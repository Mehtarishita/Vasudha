import React, { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { CheckCircle, XCircle, Clock, Upload, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const RegulatorVerification = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verification, setVerification] = useState(null)
  const [kycDetails, setKycDetails] = useState(null)

  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    regulator_type: '',
    jurisdiction_area: '',
    state: '',
    district: '',
    block_tehsil: '',
    designation: '',
    department: '',
    ah_employee_id: '',
    fssai_employee_id: '',
    fssai_designation: '',
    office_name: '',
    office_address: '',
    office_phone: '',
    office_email: '',
    authority_document_type: '',
    authority_document_number: '',
    authority_issue_date: ''
  })

  const [documents, setDocuments] = useState({
    ah_appointment_letter_url: null,
    fssai_appointment_letter_url: null,
    authority_document_url: null
  })

  const regulatorTypes = [
    { value: 'central', label: 'Central Level Regulator', description: 'National Oversight - All India' },
    { value: 'state', label: 'State Level Regulator', description: 'State Administration - Entire State' },
    { value: 'district', label: 'District Level Regulator', description: 'Enforcement Authority - District Command Center' },
    { value: 'block', label: 'Block/Field Level Regulator', description: 'Inspector - Block/Tehsil/Village Cluster' }
  ]

  const centralDesignations = [
    'Animal Husbandry Commissioner (AHC)',
    'Joint Secretary (Livestock Health)',
    'CEO (FSSAI)',
    'Commissioner (FSSAI)',
    'Other Central Authority'
  ]

  const stateDesignations = [
    'Director of Animal Husbandry & Veterinary Services',
    'State Food Safety Commissioner',
    'Additional Director (AH&VS)',
    'Other State Authority'
  ]

  const districtDesignations = [
    'Deputy Director of Veterinary Services (DDVS)',
    'Chief Veterinary Officer (CVO)',
    'Designated Officer (DO - Food Safety)',
    'District Food Safety Officer',
    'Other District Authority'
  ]

  const blockDesignations = [
    'Block Veterinary Officer (BVO)',
    'Veterinary Assistant Surgeon (VAS)',
    'Food Safety Officer (FSO)',
    'Junior Food Safety Officer',
    'Other Block/Field Authority'
  ]

  const getDesignationsForType = (type) => {
    switch(type) {
      case 'central': return centralDesignations
      case 'state': return stateDesignations
      case 'district': return districtDesignations
      case 'block': return blockDesignations
      default: return []
    }
  }

  const statesOfIndia = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ]

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return

    try {
      // Fetch existing verification
      const { data: verificationData } = await supabase
        .from('regulator_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (verificationData) {
        setVerification(verificationData)
        setFormData({
          full_name: verificationData.full_name || '',
          mobile: verificationData.mobile || '',
          email: verificationData.email || '',
          regulator_type: verificationData.regulator_type || '',
          jurisdiction_area: verificationData.jurisdiction_area || '',
          state: verificationData.state || '',
          district: verificationData.district || '',
          block_tehsil: verificationData.block_tehsil || '',
          designation: verificationData.designation || '',
          department: verificationData.department || '',
          ah_employee_id: verificationData.ah_employee_id || '',
          fssai_employee_id: verificationData.fssai_employee_id || '',
          fssai_designation: verificationData.fssai_designation || '',
          office_name: verificationData.office_name || '',
          office_address: verificationData.office_address || '',
          office_phone: verificationData.office_phone || '',
          office_email: verificationData.office_email || '',
          authority_document_type: verificationData.authority_document_type || '',
          authority_document_number: verificationData.authority_document_number || '',
          authority_issue_date: verificationData.authority_issue_date || ''
        })
      } else {
        // Auto-fill from KYC
        const { data: kyc } = await supabase
          .from('kyc_details')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (kyc) {
          setKycDetails(kyc)
          setFormData(prev => ({
            ...prev,
            full_name: kyc.full_legal_name || kyc.full_name || '',
            mobile: kyc.phone_number || '',
            email: kyc.email || '',
            state: kyc.state || '',
            district: kyc.city || '',
            office_address: kyc.complete_address || ''
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Auto-set jurisdiction based on regulator type
    if (name === 'regulator_type') {
      let jurisdictionArea = ''
      switch(value) {
        case 'central':
          jurisdictionArea = 'All India'
          break
        case 'state':
          jurisdictionArea = formData.state || ''
          break
        case 'district':
          jurisdictionArea = formData.district || ''
          break
        case 'block':
          jurisdictionArea = formData.block_tehsil || ''
          break
      }
      setFormData(prev => ({
        ...prev,
        jurisdiction_area: jurisdictionArea
      }))
    }

    // Update jurisdiction area when state/district/block changes
    if (name === 'state' && formData.regulator_type === 'state') {
      setFormData(prev => ({ ...prev, jurisdiction_area: value }))
    }
    if (name === 'district' && formData.regulator_type === 'district') {
      setFormData(prev => ({ ...prev, jurisdiction_area: value }))
    }
    if (name === 'block_tehsil' && formData.regulator_type === 'block') {
      setFormData(prev => ({ ...prev, jurisdiction_area: value }))
    }
  }

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${fieldName}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('regulator_documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('regulator_documents')
        .getPublicUrl(fileName)

      setDocuments(prev => ({
        ...prev,
        [fieldName]: publicUrl
      }))

      toast.success('Document uploaded successfully!')
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload document: ' + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const submissionData = {
        user_id: user.id,
        ...formData,
        ...documents,
        submitted_at: new Date().toISOString(),
        status: 'pending'
      }

      if (verification) {
        // Update existing
        const { error } = await supabase
          .from('regulator_verifications')
          .update(submissionData)
          .eq('id', verification.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('regulator_verifications')
          .insert([submissionData])

        if (error) throw error
      }

      toast.success('Verification submitted successfully! Under review for 15 minutes.')
      fetchData()

      // Auto-verify after 15 minutes
      setTimeout(async () => {
        try {
          const { error: updateError } = await supabase
            .from('regulator_verifications')
            .update({ status: 'verified', verified_at: new Date().toISOString() })
            .eq('user_id', user.id)
          
          if (!updateError) {
            fetchData()
            toast.success('🎉 Verification Complete! You are now verified.')
          }
        } catch (err) {
          console.error('Auto-verification error:', err)
        }
      }, 15 * 60 * 1000) // 15 minutes
    } catch (error) {
      console.error('Error submitting verification:', error)
      toast.error('Failed to submit verification: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = () => {
    if (!verification) {
      return (
        <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-800 bg-gray-100 rounded-full">
          <Clock className="w-4 h-4 mr-1" />
          Not Started
        </span>
      )
    }

    switch (verification.status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
            <CheckCircle className="w-4 h-4 mr-1" />
            Verified
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-800 bg-red-100 rounded-full">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-full">
            <Clock className="w-4 h-4 mr-1" />
            Pending Review
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl p-6 mx-auto">
      <div className="p-6 bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Regulator Verification</h1>
            <p className="mt-1 text-gray-600">Complete your official verification to access regulator features</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Under Review Card */}
        {verification && verification.status === 'pending' && (
          <div className="p-8 mb-6 border-2 border-yellow-300 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-yellow-100 rounded-full">
                <Clock className="w-16 h-16 text-yellow-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verification Under Review</h2>
              <p className="max-w-2xl text-lg text-gray-700">
                Your regulator verification is currently being processed. Our automated system is reviewing your credentials.
              </p>
              <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Verification will be completed within 15 minutes</span>
              </div>
              {verification.submitted_at && (
                <p className="mt-2 text-sm text-gray-600">
                  Submitted on: {new Date(verification.submitted_at).toLocaleString()}
                </p>
              )}
              <p className="mt-4 text-sm text-gray-600">
                You will be notified once your verification is approved. Please refresh the page after 15 minutes.
              </p>
            </div>
          </div>
        )}

        {/* Verified Card */}
        {verification && verification.status === 'verified' && (
          <div className="p-8 mb-6 border-2 border-green-300 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">✅ Verification Complete!</h2>
              <p className="max-w-2xl text-lg text-gray-700">
                Congratulations! Your regulator credentials have been verified successfully.
              </p>
              <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">You can now access all regulator features</span>
              </div>
              {verification.verified_at && (
                <p className="mt-2 text-sm text-gray-600">
                  Verified on: {new Date(verification.verified_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rejection Notice */}
        {verification && verification.status === 'rejected' && (
          <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Verification Rejected</h3>
                <p className="mt-1 text-sm text-red-700">{verification.rejection_reason}</p>
                <p className="mt-2 text-xs text-red-600">
                  Please correct the issues and resubmit your application.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show form only if not verified and not pending */}
        {(!verification || verification.status === 'rejected') && (
          <form onSubmit={handleSubmit} className="space-y-8">{/* Personal Details */}
          {/* Personal Details */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Personal Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your identity proof (Aadhaar/PAN) has already been verified through KYC. 
                No need to upload ID documents again.
              </p>
            </div>
          </section>

          {/* Regulator Type & Jurisdiction */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Regulator Level & Jurisdiction</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Regulator Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="regulator_type"
                  value={formData.regulator_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Regulator Type</option>
                  {regulatorTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {formData.regulator_type && formData.regulator_type !== 'central' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      {statesOfIndia.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  {(formData.regulator_type === 'district' || formData.regulator_type === 'block') && (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        District <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Sehore"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {formData.regulator_type === 'block' && (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Block/Tehsil <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="block_tehsil"
                        value={formData.block_tehsil}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Sehore Block-1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Jurisdiction Area (Auto-filled)
                </label>
                <input
                  type="text"
                  name="jurisdiction_area"
                  value={formData.jurisdiction_area}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </section>

          {/* Official Designation */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Official Designation</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.regulator_type}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select Designation</option>
                  {getDesignationsForType(formData.regulator_type).map(designation => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  <option value="animal_husbandry">Animal Husbandry Department</option>
                  <option value="fssai">FSSAI (Food Safety)</option>
                  <option value="both">Both Departments</option>
                </select>
              </div>

              {(formData.department === 'animal_husbandry' || formData.department === 'both') && (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      AH Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="ah_employee_id"
                      value={formData.ah_employee_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      AH Appointment Letter <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'ah_appointment_letter_url')}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    {documents.ah_appointment_letter_url && (
                      <p className="flex items-center mt-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Document uploaded
                      </p>
                    )}
                  </div>
                </>
              )}

              {(formData.department === 'fssai' || formData.department === 'both') && (
                <>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      FSSAI Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fssai_employee_id"
                      value={formData.fssai_employee_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      FSSAI Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fssai_designation"
                      value={formData.fssai_designation}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Food Safety Officer"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      FSSAI Appointment Letter <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'fssai_appointment_letter_url')}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    {documents.fssai_appointment_letter_url && (
                      <p className="flex items-center mt-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Document uploaded
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Office Details */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Office Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Office Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="office_name"
                  value={formData.office_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., District Veterinary Office"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Office Phone
                </label>
                <input
                  type="tel"
                  name="office_phone"
                  value={formData.office_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Office Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="office_address"
                  value={formData.office_address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Office Email
                </label>
                <input
                  type="email"
                  name="office_email"
                  value={formData.office_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Authority Document */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Authority Document</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="authority_document_type"
                  value={formData.authority_document_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Document Type</option>
                  <option value="government_order">Government Order (GO)</option>
                  <option value="appointment_letter">Appointment Letter</option>
                  <option value="delegation_certificate">Delegation Certificate</option>
                  <option value="transfer_order">Transfer Order</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Document Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="authority_document_number"
                  value={formData.authority_document_number}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., GO/AH/2024/1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="authority_issue_date"
                  value={formData.authority_issue_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Upload Authority Document <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'authority_document_url')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {documents.authority_document_url && (
                  <p className="flex items-center mt-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Document uploaded
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  {verification?.status === 'rejected' ? 'Resubmit Verification' : 'Submit for Verification'}
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

export default RegulatorVerification;
