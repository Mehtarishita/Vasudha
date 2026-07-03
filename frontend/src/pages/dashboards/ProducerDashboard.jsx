import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
  BellAlertIcon,
  CheckCircleIcon,
  BoltIcon,
  PlayCircleIcon,
  ChartBarIcon,
  XMarkIcon,
  ClockIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { getLivestockStats } from '../../services/livestockHelpers'
import { getTreatments, getActiveTreatments } from '../../services/treatmentHelpers'
import { supabase } from '../../config/supabase'
import toast from 'react-hot-toast'

// Components
import StatCard from '../../components/common/StatCard'
import QuickActions from '../../components/common/QuickActions'
import RecentActivity from '../../components/common/RecentActivity'
import WeatherWidget from '../../components/common/WeatherWidget'
import { href } from 'react-router-dom'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const ProducerDashboard = () => {
  const { profile, user } = useAuthStore()
  const [stats, setStats] = useState({
    totalLivestock: 0,
    activeLivestock: 0,
    underWithdrawal: 0,
    healthyLivestock: 0,
    complianceScore: 0
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)

  // Fetch dashboard data
  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch livestock stats
      const livestockStats = await getLivestockStats(user.id)
      
      // Calculate compliance score based on data
      const complianceScore = calculateComplianceScore(
        livestockStats.total,
        livestockStats.healthy,
        livestockStats.underTreatment
      )
      
      setStats({
        totalLivestock: livestockStats.total,
        activeLivestock: livestockStats.total - livestockStats.underTreatment,
        underWithdrawal: livestockStats.underTreatment,
        healthyLivestock: livestockStats.healthy,
        complianceScore: complianceScore
      })

      // Fetch recent activities
      await loadRecentActivities()
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const calculateComplianceScore = (total, healthy, underTreatment) => {
    if (total === 0) return 0
    
    // Base score from healthy livestock percentage
    const healthyPercentage = (healthy / total) * 100
    
    // Penalty for high withdrawal rate
    const withdrawalPercentage = (underTreatment / total) * 100
    const withdrawalPenalty = withdrawalPercentage > 20 ? 15 : withdrawalPercentage > 10 ? 10 : 5
    
    // Calculate final score
    const score = Math.max(0, Math.min(100, healthyPercentage - withdrawalPenalty))
    
    return Math.round(score)
  }

  const loadRecentActivities = async () => {
    try {
      // Fetch recent treatments
      const treatments = await getTreatments(user.id)
      const recentTreatments = treatments.slice(0, 10)

      // Fetch recent samples (if available)
      const { data: samples } = await supabase
        .from('samples')
        .select('*, livestock:livestock_id(tag_id)')
        .eq('farmer_id', user.id)
        .order('collection_date', { ascending: false })
        .limit(5)

      // Get active treatments for alerts
      const activeTreatments = await getActiveTreatments(user.id)
      
      // Combine and format activities
      const activities = []
      
      // Add treatment records
      recentTreatments.forEach(treatment => {
        activities.push({
          id: `treatment-${treatment.id}`,
          type: 'treatment',
          message: `Administered ${treatment.drug_name} to ${treatment.livestock?.species || 'Livestock'} #${treatment.livestock?.tag_id || treatment.livestock_id}`,
          time: formatTimeAgo(treatment.administration_date),
          status: 'success'
        })
      })

      // Add sample collection records
      samples?.forEach(sample => {
        activities.push({
          id: `sample-${sample.id}`,
          type: 'sample',
          message: `${sample.sample_type} sample collected from ${sample.livestock?.tag_id || 'Livestock'}`,
          time: formatTimeAgo(sample.collection_date),
          status: sample.test_result === 'pending' ? 'pending' : 'success'
        })
      })

      // Add withdrawal ending alerts
      activeTreatments?.slice(0, 3).forEach(treatment => {
        const daysRemaining = Math.ceil(
          (new Date(treatment.withdrawal_end_date) - new Date()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysRemaining <= 3 && daysRemaining > 0) {
          activities.push({
            id: `alert-${treatment.id}`,
            type: 'alert',
            message: `Withdrawal period ending in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} for ${treatment.livestock?.species || 'Livestock'} #${treatment.livestock_tag_id}`,
            time: formatTimeAgo(treatment.administration_date),
            status: 'warning'
          })
        }
      })

      // Sort by most recent and limit to 5
      activities.sort((a, b) => {
        // Simple sorting - you can enhance this
        return 0
      })

      setRecentActivities(activities.slice(0, 5))
      
    } catch (error) {
      console.error('Error loading recent activities:', error)
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const quickActions = [
    {
      title: 'Record Treatment',
      description: 'Log new treatment details',
      icon: BoltIcon,
      color: 'bg-gradient-to-r from-green-500 to-blue-500',
      href: '/app/administration'
    },
    {
      title: 'Scanner',
      description: 'AI-powered medicine scanner',
      icon: QrCodeIcon,
      color: 'bg-blue-500',
      href: '/app/treatment-recording'
    },
    {
      title: 'How to Start',
      description: 'Watch tutorial videos',
      icon: PlayCircleIcon,
      color: 'bg-purple-500',
      href:'/app/information'
    },
    {
      title: 'View Livestock',
      description: 'Manage livestock profiles',
      icon: UserGroupIcon,
      color: 'bg-orange-500',
      href: '/app/animals'
    },
    {
      title: 'Alerts & Notifications',
      description: 'View all alerts',
      icon: BellAlertIcon,
      color: 'bg-red-500',
      href: '/producer/alerts'
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics',
      icon: ChartBarIcon,
      color: 'bg-indigo-500',
      href: '/app/analytics'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Video Tutorial Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">How to Use VASUDHA</h2>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6 overflow-hidden bg-gray-900 aspect-video rounded-xl">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white">
                      <PlayCircleIcon className="w-20 h-20 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Video Player</p>
                      <p className="text-sm opacity-75">Tutorial video will be embedded here</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <h3 className="mb-2 font-semibold text-gray-900">Getting Started</h3>
                    <p className="text-sm text-gray-600">Learn the basics of VASUDHA platform</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <h3 className="mb-2 font-semibold text-gray-900">Recording Treatment</h3>
                    <p className="text-sm text-gray-600">How to record livestock treatments</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <h3 className="mb-2 font-semibold text-gray-900">Using Scanner</h3>
                    <p className="text-sm text-gray-600">Guide to QR code scanning</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Activities Modal */}
      <AnimatePresence>
        {showAllActivities && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAllActivities(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-3xl overflow-hidden bg-white shadow-2xl rounded-2xl max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">All Recent Activities</h2>
                <button
                  onClick={() => setShowAllActivities(false)}
                  className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className={`w-2 h-2 mt-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.message}</p>
                        <p className="text-sm text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header with quick stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 text-white shadow-lg bg-gradient-to-r from-green-700 to-blue-700 rounded-2xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">{getGreeting()}, {profile?.name || user?.name || 'Livestock Owner'}! <span role='img' aria-label='sunrise'>🌅</span></h1>
            <p className="text-lg opacity-90">Today's livestock overview and important updates</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4 md:mt-0">
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <UserGroupIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{loading ? '...' : stats.totalLivestock}</div>
                <div className="text-xs opacity-90">Total Livestock</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <CheckCircleIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{loading ? '...' : stats.activeLivestock}</div>
                <div className="text-xs opacity-90">Active Livestock</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <ClockIcon className="text-yellow-300 w-7 h-7" />
              <div>
                <div className="text-xl font-semibold">{loading ? '...' : stats.underWithdrawal}</div>
                <div className="text-xs opacity-90">Under Withdrawal</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <HeartIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{loading ? '...' : stats.healthyLivestock}</div>
                <div className="text-xs opacity-90">Healthy Livestock</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Livestock"
          value={stats.totalLivestock}
          change="+2 this week"
          changeType="positive"
          icon={UserGroupIcon}
          color="blue"
        />
        <StatCard
          title="Active Livestock"
          value={stats.activeLivestock}
          change="Healthy & productive"
          changeType="positive"
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Under Withdrawal"
          value={stats.underWithdrawal}
          change="3 ending soon"
          changeType="neutral"
          icon={ClockIcon}
          color="yellow"
        />
        <StatCard
          title="Compliance Score"
          value={`${stats.complianceScore}%`}
          change="+5% this month"
          changeType="positive"
          icon={CheckCircleIcon}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Quick Actions */}
          <QuickActions actions={quickActions} />

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <button
                onClick={() => setShowAllActivities(true)}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-sm">Loading activities...</p>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No recent activities</p>
                  <p className="text-xs mt-1">Start by recording treatments or managing livestock</p>
                </div>
              ) : (
                recentActivities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                  >
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* How to Use Video Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">How to Use VASUDHA</h3>
            
            <div 
              className="mb-4 overflow-hidden transition-transform cursor-pointer bg-gradient-to-br from-blue-100 to-purple-100 aspect-video rounded-xl hover:scale-105"
              onClick={() => setShowVideoModal(true)}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <PlayCircleIcon className="w-16 h-16 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold text-gray-800">Watch Tutorial</p>
                  <p className="text-xs text-gray-600">Learn how to get started</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowVideoModal(true)}
                className="w-full px-4 py-3 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <span className="flex items-center justify-center gap-2">
                  <PlayCircleIcon className="w-5 h-5" />
                  Watch Getting Started Guide
                </span>
              </button>
              <p className="text-xs text-center text-gray-500">
                Quick tutorials on using all features
              </p>
            </div>
          </motion.div>

          {/* Weather Widget */}
          <WeatherWidget location="Maharashtra, India" />
        </div>
      </div>
    </div>
  )
}

export default ProducerDashboard