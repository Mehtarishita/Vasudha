import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import vetHelpers from '../../services/vetHelpers'

const FarmVisitsSchedule = () => {
  const { user } = useAuthStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'history'
  const [scheduledVisits, setScheduledVisits] = useState([])
  const [visitHistory, setVisitHistory] = useState([])
  const [farms, setFarms] = useState([])
  const [loading, setLoading] = useState(true)

  // Form state for new visit
  const [visitForm, setVisitForm] = useState({
    farmId: '',
    farmName: '',
    farmLocation: '',
    visitDate: '',
    visitTime: '',
    visitType: 'routine',
    purpose: '',
    notes: ''
  })

  // Load farms and visits from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      
      try {
        setLoading(true)
        
        // Load assigned farms
        const { data: farmsData, error: farmsError } = await vetHelpers.getAssignedFarms(user.id)
        if (farmsError) throw farmsError
        
        setFarms((farmsData || []).map(farm => ({
          id: farm.id,
          name: farm.name,
          location: farm.location || (farm.district ? `${farm.district}, ${farm.state || ''}` : 'Location not set')
        })))
        
        // Load scheduled visits
        const { data: visitsData, error: visitsError } = await vetHelpers.getScheduledVisits(user.id)
        if (visitsError) throw visitsError
        
        const now = new Date()
        const upcoming = []
        const history = []
        
        if (visitsData && Array.isArray(visitsData)) {
          visitsData.forEach(visit => {
            const visitDate = new Date(visit.scheduled_date)
            const transformed = {
              id: visit.id,
              farmId: visit.farm_id,
              farmName: visit.farm?.name || visit.farm_name || 'Unknown Farm',
              farmLocation: visit.farm?.location || visit.location || (visit.district ? `${visit.district}, ${visit.state || ''}` : 'Location not set'),
              date: visit.scheduled_date?.split('T')[0],
              time: visit.scheduled_date ? new Date(visit.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
              type: visit.inspection_type || 'routine',
              purpose: visit.notes || visit.findings || '',
              status: visit.status,
              duration: visit.completed_at ? calculateDuration(visit.scheduled_date, visit.completed_at) : null,
              findings: visit.findings || visit.notes,
              animalsChecked: 0,
              prescriptionsIssued: 0
            }
            
            if (visit.status === 'completed') {
              history.push(transformed)
            } else if (visitDate >= now || visit.status === 'scheduled') {
              upcoming.push(transformed)
            }
          })
        }
        
        setScheduledVisits(upcoming)
        setVisitHistory(history)
      } catch (error) {
        console.error('Error loading visit data:', error)
        toast.error('Failed to load visit data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user])
  
  // Helper to calculate visit duration
  const calculateDuration = (start, end) => {
    const duration = (new Date(end) - new Date(start)) / (1000 * 60 * 60) // hours
    return `${duration.toFixed(1)} hours`
  }


  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const getVisitsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return scheduledVisits.filter(visit => visit.date === dateStr)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setVisitForm(prev => ({ ...prev, [name]: value }))
  }

  const handleScheduleVisit = async () => {
    if (!visitForm.farmId || !visitForm.visitDate || !visitForm.visitTime) {
      toast.error('Please fill all required fields')
      return
    }

    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${visitForm.visitDate}T${visitForm.visitTime}`)
      
      const { error } = await vetHelpers.createFarmVisit({
        farmId: visitForm.farmId,
        vetId: user.id,
        scheduledDate: scheduledDateTime.toISOString(),
        inspectionType: visitForm.visitType,
        purpose: visitForm.purpose,
        notes: visitForm.notes
      })
      
      if (error) throw error
      
      toast.success('✅ Farm visit scheduled successfully!')
      
      // Reload visits to show new one
      const { data: visitsData } = await vetHelpers.getScheduledVisits(user.id)
      const upcoming = (visitsData || []).filter(v => v.status === 'scheduled').map(visit => ({
        id: visit.id,
        farmId: visit.farm_id,
        farmName: visit.farm?.name || visit.farm_name || 'Unknown Farm',
        farmLocation: visit.farm?.location || visit.location || 'Location not set',
        date: visit.scheduled_date?.split('T')[0],
        time: visit.scheduled_date ? new Date(visit.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
        type: visit.inspection_type || 'routine',
        purpose: visit.notes || '',
        status: visit.status
      }))
      
      setScheduledVisits(upcoming)
      setShowScheduleModal(false)
      setVisitForm({
        farmId: '',
        farmName: '',
        farmLocation: '',
        visitDate: '',
        visitTime: '',
        visitType: 'routine',
        purpose: '',
        notes: ''
      })
    } catch (error) {
      console.error('Error scheduling visit:', error)
      toast.error('Failed to schedule visit')
    }
  }

  const getVisitTypeBadge = (type) => {
    switch (type) {
      case 'emergency':
        return <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">🚨 Emergency</span>
      case 'follow-up':
        return <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">🔄 Follow-up</span>
      case 'routine':
        return <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">📋 Routine</span>
      default:
        return null
    }
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)
    const days = []
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const visits = getVisitsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`p-2 min-h-[80px] border cursor-pointer transition-all hover:shadow-md ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
          } ${isSelected ? 'ring-2 ring-green-500' : ''} rounded-lg`}
        >
          <div className={`text-sm font-semibold mb-1 ${
            isToday ? 'text-blue-600' : 'text-gray-700'
          }`}>
            {day}
          </div>
          {visits.length > 0 && (
            <div className="space-y-1">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className={`text-xs p-1 rounded ${
                    visit.type === 'emergency' ? 'bg-red-200 text-red-800' :
                    visit.type === 'follow-up' ? 'bg-blue-200 text-blue-800' :
                    'bg-green-200 text-green-800'
                  }`}
                >
                  {visit.time} - {visit.farmName.split(' ')[0]}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="p-6 bg-white shadow-lg rounded-2xl">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day) => (
            <div key={day} className="p-2 font-semibold text-center text-gray-700">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-2 space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Farm Visits & Schedule
              </h1>
            </div>
            <p className="text-gray-600">
              Manage your farm visits and schedule
            </p>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Schedule Visit</span>
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex p-1 mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Calendar View</span>
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              viewMode === 'history'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Visit History</span>
          </button>
        </div>

        {viewMode === 'calendar' && (
          <>
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 mb-6 bg-white shadow-lg rounded-2xl">
              <button
                onClick={handlePrevMonth}
                className="p-2 transition-colors rounded-lg hover:bg-gray-100"
              >
                <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
              </button>

              <h2 className="text-xl font-bold text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={handleNextMonth}
                className="p-2 transition-colors rounded-lg hover:bg-gray-100"
              >
                <ChevronRightIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Calendar */}
            {renderCalendar()}

            {/* Upcoming Visits */}
            <div className="mt-6">
              <h3 className="mb-4 text-xl font-bold text-gray-900">Upcoming Visits</h3>
              <div className="space-y-4">
                {scheduledVisits.map((visit) => (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-white shadow-lg rounded-2xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{visit.farmName}</h4>
                        <p className="text-sm text-gray-600">{visit.farmLocation}</p>
                      </div>
                      {getVisitTypeBadge(visit.type)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-3">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-sm">{new Date(visit.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-700">
                        <ClockIcon className="w-5 h-5 text-green-600" />
                        <span className="text-sm">{visit.time}</span>
                      </div>
                      <div className="flex items-center col-span-2 space-x-2 text-gray-700 md:col-span-1">
                        <MapPinIcon className="w-5 h-5 text-orange-600" />
                        <span className="text-sm">{visit.farmLocation}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-blue-600">Purpose:</span> {visit.purpose}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

        {viewMode === 'history' && (
          <div className="space-y-4">
            {visitHistory.map((visit) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white shadow-lg rounded-2xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{visit.farmName}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(visit.date).toLocaleDateString()} at {visit.time}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getVisitTypeBadge(visit.type)}
                    <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                      <CheckCircleIcon className="inline w-4 h-4 mr-1" />
                      Completed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-3">
                  <div className="p-3 text-center rounded-lg bg-blue-50">
                    <p className="text-xs text-blue-600">Duration</p>
                    <p className="font-bold text-gray-900">{visit.duration}</p>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-purple-50">
                    <p className="text-xs text-purple-600">Animals Checked</p>
                    <p className="font-bold text-gray-900">{visit.animalsChecked}</p>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-green-50">
                    <p className="text-xs text-green-600">Prescriptions</p>
                    <p className="font-bold text-gray-900">{visit.prescriptionsIssued}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                  <p className="mb-1 text-xs font-medium text-gray-700">Findings & Actions:</p>
                  <p className="text-sm text-gray-900">{visit.findings}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Schedule Visit Modal */}
        <AnimatePresence>
          {showScheduleModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowScheduleModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-2xl bg-white shadow-2xl rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Schedule Farm Visit</h2>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Select Farm *
                    </label>
                    <select
                      name="farmId"
                      value={visitForm.farmId}
                      onChange={(e) => {
                        const farm = farms.find(f => f.id === e.target.value)
                        setVisitForm(prev => ({
                          ...prev,
                          farmId: e.target.value,
                          farmName: farm ? farm.name : '',
                          farmLocation: farm ? farm.location : ''
                        }))
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Choose farm...</option>
                      {farms.map((farm) => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name} - {farm.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Visit Date *
                      </label>
                      <input
                        type="date"
                        name="visitDate"
                        value={visitForm.visitDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Visit Time *
                      </label>
                      <input
                        type="time"
                        name="visitTime"
                        value={visitForm.visitTime}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Visit Type
                    </label>
                    <select
                      name="visitType"
                      value={visitForm.visitType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="routine">Routine Checkup</option>
                      <option value="follow-up">Follow-up Visit</option>
                      <option value="emergency">Emergency Visit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Purpose
                    </label>
                    <input
                      type="text"
                      name="purpose"
                      value={visitForm.purpose}
                      onChange={handleInputChange}
                      placeholder="e.g., Monthly health checkup"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={visitForm.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Additional notes for the visit..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleScheduleVisit}
                      className="flex items-center justify-center flex-1 px-6 py-3 space-x-2 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Schedule Visit</span>
                    </button>
                    <button
                      onClick={() => setShowScheduleModal(false)}
                      className="px-6 py-3 font-medium text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
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

export default FarmVisitsSchedule
