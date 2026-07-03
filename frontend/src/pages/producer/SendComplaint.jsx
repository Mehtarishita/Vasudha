import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MegaphoneIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  InboxIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const SendComplaint = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [myComplaints, setMyComplaints] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])

  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
    severity: 'medium',
    location: '',
    incidentDate: '',
    incidentTime: '',
    contactPreference: 'email',
    isAnonymous: false
  })

  const complaintCategories = [
    {
      id: 'drug_quality',
      name: 'Drug Quality Issues',
      icon: ShieldExclamationIcon,
      description: 'Counterfeit or substandard veterinary drugs',
      color: 'red'
    },
    {
      id: 'illegal_sales',
      name: 'Illegal Drug Sales',
      icon: ExclamationTriangleIcon,
      description: 'Unauthorized sale of antimicrobials',
      color: 'orange'
    },
    {
      id: 'prescription_violation',
      name: 'Prescription Violations',
      icon: DocumentTextIcon,
      description: 'Drugs sold without proper prescription',
      color: 'yellow'
    },
    {
      id: 'malpractice',
      name: 'Veterinary Malpractice',
      icon: ShieldExclamationIcon,
      description: 'Improper treatment or negligence',
      color: 'purple'
    },
    {
      id: 'residue_violation',
      name: 'Residue Violations',
      icon: ExclamationTriangleIcon,
      description: 'Products with excessive drug residues',
      color: 'pink'
    },
    {
      id: 'other',
      name: 'Other Concerns',
      icon: MegaphoneIcon,
      description: 'Other AMU/AMR related issues',
      color: 'blue'
    }
  ]

  const severityLevels = [
    { value: 'low', label: 'Low Priority', color: 'green', description: 'General concern, no immediate risk' },
    { value: 'medium', label: 'Medium Priority', color: 'yellow', description: 'Requires attention soon' },
    { value: 'high', label: 'High Priority', color: 'orange', description: 'Urgent issue, needs quick action' },
    { value: 'critical', label: 'Critical', color: 'red', description: 'Emergency, immediate action required' }
  ]

  useEffect(() => {
    fetchMyComplaints()
  }, [user])

  const fetchMyComplaints = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyComplaints(data || [])
    } catch (error) {
      console.error('Error fetching complaints:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + selectedImages.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }
    const imageUrls = files.map(file => ({
      url: URL.createObjectURL(file),
      file: file
    }))
    setSelectedImages(prev => [...prev, ...imageUrls])
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmitComplaint = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      toast.error('Please fill all required fields')
      return
    }

    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    setLoading(true)

    try {
      // Get user profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, mobile_number, district, state')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Prepare complaint data
      const complaintData = {
        submitted_by: user.id,
        submitter_name: formData.isAnonymous ? 'Anonymous' : profileData.name,
        submitter_phone: formData.isAnonymous ? null : profileData.mobile_number,
        submitter_district: profileData.district,
        submitter_state: profileData.state,
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        severity: formData.severity,
        location: formData.location || profileData.district,
        incident_date: formData.incidentDate || null,
        incident_time: formData.incidentTime || null,
        contact_preference: formData.contactPreference,
        is_anonymous: formData.isAnonymous,
        status: 'submitted',
        images: selectedImages.length > 0 ? selectedImages.map(img => img.url) : null
      }

      const { data, error } = await supabase
        .from('complaints')
        .insert([complaintData])
        .select()
        .single()

      if (error) throw error

      toast.success('Complaint submitted successfully!')
      
      // Reset form
      setFormData({
        category: '',
        subject: '',
        description: '',
        severity: 'medium',
        location: '',
        incidentDate: '',
        incidentTime: '',
        contactPreference: 'email',
        isAnonymous: false
      })
      setSelectedImages([])
      setShowForm(false)
      
      // Refresh complaints list
      fetchMyComplaints()
    } catch (error) {
      console.error('Error submitting complaint:', error)
      toast.error('Failed to submit complaint: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'submitted': { color: 'bg-blue-100 text-blue-700', label: 'Submitted' },
      'under_review': { color: 'bg-yellow-100 text-yellow-700', label: 'Under Review' },
      'investigating': { color: 'bg-orange-100 text-orange-700', label: 'Investigating' },
      'action_taken': { color: 'bg-purple-100 text-purple-700', label: 'Action Taken' },
      'resolved': { color: 'bg-green-100 text-green-700', label: 'Resolved' },
      'closed': { color: 'bg-gray-100 text-gray-700', label: 'Closed' }
    }
    const config = statusConfig[status] || statusConfig['submitted']
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getSeverityBadge = (severity) => {
    const config = severityLevels.find(s => s.value === severity) || severityLevels[1]
    const colorClasses = {
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700'
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${colorClasses[config.color]}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2 space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
                  <MegaphoneIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  Send Complaint
                </h1>
              </div>
              <p className="text-gray-600">
                Report AMU/AMR violations, drug quality issues, or other concerns to regulatory authorities
              </p>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 space-x-2 text-white transition-colors rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              <MegaphoneIcon className="w-5 h-5" />
              <span className="hidden sm:inline">New Complaint</span>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 mb-6 border-l-4 border-blue-500 rounded-lg bg-blue-50">
          <div className="flex items-start">
            <InboxIcon className="w-5 h-5 mt-0.5 text-blue-600 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Confidential Reporting</h3>
              <p className="mt-1 text-sm text-blue-700">
                Your complaints are taken seriously. You can submit anonymously if needed. 
                All reports are reviewed by regulatory authorities within 48 hours.
              </p>
            </div>
          </div>
        </div>

        {/* My Complaints */}
        <div className="mb-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900">My Complaints</h2>
          
          {myComplaints.length === 0 ? (
            <div className="p-12 text-center bg-white shadow-lg rounded-2xl">
              <MegaphoneIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">No Complaints Yet</h3>
              <p className="mb-4 text-gray-600">
                You haven't submitted any complaints. Click "New Complaint" to report an issue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myComplaints.map((complaint) => {
                const category = complaintCategories.find(c => c.id === complaint.category)
                const Icon = category?.icon || MegaphoneIcon
                
                return (
                  <motion.div
                    key={complaint.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 transition-shadow bg-white shadow-lg rounded-2xl hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-red-100 to-orange-100">
                          <Icon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{complaint.subject}</h3>
                          <p className="text-sm text-gray-600">{category?.name}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {getStatusBadge(complaint.status)}
                            {getSeverityBadge(complaint.severity)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        ID: {complaint.id.slice(0, 8)}
                      </span>
                    </div>

                    <p className="mb-4 text-sm text-gray-700">{complaint.description}</p>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 md:grid-cols-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                        <span>{complaint.location}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                      </div>
                      {complaint.regulator_response && (
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-green-700">Response:</p>
                          <p className="text-xs text-gray-600">{complaint.regulator_response}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Complaint Form Modal */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Submit New Complaint</h2>
                  <p className="text-sm text-gray-600">
                    All information will be treated confidentially
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    Complaint Category *
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {complaintCategories.map((category) => {
                      const Icon = category.icon
                      const isSelected = formData.category === category.id
                      return (
                        <button
                          key={category.id}
                          onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                          className={`p-4 text-left border-2 rounded-lg transition-all ${
                            isSelected 
                              ? 'border-red-500 bg-red-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />
                          <h4 className="font-semibold text-gray-900">{category.name}</h4>
                          <p className="text-xs text-gray-600">{category.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Subject/Title *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Brief summary of the issue"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Detailed Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide detailed information about the incident, including who, what, when, where, and how..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Severity */}
                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    Severity Level *
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {severityLevels.map((level) => {
                      const isSelected = formData.severity === level.value
                      const colorClasses = {
                        green: 'border-green-500 bg-green-50',
                        yellow: 'border-yellow-500 bg-yellow-50',
                        orange: 'border-orange-500 bg-orange-50',
                        red: 'border-red-500 bg-red-50'
                      }
                      return (
                        <button
                          key={level.value}
                          onClick={() => setFormData(prev => ({ ...prev, severity: level.value }))}
                          className={`p-3 text-left border-2 rounded-lg transition-all ${
                            isSelected 
                              ? colorClasses[level.color] + ' shadow-md' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{level.label}</p>
                          <p className="text-xs text-gray-600">{level.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Location & Date/Time */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Village/Town/City"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Incident Date
                    </label>
                    <input
                      type="date"
                      name="incidentDate"
                      value={formData.incidentDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Incident Time
                    </label>
                    <input
                      type="time"
                      name="incidentTime"
                      value={formData.incidentTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Upload Evidence (Optional - Max 5 images)
                  </label>
                  <div
                    className="p-8 text-center transition-colors border-2 border-gray-300 border-dashed cursor-pointer rounded-xl hover:border-red-400"
                    onClick={() => document.getElementById('complaintImages').click()}
                  >
                    <PhotoIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-600">
                      Click to upload images (photos, screenshots, documents)
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WebP up to 10MB each
                    </p>
                  </div>
                  <input
                    id="complaintImages"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4 md:grid-cols-5">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.url}
                            alt={`Evidence ${index + 1}`}
                            className="object-cover w-full h-24 rounded-lg"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-1 right-1 group-hover:opacity-100"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact Preference */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Preferred Contact Method
                  </label>
                  <select
                    name="contactPreference"
                    value={formData.contactPreference}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Both Email & Phone</option>
                    <option value="none">No contact needed</option>
                  </select>
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <input
                    type="checkbox"
                    name="isAnonymous"
                    checked={formData.isAnonymous}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label className="ml-3 text-sm text-gray-700">
                    <span className="font-semibold">Submit Anonymously</span>
                    <p className="text-xs text-gray-600">Your identity will be kept confidential</p>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmitComplaint}
                    disabled={loading}
                    className="flex items-center justify-center flex-1 px-6 py-3 space-x-2 font-medium text-white transition-colors rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <MegaphoneIcon className="w-5 h-5" />
                        <span>Submit Complaint</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default SendComplaint
