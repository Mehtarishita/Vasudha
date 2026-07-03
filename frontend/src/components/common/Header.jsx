import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { supabase } from '../../config/supabase'
import ministerylogo from '/Logo_ministry.png'

const Header = ({ onMenuClick }) => {
  const { user, profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const [selectedLang, setSelectedLang] = useState(localStorage.getItem('vasudha_language') || 'en')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'mr', label: 'मराठी' },
  ]

  // Change language globally
  const handleLangChange = (e) => {
    const lang = e.target.value
    setSelectedLang(lang)
    localStorage.setItem('vasudha_language', lang)
    window.location.reload()
  }

  // Load notifications based on user role
  useEffect(() => {
    if (user?.id && profile?.user_type) {
      loadNotifications()

      // Set up real-time subscription
      const subscription = setupRealtimeSubscription()

      return () => {
        subscription?.unsubscribe()
      }
    }
  }, [user?.id, profile?.user_type])

  const setupRealtimeSubscription = () => {
    const userRole = profile?.user_type || user?.role

    // Subscribe to relevant tables based on role
    const channel = supabase.channel('header_notifications')

    if (userRole === 'producer') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'treatments', filter: `farmer_id=eq.${user.id}` }, () => loadNotifications())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'treatment_requests', filter: `farmer_id=eq.${user.id}` }, () => loadNotifications())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions', filter: `farmer_id=eq.${user.id}` }, () => loadNotifications())
    } else if (userRole === 'veterinarian') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'treatment_requests' }, () => loadNotifications())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions', filter: `veterinarian_id=eq.${user.id}` }, () => loadNotifications())
    } else if (userRole === 'lab') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'samples' }, () => loadNotifications())
    } else if (userRole === 'collector') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_records', filter: `collector_id=eq.${user.id}` }, () => loadNotifications())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'batches', filter: `collector_id=eq.${user.id}` }, () => loadNotifications())
    } else if (userRole === 'retailer') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'retailer_stock', filter: `user_id=eq.${user.id}` }, () => loadNotifications())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => loadNotifications())
    } else if (userRole === 'regulator') {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'regulatory_actions' }, () => loadNotifications())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'samples' }, () => loadNotifications())
    }

    channel.subscribe()
    return channel
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const userRole = profile?.user_type || user?.role
      let alerts = []

      switch (userRole) {
        case 'producer':
          alerts = await getProducerNotifications()
          break
        case 'veterinarian':
          alerts = await getVeterinarianNotifications()
          break
        case 'lab':
          alerts = await getLabNotifications()
          break
        case 'collector':
          alerts = await getCollectorNotifications()
          break
        case 'retailer':
          alerts = await getRetailerNotifications()
          break
        case 'regulator':
          alerts = await getRegulatorNotifications()
          break
        default:
          alerts = []
      }

      // Sort by most recent and limit to 5
      alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setNotifications(alerts.slice(0, 5))
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Producer notifications
  const getProducerNotifications = async () => {
    const alerts = []

    try {
      // Withdrawal period alerts
      const { data: treatments } = await supabase
        .from('treatments')
        .select('*, livestock:livestock_id(tag_id, name)')
        .eq('farmer_id', user.id)
        .gte('withdrawal_end_date', new Date().toISOString().split('T')[0])
        .order('withdrawal_end_date', { ascending: true })
        .limit(3)

      treatments?.forEach(treatment => {
        const endDate = new Date(treatment.withdrawal_end_date)
        const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))

        if (daysRemaining <= 3 && daysRemaining >= 0) {
          alerts.push({
            id: `withdrawal-${treatment.id}`,
            message: `Withdrawal ending in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} for ${treatment.livestock?.name || treatment.livestock?.tag_id}`,
            type: daysRemaining <= 1 ? 'alert' : 'warning',
            time: formatTimeAgo(treatment.administration_date),
            timestamp: treatment.administration_date
          })
        }
      })

      // Treatment request updates
      const { data: requests } = await supabase
        .from('treatment_requests')
        .select('*')
        .eq('farmer_id', user.id)
        .in('status', ['assigned', 'prescription_given'])
        .order('updated_at', { ascending: false })
        .limit(2)

      requests?.forEach(request => {
        if (request.status === 'prescription_given') {
          alerts.push({
            id: `request-${request.id}`,
            message: `Prescription ready for ${request.animal_name}`,
            type: 'info',
            time: formatTimeAgo(request.updated_at),
            timestamp: request.updated_at
          })
        } else if (request.status === 'assigned') {
          alerts.push({
            id: `request-${request.id}`,
            message: `Vet assigned to ${request.animal_name}`,
            type: 'info',
            time: formatTimeAgo(request.updated_at),
            timestamp: request.updated_at
          })
        }
      })

      // Inspection alerts
      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('farmer_id', user.id)

      if (farms && farms.length > 0) {
        const { data: inspections } = await supabase
          .from('inspections')
          .select('*')
          .in('farm_id', farms.map(f => f.id))
          .in('status', ['scheduled', 'in_progress'])
          .order('scheduled_date', { ascending: true })
          .limit(2)

        inspections?.forEach(inspection => {
          const scheduledDate = new Date(inspection.scheduled_date)
          const daysUntil = Math.ceil((scheduledDate - new Date()) / (1000 * 60 * 60 * 24))

          if (daysUntil <= 3) {
            alerts.push({
              id: `inspection-${inspection.id}`,
              message: `${inspection.inspection_type} inspection in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
              type: 'warning',
              time: formatTimeAgo(inspection.created_at),
              timestamp: inspection.created_at
            })
          }
        })
      }
    } catch (error) {
      console.error('Error fetching producer notifications:', error)
    }

    return alerts
  }

  // Veterinarian notifications
  const getVeterinarianNotifications = async () => {
    const alerts = []

    try {
      // Pending treatment requests
      const { data: requests } = await supabase
        .from('treatment_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3)

      requests?.forEach(request => {
        const urgencyLabel = request.urgency === 'emergency' ? '🚨 EMERGENCY: ' : request.urgency === 'urgent' ? '⚡ URGENT: ' : ''
        alerts.push({
          id: `request-${request.id}`,
          message: `${urgencyLabel}New request for ${request.animal_name}`,
          type: request.urgency === 'emergency' ? 'alert' : 'warning',
          time: formatTimeAgo(request.created_at),
          timestamp: request.created_at
        })
      })

      // Assigned requests
      const { data: assigned } = await supabase
        .from('treatment_requests')
        .select('*')
        .eq('veterinarian_id', user.id)
        .in('status', ['assigned', 'consulted'])
        .order('updated_at', { ascending: false })
        .limit(2)

      assigned?.forEach(request => {
        alerts.push({
          id: `assigned-${request.id}`,
          message: `Follow-up needed for ${request.animal_name}`,
          type: 'info',
          time: formatTimeAgo(request.updated_at),
          timestamp: request.updated_at
        })
      })
    } catch (error) {
      console.error('Error fetching vet notifications:', error)
    }

    return alerts
  }

  // Lab notifications
  const getLabNotifications = async () => {
    const alerts = []

    try {
      // Pending samples
      const { data: samples } = await supabase
        .from('samples')
        .select('*')
        .eq('reception_status', 'awaiting')
        .order('collected_at', { ascending: false })
        .limit(3)

      samples?.forEach(sample => {
        alerts.push({
          id: `sample-${sample.id}`,
          message: `New sample ${sample.sample_code} awaiting reception`,
          type: 'warning',
          time: formatTimeAgo(sample.collected_at),
          timestamp: sample.collected_at
        })
      })

      // Urgent priority samples
      const { data: urgent } = await supabase
        .from('samples')
        .select('*')
        .eq('priority', 'urgent')
        .eq('status', 'pending')
        .order('collected_at', { ascending: false })
        .limit(2)

      urgent?.forEach(sample => {
        alerts.push({
          id: `urgent-${sample.id}`,
          message: `🚨 Urgent: Sample ${sample.sample_code} needs testing`,
          type: 'alert',
          time: formatTimeAgo(sample.collected_at),
          timestamp: sample.collected_at
        })
      })
    } catch (error) {
      console.error('Error fetching lab notifications:', error)
    }

    return alerts
  }

  // Collector notifications
  const getCollectorNotifications = async () => {
    const alerts = []

    try {
      // Recent collections
      const { data: collections } = await supabase
        .from('collection_records')
        .select('*, farm:farm_id(name)')
        .eq('collector_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      collections?.forEach(collection => {
        if (!collection.can_accept) {
          alerts.push({
            id: `collection-${collection.id}`,
            message: `Collection rejected at ${collection.farm?.name}: ${collection.rejection_reason}`,
            type: 'alert',
            time: formatTimeAgo(collection.created_at),
            timestamp: collection.created_at
          })
        }
      })

      // Unsealed batches
      const { data: batches } = await supabase
        .from('batches')
        .select('*')
        .eq('collector_id', user.id)
        .eq('sealed', false)
        .order('created_at', { ascending: false })
        .limit(2)

      batches?.forEach(batch => {
        alerts.push({
          id: `batch-${batch.id}`,
          message: `Batch ${batch.batch_id} ready to seal`,
          type: 'info',
          time: formatTimeAgo(batch.created_at),
          timestamp: batch.created_at
        })
      })
    } catch (error) {
      console.error('Error fetching collector notifications:', error)
    }

    return alerts
  }

  // Retailer notifications
  const getRetailerNotifications = async () => {
    const alerts = []

    try {
      // Low stock alerts
      const { data: stock } = await supabase
        .from('retailer_stock')
        .select('*')
        .eq('user_id', user.id)
        .lt('quantity_available', 10)
        .order('quantity_available', { ascending: true })
        .limit(3)

      stock?.forEach(item => {
        alerts.push({
          id: `stock-${item.id}`,
          message: `Low stock: ${item.drug_name} (${item.quantity_available} ${item.unit_type} left)`,
          type: 'warning',
          time: formatTimeAgo(item.updated_at),
          timestamp: item.updated_at
        })
      })

      // Expiring stock
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { data: expiring } = await supabase
        .from('retailer_stock')
        .select('*')
        .eq('user_id', user.id)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(2)

      expiring?.forEach(item => {
        const daysUntilExpiry = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `expiry-${item.id}`,
          message: `${item.drug_name} expires in ${daysUntilExpiry} days`,
          type: daysUntilExpiry <= 7 ? 'alert' : 'warning',
          time: formatTimeAgo(item.updated_at),
          timestamp: item.updated_at
        })
      })
    } catch (error) {
      console.error('Error fetching retailer notifications:', error)
    }

    return alerts
  }

  // Regulator notifications
  const getRegulatorNotifications = async () => {
    const alerts = []

    try {
      // Open regulatory actions
      const { data: actions } = await supabase
        .from('regulatory_actions')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(3)

      actions?.forEach(action => {
        alerts.push({
          id: `action-${action.id}`,
          message: `${action.action_type} for ${action.entity_name}`,
          type: action.action_level === 'critical' ? 'alert' : 'warning',
          time: formatTimeAgo(action.created_at),
          timestamp: action.created_at
        })
      })

      // Failed samples
      const { data: samples } = await supabase
        .from('samples')
        .select('*, batch:batch_id(batch_id)')
        .eq('lab_status', 'fail')
        .order('test_completed_at', { ascending: false })
        .limit(2)

      samples?.forEach(sample => {
        alerts.push({
          id: `sample-${sample.id}`,
          message: `MRL violation in ${sample.batch?.batch_id || sample.sample_code}`,
          type: 'alert',
          time: formatTimeAgo(sample.test_completed_at),
          timestamp: sample.test_completed_at
        })
      })
    } catch (error) {
      console.error('Error fetching regulator notifications:', error)
    }

    return alerts
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recently'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getNotificationTypeColor = (type) => {
    switch (type) {
      case 'alert':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getAlertPageLink = () => {
    const userRole = profile?.user_type || user?.role

    switch (userRole) {
      case 'producer':
        return '/producer/alerts'
      case 'veterinarian':
        return '/vet/requests'
      case 'lab':
        return '/lab/pending-queue'
      case 'collector':
        return '/collector/daily-collection'
      case 'retailer':
        return '/retailer/stock'
      case 'regulator':
        return '/regulator/compliance-violations'
      default:
        return '/app/dashboard'
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Menu button and title */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-400 rounded-md lg:hidden hover:text-gray-500 hover:bg-gray-100"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <div className="ml-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {user?.role === 'producer' && 'Livestock Owner Portal'}
              {user?.role === 'veterinarian' && 'Veterinary Portal'}
              {user?.role === 'lab' && 'Laboratory Dashboard'}
              {user?.role === 'regulator' && 'Regulatory Dashboard'}
              {user?.role === 'retailer' && 'Retailer Panel'}
              {user?.role === 'collector' && 'Collector Dashboard'}
            </h1>
          </div>
        </div>

        {/* Right side - Notifications and profile */}
        <div className="flex items-center space-x-4">
          {/* Ministry Logo */}
          <div className="items-center hidden px-3 py-1 space-x-2 md:flex">
            <img src={ministerylogo} alt="Ministry Logo" width={240} height={40} className="object-contain" />
          </div>

          {/* Notifications */}
          <Menu as="div" className="relative">
            <Menu.Button className="relative p-2 text-gray-400 rounded-full hover:text-gray-500 hover:bg-gray-100">
              <BellIcon className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                  {notifications.length}
                </span>
              )}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-50 mt-2 origin-top-right bg-white rounded-md shadow-lg w-80 ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">
                      Notifications {loading && <span className="text-xs text-gray-500">(updating...)</span>}
                    </h3>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <BellIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <Menu.Item key={notification.id}>
                        <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                          <p className={`text-sm font-medium ${getNotificationTypeColor(notification.type)}`}>
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{notification.time}</p>
                        </div>
                      </Menu.Item>
                    ))
                  )}

                  <div className="px-4 py-2 border-t border-gray-200">
                    <button
                      onClick={() => navigate(getAlertPageLink())}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center p-2 space-x-3 rounded-lg hover:bg-gray-100">
              <UserCircleIcon className="w-8 h-8 text-gray-400" />
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-gray-900">{profile?.name || user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.user_type || user?.role}</p>
              </div>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-50 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <NavLink
                        to="/app/profile"
                        className={`${active ? 'bg-gray-100' : ''
                          } flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                      >
                        <UserCircleIcon className="w-4 h-4 mr-3" />
                        Profile
                      </NavLink>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <NavLink
                        to="/app/settings"
                        className={`${active ? 'bg-gray-100' : ''
                          } flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-3" />
                        Settings
                      </NavLink>
                    )}
                  </Menu.Item>
                  <div className="border-t border-gray-200"></div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={async () => {
                          await logout()
                          navigate('/', { replace: true })
                        }}
                        className={`${active ? 'bg-gray-100' : ''
                          } flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100`}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  )
}

export default Header
