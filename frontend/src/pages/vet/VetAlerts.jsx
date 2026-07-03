import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BellAlertIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import vetHelpers from '../../services/vetHelpers'

const VetAlerts = () => {
  const { user } = useAuthStore()
  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'urgent', 'normal', 'low'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [allAlerts, setAllAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  // Load alerts from Supabase
  useEffect(() => {
    const loadAlerts = async () => {
      if (!user?.id) return
      
      try {
        setLoading(true)
        const { data, error } = await vetHelpers.getAlerts(user.id)
        
        if (error) throw error
        
        // Transform alerts to UI format
        const transformedAlerts = (data || []).map((alert, index) => ({
          id: alert.id || `ALT${String(index + 1).padStart(3, '0')}`,
          type: alert.priority === 1 ? 'urgent' : alert.priority === 2 ? 'normal' : 'low',
          category: alert.category,
          title: alert.title,
          message: alert.message,
          farmName: alert.farmName,
          animalTag: alert.animalTag,
          timestamp: alert.timestamp,
          status: alert.status || 'unread',
          actionRequired: alert.actionRequired !== false,
          priority: alert.priority
        }))
        
        setAllAlerts(transformedAlerts)
      } catch (error) {
        console.error('Error loading alerts:', error)
        toast.error('Failed to load alerts')
      } finally {
        setLoading(false)
      }
    }
    
    loadAlerts()
  }, [user])

  // Filter alerts
  const filteredAlerts = allAlerts.filter(alert => {
    const matchesFilter = activeFilter === 'all' || alert.type === activeFilter
    const matchesSearch = !searchTerm.trim() || 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const unreadCount = allAlerts.filter(a => a.status === 'unread').length
  const urgentCount = allAlerts.filter(a => a.type === 'urgent').length
  const actionRequiredCount = allAlerts.filter(a => a.actionRequired && a.status === 'unread').length

  const getAlertColor = (type) => {
    switch (type) {
      case 'urgent':
        return 'border-red-500 bg-red-50'
      case 'normal':
        return 'border-orange-500 bg-orange-50'
      case 'low':
        return 'border-blue-500 bg-blue-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const getAlertBadge = (type) => {
    switch (type) {
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">🚨 Urgent</span>
      case 'normal':
        return <span className="px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">⚠️ Normal</span>
      case 'low':
        return <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">ℹ️ Low</span>
      default:
        return null
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'MRL Failure': '🔬',
      'Treatment Request': '🏥',
      'Follow-up Due': '📅',
      'Prescription Expiring': '💊',
      'Lab Results Ready': '✅',
      'Withdrawal Period Active': '⏳',
      'Resistance Alert': '⚠️',
      'Scheduled Visit': '📆'
    }
    return icons[category] || '📢'
  }

  const handleMarkAsRead = (alertId) => {
    toast.success('Alert marked as read')
    // In real app, update alert status
  }

  const handleDismiss = (alertId) => {
    toast.success('Alert dismissed')
    setSelectedAlert(null)
    // In real app, dismiss alert
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2 space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <BellAlertIcon className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Alerts & Notifications
            </h1>
          </div>
          <p className="text-gray-600">
            Stay updated on urgent matters, treatment requests, and farm alerts
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{allAlerts.length}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <BellAlertIcon className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-3xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-3xl font-bold text-red-600">{urgentCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Action Required</p>
                <p className="text-3xl font-bold text-orange-600">{actionRequiredCount}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ClockIcon className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 mb-6 bg-white shadow-lg rounded-2xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({allAlerts.length})
              </button>
              <button
                onClick={() => setActiveFilter('urgent')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === 'urgent'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Urgent ({urgentCount})
              </button>
              <button
                onClick={() => setActiveFilter('normal')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === 'normal'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setActiveFilter('low')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === 'low'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Low
              </button>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 bg-white rounded-2xl shadow-lg border-l-4 ${getAlertColor(alert.type)} ${
                alert.status === 'unread' ? 'ring-2 ring-offset-2 ring-red-200' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 mt-1 text-2xl bg-white rounded-full shadow-md">
                    {getCategoryIcon(alert.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1 space-x-2">
                      <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                      {alert.status === 'unread' && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-full">NEW</span>
                      )}
                    </div>
                    <div className="flex items-center mb-2 space-x-2">
                      {getAlertBadge(alert.type)}
                      <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                        {alert.category}
                      </span>
                      {alert.actionRequired && (
                        <span className="px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">
                          ⚡ Action Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</p>
                </div>
              </div>

              <p className="mb-4 text-sm text-gray-700">{alert.message}</p>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>🏡 {alert.farmName}</span>
                  <span>🐄 {alert.animalTag}</span>
                </div>

                <div className="flex gap-2">
                  {alert.status === 'unread' && (
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="flex items-center px-3 py-1.5 space-x-1 text-sm font-medium text-green-700 transition-colors bg-green-100 rounded-lg hover:bg-green-200"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Mark as Read</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="flex items-center px-3 py-1.5 space-x-1 text-sm font-medium text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
              <BellAlertIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">No alerts found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'You have no alerts at the moment'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VetAlerts
