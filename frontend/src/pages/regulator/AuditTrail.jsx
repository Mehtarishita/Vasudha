import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const PER_PAGE = 12

const downloadCSV = (rows, filename = 'audit-trail.csv') => {
  if (!rows || rows.length === 0) return
  const keys = Object.keys(rows[0])
  const csv = [
    keys.join(','),
    ...rows.map(r =>
      keys
        .map(k =>
          `"${String(r[k] ?? '')
            .replace(/"/g, '""')
            .replace(/\n/g, ' ')}"`
        )
        .join(',')
    )
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const AuditTrail = () => {
  const { user } = useAuthStore()
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)
  
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  // Fetch regulator type and jurisdiction
  useEffect(() => {
    const fetchRegulatorType = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('regulator_verifications')
          .select('regulator_type, state, district')
          .eq('user_id', user.id)
          .eq('status', 'verified')
          .single()
        
        if (error) {
          console.error('Error fetching regulator verification:', error)
          return
        }
        
        if (data) {
          setRegulatorType(data.regulator_type)
          setJurisdiction(data)
        }
      } catch (err) {
        console.error('Error in fetchRegulatorType:', err)
      }
    }
    
    fetchRegulatorType()
  }, [user])

  // 🔗 Load audit logs from Supabase
  useEffect(() => {
    const loadLogs = async () => {
      if (!regulatorType) return
      
      setLoading(true)
      try {
        // Note: audit_logs table doesn't have state/district columns in schema
        // Central regulators see all logs, state/district regulators see all for now
        // TODO: Add state/district to audit_logs or filter by user_role/user_id
        const { data, error } = await supabase
          .from('audit_logs')
          .select(
            'id, event_id, event_time, user_name, user_role, event_type, action, details, resource_type, resource_id, ip_address'
          )
          .order('event_time', { ascending: false })
          .limit(1000)

        if (error) throw error
        setLogs(data || [])
      } catch (err) {
        console.error('Error loading audit logs:', err)
        toast.error('Failed to load audit trail')
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [regulatorType, jurisdiction])

  // 🔍 Filter in-memory (simpler, fine up to a few thousand rows)
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (typeFilter !== 'all' && l.event_type !== typeFilter) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        (l.event_id && l.event_id.toLowerCase().includes(q)) ||
        (l.user_name && l.user_name.toLowerCase().includes(q)) ||
        (l.user_role && l.user_role.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.resource_type && l.resource_type.toLowerCase().includes(q)) ||
        (l.resource_id && l.resource_id.toLowerCase().includes(q))
      )
    })
  }, [logs, query, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  const typeColor = (type) => {
    switch (type) {
      case 'ERROR':
        return 'text-red-600'
      case 'WARN':
        return 'text-orange-600'
      case 'SECURITY':
        return 'text-purple-600'
      case 'COMPLIANCE':
        return 'text-blue-600'
      default:
        return 'text-green-600'
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      if (!filtered.length) {
        toast('No audit entries to export')
        return
      }
      downloadCSV(
        filtered.map((l) => ({
          event_id: l.event_id,
          event_time: l.event_time,
          user_name: l.user_name,
          user_role: l.user_role,
          event_type: l.event_type,
          action: l.action,
          details: l.details,
          resource_type: l.resource_type,
          resource_id: l.resource_id,
          ip_address: l.ip_address
        })),
        'audit-trail.csv'
      )
      toast.success('Audit CSV exported')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export audit CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">
            Complete audit and activity logging for all regulator, lab, and field actions — searchable,
            filterable, and exportable.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            disabled={exporting || !filtered.length}
            className="inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filters + table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        {/* Search & filters */}
        <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by user, action, id, resource..."
                className="py-2 pl-10 pr-4 border rounded-md w-72 focus:ring-2 focus:ring-green-500"
              />
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            </div>

            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="py-2 pl-2 pr-3 text-sm border rounded-md"
              >
                <option value="all">All Types</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="SECURITY">SECURITY</option>
                <option value="COMPLIANCE">COMPLIANCE</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Showing <strong>{filtered.length}</strong> of {logs.length} log entries
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="px-3 py-2">Event ID</th>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {log.event_id || log.id}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {log.event_time
                      ? new Date(log.event_time).toLocaleString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm text-gray-900">
                      {log.user_name || 'System'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {log.user_role || ''}
                    </div>
                  </td>
                  <td className={`py-2 px-3 text-sm font-medium ${typeColor(log.event_type)}`}>
                    {log.event_type}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-800">
                    {log.action}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {log.resource_type && (
                      <span className="font-medium">
                        {log.resource_type.toUpperCase()}
                      </span>
                    )}
                    {log.resource_id && (
                      <span className="ml-1 text-gray-500">
                        ({log.resource_id})
                      </span>
                    )}
                    {(!log.resource_type && !log.resource_id) && (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}

              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-sm text-center text-gray-500">
                    No audit events found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="mt-3 text-xs text-gray-500">
            Loading audit logs…
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border rounded-md disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default AuditTrail
