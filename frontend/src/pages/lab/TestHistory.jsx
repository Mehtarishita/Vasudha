import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const TestHistory = () => {
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [samples, setSamples] = useState([])
  const [farmsMap, setFarmsMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Load completed tests from Supabase
  const loadHistory = async () => {
    try {
      setLoading(true)

      // 1. Completed = status 'tested' AND assigned to this lab user
      const { data: rows, error } = await supabase
        .from('samples')
        .select('*')
        .eq('status', 'tested')
        .eq('assigned_to', user?.id)
        .order('test_completed_at', { ascending: false })

      if (error) throw error

      setSamples(rows || [])

      // 2. Fetch farms for nice farm names (optional but useful)
      const farmIds = Array.from(
        new Set((rows || []).map((s) => s.farm_id).filter(Boolean))
      )

      if (farmIds.length) {
        const { data: farmRows, error: farmErr } = await supabase
          .from('farms')
          .select('id, name, farm_id')
          .in('id', farmIds)

        if (farmErr) throw farmErr

        const map = {}
        ;(farmRows || []).forEach((f) => {
          map[f.id] = {
            name: f.name,
            code: f.farm_id
          }
        })
        setFarmsMap(map)
      } else {
        setFarmsMap({})
      }
    } catch (err) {
      console.error('Error loading test history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadHistory()
    }
  }, [user])

  // Filter by search term
  const filteredSamples = samples.filter((sample) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true

    const labId = (sample.lab_internal_id || sample.sample_code || '').toLowerCase()
    const batchId = (sample.batch_id || '').toLowerCase()
    const farmName = (farmsMap[sample.farm_id]?.name || '').toLowerCase()
    const dateStr = sample.test_completed_at
      ? new Date(sample.test_completed_at).toLocaleDateString('en-IN').toLowerCase()
      : ''

    return (
      labId.includes(term) ||
      batchId.includes(term) ||
      farmName.includes(term) ||
      dateStr.includes(term)
    )
  })

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 sm:p-6 text-white"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <ArchiveBoxIcon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-100" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Test History & Archives</h1>
            <p className="text-sm sm:text-base opacity-90">Search and view completed test records</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Batch ID, Lab ID, Farm Name, or Date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Results Table */}
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
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Farm Name</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sample Type</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Completed Date</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">MRL Status</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Certificate ID</th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-8 text-center text-gray-500 text-sm"
                  >
                    Loading completed tests...
                  </td>
                </tr>
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-8 text-center text-gray-500 text-sm"
                  >
                    No completed tests found.
                  </td>
                </tr>
              ) : (
                filteredSamples.map((sample) => {
                  const labId =
                    sample.lab_internal_id || sample.sample_code || '—'
                  const farm = farmsMap[sample.farm_id]
                  const farmName = farm
                    ? `${farm.farm_id ? farm.farm_id + ' • ' : ''}${farm.name}`
                    : '—'
                  const completedDate = sample.test_completed_at
                    ? new Date(sample.test_completed_at).toLocaleDateString(
                        'en-IN'
                      )
                    : '—'
                  const mrlStatus = sample.lab_status // 'pass' | 'fail' | null
                  const certificateId = sample.certificate_id || '—'

                  return (
                    <tr key={sample.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {labId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {sample.batch_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {farmName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          {sample.sample_type || 'milk'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {completedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {mrlStatus === 'pass' ? (
                          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            PASS
                          </span>
                        ) : mrlStatus === 'fail' ? (
                          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            <XCircleIcon className="w-4 h-4 mr-1" />
                            FAIL
                          </span>
                        ) : (
                          <span className="flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            <ArchiveBoxIcon className="w-4 h-4 mr-1" />
                            UNKNOWN
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {certificateId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                          onClick={() => {
                            // wire this to your report page later, e.g. navigate(`/lab/report/${sample.id}`)
                            console.log('View report for sample', sample.id)
                          }}
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-1" />
                          View Report
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default TestHistory
