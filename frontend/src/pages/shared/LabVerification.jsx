import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BeakerIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const LabVerification = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('pending')

  const [formData, setFormData] = useState({
    // Facility Details
    lab_name: '',
    registered_address: '',
    contact_person_name: '',
    designation: '',
    mobile: '',
    email: '',
    
    // Accreditation & Licensing
    nabl_certificate_number: '',
    nabl_expiry_date: '',
    nabl_scope_document: null,
    fssai_license_number: '',
    fssai_license_document: null,
    gstin_number: '',
    
    // Equipment & Capabilities
    test_capabilities: {
      antibiotic_residue: false,
      microbial_quality: false,
      aflatoxin: false
    },
    daily_testing_capacity: '',
    
    // Entity Type
    entity_type: 'private' // private or government
  })

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

      if (data) {
        setFormData(prev => ({
          ...prev,
          contact_person_name: data.name || '',
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
        .from('lab_verifications')
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
    const filePath = `lab_docs/${fileName}`

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
      if (!formData.nabl_certificate_number || !formData.fssai_license_number) {
        toast.error('Please fill in all required accreditation details')
        return
      }

      const { error } = await supabase
        .from('lab_verifications')
        .upsert({
          user_id: user.id,
          lab_name: formData.lab_name,
          registered_address: formData.registered_address,
          contact_person_name: formData.contact_person_name,
          designation: formData.designation,
          mobile: formData.mobile,
          email: formData.email,
          nabl_certificate_number: formData.nabl_certificate_number,
          nabl_expiry_date: formData.nabl_expiry_date,
          nabl_scope_document_url: formData.nabl_scope_document,
          fssai_license_number: formData.fssai_license_number,
          fssai_license_document_url: formData.fssai_license_document,
          gstin_number: formData.gstin_number,
          test_capabilities: formData.test_capabilities,
          daily_testing_capacity: parseInt(formData.daily_testing_capacity) || 0,
          entity_type: formData.entity_type,
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
            .from('lab_verifications')
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
          <div className="flex items-center gap-2 px-4 py-2 text-green-800 bg-green-100 rounded-full">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-semibold">Verified</span>
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-yellow-800 bg-yellow-100 rounded-full">
            <ClockIcon className="w-5 h-5" />
            <span className="font-semibold">Pending Review</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-gray-800 bg-gray-100 rounded-full">
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
          <h1 className="text-2xl font-bold text-gray-900">Laboratory Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Verify your facility accreditation</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge()}
          <BeakerIcon className="w-10 h-10 text-blue-600" />
        </div>
      </motion.div>

      {verificationStatus === 'pending' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 border-2 border-yellow-300 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl"
        >
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="p-4 bg-yellow-100 rounded-full">
              <ClockIcon className="w-16 h-16 text-yellow-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verification Under Review</h2>
            <p className="max-w-2xl text-lg text-gray-700">
              Your laboratory verification is currently being processed. Our automated system is reviewing your accreditation.
            </p>
            <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Verification will be completed within 15 minutes</span>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              You will be notified once your verification is approved. Please refresh the page after 15 minutes.
            </p>
          </div>
        </motion.div>
      )}

      {verificationStatus === 'verified' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 border-2 border-green-300 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl"
        >
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircleIcon className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">✅ Verification Complete!</h2>
            <p className="max-w-2xl text-lg text-gray-700">
              Congratulations! Your laboratory accreditation has been verified successfully.
            </p>
            <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
              <BeakerIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">You can now access all laboratory features</span>
            </div>
          </div>
        </motion.div>
      )}

      {verificationStatus !== 'pending' && verificationStatus !== 'verified' && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entity Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Entity Type</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="government"
                checked={formData.entity_type === 'government'}
                onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium">Government Laboratory</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="private"
                checked={formData.entity_type === 'private'}
                onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium">Private Laboratory</span>
            </label>
          </div>
        </motion.div>

        {/* Facility Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            Facility Details
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Lab Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lab_name}
                onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Registered Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registered_address}
                onChange={(e) => setFormData({ ...formData, registered_address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Contact Person Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contact_person_name}
                onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., Lab Manager/Director"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
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
              <label className="block mb-1 text-sm font-medium text-gray-700">
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
        </motion.div>

        {/* Accreditation & Licensing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            Accreditation & Licensing (Trust Factors)
          </h3>
          
          {/* NABL Accreditation */}
          <div className="mb-6 space-y-4">
            <h4 className="font-medium text-gray-900">NABL Accreditation</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  NABL Certificate Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nabl_certificate_number}
                  onChange={(e) => setFormData({ ...formData, nabl_certificate_number: e.target.value })}
                  placeholder="e.g., TC-1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Date of Expiry <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.nabl_expiry_date}
                  onChange={(e) => setFormData({ ...formData, nabl_expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                NABL Scope of Accreditation <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, 'nabl_scope_document')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                {formData.nabl_scope_document && (
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Document proving capability to test Milk/Meat</p>
            </div>
          </div>

          {/* FSSAI License */}
          <div className="mb-6 space-y-4">
            <h4 className="font-medium text-gray-900">FSSAI License</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  FSSAI License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fssai_license_number}
                  onChange={(e) => setFormData({ ...formData, fssai_license_number: e.target.value })}
                  placeholder="14 digits"
                  maxLength={14}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
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

          {/* GST Details */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              GSTIN Number
            </label>
            <input
              type="text"
              value={formData.gstin_number}
              onChange={(e) => setFormData({ ...formData, gstin_number: e.target.value })}
              placeholder="Verifies legal business status"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </motion.div>

        {/* Equipment & Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Equipment & Capabilities</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Which tests can you perform? <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.test_capabilities.antibiotic_residue}
                    onChange={(e) => setFormData({
                      ...formData,
                      test_capabilities: {
                        ...formData.test_capabilities,
                        antibiotic_residue: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Antibiotic Residue (MRL)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.test_capabilities.microbial_quality}
                    onChange={(e) => setFormData({
                      ...formData,
                      test_capabilities: {
                        ...formData.test_capabilities,
                        microbial_quality: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Microbial Quality</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.test_capabilities.aflatoxin}
                    onChange={(e) => setFormData({
                      ...formData,
                      test_capabilities: {
                        ...formData.test_capabilities,
                        aflatoxin: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">Aflatoxin</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Daily Testing Capacity (Samples/Day)
              </label>
              <input
                type="number"
                value={formData.daily_testing_capacity}
                onChange={(e) => setFormData({ ...formData, daily_testing_capacity: e.target.value })}
                placeholder="e.g., 50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || verificationStatus === 'verified'}
            className="px-8 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
          <button
            type="button"
            className="px-8 py-3 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Save as Draft
          </button>
        </div>
      </form>
      )}
    </div>
  )
}

export default LabVerification
