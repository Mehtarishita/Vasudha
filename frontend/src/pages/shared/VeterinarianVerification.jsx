import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  DocumentTextIcon,
  AcademicCapIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const VeterinarianVerification = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('pending')
  const [kycData, setKycData] = useState(null)

  const [formData, setFormData] = useState({
    // Personal Details (auto-filled from KYC)
    full_name: '',
    mobile: '',
    email: '',
    clinic_address: '',
    
    // Professional Licensing
    state_council: '',
    registration_number: '',
    registration_certificate: null,
    
    // Educational Qualification
    degree: '',
    year_of_passing: '',
    university: '',
    degree_certificate: null,
    
    // Identity Proof
    kyc_document: null,
    
    // Declaration
    declaration_accepted: false
  })

  const stateCouncils = [
    'Veterinary Council of India (VCI)',
    'Andhra Pradesh Veterinary Council',
    'Bihar Veterinary Council',
    'Chhattisgarh Veterinary Council',
    'Gujarat Veterinary Council',
    'Haryana Veterinary Council',
    'Karnataka Veterinary Council',
    'Kerala Veterinary Council',
    'Madhya Pradesh Veterinary Council',
    'Maharashtra Veterinary Council',
    'Odisha Veterinary Council',
    'Punjab Veterinary Council',
    'Rajasthan Veterinary Council',
    'Tamil Nadu Veterinary Council',
    'Telangana Veterinary Council',
    'Uttar Pradesh Veterinary Council',
    'West Bengal Veterinary Council'
  ]

  useEffect(() => {
    loadKYCData()
    checkVerificationStatus()
  }, [user])

  const loadKYCData = async () => {
    try {
      const { data, error } = await supabase
        .from('kyc_details')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setKycData(data)
        setFormData(prev => ({
          ...prev,
          full_name: data.name || '',
          mobile: data.phone_number || '',
          email: user.email || ''
        }))
      }
    } catch (error) {
      console.error('Error loading KYC data:', error)
    }
  }

  const checkVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('veterinarian_verifications')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setVerificationStatus(data.status)
      }
    } catch (error) {
      // No verification record exists yet
      setVerificationStatus('not_started')
    }
  }

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}_${fieldName}_${Date.now()}.${fileExt}`
    const filePath = `veterinarian_docs/${fileName}`

    try {
      const { data, error } = await supabase.storage
        .from('verification_documents')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('verification_documents')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, [fieldName]: publicUrl }))
      toast.success('File uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.registration_number || !formData.state_council) {
        toast.error('Please fill in all required professional licensing details')
        return
      }

      if (!formData.declaration_accepted) {
        toast.error('Please accept the declaration')
        return
      }

      const { error } = await supabase
        .from('veterinarian_verifications')
        .upsert({
          user_id: user.id,
          full_name: formData.full_name,
          mobile: formData.mobile,
          email: formData.email,
          clinic_address: formData.clinic_address,
          state_council: formData.state_council,
          registration_number: formData.registration_number,
          registration_certificate_url: formData.registration_certificate,
          degree: formData.degree,
          year_of_passing: formData.year_of_passing,
          university: formData.university,
          degree_certificate_url: formData.degree_certificate,
          kyc_document_url: formData.kyc_document,
          declaration_accepted: formData.declaration_accepted,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Verification submitted successfully! Under review for 15 minutes.')
      setVerificationStatus('pending')

      // Auto-verify after 15 minutes
      setTimeout(async () => {
        try {
          const { error: updateError } = await supabase
            .from('veterinarian_verifications')
            .update({ status: 'verified', verified_at: new Date().toISOString() })
            .eq('user_id', user.id)
          
          if (!updateError) {
            setVerificationStatus('verified')
            toast.success('🎉 Verification Complete! You are now verified.')
          }
        } catch (err) {
          console.error('Auto-verification error:', err)
        }
      }, 15 * 60 * 1000) // 15 minutes
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('Failed to submit verification')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-semibold">Verified</span>
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full">
            <ClockIcon className="w-5 h-5" />
            <span className="font-semibold">Pending Review</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-full">
            <ClockIcon className="w-5 h-5" />
            <span className="font-semibold">Not Started</span>
          </div>
        )
    }
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veterinarian Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Verify your professional credentials</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge()}
          <ShieldCheckIcon className="w-10 h-10 text-blue-600" />
        </div>
      </motion.div>

      {verificationStatus === 'pending' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl shadow-lg"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-yellow-100 rounded-full">
              <ClockIcon className="w-16 h-16 text-yellow-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verification Under Review</h2>
            <p className="text-lg text-gray-700 max-w-2xl">
              Your veterinarian verification is currently being processed. Our automated system is reviewing your credentials.
            </p>
            <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Verification will be completed within 15 minutes</span>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              You will be notified once your verification is approved. Please refresh the page after 15 minutes.
            </p>
          </div>
        </motion.div>
      )}

      {verificationStatus === 'verified' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircleIcon className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">✅ Verification Complete!</h2>
            <p className="text-lg text-gray-700 max-w-2xl">
              Congratulations! Your veterinarian credentials have been verified successfully.
            </p>
            <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
              <ShieldCheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">You can now access all veterinarian features</span>
            </div>
          </div>
        </motion.div>
      )}

      {verificationStatus !== 'pending' && verificationStatus !== 'verified' && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            Personal Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Must match Medical Council record</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Location/Clinic Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clinic_address}
                onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </motion.div>

        {/* Professional Licensing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            Professional Licensing (Critical Section)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Veterinary Council Registration <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.state_council}
                onChange={(e) => setFormData({ ...formData, state_council: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select State Veterinary Council</option>
                {stateCouncils.map(council => (
                  <option key={council} value={council}>{council}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="e.g., MPVC/2015/1234"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Certificate <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, 'registration_certificate')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                {formData.registration_certificate && (
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Upload scanned copy (PDF/JPG)</p>
            </div>
          </div>
        </motion.div>

        {/* Educational Qualification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AcademicCapIcon className="w-5 h-5 text-blue-600" />
            Educational Qualification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                placeholder="e.g., B.V.Sc & A.H"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Passing</label>
              <input
                type="number"
                value={formData.year_of_passing}
                onChange={(e) => setFormData({ ...formData, year_of_passing: e.target.value })}
                placeholder="e.g., 2015"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">University Name</label>
              <input
                type="text"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Degree Certificate (Optional)</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, 'degree_certificate')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.degree_certificate && (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Identity Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Identity Proof</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KYC Document (Aadhaar/PAN)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, 'kyc_document')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              {formData.kyc_document && (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Declaration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.declaration_accepted}
              onChange={(e) => setFormData({ ...formData, declaration_accepted: e.target.checked })}
              className="mt-1 w-5 h-5 text-blue-600"
              required
            />
            <label className="text-sm text-gray-700">
              <span className="font-semibold">Declaration:</span> I hereby declare that I will follow the National Action Plan on AMR and FSSAI guidelines for antibiotic prescription.
            </label>
          </div>
        </motion.div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || verificationStatus === 'verified'}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
          <button
            type="button"
            className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            Save as Draft
          </button>
        </div>
      </form>
      )}
    </div>
  )
}

export default VeterinarianVerification
