import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import statesData from '../../data/states-and-districts.json'
import { sendOTP as sendOTPService, verifyOTP as verifyOTPService } from '../../services/otpService'

const KYCVerification = () => {
  const { user, profile, kycStatus, kycData, mockVerifyKYC, isLoading } = useAuthStore()

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    idType: '',
    idNumber: '',
    fullName: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    documentFront: null,
    documentBack: null,
  })

  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [step, setStep] = useState(1) // 1: Form, 2: OTP Verification

  // Update form data when profile loads
  useEffect(() => {
    // Use profile if available, otherwise fall back to user metadata
    const userData = profile || user?.user_metadata

    if (userData) {
      setFormData(prev => ({
        ...prev,
        name: userData.name || user?.user_metadata?.name || '',
        phoneNumber: userData.mobile_number || user?.user_metadata?.mobile_number || user?.phone || '',
        address: userData.address || user?.user_metadata?.address || '',
        pincode: userData.pincode || user?.user_metadata?.pincode || ''
      }))
    }
  }, [profile, user])

  // Update districts when state changes
  useEffect(() => {
    if (formData.state) {
      const stateObj = statesData.states.find(s => s.state === formData.state)
      setDistricts(stateObj ? stateObj.districts : [])
    } else {
      setDistricts([])
    }
  }, [formData.state])

  const sendOTP = async () => {
    if (!formData.phoneNumber) {
      toast.error('Phone number is required')
      return
    }

    setVerifyingOtp(true)

    try {
      // Send real OTP via Fast2SMS
      const result = await sendOTPService(formData.phoneNumber)

      if (result.success) {
        toast.success(`OTP sent to ${formData.phoneNumber}!`)
        
        // Show test OTP in development (REMOVE in production)
        if (result.testOTP) {
          toast.success(`Test OTP: ${result.testOTP}`, { duration: 10000 })
        }
        
        setOtpSent(true)
        setStep(2)
      } else {
        toast.error(result.error || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      toast.error('Failed to send OTP. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter 6-digit OTP')
      return
    }

    setVerifyingOtp(true)

    try {
      // Verify OTP using the imported service function
      const result = await verifyOTPService(formData.phoneNumber, otp)

      if (result.success) {
        toast.success('OTP verified successfully!')
        
        // Submit KYC to Supabase
        const kycResult = await mockVerifyKYC(formData)

        if (kycResult.success) {
          toast.success('KYC Verified Successfully!')
          setStep(1)
          setOtp('')
          setOtpSent(false)
        } else {
          toast.error(kycResult.error || 'KYC submission failed')
        }
      } else {
        toast.error(result.error || 'Invalid OTP')
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      toast.error('Verification failed. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const [documentPreviews, setDocumentPreviews] = useState({
    front: null,
    back: null,
  })

  const [selectedState, setSelectedState] = useState('')
  const [districts, setDistricts] = useState([])

  const idTypes = [
    { value: 'aadhaar', label: 'Aadhaar Card', format: 'XXXX-XXXX-XXXX', length: 12 },
    { value: 'pan', label: 'PAN Card', format: 'XXXXX1234X', length: 10 },
    { value: 'driving_license', label: 'Driving License', format: 'XX-XXXXXXXXXX', length: 15 },
    { value: 'passport', label: 'Passport', format: 'X1234567', length: 8 },
    { value: 'voter_id', label: 'Voter ID Card', format: 'XXX1234567', length: 10 },
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target

    // If state is changed, reset city
    if (name === 'state') {
      setFormData(prev => ({
        ...prev,
        state: value,
        city: '' // Reset city when state changes
      }))
      setSelectedState(value)
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleFileChange = (e, side) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocumentPreviews(prev => ({
          ...prev,
          [side]: reader.result
        }))
      }
      reader.readAsDataURL(file)

      // Update form data
      setFormData(prev => ({
        ...prev,
        [`document${side.charAt(0).toUpperCase() + side.slice(1)}`]: file
      }))
    }
  }

  const validateForm = () => {
    if (!formData.idType) {
      toast.error('Please select an ID type')
      return false
    }

    if (!formData.idNumber) {
      toast.error('Please enter your ID number')
      return false
    }

    const selectedIdType = idTypes.find(id => id.value === formData.idType)
    if (formData.idNumber.replace(/[-\s]/g, '').length !== selectedIdType.length) {
      toast.error(`${selectedIdType.label} should be ${selectedIdType.length} characters`)
      return false
    }

    if (!formData.fullName || !formData.dateOfBirth || !formData.address ||
      !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill all required fields')
      return false
    }

    if (!formData.documentFront) {
      toast.error('Please upload front side of your ID document')
      return false
    }

    // For Aadhaar and some other IDs, back side is required
    if (['aadhaar', 'driving_license', 'voter_id'].includes(formData.idType) && !formData.documentBack) {
      toast.error('Please upload back side of your ID document')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Send OTP for verification
    await sendOTP()
  }

  const getStatusBadge = () => {
    switch (kycStatus) {
      case 'verified':
        return (
          <div className="flex items-center px-4 py-2 space-x-2 text-green-800 bg-green-100 rounded-lg">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">Verified</span>
          </div>
        )
      case 'submitted':
        return (
          <div className="flex items-center px-4 py-2 space-x-2 text-yellow-800 bg-yellow-100 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Under Review</span>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex items-center px-4 py-2 space-x-2 text-red-800 bg-red-100 rounded-lg">
            <XCircleIcon className="w-5 h-5" />
            <span className="font-medium">Rejected</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center px-4 py-2 space-x-2 text-gray-800 bg-gray-100 rounded-lg">
            <DocumentTextIcon className="w-5 h-5" />
            <span className="font-medium">Pending</span>
          </div>
        )
    }
  }

  if (kycStatus === 'verified') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            KYC Verified Successfully
          </h3>
          <p className="mb-6 text-gray-600">
            Your identity has been verified. You now have full access to all features.
          </p>

          <div className="p-4 text-left rounded-lg bg-gray-50">
            <h4 className="mb-3 font-medium text-gray-900">Verified Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID Type:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {kycData?.id_type ? kycData.id_type.replace('_', ' ') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID Number:</span>
                <span className="font-medium text-gray-900">
                  {kycData?.id_number ? kycData.id_number.slice(0, 4) + '••••••' : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Full Name:</span>
                <span className="font-medium text-gray-900">{kycData?.full_name || kycData?.name || profile?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date of Birth:</span>
                <span className="font-medium text-gray-900">
                  {kycData?.date_of_birth ? new Date(kycData.date_of_birth).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium text-gray-900">{kycData?.city && kycData?.state ? `${kycData.city}, ${kycData.state}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-white border border-gray-200 rounded-lg shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">KYC Verification</h2>
            <p className="text-gray-600">Complete your identity verification to access all features</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {kycStatus === 'rejected' && (
        <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start space-x-3">
            <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Verification Failed</h4>
              <p className="mt-1 text-sm text-red-700">
                Your KYC verification was rejected. Please review your information and resubmit.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-xs text-gray-500">This will be used for your profile</p>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+91XXXXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            required
            readOnly
          />
          <p className="mt-1 text-xs text-gray-500">Auto-filled from your profile</p>
        </div>

        {/* Email (Optional) */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Email Address <span className="text-xs text-gray-400">(Optional)</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your.email@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* ID Type Selection */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Government ID Type <span className="text-red-500">*</span>
          </label>
          <select
            name="idType"
            value={formData.idType}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select ID Type</option>
            {idTypes.map(idType => (
              <option key={idType.value} value={idType.value}>
                {idType.label}
              </option>
            ))}
          </select>
        </div>

        {/* ID Number */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            ID Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleInputChange}
            placeholder={formData.idType ? idTypes.find(id => id.value === formData.idType)?.format : 'Enter ID Number'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Full Name */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Full Name (as per ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter full name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Address */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter complete address"
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* State, City/District, Pincode */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              State <span className="text-red-500">*</span>
            </label>
            <select
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select State</option>
              {statesData.states.map((state) => (
                <option key={state.state} value={state.state}>
                  {state.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              District/City <span className="text-red-500">*</span>
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!formData.state}
            >
              <option value="">Select District</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
            {!formData.state && (
              <p className="mt-1 text-xs text-gray-500">Select state first</p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleInputChange}
              placeholder="Pincode"
              maxLength="6"
              pattern="[0-9]{6}"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Document Upload */}
        <div className="pt-6 border-t">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Upload ID Documents</h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Front Side */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Front Side <span className="text-red-500">*</span>
              </label>
              <div className="p-6 text-center transition-colors border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500">
                {documentPreviews.front ? (
                  <div className="space-y-3">
                    <img
                      src={documentPreviews.front}
                      alt="Front Preview"
                      className="mx-auto rounded max-h-40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentPreviews(prev => ({ ...prev, front: null }))
                        setFormData(prev => ({ ...prev, documentFront: null }))
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload</p>
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, 'front')}
                      accept="image/*"
                      className="hidden"
                      required
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Back Side */}
            {['aadhaar', 'driving_license', 'voter_id'].includes(formData.idType) && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Back Side <span className="text-red-500">*</span>
                </label>
                <div className="p-6 text-center transition-colors border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500">
                  {documentPreviews.back ? (
                    <div className="space-y-3">
                      <img
                        src={documentPreviews.back}
                        alt="Back Preview"
                        className="mx-auto rounded max-h-40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDocumentPreviews(prev => ({ ...prev, back: null }))
                          setFormData(prev => ({ ...prev, documentBack: null }))
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to upload</p>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'back')}
                        accept="image/*"
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Important Note */}
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-start space-x-3">
            <IdentificationIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Important:</p>
              <ul className="space-y-1 text-blue-700 list-disc list-inside">
                <li>Ensure all information matches your government ID</li>
                <li>Upload clear, readable images of your documents</li>
                <li>Documents should not be expired</li>
                <li>Verification typically takes 24-48 hours</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button / OTP Section */}
        {step === 1 ? (
          <div className="flex justify-end space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-6 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Continue to Verification</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="pt-6 border-t">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Verify Your Mobile Number</h3>
            <p className="mb-4 text-sm text-gray-600">
              We've sent a 6-digit OTP to <strong>{formData.phoneNumber}</strong>
            </p>

            <div className="p-4 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-sm text-yellow-800">
                <strong>Test Mode:</strong> Use OTP <strong>000000</strong> for verification
              </p>
            </div>

            <div className="max-w-xs">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Enter OTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                className="w-full px-4 py-2 text-2xl tracking-widest text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end mt-6 space-x-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setOtp('')
                  setOtpSent(false)
                }}
                className="px-6 py-2 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={verifyOTP}
                disabled={verifyingOtp || otp.length !== 6}
                className="flex items-center px-6 py-2 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {verifyingOtp ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Verify & Submit KYC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </motion.div>
  )
}

export default KYCVerification
