import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CalendarIcon, 
  DocumentCheckIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ClockIcon,
  BeakerIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import StatCard from '../../components/common/StatCard'
import QuickActions from '../../components/common/QuickActions'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { getAssignedFarms } from '../../services/collectorHelpers'
import toast from 'react-hot-toast'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const CollectorDashboard = () => {
  const { profile, user } = useAuthStore()
  const navigate = useNavigate()
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [loading, setLoading] = useState(true)
  const [farms, setFarms] = useState([])
  const [batches, setBatches] = useState([])
  const [collectionSchedule, setCollectionSchedule] = useState([])
  const [collectionHistory, setCollectionHistory] = useState([])

  // Load real data from Supabase
  useEffect(() => {
    if (user?.id) {
      loadCollectorData()
    }
  }, [user])

  const loadCollectorData = async () => {
    try {
      setLoading(true)

      // Get assigned farms
      const assignedFarms = await getAssignedFarms(user.id)
      setFarms(assignedFarms)

      // Get batches created by this collector
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('collector_id', user.id)
        .order('created_at', { ascending: false })

      if (batchesError) throw batchesError
      setBatches(batchesData || [])

      // Get collection records for this collector
      const { data: collectionRecords, error: recordsError } = await supabase
        .from('collection_records')
        .select('*')
        .eq('collector_id', user.id)
        .order('collection_date', { ascending: false })
        .limit(20)

      if (recordsError) throw recordsError
      setCollectionHistory(collectionRecords || [])

      // Get today's scheduled collections (from assigned farms)
      const today = new Date().toISOString().split('T')[0]
      const scheduledToday = assignedFarms.map(farm => ({
        id: farm.id,
        farmId: farm.farm_id,
        farmName: farm.name || farm.farmer_name,
        status: collectionRecords?.some(r => 
          r.farm_id === farm.id && r.collection_date?.startsWith(today)
        ) ? 'completed' : 'pending',
        collectionTime: '08:00 AM', // Default time
        expectedVolume: farm.avgDailyYield || 0
      }))
      setCollectionSchedule(scheduledToday)

    } catch (error) {
      console.error('Error loading collector data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }
  
  // Calculate real stats from loaded data
  const activeBatch = batches.find(b => b.status === 'active')
  const todayScheduled = collectionSchedule.length
  const todayCompleted = collectionSchedule.filter(
    c => c.status === 'completed'
  ).length
  const farmsAtRisk = farms.filter(
    f => f.status === 'warning' || f.status === 'blocked' || f.livestock_on_withdrawal > 0
  ).length
  const totalFarms = farms.length

  const stats = {
    scheduledCollections: todayScheduled,
    completedToday: todayCompleted,
    pendingCompliance: farmsAtRisk,
    totalFarms: totalFarms,
    batchProgress: activeBatch ? Math.round((activeBatch.currentVolume / activeBatch.capacity) * 100) : 0,
    batchVolume: activeBatch ? activeBatch.currentVolume : 0
  }

  const upcomingCollections = collectionSchedule
    .filter(c => c.status === 'pending')
    .slice(0, 3)

  const recentActivities = collectionHistory
    .slice(0, 5)
    .map((record, idx) => {
      const farm = farms.find(f => f.id === record.farm_id)
      const status = record.acceptance_status || 'accepted'
      const timeDiff = new Date() - new Date(record.collection_date)
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
      const timeText = hoursAgo < 1 ? 'Just now' : 
                       hoursAgo < 24 ? `${hoursAgo} hours ago` : 
                       `${Math.floor(hoursAgo / 24)} days ago`
      
      return {
        id: record.id,
        type: status === 'accepted' ? 'success' : 'warning',
        message: `${status === 'accepted' ? 'Collected' : 'Rejected'} ${record.quantity_collected || 0}L from ${farm?.name || farm?.farmer_name || 'Unknown Farm'}`,
        time: timeText,
        status: status
      }
    })

  const quickActions = [
    {
      title: "Daily Collection",
      description: "Start collecting from farms",
      icon: TruckIcon,
      color: "bg-gradient-to-r from-blue-500 to-cyan-500",
      href: "/collector/daily-collection"
    },
    {
      title: "My Assigned Farms",
      description: "View all assigned farms",
      icon: MapPinIcon,
      color: "bg-green-500",
      href: "/collector/assigned-farms"
    },
    {
      title: "Batch & Tanker",
      description: "Manage active batch",
      icon: ArchiveBoxIcon,
      color: "bg-purple-500",
      href: "/collector/batch-tanker"
    },
    {
      title: "Lab Samples",
      description: "Track sent samples",
      icon: BeakerIcon,
      color: "bg-orange-500",
      href: "/collector/lab-samples"
    },
    {
      title: "Collection History",
      description: "View past collections",
      icon: ClockIcon,
      color: "bg-indigo-500",
      href: "/collector/collection-history"
    },
    {
      title: "Analytics",
      description: "View detailed analytics",
      icon: ChartBarIcon,
      color: "bg-pink-500",
      href: "/app/analytics"
    }
  ]

  return (
    <div className="space-y-8">
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
                        activity.status === 'accepted' ? 'bg-green-500' :
                        activity.status === 'rejected' ? 'bg-red-500' :
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
        className="p-8 text-white shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold">{getGreeting()}, {profile?.name || user?.name || 'Collector'}!</h1>
            <p className="text-lg opacity-90">Today's collection overview and farm updates</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4 md:mt-0">
            {loading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white/20 rounded-xl animate-pulse">
                    <div className="rounded w-7 h-7 bg-white/30"></div>
                    <div>
                      <div className="w-12 h-6 mb-1 rounded bg-white/30"></div>
                      <div className="w-16 h-3 rounded bg-white/30"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <CalendarIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{stats.scheduledCollections}</div>
                <div className="text-xs opacity-90">Scheduled</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <CheckCircleIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{stats.completedToday}</div>
                <div className="text-xs opacity-90">Completed</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <ExclamationTriangleIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{stats.pendingCompliance}</div>
                <div className="text-xs opacity-90">At Risk</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/20 rounded-xl">
              <MapPinIcon className="w-7 h-7 text-white/90" />
              <div>
                <div className="text-xl font-semibold">{stats.totalFarms}</div>
                <div className="text-xs opacity-90">Total Farms</div>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Scheduled Collections"
          value={stats.scheduledCollections}
          icon={CalendarIcon}
          color="blue"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday}
          icon={TruckIcon}
          color="green"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Farms at Risk"
          value={stats.pendingCompliance}
          icon={ExclamationTriangleIcon}
          color="orange"
          trend={{ value: 2, isPositive: false }}
        />
        <StatCard
          title="Total Farms"
          value={stats.totalFarms}
          icon={MapPinIcon}
          color="purple"
          trend={{ value: 5, isPositive: true }}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <QuickActions actions={quickActions} />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Scheduled Collections - 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <div className="h-full p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Scheduled Collections</h2>
              <button 
                onClick={() => navigate('/collector/daily-collection')}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 border border-gray-200 rounded-xl animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="w-32 h-5 mb-2 bg-gray-200 rounded"></div>
                          <div className="w-48 h-4 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-16 h-10 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : upcomingCollections.length > 0 ? (
                upcomingCollections.map((collection) => (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 transition-all border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{collection.farmName}</h3>
                          <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                            {collection.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{collection.farmId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{collection.collectionTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="mb-2 text-lg font-bold text-gray-900">{collection.expectedVolume}L</p>
                        <button 
                          onClick={() => navigate('/collector/daily-collection')}
                          className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <CalendarIcon className="w-16 h-16 mx-auto text-gray-300" />
                  <p className="mt-4 text-gray-500">No scheduled collections for today</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity - 1 column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="h-full p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <button
                onClick={() => setShowAllActivities(true)}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {loading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg animate-pulse">
                      <div className="w-2 h-2 mt-2 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="w-48 h-4 mb-2 bg-gray-200 rounded"></div>
                        <div className="w-24 h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : recentActivities.length === 0 ? (
                <div className="py-12 text-center">
                  <ClockIcon className="w-16 h-16 mx-auto text-gray-300" />
                  <p className="mt-4 text-gray-500">No recent activities</p>
                </div>
              ) : recentActivities.slice(0, showAllActivities ? recentActivities.length : 4).map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 transition-all border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Batch Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Current Batch Status</h2>
          {activeBatch && (
            <span className="px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
              Active
            </span>
          )}
        </div>
        
        {activeBatch ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="p-4 bg-white rounded-xl">
                <p className="text-sm font-medium text-gray-600">Batch ID</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{activeBatch.batchId}</p>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <p className="text-sm font-medium text-gray-600">Capacity</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {activeBatch.currentVolume}L / {activeBatch.capacity}L
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl">
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="mt-1 text-lg font-bold text-blue-600">{stats.batchProgress}%</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full h-4 overflow-hidden bg-gray-200 rounded-full">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.batchProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                />
              </div>
              <p className="mt-2 text-sm text-center text-gray-600">
                {stats.batchProgress >= 80 ? 'Ready to seal' : `${100 - stats.batchProgress}% remaining`}
              </p>
            </div>
            
            <button
              onClick={() => navigate('/collector/batch-tanker')}
              className="w-full py-3 font-medium text-white transition-colors bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              View Batch Details
            </button>
          </div>
        ) : (
          <div className="py-12 text-center">
            <ArchiveBoxIcon className="w-16 h-16 mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500">No active batch at the moment</p>
            <button
              onClick={() => navigate('/collector/batch-tanker')}
              className="px-6 py-2 mt-4 font-medium text-blue-600 transition-colors bg-white rounded-lg hover:bg-blue-50"
            >
              Start New Batch
            </button>
          </div>
        )}
      </motion.div>

      {/* Farm Risk Alerts */}
      {stats.pendingCompliance > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 border border-orange-200 shadow-lg bg-orange-50 rounded-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900">
                {stats.pendingCompliance} Farm{stats.pendingCompliance > 1 ? 's' : ''} Require Attention
              </h3>
              <p className="mt-1 text-sm text-orange-700">
                Some farms have active withdrawal periods or recent MRL failures. Review before collection.
              </p>
              <button
                onClick={() => navigate('/collector/assigned-farms')}
                className="px-4 py-2 mt-3 text-sm font-medium text-white transition-colors bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                View Risk Farms
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default CollectorDashboard
