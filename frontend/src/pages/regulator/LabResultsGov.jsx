import React, { useEffect, useMemo, useState } from 'react'
import statesData from '../../data/states-and-districts.json'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MapPinIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

const LabResultsGov = () => {
  const { user } = useAuthStore()
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)
  
  const [stateFilter, setStateFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all / pass / fail / untested
  const [dateRange, setDateRange] = useState('30d')       // 7d / 30d / all
  const [searchQuery, setSearchQuery] = useState('')

  const stateOptions = useMemo(() => statesData.states.map(s => s.state), [])
  const [states] = useState(stateOptions)
  const [districts, setDistricts] = useState([])

  const [tests, setTests] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [summary, setSummary] = useState({
    total: 0,
    pass: 0,
    fail: 0,
    highRisk: 0,
    labs: 0
  })

  // --- Date range handling ---
  const fromDateISO = useMemo(() => {
    if (dateRange === 'all') return null
    const now = new Date()
    const days = dateRange === '7d' ? 7 : 30
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return d.toISOString()
  }, [dateRange])

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

  // Update districts when stateFilter changes
  useEffect(() => {
    if (stateFilter === 'all') {
      setDistricts([])
      return
    }
    const stateObj = statesData.states.find(s => s.state === stateFilter)
    setDistricts(stateObj ? stateObj.districts : [])
  }, [stateFilter])

  // --- Unified helper to build a filtered Supabase query ---
 
 const buildFilteredQuery = () => {
  let q = supabase.from('lab_sample_overview')

  // Apply jurisdiction filtering first - filter by FARM location, not lab location
  // (Regulators oversee farms in their jurisdiction, regardless of where samples are tested)
  if (regulatorType === 'state' && jurisdiction?.state) {
    q = q.eq('farm_state', jurisdiction.state)
  } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
    q = q.eq('farm_state', jurisdiction.state).eq('farm_district', jurisdiction.district)
  } else {
    // Only apply manual filters if no jurisdiction restriction
    if (stateFilter !== 'all') {
      q = q.eq('lab_state', stateFilter)
    }
    if (districtFilter !== 'all') {
      q = q.eq('lab_city', districtFilter)
    }
  }

  if (statusFilter === 'pass') {
    q = q.eq('lab_status', 'pass')
  } else if (statusFilter === 'fail') {
    q = q.eq('lab_status', 'fail')
  } else if (statusFilter === 'untested') {
    q = q.is('lab_status', null)
  }

  // 🔹 TEMP: no backend date filter because .filter/.gte not available
  // if (fromDateISO) {
  //   q = q.filter('test_completed_at', 'gte', fromDateISO)
  // }

  if (searchQuery.trim()) {
    const pattern = `%${searchQuery.trim()}%`
    q = q.or(
      `sample_code.ilike.${pattern},batch_id.ilike.${pattern},lab_name.ilike.${pattern},lab_city.ilike.${pattern}`
    )
  }

  return q
}

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [stateFilter, districtFilter, statusFilter, dateRange, searchQuery, regulatorType, jurisdiction])

  // --- Load summary stats (for current filters) ---
  useEffect(() => {
    const loadSummary = async () => {
      if (!regulatorType) return
      
      try {
        // For summary stats, do not use .or() unless searchQuery is present
        const baseSummaryQuery = () => {
          let q = supabase.from('lab_sample_overview')
          
          // Apply jurisdiction filtering by farm location
          if (regulatorType === 'state' && jurisdiction?.state) {
            q = q.eq('farm_state', jurisdiction.state)
          } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
            q = q.eq('farm_state', jurisdiction.state).eq('farm_district', jurisdiction.district)
          } else {
            // Only apply manual filters if no jurisdiction restriction
            if (stateFilter !== 'all') q = q.eq('lab_state', stateFilter)
            if (districtFilter !== 'all') q = q.eq('lab_city', districtFilter)
          }
          
          return q
        }

        const [totalRes, passRes, failRes, highRiskRes, labsRes] = await Promise.all([
          baseSummaryQuery().select('*', { count: 'exact', head: true }),
          baseSummaryQuery().select('*', { count: 'exact', head: true }),
          baseSummaryQuery().select('*', { count: 'exact', head: true }),
          baseSummaryQuery().select('*', { count: 'exact', head: true }),
          baseSummaryQuery().select('lab_user_id')
        ])

        const labsSet = new Set()
        labsRes.data?.forEach((row) => {
          if (row.lab_user_id) labsSet.add(row.lab_user_id)
        })

        setSummary({
          total: totalRes.count || 0,
          pass: passRes.count || 0,
          fail: failRes.count || 0,
          highRisk: highRiskRes.count || 0,
          labs: labsSet.size
        })
      } catch (err) {
        console.error('Error loading summary:', err)
        toast.error('Failed to load lab summary')
      }
    }

    loadSummary()
  }, [stateFilter, districtFilter, statusFilter, dateRange, fromDateISO, searchQuery, regulatorType, jurisdiction])

  // --- Load paginated tests ---
  useEffect(() => {
    const loadTests = async () => {
      if (!regulatorType) return
      setLoading(true)
      try {
        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let query = buildFilteredQuery()

        const { data, error, count } = await query
          .select(
            'sample_id, sample_code, batch_id, status, lab_status, sample_type, collected_at, test_completed_at, priority, mrl_violation, high_risk_drugs, batch_mrl_status, compliance_score, batch_flagged, lab_name, lab_state, lab_city, report_url',
            { count: 'exact' }
          )
          .order('test_completed_at', { ascending: false, nullsFirst: false })
          .range(from, to)

        if (error) throw error

        setTests(data || [])
        setTotalCount(count || 0)
      } catch (err) {
        console.error('Error loading lab tests:', err)
        toast.error('Failed to load lab results')
      } finally {
        setLoading(false)
      }
    }

    loadTests()
  }, [stateFilter, districtFilter, statusFilter, dateRange, fromDateISO, searchQuery, page, regulatorType, jurisdiction])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // --- Export current filtered results to CSV (max 2000 rows) ---
  const handleExport = async () => {
    try {
      let query = buildFilteredQuery()

      const { data, error } = await query
        .select(
          'sample_code, batch_id, lab_name, lab_state, lab_city, status, lab_status, sample_type, collected_at, test_completed_at, batch_mrl_status, compliance_score, batch_flagged, mrl_violation',
          { count: 'exact' }
        )
        .limit(2000)

      if (error) throw error

      if (!data || data.length === 0) {
        toast('No data to export for current filters')
        return
      }

      const rows = data
      const keys = Object.keys(rows[0])
      const csv = [
        keys.join(','),
        ...rows.map((r) =>
          keys
            .map((k) =>
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
      a.download = 'lab_results_export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('Export ready')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export CSV')
    }
  }

  const statusBadge = (status) => {
    if (!status) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
          Not Tested
        </span>
      )
    }
    if (status === 'pass') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          PASS
        </span>
      )
    }
    if (status === 'fail') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
          <XCircleIcon className="w-3 h-3 mr-1" />
          FAIL
        </span>
      )
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
        {status.toUpperCase()}
      </span>
    )
  }

  const pipelineBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'tested') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-green-700 rounded-full bg-green-50">
          Tested
        </span>
      )
    }
    if (s === 'in-transit') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-700 rounded-full bg-blue-50">
          In Transit
        </span>
      )
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-medium text-yellow-700 rounded-full bg-yellow-50">
        Pending
      </span>
    )
  }

  const riskBadge = (row) => {
    if (
      row.batch_flagged ||
      row.mrl_violation ||
      (row.high_risk_drugs && Object.keys(row.high_risk_drugs || {}).length > 0)
    ) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-red-700 rounded-full bg-red-50">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          High Risk
        </span>
      )
    }
    if (row.batch_mrl_status === 'pass' || row.lab_status === 'pass') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium text-green-700 rounded-full bg-green-50">
          Compliant
        </span>
      )
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 rounded-full bg-gray-50">
        -
      </span>
    )
  }

  const districtOptions = useMemo(() => {
    if (stateFilter === 'all') return districts
    return districts
  }, [districts, stateFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-6 text-white rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700"
      >
        <div>
          <h1 className="mb-1 text-2xl font-bold">Laboratory Results Monitoring</h1>
          <p className="text-sm opacity-90">
            Government regulator view – monitor all labs, test outcomes, and MRL compliance across states and districts.
          </p>
        </div>
        <BeakerIcon className="w-10 h-10 opacity-80" />
      </motion.div>

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Total Tests</div>
              <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            </div>
            <ChartBarIcon className="text-blue-600 w-7 h-7" />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Within selected filters</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-green-100 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Pass (MRL)</div>
              <div className="text-2xl font-bold text-green-600">{summary.pass}</div>
            </div>
            <CheckCircleIcon className="text-green-600 w-7 h-7" />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">lab_status = PASS</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-red-100 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Fail (MRL)</div>
              <div className="text-2xl font-bold text-red-600">{summary.fail}</div>
            </div>
            <XCircleIcon className="text-red-600 w-7 h-7" />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">lab_status = FAIL</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-orange-100 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">High-Risk Samples</div>
              <div className="text-2xl font-bold text-orange-500">{summary.highRisk}</div>
            </div>
            <ExclamationTriangleIcon className="text-orange-500 w-7 h-7" />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            With high_risk_drugs / violations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-purple-100 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Active Labs</div>
              <div className="text-2xl font-bold text-purple-600">{summary.labs}</div>
            </div>
            <MapPinIcon className="text-purple-600 w-7 h-7" />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Labs performing tests in this view
          </p>
        </motion.div>
      </div>

      {/* Filters row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-4">
            {/* State */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value)
                  setDistrictFilter('all')
                }}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All States</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* District/City */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                District / City
              </label>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Districts</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Result Status
              </label>
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="pass">Pass Only</option>
                  <option value="fail">Fail Only</option>
                  <option value="untested">Not Tested</option>
                </select>
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Time Window
              </label>
              <div className="flex gap-1">
                {[
                  { key: '7d', label: 'Last 7 days' },
                  { key: '30d', label: 'Last 30 days' },
                  { key: 'all', label: 'All' }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDateRange(opt.key)}
                    className={`px-3 py-1.5 text-xs rounded-full border ${
                      dateRange === opt.key
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search & Export */}
          <div className="flex flex-col w-full gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search lab, sample code, batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pr-3 text-sm border rounded-lg pl-9 focus:ring-2 focus:ring-blue-500"
              />
              <ClockIcon className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              Export CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Lab
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Sample ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Batch
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Sample Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Pipeline
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  MRL Result
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Risk / Flag
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Completed
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((row) => (
                <tr key={row.sample_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {row.lab_name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>{row.lab_state || '—'}</div>
                    <div className="text-[11px] text-gray-500">
                      {row.lab_city || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-800">
                    {row.sample_code}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {row.batch_id || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex px-2 py-1 font-medium text-indigo-700 rounded-full bg-indigo-50">
                      {row.sample_type || 'milk'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {pipelineBadge(row.status)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {statusBadge(row.lab_status)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {riskBadge(row)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {row.test_completed_at
                      ? new Date(row.test_completed_at).toLocaleString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col gap-1">
                      {row.report_url && (
                        <a
                          href={row.report_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          View Report
                        </a>
                      )}
                      <button
                        type="button"
                        className="text-gray-600 hover:text-gray-900"
                        onClick={() => {
                          console.log('Sample details', row.sample_id)
                        }}
                      >
                        More details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && tests.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-sm text-center text-gray-500"
                  >
                    No lab tests found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-xs text-gray-600">
              Showing{' '}
              <span className="font-semibold">
                {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}
              </span>{' '}
              to{' '}
              <span className="font-semibold">
                {Math.min(page * PAGE_SIZE, totalCount)}
              </span>{' '}
              of <span className="font-semibold">{totalCount}</span> tests
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs border rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-700">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="px-4 py-2 text-xs text-gray-500">
            Loading laboratory results…
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default LabResultsGov
