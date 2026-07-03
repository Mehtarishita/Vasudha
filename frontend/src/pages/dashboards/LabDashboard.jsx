import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  InboxArrowDownIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import StatCard from '../../components/common/StatCard'
import QuickActions from '../../components/common/QuickActions'
import WeatherWidget from '../../components/common/WeatherWidget'
import { supabase } from '../../config/supabase'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const LabDashboard = () => {
  const { profile, user } = useAuthStore()

  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completedToday: 0,
    mrlFailures: 0,
    urgent: 0,
    testedThisWeek: 0,
    avgTATHours: null,
    passRate: null
  })
  const [todayQueue, setTodayQueue] = useState([])
  const [loading, setLoading] = useState(true)

  const quickActions = [
    {
      title: 'Sample Reception',
      description: 'Check-in new samples',
      icon: InboxArrowDownIcon,
      color: 'bg-gradient-to-r from-blue-500 to-purple-500',
      href: '/lab/sample-reception'
    },
    {
      title: 'Pending Tests',
      description: 'View worklist',
      icon: ClockIcon,
      color: 'bg-orange-500',
      href: '/lab/pending-queue'
    },
    {
      title: 'Upload Results',
      description: 'Submit MRL data',
      icon: ArrowUpTrayIcon,
      color: 'bg-green-500',
      href: '/lab/upload-results'
    },
    {
      title: 'MRL Standards',
      description: 'Reference database',
      icon: BeakerIcon,
      color: 'bg-indigo-500',
      href: '/lab/mrl-standards'
    }
  ]

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const now = new Date()
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        )
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(startOfWeek.getDate() - 7)

        // Fetch samples from last 7 days with farm details
        const { data, error } = await supabase
          .from('samples')
          .select(
            `
            *,
            farms (
              name,
              farm_id
            )
          `
          )
          .gte('collected_at', startOfWeek.toISOString())
          .order('collected_at', { ascending: false })

        if (error) throw error

        const samples = data || []

        // Normalize dates
        const isSameDay = (d1, d2) =>
          d1.toDateString() === d2.toDateString()

        const today = new Date()

        // Stats
        const pending = samples.filter((s) => s.status === 'pending').length
        const inProgress = samples.filter(
          (s) => s.status === 'in-transit'
        ).length
        const completedToday = samples.filter(
          (s) =>
            s.status === 'tested' &&
            s.test_completed_at &&
            isSameDay(new Date(s.test_completed_at), today)
        ).length
        const mrlFailures = samples.filter(
          (s) => s.lab_status === 'fail'
        ).length
        const urgent = samples.filter(
          (s) =>
            (s.priority === 'urgent' || s.priority === 'Urgent') &&
            (s.status === 'pending' || s.status === 'in-transit')
        ).length

        // Weekly tested stats
        const testedSamples = samples.filter(
          (s) => s.status === 'tested' && s.test_completed_at
        )

        let avgTATHours = null
        let passRate = null

        if (testedSamples.length > 0) {
          const diffs = testedSamples
            .filter((s) => s.collected_at)
            .map((s) => {
              const start = new Date(s.collected_at)
              const end = new Date(s.test_completed_at)
              return (end - start) / (1000 * 60 * 60) // hours
            })
            .filter((h) => !isNaN(h))

          if (diffs.length > 0) {
            avgTATHours =
              diffs.reduce((sum, h) => sum + h, 0) / diffs.length
          }

          const passCount = testedSamples.filter(
            (s) => s.lab_status === 'pass'
          ).length
          passRate = (passCount / testedSamples.length) * 100
        }

        // Today's queue: pending / in-transit collected today
        const todayQueue = samples
          .filter(
            (s) =>
              (s.status === 'pending' || s.status === 'in-transit') &&
              s.collected_at &&
              isSameDay(new Date(s.collected_at), today)
          )
          .slice(0, 5)

        setStats({
          pending,
          inProgress,
          completedToday,
          mrlFailures,
          urgent,
          testedThisWeek: testedSamples.length,
          avgTATHours,
          passRate
        })
        setTodayQueue(todayQueue)
      } catch (err) {
        console.error('Error loading lab dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600"
      >
        <h1 className="mb-2 text-2xl font-bold">
          {getGreeting()}, {profile?.name || user?.name || 'Lab Team'}!
        </h1>
        <p className="opacity-90">
          Laboratory Testing & Sample Management Dashboard
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Samples"
          value={stats.pending}
          change={
            stats.urgent > 0 ? `${stats.urgent} Urgent` : 'Awaiting Testing'
          }
          changeType={stats.urgent > 0 ? 'negative' : 'neutral'}
          icon={BeakerIcon}
          color="orange"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          change="Under Analysis"
          changeType="neutral"
          icon={ClockIcon}
          color="blue"
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday}
          change="Tests Finished"
          changeType={stats.completedToday > 0 ? 'positive' : 'neutral'}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="MRL Failures"
          value={stats.mrlFailures}
          change="Violations Found"
          changeType={stats.mrlFailures > 0 ? 'negative' : 'neutral'}
          icon={ExclamationTriangleIcon}
          color="red"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuickActions actions={quickActions} />

          {/* Today's Sample Queue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Today&apos;s Sample Queue
              </h3>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View All
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : todayQueue.length === 0 ? (
              <p className="text-sm text-gray-500">
                No samples in today&apos;s queue.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 text-sm font-medium text-left text-gray-900">
                        Lab ID
                      </th>
                      <th className="py-2 text-sm font-medium text-left text-gray-900">
                        Farm
                      </th>
                      <th className="py-2 text-sm font-medium text-left text-gray-900">
                        Sample Type
                      </th>
                      <th className="py-2 text-sm font-medium text-left text-gray-900">
                        Status
                      </th>
                      <th className="py-2 text-sm font-medium text-left text-gray-900">
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {todayQueue.map((sample) => {
                      const labId =
                        sample.lab_internal_id ||
                        sample.sample_code ||
                        sample.id
                      const farmName =
                        sample.farms?.name || sample.farms?.farm_id || '—'
                      const sampleType =
                        (sample.sample_type || 'milk')
                          .charAt(0)
                          .toUpperCase() +
                        (sample.sample_type || 'milk').slice(1)
                      const statusLabel =
                        sample.status === 'pending'
                          ? 'Pending'
                          : sample.status === 'in-transit'
                          ? 'In Transit'
                          : sample.status
                      const priority =
                        sample.priority ||
                        sample.priority === ''
                          ? sample.priority
                          : 'normal'
                      const priorityLower = (priority || 'normal').toLowerCase()

                      return (
                        <tr key={sample.id} className="hover:bg-gray-50">
                          <td className="py-3 text-sm font-medium text-gray-900">
                            {labId}
                          </td>
                          <td className="py-3 text-sm text-gray-600">
                            {farmName}
                          </td>
                          <td className="py-3 text-sm text-gray-600">
                            {sampleType}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                sample.status === 'pending'
                                  ? 'text-yellow-800 bg-yellow-100'
                                  : 'text-blue-800 bg-blue-100'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                priorityLower === 'urgent'
                                  ? 'text-red-800 bg-red-100'
                                  : priorityLower === 'high'
                                  ? 'text-orange-800 bg-orange-100'
                                  : 'text-blue-800 bg-blue-100'
                              }`}
                            >
                              {priority
                                ? priority.charAt(0).toUpperCase() +
                                  priority.slice(1)
                                : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          <WeatherWidget />

          {/* Equipment Status (still static, operational UI info) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Equipment Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">HPLC System</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">
                    Operational
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Mass Spectrometer
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">
                    Operational
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Centrifuge</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-600">
                    Maintenance Due
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats - This Week (from Supabase) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              This Week
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Samples Tested
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {stats.testedThisWeek}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Average TAT
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {stats.avgTATHours != null
                    ? `${stats.avgTATHours.toFixed(1)} h`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Pass Rate
                </span>
                <span className="text-lg font-bold text-green-600">
                  {stats.passRate != null
                    ? `${stats.passRate.toFixed(0)}%`
                    : '—'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LabDashboard
