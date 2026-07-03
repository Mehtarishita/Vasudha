import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  InboxStackIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const ComplaintsDashboard = () => {
  const { user } = useAuthStore()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    underReview: 0,
    resolved: 0
  })

  const complaintCategories = {
    'drug_quality': { name: 'Drug Quality Issues', icon: ShieldExclamationIcon, color: 'red' },
    'illegal_sales': { name: 'Illegal Drug Sales', icon: ExclamationTriangleIcon, color: 'orange' },
    'prescription_violation': { name: 'Prescription Violations', icon: DocumentTextIcon, color: 'yellow' },
    'malpractice': { name: 'Veterinary Malpractice', icon: ShieldExclamationIcon, color: 'purple' },
    'residue_violation': { name: 'Residue Violations', icon: ExclamationTriangleIcon, color: 'pink' },
    'other': { name: 'Other Concerns', icon: MegaphoneIcon, color: 'blue' }
  }

  const statusOptions = [
    { value: 'submitted', label: 'Submitted', color: 'blue' },
    { value: 'under_review', label: 'Under Review', color: 'yellow' },
    { value: 'investigating', label: 'Investigating', color: 'orange' },
    { value: 'action_taken', label: 'Action Taken', color: 'purple' },
    { value: 'resolved', label: 'Resolved', color: 'green' },
    { value: 'closed', label: 'Closed', color: 'gray' }
  ]

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' }
  ]

  useEffect(() => {
    fetchComplaints()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [complaints])

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setComplaints(data || [])
    } catch (error) {
      console.error('Error fetching complaints:', error)
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    setStats({
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'submitted').length,
      underReview: complaints.filter(c => ['under_review', 'investigating'].includes(c.status)).length,
      resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length
    })
  }

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', complaintId)

      if (error) throw error

      toast.success('Status updated successfully')
      fetchComplaints()
      
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint(prev => ({ ...prev, status: newStatus }))
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      toast.error('Please enter a response')
      return
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          regulator_response: responseText,
          response_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedComplaint.id)

      if (error) throw error

      toast.success('Response submitted successfully')
      setResponseText('')
      fetchComplaints()
      setSelectedComplaint(prev => ({ ...prev, regulator_response: responseText }))
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error('Failed to submit response')
    }
  }

  const getStatusBadge = (status) => {
    const config = statusOptions.find(s => s.value === status) || statusOptions[0]
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      orange: 'bg-orange-100 text-orange-700',
      purple: 'bg-purple-100 text-purple-700',
      green: 'bg-green-100 text-green-700',
      gray: 'bg-gray-100 text-gray-700'
    }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
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

  const filteredComplaints = complaints.filter(complaint => {
    const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus
    const matchesSeverity = filterSeverity === 'all' || complaint.severity === filterSeverity
    const matchesSearch = searchTerm === '' || 
      complaint.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.submitter_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSeverity && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2 space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <InboxStackIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Complaints Dashboard
            </h1>
          </div>
          <p className="text-gray-600">
            Monitor and respond to complaints from producers and stakeholders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
          <div className="p-5 bg-white border border-blue-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <InboxStackIcon className="w-10 h-10 text-blue-300" />
            </div>
          </div>

          <div className="p-5 bg-white border border-yellow-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <ClockIcon className="w-10 h-10 text-yellow-300" />
            </div>
          </div>

          <div className="p-5 bg-white border border-orange-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Under Investigation</p>
                <p className="text-3xl font-bold text-orange-600">{stats.underReview}</p>
              </div>
              <ExclamationTriangleIcon className="w-10 h-10 text-orange-300" />
            </div>
          </div>

          <div className="p-5 bg-white border border-green-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircleIcon className="w-10 h-10 text-green-300" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 mb-6 bg-white shadow-sm rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search complaints..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                {severityLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center bg-white shadow-lg rounded-2xl">
            <InboxStackIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Complaints Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' 
                ? 'Try adjusting your filters'
                : 'No complaints have been submitted yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((complaint) => {
              const category = complaintCategories[complaint.category] || complaintCategories['other']
              const Icon = category.icon
              const isHighPriority = complaint.severity === 'high' || complaint.severity === 'critical'
              
              return (
                <motion.div
                  key={complaint.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 transition-shadow bg-white shadow-lg rounded-2xl hover:shadow-xl ${
                    isHighPriority ? 'border-2 border-red-300' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start flex-1 space-x-3">
                      <div className={`p-2 rounded-lg ${isHighPriority ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <Icon className={`w-6 h-6 ${isHighPriority ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{complaint.subject}</h3>
                          {isHighPriority && (
                            <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded animate-pulse">
                              URGENT
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-gray-600">{category.name}</p>
                        <p className="mb-3 text-sm text-gray-700 line-clamp-2">{complaint.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {getStatusBadge(complaint.status)}
                          {getSeverityBadge(complaint.severity)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      ID: {complaint.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 mb-4 border-t border-gray-200 md:grid-cols-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span>{complaint.submitter_name || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span>{complaint.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span>{new Date(complaint.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedComplaint(complaint)
                        setShowDetailModal(true)
                      }}
                      className="flex items-center px-3 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>View Details</span>
                    </button>

                    {complaint.status === 'submitted' && (
                      <button
                        onClick={() => handleUpdateStatus(complaint.id, 'under_review')}
                        className="px-3 py-2 text-sm font-medium text-yellow-700 transition-colors bg-yellow-100 rounded-lg hover:bg-yellow-200"
                      >
                        Mark Under Review
                      </button>
                    )}

                    {complaint.status === 'under_review' && (
                      <button
                        onClick={() => handleUpdateStatus(complaint.id, 'investigating')}
                        className="px-3 py-2 text-sm font-medium text-orange-700 transition-colors bg-orange-100 rounded-lg hover:bg-orange-200"
                      >
                        Start Investigation
                      </button>
                    )}

                    {complaint.status === 'investigating' && (
                      <button
                        onClick={() => handleUpdateStatus(complaint.id, 'action_taken')}
                        className="px-3 py-2 text-sm font-medium text-purple-700 transition-colors bg-purple-100 rounded-lg hover:bg-purple-200"
                      >
                        Action Taken
                      </button>
                    )}

                    {complaint.status === 'action_taken' && (
                      <button
                        onClick={() => handleUpdateStatus(complaint.id, 'resolved')}
                        className="px-3 py-2 text-sm font-medium text-green-700 transition-colors bg-green-100 rounded-lg hover:bg-green-200"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedComplaint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-3xl bg-white shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Complaint Details</h2>
                    <p className="text-sm text-gray-600">ID: {selectedComplaint.id}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="mb-1 text-sm text-gray-600">Category</p>
                      <p className="font-semibold text-gray-900">
                        {complaintCategories[selectedComplaint.category]?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(selectedComplaint.status)}
                      <div className="mt-2">{getSeverityBadge(selectedComplaint.severity)}</div>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">{selectedComplaint.subject}</h3>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="mb-1 text-sm font-semibold text-gray-700">Description</p>
                    <p className="text-sm leading-relaxed text-gray-600">{selectedComplaint.description}</p>
                  </div>

                  {/* Submitter Info */}
                  {!selectedComplaint.is_anonymous && (
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <p className="mb-3 text-sm font-semibold text-blue-900">Submitter Information</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="flex items-center space-x-2 text-sm text-blue-800">
                          <UserIcon className="w-4 h-4" />
                          <span>{selectedComplaint.submitter_name}</span>
                        </div>
                        {selectedComplaint.submitter_phone && (
                          <div className="flex items-center space-x-2 text-sm text-blue-800">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{selectedComplaint.submitter_phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-sm text-blue-800">
                          <MapPinIcon className="w-4 h-4" />
                          <span>{selectedComplaint.submitter_district}, {selectedComplaint.submitter_state}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Incident Details */}
                  {(selectedComplaint.incident_date || selectedComplaint.location) && (
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="mb-3 text-sm font-semibold text-gray-700">Incident Details</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {selectedComplaint.location && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{selectedComplaint.location}</span>
                          </div>
                        )}
                        {selectedComplaint.incident_date && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{new Date(selectedComplaint.incident_date).toLocaleDateString()}</span>
                            {selectedComplaint.incident_time && <span>at {selectedComplaint.incident_time}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold text-gray-700">Evidence</p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {selectedComplaint.images.map((img, index) => (
                          <img
                            key={index}
                            src={img}
                            alt={`Evidence ${index + 1}`}
                            className="object-cover w-full h-32 border border-gray-300 rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Update */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-700">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleUpdateStatus(selectedComplaint.id, option.value)}
                          disabled={selectedComplaint.status === option.value}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedComplaint.status === option.value
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Response Section */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-700">Regulator Response</p>
                    {selectedComplaint.regulator_response ? (
                      <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                        <p className="mb-2 text-sm text-green-900">{selectedComplaint.regulator_response}</p>
                        <p className="text-xs text-green-700">
                          Responded on {new Date(selectedComplaint.response_date).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Enter your response to the complainant..."
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleSubmitResponse}
                          className="flex items-center px-4 py-2 mt-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          <ChatBubbleLeftRightIcon className="w-5 h-5" />
                          <span>Submit Response</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ComplaintsDashboard
