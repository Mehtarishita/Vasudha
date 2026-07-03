import { supabase } from '../config/supabase'

// Get all livestock for the logged-in user
export const getLivestock = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('livestock')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farm_id,
          location,
          phone,
          farmer_unique_id
        )
      `)
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Fetch phone and name from kyc_details
    const { data: kycData } = await supabase
      .from('kyc_details')
      .select('phone_number, name')
      .eq('user_id', userId)
      .single()
    
    const phoneFromKYC = kycData?.phone_number
    const nameFromKYC = kycData?.name
    
    // Transform data to include farm details at root level
    const transformedData = data?.map(item => ({
      ...item,
      farm_name: item.farms?.name,
      farm_farm_id: item.farms?.farm_id,
      farm_location: item.farms?.location,
      farmer_phone: phoneFromKYC || item.farms?.phone, // Use phone from kyc_details first
      farmer_unique_id: item.farms?.farmer_unique_id,
      farmer_name: nameFromKYC, // Use name from kyc_details
    })) || []
    
    return transformedData
  } catch (error) {
    console.error('Error fetching livestock:', error)
    throw error
  }
}

// Get a single livestock by ID
export const getLivestockById = async (livestockId) => {
  try {
    const { data, error } = await supabase
      .from('livestock')
      .select(`
        *,
        farms (
          id,
          name,
          farm_id,
          location,
          phone,
          farmer_unique_id
        )
      `)
      .eq('id', livestockId)
      .single()

    if (error) throw error
    
    // Fetch phone and name from kyc_details
    const { data: kycData } = await supabase
      .from('kyc_details')
      .select('phone_number, name')
      .eq('user_id', data.farmer_id)
      .single()
    
    const phoneFromKYC = kycData?.phone_number
    const nameFromKYC = kycData?.name
    
    // Transform data
    const transformed = {
      ...data,
      farm_name: data.farms?.name,
      farm_farm_id: data.farms?.farm_id,
      farm_location: data.farms?.location,
      farmer_phone: phoneFromKYC || data.farms?.phone, // Use phone from kyc_details first
      farmer_unique_id: data.farms?.farmer_unique_id,
      farmer_name: nameFromKYC, // Use name from kyc_details
    }
    
    return transformed
  } catch (error) {
    console.error('Error fetching livestock:', error)
    throw error
  }
}

// Create a new livestock
export const createLivestock = async (livestockData, userId, farmerUniqueId, farmId) => {
  try {
    // Clean up data - convert empty strings to null for numeric fields
    const cleanedData = {
      ...livestockData,
      weight: livestockData.weight && livestockData.weight !== '' ? parseFloat(livestockData.weight) : null,
      avg_produce: livestockData.avg_produce && livestockData.avg_produce !== '' ? parseFloat(livestockData.avg_produce) : null,
      farmer_id: userId,
      farmer_unique_id: farmerUniqueId,
      farm_id: farmId,
    }

    const { data: livestock, error: livestockError } = await supabase
      .from('livestock')
      .insert(cleanedData)
      .select()
      .single()

    if (livestockError) throw livestockError

    // Fetch the complete livestock data with farm details
    return await getLivestockById(livestock.id)
  } catch (error) {
    console.error('Error creating livestock:', error)
    throw error
  }
}

// Update a livestock
export const updateLivestock = async (livestockId, livestockData) => {
  try {
    // Clean up data - convert empty strings to null for numeric fields
    const cleanedData = {
      ...livestockData,
      weight: livestockData.weight && livestockData.weight !== '' ? parseFloat(livestockData.weight) : null,
      avg_produce: livestockData.avg_produce && livestockData.avg_produce !== '' ? parseFloat(livestockData.avg_produce) : null,
    }

    const { data: livestock, error: livestockError } = await supabase
      .from('livestock')
      .update(cleanedData)
      .eq('id', livestockId)
      .select()
      .single()

    if (livestockError) throw livestockError

    // Fetch the updated livestock data
    return await getLivestockById(livestockId)
  } catch (error) {
    console.error('Error updating livestock:', error)
    throw error
  }
}

// Delete a livestock
export const deleteLivestock = async (livestockId) => {
  try {
    const { error } = await supabase
      .from('livestock')
      .delete()
      .eq('id', livestockId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting livestock:', error)
    throw error
  }
}

// Get livestock count by health status
export const getLivestockStats = async (userId) => {
  try {
    // Get all livestock
    const { data: livestockData, error: livestockError } = await supabase
      .from('livestock')
      .select('id, health_status')
      .eq('farmer_id', userId)

    if (livestockError) throw livestockError

    // Get active treatments (animals currently under withdrawal period)
    const { data: activeTreatments, error: treatmentsError } = await supabase
      .from('treatments')
      .select('livestock_id, withdrawal_end_date')
      .eq('farmer_id', userId)
    
    if (treatmentsError) throw treatmentsError

    // Calculate animals under active withdrawal
    const today = new Date()
    const livestockWithActiveWithdrawal = new Set()
    
    activeTreatments?.forEach(treatment => {
      const withdrawalEnd = new Date(treatment.withdrawal_end_date)
      if (withdrawalEnd >= today) {
        livestockWithActiveWithdrawal.add(treatment.livestock_id)
      }
    })

    // Get total AMU records
    const { data: amuData, error: amuError } = await supabase
      .from('amu_records')
      .select('id')
      .eq('farmer_id', userId)
    
    if (amuError) throw amuError

    const stats = {
      total: livestockData?.length || 0,
      healthy: livestockData?.filter(l => l.health_status?.toLowerCase() === 'healthy').length || 0,
      underTreatment: livestockWithActiveWithdrawal.size || 0,
      totalAMU: amuData?.length || 0,
    }

    return stats
  } catch (error) {
    console.error('Error fetching livestock stats:', error)
    return {
      total: 0,
      healthy: 0,
      underTreatment: 0,
      totalAMU: 0
    }
  }
}

// Get livestock by farm
export const getLivestockByFarm = async (farmId) => {
  try {
    const { data, error } = await supabase
      .from('livestock')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching livestock by farm:', error)
    throw error
  }
}

