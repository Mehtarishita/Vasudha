import { supabase } from '../config/supabase'

/**
 * Get all treatments for a user's livestock
 */
export const getTreatments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select(`
        *,
        livestock:livestock_id (
          id,
          tag_id,
          species,
          breed
        )
      `)
      .eq('farmer_id', userId)
      .order('administration_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching treatments:', error)
    throw error
  }
}

/**
 * Get active treatments (with ongoing withdrawal periods)
 */
export const getActiveTreatments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('active_treatments_view')
      .select('*')
      .eq('farmer_id', userId)
      .order('withdrawal_end_date', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching active treatments:', error)
    throw error
  }
}

/**
 * Get treatments for a specific livestock
 */
export const getLivestockTreatments = async (livestockId) => {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select('*')
      .eq('livestock_id', livestockId)
      .order('administration_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching livestock treatments:', error)
    throw error
  }
}

/**
 * Get livestock with active withdrawal periods
 */
export const getLivestockWithTreatments = async (userId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_livestock_with_treatments', { farmer_uuid: userId })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching livestock with treatments:', error)
    throw error
  }
}

/**
 * Create a new treatment record
 */
export const createTreatment = async (treatmentData, userId) => {
  try {
    // Calculate withdrawal end date
    const administrationDate = new Date(treatmentData.administration_date)
    const withdrawalEndDate = new Date(administrationDate)
    withdrawalEndDate.setDate(withdrawalEndDate.getDate() + treatmentData.withdrawal_period_days)

    const treatment = {
      ...treatmentData,
      farmer_id: userId,
      withdrawal_end_date: withdrawalEndDate.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('treatments')
      .insert([treatment])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating treatment:', error)
    throw error
  }
}

/**
 * Update a treatment record
 */
export const updateTreatment = async (treatmentId, updates) => {
  try {
    // Recalculate withdrawal end date if administration date or withdrawal period changed
    if (updates.administration_date || updates.withdrawal_period_days) {
      const treatment = await getTreatmentById(treatmentId)
      const administrationDate = new Date(updates.administration_date || treatment.administration_date)
      const withdrawalDays = updates.withdrawal_period_days || treatment.withdrawal_period_days
      const withdrawalEndDate = new Date(administrationDate)
      withdrawalEndDate.setDate(withdrawalEndDate.getDate() + withdrawalDays)
      updates.withdrawal_end_date = withdrawalEndDate.toISOString().split('T')[0]
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('treatments')
      .update(updates)
      .eq('id', treatmentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating treatment:', error)
    throw error
  }
}

/**
 * Delete a treatment record
 */
export const deleteTreatment = async (treatmentId) => {
  try {
    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', treatmentId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting treatment:', error)
    throw error
  }
}

/**
 * Get a single treatment by ID
 */
export const getTreatmentById = async (treatmentId) => {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select('*')
      .eq('id', treatmentId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching treatment:', error)
    throw error
  }
}

/**
 * Get AMU (Antimicrobial Use) records for a user
 */
export const getAMURecords = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('amu_records')
      .select(`
        *,
        livestock:livestock_id (
          tag_id,
          species,
          breed
        )
      `)
      .eq('farmer_id', userId)
      .order('administration_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching AMU records:', error)
    throw error
  }
}

/**
 * Get treatment statistics for a user
 */
export const getTreatmentStats = async (userId) => {
  try {
    const { data: treatments, error: treatmentsError } = await supabase
      .from('treatments')
      .select('id, category, withdrawal_end_date')
      .eq('farmer_id', userId)

    if (treatmentsError) throw treatmentsError

    const { data: activeAMU, error: amuError } = await supabase
      .from('amu_records')
      .select('id')
      .eq('farmer_id', userId)
      .eq('status', 'active')

    if (amuError) throw amuError

    const today = new Date().toISOString().split('T')[0]
    
    const stats = {
      totalTreatments: treatments?.length || 0,
      activeWithdrawals: treatments?.filter(t => t.withdrawal_end_date >= today).length || 0,
      antibioticUse: treatments?.filter(t => t.category === 'Antibiotic').length || 0,
      activeAMU: activeAMU?.length || 0
    }

    return stats
  } catch (error) {
    console.error('Error fetching treatment stats:', error)
    return {
      totalTreatments: 0,
      activeWithdrawals: 0,
      antibioticUse: 0,
      activeAMU: 0
    }
  }
}

/**
 * Upload drug image to Supabase Storage
 */
export const uploadDrugImage = async (file, treatmentId) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${treatmentId}_${Date.now()}.${fileExt}`
    const filePath = `drug-images/${fileName}`

    const { data, error } = await supabase.storage
      .from('treatment-images')
      .upload(filePath, file)

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('treatment-images')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading drug image:', error)
    throw error
  }
}

/**
 * Calculate withdrawal period end date
 */
export const calculateWithdrawalEndDate = (administrationDate, withdrawalDays) => {
  const date = new Date(administrationDate)
  date.setDate(date.getDate() + withdrawalDays)
  return date.toISOString().split('T')[0]
}

/**
 * Get days remaining until withdrawal end
 */
export const getDaysRemaining = (withdrawalEndDate) => {
  const today = new Date()
  const endDate = new Date(withdrawalEndDate)
  const diffTime = endDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get withdrawal status
 */
export const getWithdrawalStatus = (withdrawalEndDate) => {
  const daysRemaining = getDaysRemaining(withdrawalEndDate)
  
  if (daysRemaining < 0) return 'completed'
  if (daysRemaining === 0) return 'ending-today'
  if (daysRemaining <= 3) return 'ending-soon'
  return 'active'
}

/**
 * Get status color for UI
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'ending-soon':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'ending-today':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}
