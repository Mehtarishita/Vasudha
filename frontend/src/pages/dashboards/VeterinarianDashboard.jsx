import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  MapIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  BeakerIcon,
  BuildingOfficeIcon,
  BellAlertIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import StatCard from '../../components/common/StatCard'
import QuickActions from '../../components/common/QuickActions'
import AlertsPanel from '../../components/common/AlertsPanel'
import drugDatabase from '../../data/drug_database.json'
import { supabase } from '../../config/supabase'
import vetHelpers from '../../services/vetHelpers'
import toast from 'react-hot-toast'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const VeterinarianDashboard = () => {
  const { profile, user } = useAuthStore()
  const [stats, setStats] = useState({
    activePrescriptions: 0,
    farmsVisited: 0,
    animalsExamined: 0,
    pendingFollowups: 0,
    treatmentRequests: 0,
    farmsRegistered: 0,
    todayAppointments: 0
  })
  const [loading, setLoading] = useState(true)
  const [upcomingTreatments, setUpcomingTreatments] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])

  const [drugSearchTerm, setDrugSearchTerm] = useState('')

  // Load real-time data from Supabase
  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Get vet's district from kyc_details table (city field)
      const { data: vetKyc, error: vetError } = await supabase
        .from('kyc_details')
        .select('city, state')
        .eq('user_id', user.id)
        .single()

      if (vetError) {
        console.error('Error fetching vet KYC:', vetError)
        toast.error('Unable to load veterinarian district. Please complete KYC.')
        setLoading(false)
        return
      }

      if (!vetKyc?.city) {
        toast.error('Veterinarian district not set. Please complete your KYC.')
        setLoading(false)
        return
      }

      const vetDistrict = vetKyc.city  // city is the district
      const vetState = vetKyc.state

      // Fetch treatments created by this vet
      const { data: treatments, error: treatmentsError } = await supabase
        .from('treatments')
        .select('*')
        .eq('veterinarian_id', user.id)
        .order('created_at', { ascending: false })

      if (treatmentsError) throw treatmentsError

      // Fetch treatment requests from farmers in the same district
      // Only show pending requests from same district OR assigned/in-progress requests for this vet
      const { data: districtFarmers, error: farmersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'producer')
        .ilike('address', `%${vetDistrict}%`)

      const districtFarmerIds = (districtFarmers || []).map(f => f.id)

      let requestsQuery = supabase
        .from('treatment_requests')
        .select('*')
        .order('created_at', { ascending: false })

      // Get requests either assigned to this vet OR pending from same district
      if (districtFarmerIds.length > 0) {
        requestsQuery = requestsQuery.or(
          `veterinarian_id.eq.${user.id},and(farmer_id.in.(${districtFarmerIds.join(',')}),status.in.(pending,assigned))`
        )
      } else {
        requestsQuery = requestsQuery.eq('veterinarian_id', user.id)
      }

      const { data: requests, error: requestsError } = await requestsQuery

      if (requestsError) throw requestsError

      // Fetch farms from the same district using helper function
      const { data: farms, error: farmsError } = await vetHelpers.getAssignedFarms(user.id)

      if (farmsError) throw farmsError

      // Fetch livestock from district farms
      const farmIds = (farms || []).map(f => f.id)
      let livestock = []
      if (farmIds.length > 0) {
        const { data: livestockData, error: livestockError } = await supabase
          .from('livestock')
          .select('id, tag_id, name, species, breed, health_status, farm_id')
          .in('farm_id', farmIds)

        if (!livestockError) {
          livestock = livestockData || []
        }
      }

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]

      const activePrescriptions = (treatments || []).filter(
        t => t.withdrawal_end_date >= today
      ).length

      const treatmentsThisWeek = (treatments || []).filter(
        t => t.created_at >= weekAgoStr
      )

      // Get unique farms from treatments
      const uniqueFarmsVisited = new Set(
        treatmentsThisWeek.map(t => t.farmer_id)
      ).size

      // Get unique livestock treated
      const uniqueAnimalsExamined = new Set(
        (treatments || []).map(t => t.livestock_id).filter(Boolean)
      ).size

      // Pending follow-ups: active treatments that need monitoring
      const pendingFollowups = (treatments || []).filter(t => {
        const withdrawalDate = new Date(t.withdrawal_end_date)
        const daysRemaining = Math.ceil((withdrawalDate - new Date()) / (1000 * 60 * 60 * 24))
        return daysRemaining > 0 && daysRemaining <= 7 // Follow-ups needed within a week
      }).length

      // Pending treatment requests from district
      const pendingRequests = (requests || []).filter(
        r => r.status === 'pending' || r.status === 'assigned'
      ).length
      
      // Today's appointments - requests assigned to this vet for today
      const todayRequests = (requests || []).filter(r => {
        if (r.veterinarian_id !== user.id) return false
        const reqDate = new Date(r.consultation_date || r.created_at).toISOString().split('T')[0]
        return reqDate === today && (r.status === 'assigned' || r.status === 'consulted')
      }).length

      setStats({
        activePrescriptions,
        farmsVisited: uniqueFarmsVisited,
        animalsExamined: uniqueAnimalsExamined,
        pendingFollowups,
        treatmentRequests: pendingRequests,
        farmsRegistered: farms?.length || 0,
        todayAppointments: todayRequests,
        totalAnimals: livestock.length,
        districtName: vetDistrict
      })

      // Set upcoming treatments for schedule
      const upcomingActive = (treatments || [])
        .filter(t => t.withdrawal_end_date >= today)
        .sort((a, b) => new Date(a.withdrawal_end_date) - new Date(b.withdrawal_end_date))
        .slice(0, 5)

      setUpcomingTreatments(upcomingActive)

      // Generate alerts from pending requests and follow-ups
      const alerts = []
      
      // Add pending treatment requests as alerts (assigned to this vet)
      const urgentRequests = (requests || [])
        .filter(r => (r.status === 'pending' || r.status === 'assigned') && (r.urgency === 'urgent' || r.urgency === 'emergency'))
        .slice(0, 3)
      
      urgentRequests.forEach(req => {
        alerts.push({
          id: `req-${req.id}`,
          type: req.urgency === 'emergency' ? 'error' : 'warning',
          title: `${req.urgency === 'emergency' ? 'Emergency' : 'Urgent'} Treatment Request`,
          message: `${req.animal_species} - ${req.symptoms?.substring(0, 50) || req.disease || 'Requires attention'}`,
          time: formatTimeAgo(req.created_at)
        })
      })

      // Add follow-up alerts
      const followUpTreatments = (treatments || [])
        .filter(t => {
          const withdrawalDate = new Date(t.withdrawal_end_date)
          const daysRemaining = Math.ceil((withdrawalDate - new Date()) / (1000 * 60 * 60 * 24))
          return daysRemaining > 0 && daysRemaining <= 3
        })
        .slice(0, 2)

      followUpTreatments.forEach(treatment => {
        const daysRemaining = Math.ceil((new Date(treatment.withdrawal_end_date) - new Date()) / (1000 * 60 * 60 * 24))
        alerts.push({
          id: `follow-${treatment.id}`,
          type: 'info',
          title: 'Follow-up Required',
          message: `Withdrawal period ending in ${daysRemaining} day(s) - ${treatment.drug_name}`,
          time: formatTimeAgo(treatment.created_at)
        })
      })

      // Add new farm registration alerts (farms created recently)
      const recentFarms = (farms || [])
        .filter(f => {
          const farmDate = new Date(f.created_at)
          const threeDaysAgo = new Date()
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
          return farmDate >= threeDaysAgo
        })
        .slice(0, 1)

      recentFarms.forEach(farm => {
        alerts.push({
          id: `farm-${farm.id}`,
          type: 'info',
          title: 'New Farm Registration',
          message: `Farm ID: ${farm.farm_id} registered`,
          time: formatTimeAgo(farm.created_at)
        })
      })

      setRecentAlerts(alerts.length > 0 ? alerts : [
        {
          id: 'no-alerts',
          type: 'success',
          title: 'All Clear',
          message: 'No urgent alerts at this time. Keep up the good work!',
          time: 'Now'
        }
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Format time ago helper
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  const quickActions = [
    {
      title: 'Recent Requests',
      description: 'View treatment requests',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
      href: '/vet/requests'
    },
    {
      title: 'Create Prescription',
      description: 'Write new prescription',
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500',
      href: '/vet/prescriptions'
    },
    {
      title: 'Treatment Analytics',
      description: 'Review treatment data',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      href: '/vet/alerts'
    },
    {
      title: 'Treatment History',
      description: 'View past treatments',
      icon: BeakerIcon,
      color: 'bg-orange-500',
      href: '/app/administration'
    },
    {
      title: 'Farms Registered',
      description: 'View all registered farms',
      icon: BuildingOfficeIcon,
      color: 'bg-teal-500',
      href: '/vet/farms-patients'
    },
    {
      title: 'Alerts',
      description: 'View all alerts',
      icon: BellAlertIcon,
      color: 'bg-red-500',
      href: '/vet/alerts'
    }
  ]

  // Filter drug database based on search
  const filteredDrugs = useMemo(() => {
    if (!drugSearchTerm.trim()) {
      return drugDatabase.slice(0, 5) // Show first 5 drugs by default
    }
    
    const searchLower = drugSearchTerm.toLowerCase()
    return drugDatabase.filter(drug => 
      drug.salt_name.toLowerCase().includes(searchLower) ||
      drug.category.toLowerCase().includes(searchLower)
    ).slice(0, 10) // Show max 10 results
  }, [drugSearchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-white rounded-lg bg-gradient-to-r from-blue-600 to-purple-600"
      >
        <h1 className="mb-2 text-2xl font-bold">{getGreeting()}, {profile?.name || user?.name || 'Doctor'}! 👩‍⚕️</h1>
        <p className="opacity-90">Your veterinary practice overview {stats.districtName ? `- ${stats.districtName} District` : ''}</p>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-3 rounded-lg bg-white/20 animate-pulse">
                <div className="w-12 h-6 mb-2 rounded bg-white/30"></div>
                <div className="w-24 h-4 rounded bg-white/30"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
            <div className="p-3 rounded-lg bg-white/20">
              <div className="text-lg font-semibold">{stats.activePrescriptions}</div>
              <div className="text-sm opacity-90">Active Prescriptions</div>
            </div>
            <div className="p-3 rounded-lg bg-white/20">
              <div className="text-lg font-semibold">{stats.farmsVisited}</div>
              <div className="text-sm opacity-90">Farms This Week</div>
            </div>
            <div className="p-3 rounded-lg bg-white/20">
              <div className="text-lg font-semibold">{stats.animalsExamined}</div>
              <div className="text-sm opacity-90">Animals Examined</div>
            </div>
            <div className="p-3 rounded-lg bg-white/20">
              <div className="text-lg font-semibold">{stats.pendingFollowups}</div>
              <div className="text-sm opacity-90">Pending Follow-ups</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Appointments"
          value={loading ? "..." : (stats.todayAppointments || 0).toString()}
          change={loading ? "" : stats.todayAppointments > 0 ? "Scheduled today" : "No appointments"}
          changeType={stats.todayAppointments > 0 ? "positive" : "neutral"}
          icon={CalendarDaysIcon}
          color="blue"
        />
        <StatCard
          title="Prescriptions Written"
          value={loading ? "..." : stats.activePrescriptions.toString()}
          change={loading ? "" : "Active treatments"}
          changeType="positive"
          icon={ClipboardDocumentListIcon}
          color="green"
        />
        <StatCard
          title="Treatment Requests"
          value={loading ? "..." : stats.treatmentRequests.toString()}
          change="Pending review"
          changeType="warning"
          icon={DocumentTextIcon}
          color="orange"
        />
        <StatCard
          title="Farms Registered"
          value={loading ? "..." : stats.farmsRegistered.toString()}
          change="In system"
          changeType="positive"
          icon={BuildingOfficeIcon}
          color="teal"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuickActions actions={quickActions} />
          
          {/* Today's Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Treatments</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 rounded-lg animate-pulse bg-gray-50">
                    <div className="w-48 h-4 mb-2 bg-gray-200 rounded"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : upcomingTreatments.length > 0 ? (
              <div className="space-y-3">
                {upcomingTreatments.map((treatment, index) => {
                  const daysRemaining = Math.ceil((new Date(treatment.withdrawal_end_date) - new Date()) / (1000 * 60 * 60 * 24))
                  const colors = ['blue', 'yellow', 'green', 'purple', 'pink']
                  const color = colors[index % colors.length]
                  return (
                    <div key={treatment.id} className={`flex items-center justify-between p-3 rounded-lg bg-${color}-50`}>
                      <div>
                        <div className="font-medium text-gray-900">{treatment.drug_name || treatment.salt_name}</div>
                        <div className="text-sm text-gray-600">
                          {treatment.category} - Withdrawal ends in {daysRemaining} days
                        </div>
                      </div>
                      <div className={`text-sm text-${color}-600`}>
                        {new Date(treatment.withdrawal_end_date).toLocaleDateString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming treatments</p>
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          <AlertsPanel alerts={recentAlerts} />
          
          {/* Drug Database Quick Access */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Drug Database</h3>
            <div className="space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="Search drugs by name or category..."
                  value={drugSearchTerm}
                  onChange={(e) => setDrugSearchTerm(e.target.value)}
                  className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2 overflow-y-auto max-h-96">
                {filteredDrugs.length > 0 ? (
                  filteredDrugs.map((drug) => (
                    <div key={drug.id} className="p-3 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{drug.salt_name}</div>
                          <div className="mt-1 text-xs text-gray-600">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full mr-2">
                              {drug.category}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            <div>Withdrawal: <span className="font-semibold text-orange-600">{drug.withdrawal_period_days} days</span></div>
                            <div className="mt-1">
                              <span className="text-gray-500">MRL Milk:</span> {drug.mrl_limit_milk}
                            </div>
                            {drug.mrl_limit_meat && (
                              <div>
                                <span className="text-gray-500">MRL Meat:</span> {drug.mrl_limit_meat}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <BeakerIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No drugs found</p>
                  </div>
                )}
              </div>
              
              {!drugSearchTerm && (
                <p className="mt-2 text-xs text-center text-gray-500">
                  Showing {filteredDrugs.length} of {drugDatabase.length} drugs
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default VeterinarianDashboard
