import { supabase } from '../config/supabase'

/**
 * Veterinarian Helper Functions
 * Handles all vet-specific database operations
 */

export const vetHelpers = {
  // ==================== TREATMENT REQUESTS ====================
  
  /**
   * Get all treatment requests (with filtering)
   */
  getTreatmentRequests: async (filters = {}) => {
    try {
      let query = supabase
        .from('treatment_requests')
        .select(`
          *,
          livestock:livestock(
            id,
            tag_id,
            name,
            species,
            breed,
            farm:farms(id, name, location)
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.vetId) {
        query = query.eq('veterinarian_id', filters.vetId)
      }
      if (filters.urgency) {
        query = query.eq('urgency', filters.urgency)
      }

      const { data, error } = await query
      
      // Fetch farmer details separately
      if (data && data.length > 0) {
        const farmerIds = [...new Set(data.map(req => req.farmer_id).filter(Boolean))]
        
        if (farmerIds.length > 0) {
          const { data: farmers } = await supabase
            .from('profiles')
            .select('id, name, mobile_number, address, pincode')
            .in('id', farmerIds)
          
          const farmerMap = {}
          farmers?.forEach(f => {
            farmerMap[f.id] = f
          })
          
          data.forEach(request => {
            if (request.farmer_id) {
              request.farmer = farmerMap[request.farmer_id] || null
            }
          })
        }
      }

      return { data, error }
    } catch (error) {
      console.error('Error fetching treatment requests:', error)
      return { data: null, error }
    }
  },

  /**
   * Assign treatment request to veterinarian
   */
  assignRequest: async (requestId, vetId, vetName) => {
    try {
      const { data, error } = await supabase
        .from('treatment_requests')
        .update({
          status: 'assigned',
          veterinarian_id: vetId,
          veterinarian_name: vetName,
          assigned_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error assigning request:', error)
      return { data: null, error }
    }
  },

  /**
   * Update treatment request status
   */
  updateRequestStatus: async (requestId, status, updates = {}) => {
    try {
      const { data, error } = await supabase
        .from('treatment_requests')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating request status:', error)
      return { data: null, error }
    }
  },

  // ==================== TREATMENTS & PRESCRIPTIONS ====================

  /**
   * Get all treatments (with livestock and farm details)
   */
  getTreatments: async (filters = {}) => {
    try {
      let query = supabase
        .from('treatments')
        .select(`
          *,
          livestock:livestock(
            id,
            livestock_id,
            tag_id,
            name,
            species,
            breed,
            farm:farms(
              id, 
              farm_id, 
              name, 
              location,
              farmer_id
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filters.vetId) {
        query = query.eq('veterinarian_id', filters.vetId)
      }
      if (filters.activeOnly) {
        const today = new Date().toISOString().split('T')[0]
        query = query.gte('withdrawal_end_date', today)
      }

      const { data, error } = await query
      
      // Fetch farmer details separately using farmer_id from farms
      if (data && data.length > 0) {
        const farmerIds = [...new Set(
          data
            .filter(t => t.livestock?.farm?.farmer_id)
            .map(t => t.livestock.farm.farmer_id)
        )]
        
        if (farmerIds.length > 0) {
          const { data: farmers } = await supabase
            .from('profiles')
            .select('id, name, mobile_number')
            .in('id', farmerIds)
          
          // Map farmers to treatments
          const farmerMap = {}
          farmers?.forEach(f => {
            farmerMap[f.id] = f
          })
          
          data.forEach(treatment => {
            if (treatment.livestock?.farm?.farmer_id) {
              treatment.livestock.farm.farmer = farmerMap[treatment.livestock.farm.farmer_id] || null
            }
          })
        }
      }

      return { data, error }
    } catch (error) {
      console.error('Error fetching treatments:', error)
      return { data: null, error }
    }
  },

  /**
   * Create new treatment record
   */
  createTreatment: async (treatmentData) => {
    try {
      // Calculate withdrawal end date
      const adminDate = new Date(treatmentData.administration_date || new Date())
      const withdrawalEndDate = new Date(adminDate)
      withdrawalEndDate.setDate(withdrawalEndDate.getDate() + (treatmentData.withdrawal_period_days || 0))

      const treatment = {
        ...treatmentData,
        withdrawal_end_date: withdrawalEndDate.toISOString().split('T')[0],
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('treatments')
        .insert(treatment)
        .select()
        .single()

      // Update livestock total_treatments counter
      if (data && treatmentData.livestock_id) {
        await supabase.rpc('increment_livestock_treatments', {
          livestock_id: treatmentData.livestock_id
        })
      }

      return { data, error }
    } catch (error) {
      console.error('Error creating treatment:', error)
      return { data: null, error }
    }
  },

  // ==================== FARMS & LIVESTOCK ====================

  /**
   * Get farms assigned to vet (by district)
   */
  getAssignedFarms: async (vetId) => {
    try {
      // Get vet's district from kyc_details table (city field)
      const { data: vetKyc, error: vetError } = await supabase
        .from('kyc_details')
        .select('city, state')
        .eq('user_id', vetId)
        .single()

      if (vetError || !vetKyc?.city) {
        console.warn('Vet district not found:', vetError)
        return { data: [], error: vetError }
      }

      const vetDistrict = vetKyc.city  // city is the district

      // Get farmers from the same district using address field
      // Note: This assumes district is part of the address or we use kyc_details table
      const { data: farmers, error: farmersError } = await supabase
        .from('profiles')
        .select('id, name, mobile_number, address')
        .eq('user_type', 'producer')
        .ilike('address', `%${vetDistrict}%`)

      if (farmersError) {
        console.error('Error fetching farmers:', farmersError)
        return { data: [], error: farmersError }
      }

      if (!farmers || farmers.length === 0) {
        return { data: [], error: null }
      }

      const farmerIds = farmers.map(f => f.id)

      // Get farms for these farmers
      const { data: farms, error } = await supabase
        .from('farms')
        .select(`
          *,
          farm_livestock(
            livestock_type,
            count
          )
        `)
        .in('farmer_id', farmerIds)

      // Enrich farms with farmer details
      const enrichedFarms = farms?.map(farm => {
        const farmer = farmers.find(f => f.id === farm.farmer_id)
        const totalLivestock = farm.farm_livestock?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
        
        return {
          ...farm,
          farmer_name: farmer?.name || 'Unknown',
          farmer_phone: farmer?.mobile_number || farm.phone,
          farmer_address: farmer?.address || '',
          district: vetDistrict,
          livestock_count: farm.total_livestock || totalLivestock,
          livestock_summary: farm.farm_livestock || []
        }
      }) || []

      return { data: enrichedFarms, error }
    } catch (error) {
      console.error('Error fetching assigned farms:', error)
      return { data: null, error }
    }
  },

  /**
   * Get livestock for farms
   */
  getLivestockForFarms: async (farmIds) => {
    try {
      const { data, error } = await supabase
        .from('livestock')
        .select(`
          *,
          farm:farms(id, farm_id, name, farmer_id)
        `)
        .in('farm_id', farmIds)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('Error fetching livestock:', error)
      return { data: null, error }
    }
  },

  // ==================== LAB REPORTS & SAMPLES ====================

  /**
   * Get lab samples and results for vet's farms
   */
  getLabReports: async (vetId) => {
    try {
      // Get vet's farms first
      const { data: farms } = await vetHelpers.getAssignedFarms(vetId)
      
      if (!farms || farms.length === 0) {
        return { data: [], error: null }
      }

      const farmIds = farms.map(f => f.id)

      // Get samples for these farms
      const { data, error } = await supabase
        .from('samples')
        .select(`
          *,
          batch:batches!samples_batch_id_fkey(
            batch_id,
            collection_date,
            collector:profiles!batches_collector_id_fkey(name, mobile_number)
          ),
          farm:farms(id, farm_id, name, location)
        `)
        .in('farm_id', farmIds)
        .order('collected_at', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('Error fetching lab reports:', error)
      return { data: null, error }
    }
  },

  // ==================== ALERTS & NOTIFICATIONS ====================

  /**
   * Get alerts for veterinarian
   */
  getAlerts: async (vetId) => {
    try {
      const alerts = []

      // 1. Get MRL failures from samples
      const { data: farms } = await vetHelpers.getAssignedFarms(vetId)
      if (farms && farms.length > 0) {
        const farmIds = farms.map(f => f.id)
        
        const { data: failedSamples } = await supabase
          .from('samples')
          .select('*, farm:farms(name, location)')
          .in('farm_id', farmIds)
          .eq('lab_status', 'fail')
          .gte('collected_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

        if (failedSamples) {
          failedSamples.forEach(sample => {
            alerts.push({
              id: `MRL-${sample.id}`,
              type: 'urgent',
              category: 'MRL Failure',
              title: `MRL Exceeded - ${sample.farm?.name}`,
              message: `Sample ${sample.sample_code} has failed MRL testing. Immediate action required.`,
              farmName: sample.farm?.name,
              timestamp: sample.collected_at,
              status: 'unread',
              actionRequired: true,
              priority: 1
            })
          })
        }
      }

      // 2. Get pending treatment requests
      const { data: pendingRequests } = await supabase
        .from('treatment_requests')
        .select('*')
        .eq('status', 'pending')
        .eq('urgency', 'emergency')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

      if (pendingRequests) {
        pendingRequests.forEach(request => {
          alerts.push({
            id: `REQ-${request.id}`,
            type: request.urgency === 'emergency' ? 'urgent' : 'normal',
            category: 'Treatment Request',
            title: `${request.urgency === 'emergency' ? 'Emergency' : 'Treatment'} Request - ${request.farmer_name}`,
            message: `${request.animal_species} showing symptoms: ${request.symptoms}`,
            farmName: request.farmer_name,
            timestamp: request.created_at,
            status: 'unread',
            actionRequired: true,
            priority: request.urgency === 'emergency' ? 1 : 2
          })
        })
      }

      // 3. Get upcoming withdrawal period endings
      const { data: activeWithdrawals } = await supabase
        .from('treatments')
        .select(`
          *,
          livestock:livestock(tag_id, name, farm:farms(name))
        `)
        .eq('veterinarian_id', vetId)
        .gte('withdrawal_end_date', new Date().toISOString().split('T')[0])
        .lte('withdrawal_end_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Next 3 days

      if (activeWithdrawals) {
        activeWithdrawals.forEach(treatment => {
          alerts.push({
            id: `WD-${treatment.id}`,
            type: 'normal',
            category: 'Withdrawal Period Active',
            title: `Withdrawal Period Ending Soon`,
            message: `${treatment.livestock?.name || 'Animal'} (${treatment.livestock?.tag_id}) withdrawal ends on ${new Date(treatment.withdrawal_end_date).toLocaleDateString()}`,
            farmName: treatment.livestock?.farm?.name || 'Unknown Farm',
            timestamp: treatment.created_at,
            status: 'read',
            actionRequired: false,
            priority: 2
          })
        })
      }

      // Sort by priority and timestamp
      alerts.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return new Date(b.timestamp) - new Date(a.timestamp)
      })

      return { data: alerts, error: null }
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return { data: [], error }
    }
  },

  // ==================== FARM VISITS ====================

  /**
   * Get scheduled farm visits (from inspections table)
   */
  getScheduledVisits: async (vetId) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          farm:farms(id, farm_id, name, location, phone, farmer_id)
        `)
        .eq('inspector_id', vetId)
        .order('scheduled_date', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('Error fetching scheduled visits:', error)
      return { data: null, error }
    }
  },

  /**
   * Create farm visit/inspection
   */
  createFarmVisit: async (visitData) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .insert({
          farm_id: visitData.farmId,
          inspector_id: visitData.vetId,
          scheduled_date: visitData.scheduledDate,
          inspection_type: visitData.inspectionType,
          status: 'scheduled',
          priority: visitData.inspectionType === 'emergency' ? 'critical' : 'medium',
          notes: visitData.notes,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error creating farm visit:', error)
      return { data: null, error }
    }
  },

  /**
   * Update farm visit status
   */
  updateVisitStatus: async (visitId, status, notes = null) => {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
      if (notes) {
        updates.notes = notes
      }

      const { data, error } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', visitId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating visit status:', error)
      return { data: null, error }
    }
  },

  // ==================== VETERINARIAN PROFILE ====================

  /**
   * Get veterinarian profile details
   */
  getVetProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('veterinarians')
        .select('*')
        .eq('user_id', userId)
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error fetching vet profile:', error)
      return { data: null, error }
    }
  },

  /**
   * Update availability status
   */
  updateAvailability: async (userId, status) => {
    try {
      const { data, error } = await supabase
        .from('veterinarians')
        .update({
          availability_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating availability:', error)
      return { data: null, error }
    }
  }
}

export default vetHelpers
