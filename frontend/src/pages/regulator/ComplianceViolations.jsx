import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  DocumentTextIcon,
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

const ComplianceViolations = () => {
  const { user } = useAuthStore()
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)
  
  const [activeTab, setActiveTab] = useState('mrl-failures')
  const [mrlFailures, setMrlFailures] = useState([])
  const [repeatOffenders, setRepeatOffenders] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(false)

  const [pageFailures, setPageFailures] = useState(1)
  const [pageOffenders, setPageOffenders] = useState(1)
  const [pageActions, setPageActions] = useState(1)

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

  // Load data once on mount
  useEffect(() => {
    const loadData = async () => {
      if (!regulatorType) return
      
      setLoading(true)
      try {
        // Build queries with jurisdiction filtering
        let failuresQuery = supabase
          .from('mrl_violation_events')
          .select('*')
          .order('test_completed_at', { ascending: false, nullsFirst: false })
          .limit(500)
        
        let offendersQuery = supabase
          .from('mrl_repeat_offenders_farms')
          .select('*')
          .order('violation_count', { ascending: false })
          .limit(200)
        
        let actionsQuery = supabase
          .from('regulatory_actions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
        
        // Apply jurisdiction filters
        if (regulatorType === 'state' && jurisdiction?.state) {
          failuresQuery = failuresQuery.eq('farm_state', jurisdiction.state)
          offendersQuery = offendersQuery.eq('farm_state', jurisdiction.state)
          // Filter actions by checking if entity_type is 'farm' and filtering by state
          // For farms, we need to join with farms table or use entity_public_id pattern
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          failuresQuery = failuresQuery
            .eq('farm_state', jurisdiction.state)
            .eq('farm_district', jurisdiction.district)
          offendersQuery = offendersQuery
            .eq('farm_state', jurisdiction.state)
            .eq('farm_district', jurisdiction.district)
        }

        const [{ data: failures, error: failuresError }, { data: offenders, error: offendersError }, { data: actionsData, error: actionsError }] =
          await Promise.all([
            failuresQuery,
            offendersQuery,
            actionsQuery
          ])

        if (failuresError) throw failuresError
        if (offendersError) throw offendersError
        if (actionsError) throw actionsError

        // Post-filter regulatory actions based on jurisdiction
        // Since regulatory_actions may not have direct state/district fields,
        // we filter by matching entity IDs from jurisdiction-filtered violations
        let filteredActions = actionsData || []
        
        if (regulatorType !== 'central' && failures && failures.length > 0) {
          // Get farm IDs and sample IDs from jurisdiction-filtered failures
          const jurisdictionSampleIds = new Set(failures.map(f => f.sample_id))
          const jurisdictionBatchIds = new Set(failures.map(f => f.batch_id).filter(Boolean))
          const jurisdictionFarmIds = new Set(failures.map(f => f.farm_id).filter(Boolean))
          
          // Filter actions that relate to jurisdiction entities
          filteredActions = filteredActions.filter(action => {
            // Keep if related to a jurisdiction sample/batch
            if (action.related_sample_id && jurisdictionSampleIds.has(action.related_sample_id)) return true
            if (action.related_batch_id && jurisdictionBatchIds.has(action.related_batch_id)) return true
            
            // Keep if entity is a farm in jurisdiction
            if (action.entity_type === 'farm' && action.entity_id && jurisdictionFarmIds.has(action.entity_id)) return true
            
            // For central regulators, keep all
            return false
          })
        }

        setMrlFailures(failures || [])
        setRepeatOffenders(offenders || [])
        setActions(filteredActions)
      } catch (err) {
        console.error('Error loading compliance data:', err)
        toast.error('Failed to load compliance & violations data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [regulatorType, jurisdiction])

  const summary = useMemo(() => {
    const totalFailures = mrlFailures.length
    const totalOffenderFarms = repeatOffenders.length
    const openActions = actions.filter(a => a.status === 'open').length
    const closedActions = actions.filter(a => a.status === 'closed').length

    return {
      totalFailures,
      totalOffenderFarms,
      openActions,
      closedActions
    }
  }, [mrlFailures, repeatOffenders, actions])

  const getStatusBadge = (row) => {
    if (row.lab_status === 'fail') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
          <XCircleIcon className="w-3 h-3 mr-1" />
          MRL FAIL
        </span>
      )
    }
    if (row.lab_status === 'pass') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          MRL PASS
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
        {row.lab_status || 'Unknown'}
      </span>
    )
  }

  const getRiskBadge = (row) => {
    const hasHighRisk = !!row.high_risk_drugs
    const isBatchFlagged = !!row.batch_flagged
    const hasViolationText = !!row.mrl_violation

    if (isBatchFlagged || hasHighRisk || hasViolationText) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 rounded-full bg-red-50">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          High Risk
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 rounded-full bg-gray-50">
        —
      </span>
    )
  }

  const getPipelineBadge = (status) => {
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

  const severityColor = (count) => {
    if (count >= 10) return 'bg-red-100 text-red-800'
    if (count >= 5) return 'bg-orange-100 text-orange-800'
    if (count >= 2) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const actionStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const currentMrlPage = useMemo(() => {
    const start = (pageFailures - 1) * PAGE_SIZE
    return mrlFailures.slice(start, start + PAGE_SIZE)
  }, [mrlFailures, pageFailures])

  const currentOffendersPage = useMemo(() => {
    const start = (pageOffenders - 1) * PAGE_SIZE
    return repeatOffenders.slice(start, start + PAGE_SIZE)
  }, [repeatOffenders, pageOffenders])

  const currentActionsPage = useMemo(() => {
    const start = (pageActions - 1) * PAGE_SIZE
    return actions.slice(start, start + PAGE_SIZE)
  }, [actions, pageActions])

  const totalMrlPages = Math.max(1, Math.ceil(mrlFailures.length / PAGE_SIZE))
  const totalOffenderPages = Math.max(1, Math.ceil(repeatOffenders.length / PAGE_SIZE))
  const totalActionsPages = Math.max(1, Math.ceil(actions.length / PAGE_SIZE))

  const handleExportFailures = async () => {
    try {
      setExporting(true)
      if (!mrlFailures.length) {
        toast('No MRL failures to export')
        return
      }

      const rows = mrlFailures
      const keys = [
        'sample_code',
        'batch_id',
        'lab_status',
        'pipeline_status',
        'test_completed_at',
        'farm_public_id',
        'farm_name',
        'farm_state',
        'farm_district',
        'farm_pincode',
        'mrl_violation',
        'compliance_score',
        'batch_mrl_status'
      ]

      const csv = [
        keys.join(','),
        ...rows.map(row =>
          keys
            .map(k =>
              `"${String(row[k] ?? '')
                .replace(/"/g, '""')
                .replace(/\n/g, ' ')}"`
            )
            .join(',')
        )
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      document.body.appendChild(a)
      a.href = url
      a.download = 'mrl_failure_log.csv'
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('MRL failure log exported')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance & Violations</h1>
          <p className="text-gray-600">
            State / national regulator view – track MRL failures, repeat offenders, and enforcement actions.
          </p>
          {jurisdiction && regulatorType !== 'central' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full">
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
                Jurisdiction: {jurisdiction.state}
                
              </span>
              <span className="text-xs text-gray-500">
                ({regulatorType === 'state' ? 'State' : regulatorType === 'district' ? 'District' : 'Block'} Level)
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleExportFailures}
          disabled={exporting}
          className="inline-flex items-center px-4 py-2 text-sm bg-white border rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          {exporting ? 'Exporting…' : 'Export MRL Failures'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border border-red-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Total MRL Failures</div>
              <div className="text-2xl font-bold text-red-600">{summary.totalFailures}</div>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            From laboratory test data (samples table)
          </p>
        </div>

        <div className="p-4 bg-white border border-orange-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Repeat Offender Farms</div>
              <div className="text-2xl font-bold text-orange-500">{summary.totalOffenderFarms}</div>
            </div>
            <FlagIcon className="w-8 h-8 text-orange-500" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Farms with ≥ 2 MRL violations
          </p>
        </div>

        <div className="p-4 bg-white border border-yellow-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Open Enforcement Actions</div>
              <div className="text-2xl font-bold text-yellow-600">{summary.openActions}</div>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Warnings, show-cause notices, penalties
          </p>
        </div>

        <div className="p-4 bg-white border border-green-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Closed Actions</div>
              <div className="text-2xl font-bold text-green-600">{summary.closedActions}</div>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-green-600" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Resolved with corrective action
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('mrl-failures')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mrl-failures'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            MRL Failure Log
          </button>
          <button
            onClick={() => setActiveTab('repeat-offenders')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'repeat-offenders'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Repeat Offenders (Farms)
          </button>
          <button
            onClick={() => setActiveTab('action-tracker')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'action-tracker'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Enforcement Action Tracker
          </button>
        </nav>
      </div>

      {/* MRL Failures Tab */}
      {activeTab === 'mrl-failures' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Sample / Batch
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Farm
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Region
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Result
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Violation Details
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Risk / Flag
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentMrlPage.map(row => (
                  <tr key={row.sample_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-mono text-xs text-gray-900">
                        {row.sample_code}
                      </div>
                      <div className="text-xs text-gray-500">
                        Batch: {row.batch_id || '—'}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {getPipelineBadge(row.pipeline_status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-semibold text-gray-900">
                        {row.farm_name || 'Unlinked farm'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {row.farm_public_id || ''}{row.farm_public_id && ' • '}{row.farmer_name || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div>{row.farm_state || '—'}</div>
                      <div className="text-[11px] text-gray-500">
                        {row.farm_district || ''}{row.farm_pincode ? ` • ${row.farm_pincode}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="mb-1">{getStatusBadge(row)}</div>
                      <div className="text-[11px] text-gray-500">
                        Batch: {row.batch_mrl_status || '—'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Compliance score: {row.compliance_score ?? '—'}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-gray-700">
                      {row.mrl_violation ? (
                        <p className="line-clamp-3">{row.mrl_violation}</p>
                      ) : row.high_risk_drugs ? (
                        <p className="line-clamp-3">
                          High-risk drugs: {JSON.stringify(row.high_risk_drugs)}
                        </p>
                      ) : (
                        <span className="text-gray-400">No details recorded</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {getRiskBadge(row)}
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
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            View lab report
                          </a>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center text-red-600 hover:text-red-800"
                          onClick={() => {
                            console.log('View full details for sample', row.sample_id)
                          }}
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-1" />
                          Full case file
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && !currentMrlPage.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-sm text-center text-gray-500"
                    >
                      No MRL violations found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination for MRL Failures */}
          {mrlFailures.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <div className="text-xs text-gray-600">
                Showing{' '}
                <span className="font-semibold">
                  {Math.min((pageFailures - 1) * PAGE_SIZE + 1, mrlFailures.length)}
                </span>{' '}
                to{' '}
                <span className="font-semibold">
                  {Math.min(pageFailures * PAGE_SIZE, mrlFailures.length)}
                </span>{' '}
                of <span className="font-semibold">{mrlFailures.length}</span> failures
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageFailures === 1}
                  onClick={() => setPageFailures(p => Math.max(1, p - 1))}
                  className="px-3 py-1 text-xs border rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-700">
                  Page {pageFailures} of {totalMrlPages}
                </span>
                <button
                  type="button"
                  disabled={pageFailures === totalMrlPages}
                  onClick={() =>
                    setPageFailures(p => Math.min(totalMrlPages, p + 1))
                  }
                  className="px-3 py-1 text-xs border rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="px-4 py-2 text-xs text-gray-500">
              Loading violations…
            </div>
          )}
        </motion.div>
      )}

      {/* Repeat Offenders Tab */}
      {activeTab === 'repeat-offenders' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {currentOffendersPage.map(offender => (
            <div
              key={offender.farm_id}
              className="p-6 bg-white border-l-4 border-red-500 shadow-sm rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <FlagIcon className="w-6 h-6 text-red-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {offender.farm_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {offender.farm_public_id} • {offender.farmer_name || 'Farmer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {offender.farm_state || '—'}
                        {offender.farm_district ? ` • ${offender.farm_district}` : ''}
                        {offender.farm_pincode ? ` • ${offender.farm_pincode}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Violations</div>
                      <div className="flex items-center mt-1 space-x-2">
                        <div className="text-2xl font-bold text-red-600">
                          {offender.violation_count}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor(
                            offender.violation_count
                          )}`}
                        >
                          {offender.violation_count >= 10
                            ? 'Severe'
                            : offender.violation_count >= 5
                            ? 'High'
                            : 'Moderate'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Last Violation</div>
                      <div className="mt-1 font-medium text-gray-900">
                        {offender.last_violation_at
                          ? new Date(
                              offender.last_violation_at
                            ).toLocaleDateString('en-IN')
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Location</div>
                      <div className="mt-1 text-sm text-gray-800">
                        {offender.farm_location || '—'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col ml-6 space-y-2">
                  <button className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">
                    Recommend Suspension
                  </button>
                  <button className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                    Issue Show-Cause Notice
                  </button>
                  <button className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                    View Farm Profile
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loading && !currentOffendersPage.length && (
            <div className="py-10 text-sm text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
              No repeat-offender farms found yet.
            </div>
          )}

          {repeatOffenders.length > 0 && (
            <div className="flex items-center justify-between px-1 py-2 text-xs text-gray-600">
              <span>
                Showing farms with repeated MRL failures. Use this list to
                prioritise inspections and enforcement.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageOffenders === 1}
                  onClick={() => setPageOffenders(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {pageOffenders} of {totalOffenderPages}
                </span>
                <button
                  type="button"
                  disabled={pageOffenders === totalOffenderPages}
                  onClick={() =>
                    setPageOffenders(p => Math.min(totalOffenderPages, p + 1))
                  }
                  className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Enforcement Action Tracker Tab */}
      {activeTab === 'action-tracker' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Enforcement Action Tracker
              </h2>
              <p className="text-xs text-gray-500">
                View warnings, notices, penalties and suspensions recorded in <code>regulatory_actions</code>.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Reason / Notes
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Linked Sample / Batch
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-left text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentActionsPage.map(action => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-gray-900">
                        {action.entity_name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {action.entity_type.toUpperCase()}
                        {action.entity_public_id ? ` • ${action.entity_public_id}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div className="font-medium">
                        {action.action_type || '—'}
                      </div>
                      {action.action_level && (
                        <div className="text-[11px] text-gray-500">
                          Level: {action.action_level}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${actionStatusColor(
                          action.status
                        )}`}
                      >
                        {action.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-gray-700">
                      {action.reason && (
                        <p className="mb-1 line-clamp-2">{action.reason}</p>
                      )}
                      {action.notes && (
                        <p className="line-clamp-2 text-[11px] text-gray-500">
                          Notes: {action.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {action.related_sample_id && (
                        <div className="text-[11px] text-gray-600">
                          Sample: {action.related_sample_id}
                        </div>
                      )}
                      {action.related_batch_id && (
                        <div className="text-[11px] text-gray-600">
                          Batch: {action.related_batch_id}
                        </div>
                      )}
                      {!action.related_sample_id && !action.related_batch_id && (
                        <span className="text-gray-400 text-[11px]">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {action.created_at
                        ? new Date(action.created_at).toLocaleString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                ))}

                {!loading && !currentActionsPage.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-sm text-center text-gray-500"
                    >
                      No enforcement actions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {actions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-600 border-t bg-gray-50">
              <div>
                Tracking {actions.length} actions. Use this to audit follow-up on
                MRL and AMU non-compliance.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageActions === 1}
                  onClick={() => setPageActions(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {pageActions} of {totalActionsPages}
                </span>
                <button
                  type="button"
                  disabled={pageActions === totalActionsPages}
                  onClick={() =>
                    setPageActions(p => Math.min(totalActionsPages, p + 1))
                  }
                  className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="px-4 py-2 text-xs text-gray-500">
              Loading actions…
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default ComplianceViolations
