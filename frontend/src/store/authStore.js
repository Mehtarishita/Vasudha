import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authHelpers, profileHelpers, kycHelpers } from '../config/supabase'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
      isLoading: true, // Start with true to prevent premature redirects
      kycCompleted: false,
      kycData: null,
      kycStatus: 'pending', // pending, submitted, verified, rejected

      // Initialize auth state from Supabase session
      initializeAuth: async () => {
        const currentState = get()
        
        // If we already have authenticated state from persistence, just validate it
        if (currentState.isAuthenticated && currentState.user) {
          set({ isLoading: true })
          try {
            const { session } = await authHelpers.getSession()
            
            // Session still valid, keep existing state and just update session
            if (session) {
              set({ session, isLoading: false })
              return
            }
            
            // Session expired, need to re-authenticate
            set({ 
              user: null,
              profile: null,
              session: null,
              isAuthenticated: false,
              kycCompleted: false,
              kycData: null,
              kycStatus: 'pending',
              isLoading: false 
            })
          } catch (error) {
            console.error('Session validation error:', error)
            set({ isLoading: false })
          }
          return
        }
        
        // No persisted state, do full initialization
        set({ isLoading: true })
        try {
          const { session } = await authHelpers.getSession()
          
          if (session) {
            const { user } = session
            
            // Get user profile
            const { data: profile, error: profileError } = await profileHelpers.getProfile(user.id)
            if (profileError) {
              console.error('Profile fetch error:', profileError)
            }
            
            // Fetch KYC data
            let kycData = null
            let kycStatus = 'pending'
            let kycCompleted = false
            
            const { data: kycResult, error: kycError } = await kycHelpers.getKYC(user.id)
            
            if (kycResult && !kycError) {
              kycData = kycResult
              kycStatus = kycResult.verification_status || 'pending'
              kycCompleted = kycStatus === 'verified'
              
              // Update profile with KYC details for easy access
              if (profile) {
                profile.name = kycResult.name || kycResult.full_name || kycResult.full_legal_name || profile.name
                profile.mobile = kycResult.phone_number || profile.mobile_number
                profile.unique_id = profile.unique_id // Keep from profile table
              }
            }
            
            // Use profile.kyc_status as fallback
            if (!kycData && profile?.kyc_status) {
              kycStatus = profile.kyc_status
              kycCompleted = kycStatus === 'verified'
            }
            
            // Get user_type from profile
            const userType = profile?.user_type || user.user_metadata?.user_type || 'producer'
            
            // Create user object with role for backward compatibility
            const userWithRole = {
              ...user,
              role: userType
            }
            
            set({
              user: userWithRole,
              session,
              profile,
              isAuthenticated: true,
              kycStatus: kycStatus,
              kycCompleted: kycCompleted,
              kycData: kycData,
              isLoading: false
            })
          } else {
            set({ 
              user: null,
              profile: null,
              session: null,
              isAuthenticated: false,
              kycCompleted: false,
              kycData: null,
              kycStatus: 'pending',
              isLoading: false 
            })
          }
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ 
            user: null,
            profile: null,
            session: null,
            isAuthenticated: false,
            kycCompleted: false,
            kycData: null,
            kycStatus: 'pending',
            isLoading: false 
          })
        }
      },

      // Set user after successful login/registration
      setUser: async (session) => {
        if (session?.user) {
          const { user } = session
          
          // Get user profile from database
          const { data: profile, error: profileError } = await profileHelpers.getProfile(user.id)
          if (profileError) {
            console.warn('Profile not found in database:', profileError)
          }
          
          // Fetch KYC data from database
          let kycData = null
          let kycStatus = 'pending'
          let kycCompleted = false
          
          const { data: kycResult, error: kycError } = await kycHelpers.getKYC(user.id)
          
          if (kycResult && !kycError) {
            kycData = kycResult
            kycStatus = kycResult.verification_status || 'pending'
            kycCompleted = kycStatus === 'verified'
            
            // Merge KYC details into profile for easy access
            if (profile) {
              profile.name = kycResult.name || kycResult.full_name || kycResult.full_legal_name || profile.name
              profile.mobile = kycResult.phone_number || profile.mobile_number
            }
          }
          
          // Use profile.kyc_status as fallback
          if (!kycData && profile?.kyc_status) {
            kycStatus = profile.kyc_status
            kycCompleted = kycStatus === 'verified'
          }
          
          // Get user_type from profile or metadata
          const userType = profile?.user_type || user.user_metadata?.user_type || 'producer'
          
          // Create user object with role for backward compatibility
          const userWithRole = {
            ...user,
            role: userType
          }
          
          // Create fallback profile if database profile doesn't exist
          const finalProfile = profile || {
            id: user.id,
            name: user.user_metadata?.name,
            mobile_number: user.user_metadata?.mobile_number || user.phone?.replace('+91', ''),
            user_type: userType,
            address: user.user_metadata?.address,
            pincode: user.user_metadata?.pincode,
            kyc_status: kycStatus
          }
          
          set({
            user: userWithRole,
            session,
            profile: finalProfile,
            isAuthenticated: true,
            kycStatus: kycStatus,
            kycCompleted: kycCompleted,
            kycData: kycData
          })
        }
      },

      login: async (credentials) => {
        set({ isLoading: true })
        try {
          // Simulate API call
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            })
            return { success: true }
          } else {
            set({ isLoading: false })
            return { success: false, error: data.message }
          }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Network error' }
        }
      },

      register: async (userData) => {
        set({ isLoading: true })
        try {
          // Simulate API call
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            })
            return { success: true }
          } else {
            set({ isLoading: false })
            return { success: false, error: data.message }
          }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Network error' }
        }
      },

      logout: async () => {
        await authHelpers.signOut()
        set({
          user: null,
          profile: null,
          session: null,
          token: null,
          isAuthenticated: false,
          kycCompleted: false,
          kycData: null,
          kycStatus: 'pending',
        })
      },

      updateProfile: (updates) => {
        set((state) => ({
          user: { ...state.user, ...updates }
        }))
      },

      submitKYC: async (kycInfo) => {
        set({ isLoading: true })
        try {
          // Simulate API call for KYC submission
          const response = await fetch('/api/kyc/submit', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(kycInfo),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            set({
              kycData: kycInfo,
              kycStatus: 'submitted',
              isLoading: false,
            })
            return { success: true, message: 'KYC submitted successfully' }
          } else {
            set({ isLoading: false })
            return { success: false, error: data.message }
          }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Network error during KYC submission' }
        }
      },

      verifyKYC: async (verificationData) => {
        set({ isLoading: true })
        try {
          // Simulate API call for KYC verification
          const response = await fetch('/api/kyc/verify', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(verificationData),
          })
          
          const data = await response.json()
          
          if (response.ok) {
            set({
              kycCompleted: true,
              kycStatus: 'verified',
              isLoading: false,
            })
            return { success: true, message: 'KYC verified successfully' }
          } else {
            set({ 
              kycStatus: 'rejected',
              isLoading: false 
            })
            return { success: false, error: data.message }
          }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Network error during KYC verification' }
        }
      },

      // Mock KYC verification - now saves to Supabase
      mockVerifyKYC: async (kycInfo) => {
        try {
          const userId = get().user?.id
          if (!userId) {
            return { success: false, error: 'User not found' }
          }

          // Prepare KYC data for Supabase kyc_details table
          const kycData = {
            user_id: userId,
            name: kycInfo.name,
            phone_number: kycInfo.phoneNumber,
            email: kycInfo.email || null,
            id_type: kycInfo.idType,
            id_number: kycInfo.idNumber,
            full_name: kycInfo.fullName,
            full_legal_name: kycInfo.fullName, // Map to full_legal_name
            date_of_birth: kycInfo.dateOfBirth,
            complete_address: kycInfo.address,
            city: kycInfo.city,
            state: kycInfo.state,
            pincode: kycInfo.pincode,
            verification_status: 'verified', // Auto-verify for now
            verified_at: new Date().toISOString()
          }

          // Submit to Supabase
          const { data, error } = await kycHelpers.submitKYC(kycData)

          if (error) {
            console.error('KYC submission error:', error)
            return { success: false, error: error.message || 'Failed to submit KYC' }
          }

          // Fetch updated profile to get unique_id
          const { data: updatedProfile, error: profileError } = await profileHelpers.getProfile(userId)
          
          if (profileError) {
            console.error('Profile fetch error after KYC:', profileError)
          }

          // Fetch updated KYC data
          const { data: updatedKycData, error: kycError } = await kycHelpers.getKYC(userId)
          
          if (kycError) {
            console.error('KYC fetch error:', kycError)
          }

          // Update local state with fresh data from database
          set({
            profile: updatedProfile || get().profile,
            kycData: updatedKycData || kycInfo,
            kycCompleted: true,
            kycStatus: 'verified',
          })

          return { success: true, message: 'KYC verified successfully!' }
        } catch (error) {
          console.error('KYC verification error:', error)
          return { success: false, error: 'Failed to verify KYC' }
        }
      },

      updateKYCStatus: (status) => {
        set({ kycStatus: status })
        if (status === 'verified') {
          set({ kycCompleted: true })
        }
      },

      // Mock login for demo purposes
      mockLogin: (role) => {
        const mockUsers = {
          producer: {
            id: '1',
            name: 'Rajesh Kumar',
            email: 'rajesh@farm.com',
            role: 'producer',
            farmId: 'farm_001',
            phone: '+91-9876543210',
            location: 'Maharashtra, India'
          },
          veterinarian: {
            id: '2',
            name: 'Dr. Priya Sharma',
            email: 'priya@vet.com',
            role: 'veterinarian',
            license: 'VET12345',
            phone: '+91-9876543211',
            specialization: 'Cattle'
          },
          lab: {
            id: '3',
            name: 'Central Lab Mumbai',
            email: 'lab@central.com',
            role: 'lab',
            labId: 'LAB_001',
            accreditation: 'NABL-2023',
            phone: '+91-9876543212'
          },
          collector: {
            id: '4',
            name: 'Suresh Patil',
            email: 'suresh@collector.com',
            role: 'collector',
            collectorId: 'COL_001',
            region: 'Pune District',
            phone: '+91-9876543213'
          },
          regulator: {
            id: '5',
            name: 'Amit Singh',
            email: 'amit@ministry.gov.in',
            role: 'regulator',
            department: 'Ministry of Fisheries',
            region: 'Western India',
            phone: '+91-9876543214'
          },
          retailer: {
            id: '6',
            name: 'Ramesh Medical Store',
            email: 'ramesh@pharmacy.com',
            role: 'retailer',
            storeId: 'RET_001',
            licenseNumber: 'DL-20B-12345',
            phone: '+91-9876543215',
            location: 'Delhi, India'
          }
        }

        const user = mockUsers[role]
        if (user) {
          set({
            user,
            token: `mock_token_${role}`,
            isAuthenticated: true,
            // For demo: set KYC as not completed initially
            kycCompleted: false,
            kycStatus: 'pending',
            kycData: null,
          })
        }
      },
    }),
    {
      name: 'vasudha-auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        kycCompleted: state.kycCompleted,
        kycData: state.kycData,
        kycStatus: state.kycStatus,
      }),
    }
  )
)

export { useAuthStore }
