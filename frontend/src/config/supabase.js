import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
})

// Auth helper functions for Phone + Password
export const authHelpers = {
  // Sign up new user with phone and password
  signUp: async (phoneNumber, password, metadata) => {
    // Use phone as email (required by Supabase) in format: phone@vasudha.app
    const emailFormat = `${phoneNumber}@vasudha.app`
    
    const { data, error } = await supabase.auth.signUp({
      email: emailFormat,
      password,
      phone: `+91${phoneNumber}`,
      options: {
        data: {
          ...metadata,
          mobile_number: phoneNumber
        }
      }
    })
    
    if (error) return { data, error }
    
    // Wait for trigger to create profile (retry up to 5 times with 500ms delay)
    if (data.user) {
      let profile = null
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: profileData } = await profileHelpers.getProfile(data.user.id)
        if (profileData) {
          profile = profileData
          break
        }
      }
      
      // If profile still doesn't exist, create it manually
      if (!profile) {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: metadata.name,
            mobile_number: `+91${phoneNumber}`,
            user_type: metadata.user_type,
            address: metadata.address,
            pincode: metadata.pincode,
            kyc_status: 'pending'
          })
          .select()
          .single()
        
        if (profileError) {
          console.error('Failed to create profile:', profileError)
        } else {
          profile = newProfile
        }
      }
      
      return { data: { ...data, profile }, error: null }
    }
    
    return { data, error }
  },

  // Sign in with phone and password
  signIn: async (phoneNumber, password) => {
    const emailFormat = `${phoneNumber}@vasudha.app`
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormat,
      password
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Update user metadata
  updateUserMetadata: async (metadata) => {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    })
    return { data, error }
  }
}

// Profile helper functions
export const profileHelpers = {
  // Get user profile
  getProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('Profile fetch error:', error)
        return { data: null, error }
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('Profile fetch exception:', err)
      return { data: null, error: err }
    }
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Check if mobile number exists
  checkMobileExists: async (mobileNumber) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('mobile_number')
      .eq('mobile_number', mobileNumber)
      .maybeSingle()
    return { exists: !!data, error }
  }
}

// KYC helper functions
export const kycHelpers = {
  // Get user's KYC details
  getKYC: async (userId) => {
    const { data, error } = await supabase
      .from('kyc_details')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  // Get KYC details (alias for backward compatibility)
  getKYCDetails: async (userId) => {
    return kycHelpers.getKYC(userId)
  },

  // Submit KYC details
  submitKYC: async (kycData) => {
    const { data, error } = await supabase
      .from('kyc_details')
      .upsert(kycData)
      .select()
      .single()
    
    // Update profile KYC status to match verification status
    if (!error) {
      const kycStatusValue = kycData.verification_status || 'submitted'
      await supabase
        .from('profiles')
        .update({ kyc_status: kycStatusValue })
        .eq('id', kycData.user_id)
    }
    
    return { data, error }
  },

  // Upload KYC document
  uploadDocument: async (userId, file, documentType) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) return { data: null, error }
    
    // Get public URL (even for private buckets, you can get signed URLs)
    const { data: { publicUrl } } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(fileName)
    
    return { data: { path: fileName, url: publicUrl }, error: null }
  }
}
