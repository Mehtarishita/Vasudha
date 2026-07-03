import { supabase } from '../config/supabase'

// Get all farms for the logged-in user with phone from kyc_details
export const getFarms = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        farm_livestock (
          id,
          livestock_type,
          count
        )
      `)
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Fetch phone and name from kyc_details if not in farm
    if (data && data.length > 0) {
      const { data: kycData } = await supabase
        .from('kyc_details')
        .select('phone_number, name')
        .eq('user_id', userId)
        .single()
      
      // Add phone and name to each farm if missing
      data.forEach(farm => {
        if (!farm.phone && kycData?.phone_number) {
          farm.phone = kycData.phone_number
        }
        if (!farm.farmer_name && kycData?.name) {
          farm.farmer_name = kycData.name
        }
      })
    }
    
    return data
  } catch (error) {
    console.error('Error fetching farms:', error)
    throw error
  }
}

// Get a single farm by ID with phone from kyc_details
export const getFarm = async (farmId) => {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        farm_livestock (
          id,
          livestock_type,
          count
        )
      `)
      .eq('id', farmId)
      .single()

    if (error) throw error
    
    // Fetch phone and name from kyc_details if not in farm
    if (data) {
      const { data: kycData } = await supabase
        .from('kyc_details')
        .select('phone_number, name')
        .eq('user_id', data.farmer_id)
        .single()
      
      if (!data.phone && kycData?.phone_number) {
        data.phone = kycData.phone_number
      }
      if (!data.farmer_name && kycData?.name) {
        data.farmer_name = kycData.name
      }
    }
    
    return data
  } catch (error) {
    console.error('Error fetching farm:', error)
    throw error
  }
}

// Create a new farm
export const createFarm = async (farmData, userId, farmerUniqueId) => {
  try {
    const { livestock, ...farmDetails } = farmData
    
    // Fetch phone and name from kyc_details
    const { data: kycData } = await supabase
      .from('kyc_details')
      .select('phone_number, name')
      .eq('user_id', userId)
      .single()
    
    const phoneNumber = kycData?.phone_number || farmDetails.phone
    const farmerName = kycData?.name

    // Insert farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .insert({
        ...farmDetails,
        farmer_id: userId,
        farmer_unique_id: farmerUniqueId,
        phone: phoneNumber, // Use phone from kyc_details
        farmer_name: farmerName, // Use name from kyc_details
      })
      .select()
      .single()

    if (farmError) throw farmError

    // Insert livestock if provided
    if (livestock && livestock.length > 0) {
      const livestockRecords = livestock
        .filter(l => l.type && l.count > 0)
        .map(l => ({
          farm_id: farm.id,
          livestock_type: l.type,
          count: parseInt(l.count)
        }))

      if (livestockRecords.length > 0) {
        const { error: livestockError } = await supabase
          .from('farm_livestock')
          .insert(livestockRecords)

        if (livestockError) throw livestockError
      }
    }

    // Fetch the complete farm data with livestock
    return await getFarm(farm.id)
  } catch (error) {
    console.error('Error creating farm:', error)
    throw error
  }
}

// Update a farm
export const updateFarm = async (farmId, farmData) => {
  try {
    const { livestock, ...farmDetails } = farmData

    // Update farm details
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .update(farmDetails)
      .eq('id', farmId)
      .select()
      .single()

    if (farmError) throw farmError

    // Update livestock if provided
    if (livestock) {
      // Delete existing livestock
      await supabase
        .from('farm_livestock')
        .delete()
        .eq('farm_id', farmId)

      // Insert new livestock
      const livestockRecords = livestock
        .filter(l => l.type && l.count > 0)
        .map(l => ({
          farm_id: farmId,
          livestock_type: l.type,
          count: parseInt(l.count)
        }))

      if (livestockRecords.length > 0) {
        const { error: livestockError } = await supabase
          .from('farm_livestock')
          .insert(livestockRecords)

        if (livestockError) throw livestockError
      }
    }

    // Fetch the updated farm data
    return await getFarm(farmId)
  } catch (error) {
    console.error('Error updating farm:', error)
    throw error
  }
}

// Delete a farm
export const deleteFarm = async (farmId) => {
  try {
    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', farmId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting farm:', error)
    throw error
  }
}

// Add livestock to a farm
export const addLivestock = async (farmId, livestockType, count) => {
  try {
    const { data, error } = await supabase
      .from('farm_livestock')
      .upsert({
        farm_id: farmId,
        livestock_type: livestockType,
        count: parseInt(count)
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding livestock:', error)
    throw error
  }
}

// Update livestock count
export const updateLivestock = async (livestockId, count) => {
  try {
    const { data, error } = await supabase
      .from('farm_livestock')
      .update({ count: parseInt(count) })
      .eq('id', livestockId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating livestock:', error)
    throw error
  }
}

// Delete livestock
export const deleteLivestock = async (livestockId) => {
  try {
    const { error } = await supabase
      .from('farm_livestock')
      .delete()
      .eq('id', livestockId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting livestock:', error)
    throw error
  }
}

