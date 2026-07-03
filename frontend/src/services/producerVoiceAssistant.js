/**
 * Producer Voice Assistant - Supabase Database Functions
 * Handles all database operations for voice commands
 * 
 * Supports comprehensive producer intents:
 * - Profile & KYC management
 * - Farm & livestock operations
 * - Health, treatments & AMU tracking
 * - Milk collection & payments
 * - Lab samples & compliance
 * - Inspections & regulatory actions
 */

import { supabase } from '../config/supabase'

/**
 * DASHBOARD & OVERVIEW
 * Get comprehensive producer dashboard with all key metrics
 */
export const getProducerDashboard = async (userId) => {
  try {
    // Get farm IDs
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', userId)

    if (farmsError) throw farmsError
    
    const farmIds = farms.map(f => f.id)

    // Parallel queries for all metrics
    const [
      livestockResult,
      treatmentsResult,
      collectionsResult,
      samplesResult,
      inspectionsResult
    ] = await Promise.all([
      // Livestock count
      supabase
        .from('livestock')
        .select('id, species')
        .eq('farmer_id', userId),
      
      // Active treatments (withdrawal periods)
      supabase
        .from('treatments')
        .select('id, livestock_id, withdrawal_end_date')
        .eq('farmer_id', userId)
        .gte('withdrawal_end_date', new Date().toISOString()),
      
      // Collections last 30 days
      supabase
        .from('collection_records')
        .select('quantity_collected, payment_amount, payment_status, collection_date')
        .in('farm_id', farmIds)
        .gte('collection_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Failed samples last 30 days
      supabase
        .from('samples')
        .select('id, lab_status, mrl_violation')
        .in('farm_id', farmIds)
        .eq('lab_status', 'fail')
        .gte('collected_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Upcoming inspections
      supabase
        .from('inspections')
        .select('id, scheduled_date')
        .in('farm_id', farmIds)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_date', new Date().toISOString())
    ])

    const livestock = livestockResult.data || []
    const treatments = treatmentsResult.data || []
    const collections = collectionsResult.data || []
    const samples = samplesResult.data || []
    const inspections = inspectionsResult.data || []

    // Calculate metrics
    const totalMilk = collections.reduce((sum, c) => sum + (c.quantity_collected || 0), 0)
    const pendingPayment = collections
      .filter(c => c.payment_status !== 'paid')
      .reduce((sum, c) => sum + (c.payment_amount || 0), 0)
    
    const cattleCount = livestock.filter(l => l.species === 'cattle').length
    const buffaloCount = livestock.filter(l => l.species === 'buffalo').length

    const dashboard = {
      farms: farms.length,
      livestock: {
        total: livestock.length,
        cattle: cattleCount,
        buffalo: buffaloCount
      },
      collections_30d: {
        count: collections.length,
        total_milk: totalMilk.toFixed(2),
        pending_payment: pendingPayment.toFixed(2)
      },
      health: {
        active_treatments: treatments.length,
        animals_under_withdrawal: new Set(treatments.map(t => t.livestock_id)).size
      },
      compliance: {
        failed_samples_30d: samples.length,
        mrl_violations: samples.filter(s => s.mrl_violation).length
      },
      inspections: {
        upcoming: inspections.length,
        next_date: inspections[0]?.scheduled_date || null
      }
    }

    return {
      success: true,
      data: dashboard,
      message: `Dashboard: ${farms.length} farms, ${livestock.length} animals. ` +
        `${totalMilk.toFixed(0)} liters milk collected in last 30 days. ` +
        `${treatments.length} active treatments. ` +
        `${samples.length} failed samples.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to load dashboard.'
    }
  }
}

/**
 * PROFILE & KYC
 */
export const getProducerProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        kyc_details(*)
      `)
      .eq('id', userId)
      .single()

    if (error) throw error

    const kycStatus = data.kyc_details?.verification_status || 'pending'
    
    return {
      success: true,
      data,
      message: `Profile loaded. KYC status: ${kycStatus}.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to load profile.'
    }
  }
}

/**
 * FARM MANAGEMENT
 */
export const getMyFarms = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        livestock:livestock(count)
      `)
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data,
      message: `You have ${data.length} registered farms.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch farms.'
    }
  }
}

export const getFarmDetails = async (farmId) => {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        livestock:livestock(id, tag_id, name, species, health_status)
      `)
      .eq('id', farmId)
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: `Farm ${data.name}: ${data.total_livestock} animals, ${data.size} size.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Farm not found.'
    }
  }
}
/**
 * LIVESTOCK MANAGEMENT
 */
export const getAllLivestock = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('livestock')
      .select(`
        *,
        treatments:treatments(
          id,
          withdrawal_end_date,
          administration_date
        )
      `)
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Enrich with withdrawal status
    const enriched = data.map(animal => ({
      ...animal,
      under_withdrawal: animal.treatments?.some(
        t => t.withdrawal_end_date && new Date(t.withdrawal_end_date) >= new Date()
      ) || false,
      last_treatment: animal.treatments?.[0]?.administration_date || null
    }))
    
    return {
      success: true,
      data: enriched,
      message: `You have ${data.length} animals in your farm.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch livestock data.'
    }
  }
}

/**
 * Get livestock by tag number with full details
 */
export const getLivestockByTag = async (userId, tagNumber) => {
  try {
    const { data, error } = await supabase
      .from('livestock')
      .select(`
        *,
        treatments:treatments(
          id,
          administration_date,
          drug_name,
          withdrawal_end_date,
          veterinarian_name
        ),
        prescriptions:prescriptions(
          id,
          prescription_date,
          diagnosis,
          follow_up_required
        )
      `)
      .eq('farmer_id', userId)
      .eq('tag_id', tagNumber)
      .single()

    if (error) throw error

    const activeTreatments = data.treatments?.filter(
      t => t.withdrawal_end_date && new Date(t.withdrawal_end_date) >= new Date()
    ) || []

    return {
      success: true,
      data: {
        ...data,
        under_withdrawal: activeTreatments.length > 0,
        active_treatments_count: activeTreatments.length,
        total_prescriptions: data.prescriptions?.length || 0
      },
      message: `Animal ${data.name || tagNumber}: ${data.species}, ${data.gender}. ` +
        `Health: ${data.health_status}. ` +
        (activeTreatments.length > 0 
          ? `Under withdrawal - ${activeTreatments.length} active treatments.`
          : 'Safe to milk.')
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Animal with tag ${tagNumber} not found.`
    }
  }
}

/**
 * Get treatment history for an animal
 */
export const getTreatmentHistory = async (livestockId) => {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select(`
        *,
        livestock:livestock_id(tag_id, name)
      `)
      .eq('livestock_id', livestockId)
      .order('administration_date', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data,
      message: data.length > 0 
        ? `Found ${data.length} treatment records. Last treatment was on ${new Date(data[0].treatment_date).toLocaleDateString()}.`
        : 'No treatment history found.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch treatment history.'
    }
  }
}

/**
 * Get active prescriptions with withdrawal periods
 */
export const getActivePrescriptions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select(`
        *,
        livestock:livestock_id(tag_id, name, farmer_id)
      `)
      .eq('farmer_id', userId)
      .gte('withdrawal_end_date', new Date().toISOString())
      .order('withdrawal_end_date', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data,
      message: data.length > 0
        ? `You have ${data.length} active prescriptions. Next withdrawal period ends on ${new Date(data[0].withdrawal_end_date).toLocaleDateString()}.`
        : 'No active prescriptions or withdrawal periods.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch active prescriptions.'
    }
  }
}

/**
 * Add new livestock animal
 */
export const addLivestock = async (userId, animalData) => {
  try {
    const { data, error } = await supabase
      .from('livestock')
      .insert([{
        farmer_id: userId,
        tag_id: animalData.tag_number || animalData.tag_id,
        name: animalData.name,
        species: animalData.species || 'cattle',
        gender: animalData.gender,
        date_of_birth: animalData.date_of_birth,
        weight: animalData.weight_kg,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: `Successfully added ${animalData.name || 'new animal'} with tag ${animalData.tag_number || animalData.tag_id}.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to add livestock. Please check the details.'
    }
  }
}

/**
 * Log new treatment record
 */
export const logTreatment = async (treatmentData) => {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .insert([{
        livestock_id: treatmentData.livestock_id,
        farmer_id: treatmentData.farmer_id,
        administration_date: treatmentData.treatment_date || new Date().toISOString(),
        drug_name: treatmentData.drug_administered,
        dosage: treatmentData.dosage,
        administration_route: treatmentData.administration_route || 'oral',
        withdrawal_period_days: treatmentData.withdrawal_period_days || 0,
        withdrawal_end_date: treatmentData.withdrawal_end_date,
        notes: treatmentData.notes
      }])
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: `Treatment logged successfully. Withdrawal period: ${treatmentData.withdrawal_period_days} days.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to log treatment.'
    }
  }
}

/**
 * MILK COLLECTION & PAYMENTS
 */
export const getCollectionHistory = async (userId, days = 30) => {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get farm IDs
    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', userId)

    const farmIds = farms?.map(f => f.id) || []

    const { data, error } = await supabase
      .from('collection_records')
      .select('*')
      .in('farm_id', farmIds)
      .gte('collection_date', startDate.toISOString())
      .order('collection_date', { ascending: false })

    if (error) throw error

    const totalMilk = data.reduce((sum, r) => sum + (r.quantity_collected || 0), 0)
    const totalPayment = data.reduce((sum, r) => sum + (r.payment_amount || 0), 0)
    const pendingPayment = data
      .filter(r => r.payment_status !== 'paid')
      .reduce((sum, r) => sum + (r.payment_amount || 0), 0)
    const avgFat = data.length > 0 
      ? data.reduce((sum, r) => sum + (r.fat_percentage || 0), 0) / data.length 
      : 0
    const rejections = data.filter(r => !r.can_accept).length

    return {
      success: true,
      data,
      summary: {
        total_collections: data.length,
        total_milk: totalMilk.toFixed(2),
        total_payment: totalPayment.toFixed(2),
        pending_payment: pendingPayment.toFixed(2),
        avg_fat: avgFat.toFixed(2),
        rejections
      },
      message: `Last ${days} days: ${data.length} collections, ${totalMilk.toFixed(0)} liters. ` +
        `Total payment: ₹${totalPayment.toFixed(0)}, Pending: ₹${pendingPayment.toFixed(0)}. ` +
        (rejections > 0 ? `${rejections} rejections.` : '')
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch collection history.'
    }
  }
}

export const getTodayCollection = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', userId)

    const farmIds = farms?.map(f => f.id) || []

    const { data, error } = await supabase
      .from('collection_records')
      .select('*')
      .in('farm_id', farmIds)
      .gte('collection_date', today)

    if (error) throw error

    const totalMilk = data.reduce((sum, r) => sum + (r.quantity_collected || 0), 0)

    return {
      success: true,
      data,
      message: data.length > 0
        ? `Today: ${totalMilk.toFixed(2)} liters collected. Quality: Fat ${data[0].fat_percentage}%, SNF ${data[0].snf_percentage}%.`
        : 'No collection recorded today.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch today\'s collection.'
    }
  }
}

export const getPendingPayments = async (userId) => {
  try {
    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', userId)

    const farmIds = farms?.map(f => f.id) || []

    const { data, error } = await supabase
      .from('collection_records')
      .select('*')
      .in('farm_id', farmIds)
      .neq('payment_status', 'paid')
      .order('collection_date', { ascending: true })

    if (error) throw error

    const totalPending = data.reduce((sum, r) => sum + (r.payment_amount || 0), 0)

    return {
      success: true,
      data,
      total_pending: totalPending.toFixed(2),
      message: data.length > 0
        ? `${data.length} pending payments totaling ₹${totalPending.toFixed(2)}.`
        : 'No pending payments.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch pending payments.'
    }
  }
}

/**
 * LAB SAMPLES & COMPLIANCE
 */
export const getLabSampleStatus = async (userId) => {
  try {
    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('farmer_id', userId)

    const farmIds = farms?.map(f => f.id) || []

    const { data, error } = await supabase
      .from('samples')
      .select('*')
      .in('farm_id', farmIds)
      .order('collected_at', { ascending: false })
      .limit(10)

    if (error) throw error

    const failed = data.filter(s => s.lab_status === 'fail')
    const mrlViolations = data.filter(s => s.mrl_violation)

    return {
      success: true,
      data,
      message: `Last 10 samples: ${failed.length} failed, ${mrlViolations.length} MRL violations.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch sample status.'
    }
  }
}

/**
 * INSPECTIONS
 */
export const getUpcomingInspections = async (userId) => {
  try {
    const { data: farms } = await supabase
      .from('farms')
      .select('id, name')
      .eq('farmer_id', userId)

    const farmIds = farms?.map(f => f.id) || []

    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .in('farm_id', farmIds)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data,
      message: data.length > 0
        ? `${data.length} upcoming inspections. Next on ${new Date(data[0].scheduled_date).toLocaleDateString()}.`
        : 'No upcoming inspections.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch inspections.'
    }
  }
}

/**
 * Get milk production records
 */
export const getMilkProduction = async (userId, days = 7) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('milk_production')
      .select(`
        *,
        livestock:livestock(tag_number, name, farmer_id)
      `)
      .eq('livestock.farmer_id', userId)
      .gte('production_date', startDate.toISOString())
      .order('production_date', { ascending: false })

    if (error) throw error

    const totalMilk = data.reduce((sum, record) => sum + (record.quantity_liters || 0), 0)

    return {
      success: true,
      data,
      message: `Total milk production in last ${days} days: ${totalMilk.toFixed(2)} liters.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch milk production data.'
    }
  }
}

/**
 * Get upcoming vaccinations
 */
export const getUpcomingVaccinations = async (userId) => {
  try {
    const today = new Date().toISOString()
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const { data, error } = await supabase
      .from('vaccination_schedule')
      .select(`
        *,
        livestock:livestock(tag_number, name, farmer_id)
      `)
      .eq('livestock.farmer_id', userId)
      .gte('scheduled_date', today)
      .lte('scheduled_date', nextMonth.toISOString())
      .eq('status', 'pending')
      .order('scheduled_date', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data,
      message: data.length > 0
        ? `You have ${data.length} upcoming vaccinations. Next one is on ${new Date(data[0].scheduled_date).toLocaleDateString()}.`
        : 'No upcoming vaccinations in the next month.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch vaccination schedule.'
    }
  }
}

/**
 * Check if any animal can be sold (MRL safe)
 */
export const checkSaleReadiness = async (userId) => {
  try {
    const today = new Date().toISOString()

    // Get animals with no active withdrawal periods
    const { data, error } = await supabase
      .from('livestock')
      .select(`
        *,
        treatments(withdrawal_end_date)
      `)
      .eq('farmer_id', userId)

    if (error) throw error

    const safeToSell = data.filter(animal => {
      const activeTreatments = animal.treatments?.filter(
        t => t.withdrawal_end_date && t.withdrawal_end_date > today
      ) || []
      return activeTreatments.length === 0
    })

    return {
      success: true,
      data: safeToSell,
      message: safeToSell.length > 0
        ? `${safeToSell.length} animals are safe to sell (no active withdrawal periods).`
        : 'No animals are currently safe to sell due to active withdrawal periods.'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to check sale readiness.'
    }
  }
}

/**
 * Get farm statistics summary
 */
export const getFarmSummary = async (userId) => {
  try {
    // Get total livestock count
    const { data: livestock, error: livestockError } = await supabase
      .from('livestock')
      .select('id, species, gender')
      .eq('farmer_id', userId)

    if (livestockError) throw livestockError

    // Get active treatments
    const { data: treatments, error: treatmentsError } = await supabase
      .from('treatments')
      .select('id')
      .eq('farmer_id', userId)
      .gte('withdrawal_end_date', new Date().toISOString())

    if (treatmentsError) throw treatmentsError

    const cattleCount = livestock.filter(a => a.species === 'cattle').length
    const buffaloCount = livestock.filter(a => a.species === 'buffalo').length
    const maleCount = livestock.filter(a => a.gender === 'male').length
    const femaleCount = livestock.filter(a => a.gender === 'female').length

    return {
      success: true,
      data: {
        total: livestock.length,
        cattle: cattleCount,
        buffalo: buffaloCount,
        male: maleCount,
        female: femaleCount,
        activeTreatments: treatments.length
      },
      message: `Your farm has ${livestock.length} animals: ${cattleCount} cattle, ${buffaloCount} buffalo. ${treatments.length} animals under active treatment.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to fetch farm summary.'
    }
  }
}

/**
 * Search livestock by criteria
 */
export const searchLivestock = async (userId, searchParams) => {
  try {
    let query = supabase
      .from('livestock')
      .select('*')
      .eq('farmer_id', userId)

    if (searchParams.species) {
      query = query.eq('species', searchParams.species)
    }
    if (searchParams.gender) {
      query = query.eq('gender', searchParams.gender)
    }
    if (searchParams.minAge) {
      query = query.gte('age_months', searchParams.minAge)
    }
    if (searchParams.maxAge) {
      query = query.lte('age_months', searchParams.maxAge)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data,
      message: `Found ${data.length} animals matching your criteria.`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Search failed.'
    }
  }
}
