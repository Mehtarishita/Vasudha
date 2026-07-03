import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ClockIcon,
  BeakerIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const PendingQueue = () => {
  const { user, profile } = useAuthStore()

const [samples, setSamples] = useState([])
const [collectorsMap, setCollectorsMap] = useState({})
  const [loading, setLoading] = useState(true)

  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [modalSample, setModalSample] = useState(null)
  const [modalForm, setModalForm] = useState({
    priority: 'normal',
    analystName: ''
  })
  const [saving, setSaving] = useState(false)

  const priorityOptions = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' }
  ]

  // ---------- Helpers ----------

  const loadQueue = async () => {
    try {
      setLoading(true)

      // 1. Get samples that are accepted at reception and not yet tested
      const { data: sampleRows, error: sampleErr } = await supabase
        .from('samples')
        .select('*')
        .eq('reception_status', 'accepted')
        .eq('status', 'in-transit')
        .order('priority', { ascending: true })
        .order('test_started_at', { ascending: true, nullsFirst: true })

      if (sampleErr) throw sampleErr

      setSamples(sampleRows || [])

      // 2. Fetch farms for nice names
      // 2. Fetch collector profiles for name & display id
const collectorIds = Array.from(
  new Set((sampleRows || []).map((s) => s.collector_id).filter(Boolean))
)

if (collectorIds.length) {
  const { data: collectorRows, error: collectorErr } = await supabase
    .from('profiles')
    .select('id, name, unique_id')
    .in('id', collectorIds)

  if (collectorErr) throw collectorErr

  const map = {}
  ;(collectorRows || []).forEach((c) => {
    map[c.id] = {
      name: c.name,
      displayId: c.unique_id || (c.id ? c.id.slice(0, 8) : '')
    }
  })
  setCollectorsMap(map)
} else {
  setCollectorsMap({})
}

    } catch (err) {
      console.error('Error loading pending queue:', err)
      toast.error('Failed to load pending test queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
    // eslint-disable-next-line
  }, [])

  const getPriorityColor = (priorityRaw) => {
    const priority = (priorityRaw || 'normal').toLowerCase()
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'normal':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

const getStatusColor = (sample) => {
  if (sample.test_started_at) {
    return 'bg-blue-100 text-blue-800' // in progress
  }
  return 'bg-yellow-100 text-yellow-800' // pending in queue
}


  const displayPriority = (priorityRaw) => {
    const p = (priorityRaw || 'normal').toLowerCase()
    if (p === 'urgent') return 'Urgent'
    if (p === 'high') return 'High'
    return 'Normal'
  }

  // ---------- Derived lists ----------

  const pendingSamples = samples

  const filteredSamples = pendingSamples.filter((sample) => {
    const p = (sample.priority || 'normal').toLowerCase()
    const matchesFilter = filter === 'all' || p === filter
    const collector = collectorsMap[sample.collector_id]
    const collectorName = collector?.name || ''
    const collectorDisplayId = collector?.displayId || ''
    const labId = sample.lab_internal_id || sample.sample_code
    const batchId = sample.batch_id || ''
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term ||
      labId.toLowerCase().includes(term) ||
      batchId.toLowerCase().includes(term) ||
      collectorName.toLowerCase().includes(term) ||
      collectorDisplayId.toLowerCase().includes(term)
    return matchesFilter && matchesSearch
  })

  const countByPriority = (target) =>
    pendingSamples.filter(
      (s) => (s.priority || 'normal').toLowerCase() === target
    ).length

 const inProgressCount = pendingSamples.filter(
  (s) => !!s.test_started_at
).length


  // ---------- Modal handlers ----------

  const openStartTestModal = (sample) => {
    setModalSample(sample)
    setModalForm({
      priority: (sample.priority || 'normal').toLowerCase(),
      analystName: profile?.name || sample.analyst_name || ''
    })
  }

  const closeModal = () => {
    setModalSample(null)
    setSaving(false)
  }

  const handleStartTestSubmit = async (e) => {
    e.preventDefault()
    if (!modalSample) return

    if (!modalForm.analystName.trim()) {
      toast.error('Please enter analyst name')
      return
    }

    try {
      setSaving(true)

const { error } = await supabase
  .from('samples')
  .update({
    // keep status as 'in-transit' (still in lab pipeline)
    status: 'in-transit',
    priority: modalForm.priority,
    assigned_to: user?.id || null,
    analyst_name: modalForm.analystName.trim(),
    test_started_at: new Date().toISOString()
  })
  .eq('id', modalSample.id)


      if (error) throw error

      toast.success('Test started for this sample')

      // Refresh list and close modal
      await loadQueue()
      closeModal()
    } catch (err) {
      console.error('Error starting test:', err)
      toast.error('Failed to start test. Please try again.')
      setSaving(false)
    }
  }

  // ---------- JSX ----------

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 sm:p-6 text-white"
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Pending Test Queue</h1>
        <p className="text-sm sm:text-base opacity-90">
          Samples accepted at reception and awaiting lab analysis
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-red-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-red-600">
                {countByPriority('urgent')}
              </p>
            </div>
            <BeakerIcon className="w-10 h-10 text-red-600 opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-orange-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">
                {countByPriority('high')}
              </p>
            </div>
            <ClockIcon className="w-10 h-10 text-orange-600 opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-blue-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Normal</p>
              <p className="text-2xl font-bold text-blue-600">
                {countByPriority('normal')}
              </p>
            </div>
            <BeakerIcon className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-purple-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-purple-600">
                {inProgressCount}
              </p>
            </div>
            <ClockIcon className="w-10 h-10 text-purple-600 opacity-20" />
          </div>
        </motion.div>
      </div>

      {/* Filters + Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Lab ID, Batch ID, or Farm Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Samples Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Lab ID</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Batch ID</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Collector</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Collector ID</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sample Type</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Received</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Analyst</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-8 text-center text-gray-500 text-sm"
                  >
                    Loading pending samples...
                  </td>
                </tr>
              ) : filteredSamples.length > 0 ? (
                filteredSamples.map((sample) => {
                  const collector = collectorsMap[sample.collector_id]
                  const collectorName = collector?.name || 'Unknown collector'
                  const collectorDisplayId = collector?.displayId || (sample.collector_id ? sample.collector_id.slice(0, 8) : '—')
                  const labId = sample.lab_internal_id || sample.sample_code
                  return (
                    <tr key={sample.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{labId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{sample.batch_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{collectorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{collectorDisplayId}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">{sample.sample_type || 'milk'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sample.received_at ? new Date(sample.received_at).toLocaleString('en-IN') : '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(sample.priority)}`}>{displayPriority(sample.priority)}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sample)}`}>{sample.test_started_at ? 'IN PROGRESS' : 'PENDING'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sample.analyst_name ? sample.analyst_name : (<span className="text-gray-400 italic">Unassigned</span>)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={() => openStartTestModal(sample)} className="text-purple-600 hover:text-purple-800 font-medium">{sample.test_started_at ? 'Update' : 'Start Test'}</button></td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan="10"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No pending samples found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Start Test Modal */}
      {modalSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800"
              onClick={closeModal}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h2 className="mb-4 text-lg font-bold text-center text-purple-700">
              Start Test
            </h2>

            <div className="mb-4 text-xs text-gray-700 space-y-1">
              <div>
                <span className="font-semibold">Sample Code: </span>
                <span className="font-mono">{modalSample.sample_code}</span>
              </div>
              <div>
                <span className="font-semibold">Lab ID: </span>
                <span className="font-mono">
                  {modalSample.lab_internal_id || modalSample.sample_code}
                </span>
              </div>
              <div>
                <span className="font-semibold">Batch ID: </span>
                <span className="font-mono">{modalSample.batch_id}</span>
              </div>
              <div>
                <span className="font-semibold">Sample Type: </span>
                {modalSample.sample_type || 'milk'}
              </div>
              <div>
                <span className="font-semibold">Received At: </span>
                {modalSample.received_at
                  ? new Date(modalSample.received_at).toLocaleString('en-IN')
                  : '—'}
              </div>
            </div>

            <form onSubmit={handleStartTestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={modalForm.priority}
                  onChange={(e) =>
                    setModalForm((prev) => ({
                      ...prev,
                      priority: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Analyst Name
                </label>
                <input
                  type="text"
                  value={modalForm.analystName}
                  onChange={(e) =>
                    setModalForm((prev) => ({
                      ...prev,
                      analystName: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : modalSample.status === 'in-progress'
                  ? 'Update Test Details'
                  : 'Start Test'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PendingQueue
