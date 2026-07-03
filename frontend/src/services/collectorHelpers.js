import { supabase } from '../config/supabase'

/**
 * Get all farms assigned to a collector
 */
export const getAssignedFarms = async (collectorId) => {
  try {
    // First, get farm assignments for this collector
    const { data: assignments, error: assignError } = await supabase
      .from('collector_farm_assignments')
      .select('farm_id, route_order, assigned_at')
      .eq('collector_id', collectorId)
      .order('route_order', { ascending: true })

    if (assignError) throw assignError

    // If no assignments, return empty array
    if (!assignments || assignments.length === 0) {
      return []
    }

    // Get farm details for assigned farms
    const assignedFarmIds = assignments.map(a => a.farm_id)
    const { data: farms, error } = await supabase
      .from('farms')
      .select(`
        *,
        farm_livestock (
          livestock_type,
          count
        )
      `)
      .in('id', assignedFarmIds)

    if (error) throw error

    // Get farmer details from kyc_details
    const farmerIds = [...new Set(farms.map(f => f.farmer_id))]
    const { data: kycData } = await supabase
      .from('kyc_details')
      .select('user_id, name, phone_number')
      .in('user_id', farmerIds)

    // Get livestock details for each farm
    const farmIds = assignedFarmIds
    const { data: livestock } = await supabase
      .from('livestock')
      .select('id, farm_id, species, avg_produce, health_status')
      .in('farm_id', farmIds)

    // Get active treatments/withdrawals
    const { data: activeTreatments } = await supabase
      .from('treatments')
      .select('livestock_id, drug_name, withdrawal_end_date')
      .gte('withdrawal_end_date', new Date().toISOString().split('T')[0])

    // Process farms with additional data
    const processedFarms = farms.map(farm => {
      const kyc = kycData?.find(k => k.user_id === farm.farmer_id)
      const farmLivestock = livestock?.filter(l => l.farm_id === farm.id) || []
      const livestockIds = farmLivestock.map(l => l.id)
      const farmActiveTreatments = activeTreatments?.filter(t => 
        livestockIds.includes(t.livestock_id)
      ) || []

      // Calculate average yield
      const totalYield = farmLivestock.reduce((sum, l) => 
        sum + (parseFloat(l.avg_produce) || 0), 0
      )
      const avgDailyYield = farmLivestock.length > 0 
        ? (totalYield / farmLivestock.length).toFixed(1) 
        : 0

      // Determine farm status
      let status = 'safe'
      let withdrawalStatus = null
      
      if (farmActiveTreatments.length > 0) {
        status = 'warning'
        const earliestWithdrawal = farmActiveTreatments.reduce((earliest, t) => {
          return new Date(t.withdrawal_end_date) < new Date(earliest.withdrawal_end_date) 
            ? t : earliest
        })
        const daysRemaining = Math.ceil(
          (new Date(earliestWithdrawal.withdrawal_end_date) - new Date()) / (1000 * 60 * 60 * 24)
        )
        withdrawalStatus = {
          drugName: earliestWithdrawal.drug_name,
          daysRemaining,
          affectedAnimals: farmActiveTreatments.length
        }
      }

      return {
        ...farm,
        farmer_name: kyc?.name || farm.farmer_name,
        farmer_phone: kyc?.phone_number || farm.phone,
        total_animals: farmLivestock.length,
        avgDailyYield,
        status,
        withdrawalStatus,
        livestock_on_withdrawal: farmActiveTreatments.length,
        compliance_score: 95 // TODO: Calculate based on actual compliance data
      }
    })

    return processedFarms
  } catch (error) {
    console.error('Error fetching assigned farms:', error)
    throw error
  }
}

/**
 * Get detailed farm information for collector view
 */
export const getFarmDetails = async (farmId) => {
  try {
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select(`
        *,
        farm_livestock (
          livestock_type,
          count
        )
      `)
      .eq('id', farmId)
      .single()

    if (farmError) throw farmError

    // Get farmer KYC details
    const { data: kyc } = await supabase
      .from('kyc_details')
      .select('*')
      .eq('user_id', farm.farmer_id)
      .single()

    // Get all livestock for this farm
    const { data: livestock } = await supabase
      .from('livestock')
      .select('*')
      .eq('farm_id', farmId)

    // Get active treatments
    const livestockIds = livestock?.map(l => l.id) || []
    const { data: activeTreatments } = await supabase
      .from('treatments')
      .select('*')
      .in('livestock_id', livestockIds)
      .gte('withdrawal_end_date', new Date().toISOString().split('T')[0])

    // Get treatment history (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: recentTreatments } = await supabase
      .from('treatments')
      .select('*')
      .in('livestock_id', livestockIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Calculate production metrics
    const totalProduction = livestock?.reduce((sum, l) => 
      sum + (parseFloat(l.avg_produce) || 0), 0
    ) || 0

    const healthyAnimals = livestock?.filter(l => 
      l.health_status === 'Healthy' || l.health_status === 'healthy'
    ).length || 0

    return {
      ...farm,
      farmer_name: kyc?.name || farm.farmer_name,
      farmer_phone: kyc?.phone_number || farm.phone,
      farmer_email: kyc?.email,
      farmer_address: kyc?.complete_address,
      livestock: livestock || [],
      total_animals: livestock?.length || 0,
      healthy_animals: healthyAnimals,
      total_production: totalProduction,
      avg_production_per_animal: livestock?.length > 0 
        ? (totalProduction / livestock.length).toFixed(1) 
        : 0,
      active_treatments: activeTreatments || [],
      recent_treatments: recentTreatments || [],
      livestock_on_withdrawal: activeTreatments?.length || 0
    }
  } catch (error) {
    console.error('Error fetching farm details:', error)
    throw error
  }
}

/**
 * Add a farm to collector's assigned farms
 * This function scans farm QR or adds by farm ID
 */
export const assignFarm = async (collectorId, farmData) => {
  try {
    // Verify the farm exists
    const { data: farm, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmData.farmId || farmData.id)
      .single()

    if (error) throw error

    // Check if already assigned
    const { data: existing } = await supabase
      .from('collector_farm_assignments')
      .select('id')
      .eq('collector_id', collectorId)
      .eq('farm_id', farm.id)
      .single()

    if (existing) {
      throw new Error('Farm already assigned to you')
    }

    // Get the next route order
    const { data: lastAssignment } = await supabase
      .from('collector_farm_assignments')
      .select('route_order')
      .eq('collector_id', collectorId)
      .order('route_order', { ascending: false })
      .limit(1)
      .single()

    const nextRouteOrder = (lastAssignment?.route_order || 0) + 1

    // Insert into collector_farm_assignments table
    const { data: assignment, error: assignError } = await supabase
      .from('collector_farm_assignments')
      .insert({
        collector_id: collectorId,
        farm_id: farm.id,
        route_order: nextRouteOrder,
        status: 'active'
      })
      .select()
      .single()

    if (assignError) throw assignError

    return farm
  } catch (error) {
    console.error('Error assigning farm:', error)
    throw error
  }
}

/**
 * Get farm by QR code scan
 */
export const getFarmByQR = async (qrData) => {
  try {
    // Parse QR data - could be farm_id or full JSON
    let farmId = qrData
    if (qrData.startsWith('{')) {
      const parsed = JSON.parse(qrData)
      farmId = parsed.farm_id || parsed.id
    }

    const { data: farm, error } = await supabase
      .from('farms')
      .select(`
        *,
        farm_livestock (
          livestock_type,
          count
        )
      `)
      .eq('id', farmId)
      .single()

    if (error) throw error

    // Get farmer details
    const { data: kyc } = await supabase
      .from('kyc_details')
      .select('name, phone_number')
      .eq('user_id', farm.farmer_id)
      .single()

    return {
      ...farm,
      farmer_name: kyc?.name || farm.farmer_name,
      farmer_phone: kyc?.phone_number || farm.phone
    }
  } catch (error) {
    console.error('Error fetching farm by QR:', error)
    throw error
  }
}

/**
 * Search farms by farm_id or name
 */
export const searchFarms = async (searchQuery) => {
  try {
    const { data: farms, error } = await supabase
      .from('farms')
      .select(`
        *,
        farm_livestock (
          livestock_type,
          count
        )
      `)
      .or(`farm_id.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
      .limit(10)

    if (error) throw error

    // Get farmer details for results
    const farmerIds = [...new Set(farms.map(f => f.farmer_id))]
    const { data: kycData } = await supabase
      .from('kyc_details')
      .select('user_id, name, phone_number')
      .in('user_id', farmerIds)

    return farms.map(farm => {
      const kyc = kycData?.find(k => k.user_id === farm.farmer_id)
      return {
        ...farm,
        farmer_name: kyc?.name || farm.farmer_name,
        farmer_phone: kyc?.phone_number || farm.phone
      }
    })
  } catch (error) {
    console.error('Error searching farms:', error)
    throw error
  }
}
