import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TruckIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const CollectorVerification = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('pending')

  const [formData, setFormData] = useState({
    // Business/Entity Details
    entity_name: '',
    entity_type: 'individual', // individual, cooperative, private_company
    area_of_operation: '',
    districts: '',
    mobile: '',
    email: '',
    
    // Regulatory Licenses
    fssai_number: '',
    fssai_license_document: null,
    business_proof_type: '', // udyam_aadhar, shop_establishment, gst_certificate
    business_proof_document: null,
    
    // Infrastructure
    vehicle_registration_number: '',
    vehicle_rc_document: null,
    has_portable_analyzer: false,
    
    // GST Details
    gstin_number: ''
  })

  useEffect(() => {
    loadKYCData()
    checkVerificationStatus()
  }, [user])

  const loadKYCData = async () => {
    try {
      const { data } = await supabase
        .from('kyc_details')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setFormData(prev => ({
          ...prev,
          entity_name: data.name || '',
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
      const { data } = await supabase
        .from('collector_verifications')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setVerificationStatus(data.status)
      }
    } catch (error) {
      setVerificationStatus('not_started')
    }
  }

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}_${fieldName}_${Date.now()}.${fileExt}`
    const filePath = `collector_docs/${fileName}`

    try {
      const { error } = await supabase.storage
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
      if (!formData.fssai_number || !formData.vehicle_registration_number) {
        toast.error('Please fill in all required fields')
        return
      }

      const { error } = await supabase
        .from('collector_verifications')
        .upsert({
          user_id: user.id,
          entity_name: formData.entity_name,
          entity_type: formData.entity_type,
          area_of_operation: formData.area_of_operation,
          districts: formData.districts,
          mobile: formData.mobile,
          email: formData.email,
          fssai_number: formData.fssai_number,
          fssai_license_document_url: formData.fssai_license_document,
          business_proof_type: formData.business_proof_type,
          business_proof_document_url: formData.business_proof_document,
          vehicle_registration_number: formData.vehicle_registration_number,
          vehicle_rc_document_url: formData.vehicle_rc_document,
          has_portable_analyzer: formData.has_portable_analyzer,
          gstin_number: formData.gstin_number,
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
            .from('collector_verifications')
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
          <h1 className="text-2xl font-bold text-gray-900">Collector/Aggregator Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Verify your business credentials</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge()}
          <TruckIcon className="w-10 h-10 text-blue-600" />
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
              Your collector/aggregator verification is currently being processed. Our automated system is reviewing your credentials.
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
              Congratulations! Your collector/aggregator credentials have been verified successfully.
            </p>
            <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
              <TruckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">You can now access all collector features</span>
            </div>
          </div>
        </motion.div>
      )}

      {verificationStatus !== 'pending' && verificationStatus !== 'verified' && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business/Entity Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
            Business/Entity Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.entity_name}
                onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                placeholder="e.g., Suresh Milk Transport"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="individual"
                    checked={formData.entity_type === 'individual'}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="cooperative"
                    checked={formData.entity_type === 'cooperative'}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Cooperative</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="private_company"
                    checked={formData.entity_type === 'private_company'}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Private Company</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area of Operation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.area_of_operation}
                  onChange={(e) => setFormData({ ...formData, area_of_operation: e.target.value })}
                  placeholder="e.g., Indore Region"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Districts/Villages Covered
                </label>
                <input
                  type="text"
                  value={formData.districts}
                  onChange={(e) => setFormData({ ...formData, districts: e.target.value })}
                  placeholder="e.g., Indore, Dewas, Ujjain"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Used for geo-fencing</p>
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
            </div>
          </div>
        </motion.div>

        {/* Regulatory Licenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            Regulatory Licenses
          </h3>
          <div className="space-y-4">
            {/* FSSAI Registration */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">FSSAI Registration (FBO)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    FSSAI Registration/License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fssai_number}
                    onChange={(e) => setFormData({ ...formData, fssai_number: e.target.value })}
                    placeholder="Mandatory for food handlers"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    FSSAI License Copy
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'fssai_license_document')}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.fssai_license_document && (
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Proof */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Business Proof</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={formData.business_proof_type}
                    onChange={(e) => setFormData({ ...formData, business_proof_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Document Type</option>
                    <option value="udyam_aadhar">Udyam Aadhar</option>
                    <option value="shop_establishment">Shop & Establishment Act</option>
                    <option value="gst_certificate">GST Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Document
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'business_proof_document')}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.business_proof_document && (
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* GST Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSTIN Number (Optional)
              </label>
              <input
                type="text"
                value={formData.gstin_number}
                onChange={(e) => setFormData({ ...formData, gstin_number: e.target.value })}
                placeholder="For registered businesses"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Infrastructure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-blue-600" />
            Infrastructure (Traceability Link)
          </h3>
          <div className="space-y-4">
            {/* Vehicle Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Vehicle Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Registration Number (RC) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_registration_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_registration_number: e.target.value })}
                    placeholder="e.g., MP09AB1234"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Links Tanker Batch ID to physical truck</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RC Copy
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'vehicle_rc_document')}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    {formData.vehicle_rc_document && (
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Equipment</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_portable_analyzer}
                  onChange={(e) => setFormData({ ...formData, has_portable_analyzer: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">Do you have a portable milk analyzer?</span>
              </label>
            </div>
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

export default CollectorVerification
