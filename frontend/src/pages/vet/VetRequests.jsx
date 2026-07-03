import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  InboxIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import vetHelpers from '../../services/vetHelpers'

const VetRequests = () => {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('pending') // 'pending', 'inProgress', 'completed'
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Load treatment requests from Supabase
  useEffect(() => {
    if (user?.id) {
      loadTreatmentRequests()
    }
  }, [user])

  const loadTreatmentRequests = async () => {
    try {
      setLoading(true)

      // Get vet's district from kyc_details (city field)
      const { data: vetKyc, error: vetError } = await supabase
        .from('kyc_details')
        .select('city, state')
        .eq('user_id', user.id)
        .single()

      if (vetError || !vetKyc?.city) {
        console.error('Error fetching vet KYC:', vetError)
        toast.error('Unable to load veterinarian district. Please complete KYC.')
        setLoading(false)
        return
      }

      const vetDistrict = vetKyc.city  // city is the district

      // Get all requests either assigned to this vet OR from farmers in same district
      const { data: requests, error } = await supabase
        .from('treatment_requests')
        .select('*')
        .or(`veterinarian_id.eq.${user.id},farmer_district.eq.${vetDistrict}`)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading requests:', error)
        toast.error('Failed to load treatment requests')
      }

      setAllRequests(requests || [])
    } catch (error) {
      console.error('Error loading treatment requests:', error)
      toast.error('Failed to load treatment requests')
    } finally {
      setLoading(false)
    }
  }

  const pendingRequests = allRequests.filter(r => r.status === 'pending')
  const inProgressRequests = allRequests.filter(r => r.status === 'assigned' || r.status === 'consulted' || r.status === 'prescription_given')
  const completedRequests = allRequests.filter(r => r.status === 'completed' || r.status === 'treatment_recorded')

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'emergency':
        return <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">🚨 Emergency</span>
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">⚡ Urgent</span>
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">📋 Normal</span>
    }
  }

  const handleAcceptRequest = async (request) => {
    try {
      const { data: vetProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      const { error } = await vetHelpers.assignRequest(
        request.id,
        user.id,
        vetProfile?.name || 'Veterinarian'
      )

      if (error) throw error

      toast.success('✅ Request accepted and moved to In Progress')
      loadTreatmentRequests()
    } catch (error) {
      console.error('Error accepting request:', error)
      toast.error('Failed to accept request')
    }
  }

  const handleTriage = (request, action) => {
    if (action === 'visit') {
      handleAcceptRequest(request)
    } else if (action === 'prescribe') {
      // Store request in localStorage and navigate
      localStorage.setItem('currentTreatmentRequest', JSON.stringify(request))
      window.location.href = '/vet/prescriptions'
    }
  }

  const handleMarkComplete = async (request) => {
    try {
      const { error } = await vetHelpers.updateRequestStatus(
        request.id,
        'completed',
        { completed_at: new Date().toISOString() }
      )

      if (error) throw error

      toast.success('✅ Request marked as completed')
      loadTreatmentRequests()
    } catch (error) {
      console.error('Error completing request:', error)
      toast.error('Failed to complete request')
    }
  }

  const handlePrescribeMeds = (request) => {
    // Store request in localStorage and navigate to prescription page
    localStorage.setItem('currentTreatmentRequest', JSON.stringify(request))
    window.location.href = '/vet/prescriptions'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderRequestCard = (request) => {
    // Parse farmer notes for vital signs
    const vitalSigns = request.farmer_notes ? (() => {
      const temp = request.farmer_notes.match(/Temperature:\s*(\d+)/i)?.[1]
      const appetite = request.farmer_notes.match(/Appetite:\s*(\w+)/i)?.[1]
      const behavior = request.farmer_notes.match(/Behavior:\s*(\w+)/i)?.[1]
      return { temp, appetite, behavior }
    })() : null

    const location = [request.farmer_district, request.farmer_state].filter(Boolean).join(', ')

    return (
    <motion.div
      key={request.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${
        selectedRequest?.id === request.id ? 'ring-2 ring-green-500' : ''
      }`}
      onClick={() => setSelectedRequest(request)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2 space-x-3">
            <h3 className="text-lg font-bold text-gray-900">{request.farmer_name}</h3>
            {getUrgencyBadge(request.urgency)}
          </div>
          <p className="text-sm text-gray-600">{request.animal_name || request.animal_species}</p>
          <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500">
            {location && (
              <span className="flex items-center space-x-1">
                <MapPinIcon className="w-4 h-4" />
                <span>{location}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <PhoneIcon className="w-4 h-4" />
              <span>{request.farmer_phone}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Request ID</p>
          <p className="font-semibold text-gray-900">{request.request_id}</p>
        </div>
      </div>

      <div className="p-4 mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-600">Animal</p>
            <p className="font-semibold text-gray-900">
              {request.animal_species} ({request.animal_tag})
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Request Date</p>
            <p className="font-semibold text-gray-900">{formatDate(request.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-600">Disease</p>
            <p className="font-semibold text-gray-900">{request.disease || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Duration</p>
            <p className="font-semibold text-gray-900">{request.disease_duration || 'N/A'}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-700">Symptoms:</p>
          <p className="text-sm text-gray-900">{request.symptoms}</p>
        </div>

        {request.previous_treatments && (
          <div className="mt-2">
            <p className="mb-1 text-xs font-medium text-gray-700">Previous Treatments:</p>
            <p className="text-sm text-gray-900">{request.previous_treatments}</p>
          </div>
        )}
      </div>

      {vitalSigns && vitalSigns.temp && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2 text-center rounded-lg bg-red-50">
            <p className="text-xs text-gray-600">Temp</p>
            <p className="font-bold text-red-600">{vitalSigns.temp}°C</p>
          </div>
          <div className="p-2 text-center rounded-lg bg-blue-50">
            <p className="text-xs text-gray-600">Appetite</p>
            <p className="font-bold text-blue-600 capitalize">{vitalSigns.appetite || 'N/A'}</p>
          </div>
          <div className="p-2 text-center rounded-lg bg-green-50">
            <p className="text-xs text-gray-600">Behavior</p>
            <p className="font-bold text-green-600 capitalize">{vitalSigns.behavior || 'N/A'}</p>
          </div>
        </div>
      )}

      {request.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTriage(request, 'visit')
            }}
            className="flex items-center justify-center flex-1 px-4 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-orange-600 rounded-lg hover:bg-orange-700"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Urgent Visit Required</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTriage(request, 'prescribe')
            }}
            className="flex items-center justify-center flex-1 px-4 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>Prescribe Meds</span>
          </button>
        </div>
      )}

      {(request.status === 'assigned' || request.status === 'consulted' || request.status === 'prescription_given') && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrescribeMeds(request)
            }}
            className="flex items-center justify-center flex-1 px-4 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>Prescribe Meds</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleMarkComplete(request)
            }}
            className="flex items-center justify-center flex-1 px-4 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Mark Complete</span>
          </button>
        </div>
      )}

      {(request.status === 'completed' || request.status === 'treatment_recorded') && (
        <div className="p-3 rounded-lg bg-green-50">
          <div className="flex items-center mb-2 space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Completed</span>
          </div>
          <p className="mb-1 text-xs text-gray-600">Completed on: {request.completed_at ? formatDate(request.completed_at) : 'N/A'}</p>
          {request.prescription_details && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Treatment:</span> {request.prescription_details}
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2 space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <InboxIcon className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Treatment Requests
            </h1>
          </div>
          <p className="text-gray-600">
            Manage incoming treatment requests from producers
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ClockIcon className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{inProgressRequests.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ArrowRightIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed (This Week)</p>
                <p className="text-3xl font-bold text-green-600">{completedRequests.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-orange-100 text-orange-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClockIcon className="w-5 h-5" />
            <span>Pending ({pendingRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('inProgress')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'inProgress'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowRightIcon className="w-5 h-5" />
            <span>In Progress ({inProgressRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircleIcon className="w-5 h-5" />
            <span>Completed ({completedRequests.length})</span>
          </button>
        </div>

        {/* Request Lists */}
        {loading ? (
          <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
            <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-green-600 rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading treatment requests...</p>
          </div>
        ) : (
        <div className="space-y-4">
          {activeTab === 'pending' && pendingRequests.map(renderRequestCard)}
          {activeTab === 'inProgress' && inProgressRequests.map(renderRequestCard)}
          {activeTab === 'completed' && completedRequests.map(renderRequestCard)}

          {/* Empty State */}
          {((activeTab === 'pending' && pendingRequests.length === 0) ||
            (activeTab === 'inProgress' && inProgressRequests.length === 0) ||
            (activeTab === 'completed' && completedRequests.length === 0)) && (
            <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
              <InboxIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                No {activeTab} requests
              </h3>
              <p className="text-gray-600">
                {activeTab === 'pending' && 'All caught up! No pending requests at the moment.'}
                {activeTab === 'inProgress' && 'No requests currently in progress.'}
                {activeTab === 'completed' && 'No completed requests yet.'}
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

export default VetRequests
