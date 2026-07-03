import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'

const CollectionHistory = () => {
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const { user } = useAuthStore()
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (user?.id) {
      fetchHistory()
    }
    // eslint-disable-next-line
  }, [user])

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_records')
        .select('id, farm_id, quantity_collected, collection_date, collection_time, unit, can_accept, rejection_reason, notes, created_at, updated_at, farm:farms(name, location)')
        .eq('collector_id', user.id)
        .order('collection_date', { ascending: false })
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      setHistory([])
    }
  }

  const filteredHistory = history.filter((record) => {
    const status = record.can_accept ? 'accepted' : 'rejected'
    const matchesStatus = filterStatus === 'all' || status === filterStatus
    const matchesSearch =
      (record.farm_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.farm?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const stats = {
    total: history.length,
    accepted: history.filter(r => r.can_accept).length,
    rejected: history.filter(r => !r.can_accept).length,
    totalVolume: history.filter(r => r.can_accept).reduce((sum, r) => sum + (r.quantity_collected || 0), 0)
  }

  const getStatusIcon = (status) => {
    return status === 'accepted'
      ? <CheckCircleIcon className="w-6 h-6 text-green-600" />
      : <XCircleIcon className="w-6 h-6 text-red-600" />
  }

  const handleExportReport = () => {
    const csvData = filteredHistory.map(record => ({
      Date: new Date(record.collection_date).toLocaleDateString(),
      Time: record.collection_time,
      'Farm ID': record.farm_id,
      'Farm Name': record.farm?.name,
      'Volume (L)': record.quantity_collected,
      Status: (record.can_accept ? 'ACCEPTED' : 'REJECTED'),
      Reason: record.rejection_reason || record.notes || '-'
    }))
    if (csvData.length === 0) return
    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `collection-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collection History</h1>
          <p className="mt-1 text-sm text-gray-500">Digital logbook of all collections</p>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export Report
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Total Collections</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Accepted</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{stats.accepted}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Rejected</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{stats.rejected}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Total Volume</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{stats.totalVolume}L</p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('accepted')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filterStatus === 'accepted'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Accepted ({stats.accepted})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filterStatus === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected ({stats.rejected})
            </button>
          </div>
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search by farm ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Collection Records */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Farm ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Farm Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason / Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => {
                const status = record.can_accept ? 'accepted' : 'rejected'
                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(record.collection_date).toLocaleDateString('en-IN')}
                      </div>
                      <div className="text-sm text-gray-500">{record.collection_time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{record.farm_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.farm?.name}</div>
                      <div className="text-sm text-gray-500">{record.farm?.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">{record.quantity_collected}L</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {getStatusIcon(status)}
                        {status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {record.rejection_reason || record.notes || 'Normal collection - all checks passed'}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="p-12 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search term
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default CollectionHistory
