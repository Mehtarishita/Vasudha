import React, { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const ComplianceReports = () => {
  const { user } = useAuthStore()
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)
  
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('last_30_days')
  const [loading, setLoading] = useState(false)

  // Live data state
  const [overview, setOverview] = useState({
    totalFarms: 0,
    compliantFarms: 0,
    nonCompliantFarms: 0,
    complianceRate: 0,
    pendingInspections: 0,
    criticalViolations: 0
  })

  const [mrlSummary, setMrlSummary] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    complianceRate: 0
  })

  const [amuSummary, setAmuSummary] = useState({
    totalRecords: 0,
    compliant: 0,
    nonCompliant: 0,
    underWithdrawal: 0,
    overdueWithdrawal: 0,
    complianceRate: 0
  })

  const [violations, setViolations] = useState([])      // violations list (from MRL)
  const [metrics, setMetrics] = useState([])            // metrics cards
  const [inspections, setInspections] = useState([])    // inspections table
  const [samples, setSamples] = useState([])            // raw sample rows (for export + charts)
  const [amuRecords, setAmuRecords] = useState([])      // raw AMU rows (for charts)

  // Schedule inspection modal
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [inspectionDraft, setInspectionDraft] = useState(null)
  const [inspectionForm, setInspectionForm] = useState({
    scheduled_date: '',
    inspection_type: 'Violation Investigation',
    priority: 'high',
    inspector_name: '',
    notes: ''
  })

  // ----- Helpers -----
  
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

  const getFromDate = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case 'last_7_days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'last_30_days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case 'last_90_days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      case 'last_year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      default:
        return null
    }
  }, [dateRange])

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_investigation': return 'bg-yellow-100 text-yellow-800'
      case 'penalty_issued': return 'bg-red-100 text-red-800'
      case 'corrective_action': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return <span className="text-green-600">↗</span>
      case 'declining': return <span className="text-red-600">↘</span>
      case 'stable': return <span className="text-gray-600">→</span>
      default: return null
    }
  }

  // ----- Load data from Supabase -----

  useEffect(() => {
    const loadData = async () => {
      if (!regulatorType) return
      
      setLoading(true)
      try {
        const fromDate = getFromDate
        const today = new Date()

        // 1) Total farms - apply jurisdiction filtering
        let farmsQuery = supabase.from('farms').select('id', { count: 'exact', head: true })
        
        if (regulatorType === 'state' && jurisdiction?.state) {
          farmsQuery = farmsQuery.eq('state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          farmsQuery = farmsQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district)
        }

        const { count: totalFarms, error: farmsError } = await farmsQuery

        if (farmsError) throw farmsError

        // 2) MRL samples (sample_compliance_overview) - filter by farm jurisdiction
        let samplesQuery = supabase
          .from('sample_compliance_overview')
          .select('*')
          .order('test_completed_at', { ascending: false })
          .limit(2000)
        
        if (regulatorType === 'state' && jurisdiction?.state) {
          samplesQuery = samplesQuery.eq('farm_state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          samplesQuery = samplesQuery
            .eq('farm_state', jurisdiction.state)
            .eq('farm_district', jurisdiction.district)
        }

        const { data: sampleRows, error: samplesError } = await samplesQuery

        if (samplesError) throw samplesError

        let filteredSamples = sampleRows || []
        if (fromDate) {
          filteredSamples = filteredSamples.filter(row => {
            if (!row.test_completed_at) return false
            return new Date(row.test_completed_at) >= fromDate
          })
        }
        setSamples(filteredSamples)

        // 3) AMU records (amu_compliance_overview) - filter by farm jurisdiction
        let amuQuery = supabase
          .from('amu_compliance_overview')
          .select('*')
          .order('administration_date', { ascending: false })
          .limit(2000)
        
        if (regulatorType === 'state' && jurisdiction?.state) {
          amuQuery = amuQuery.eq('farm_state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          amuQuery = amuQuery
            .eq('farm_state', jurisdiction.state)
            .eq('farm_district', jurisdiction.district)
        }

        const { data: amuRows, error: amuError } = await amuQuery

        if (amuError) throw amuError

        let filteredAmu = amuRows || []
        if (fromDate) {
          filteredAmu = filteredAmu.filter(row => {
            if (!row.administration_date) return false
            return new Date(row.administration_date) >= fromDate
          })
        }
        setAmuRecords(filteredAmu)

        // 4) Inspections (schedule + status) - filter by jurisdiction
        let inspQuery = supabase
          .from('inspections')
          .select('*')
          .order('scheduled_date', { ascending: true })
          .limit(500)
        
        if (regulatorType === 'state' && jurisdiction?.state) {
          inspQuery = inspQuery.eq('state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          inspQuery = inspQuery
            .eq('state', jurisdiction.state)
            .eq('district', jurisdiction.district)
        }

        const { data: inspectionRows, error: inspError } = await inspQuery

        if (inspError) throw inspError

        let filteredInspections = inspectionRows || []
        if (fromDate) {
          filteredInspections = filteredInspections.filter(row => {
            if (!row.scheduled_date) return false
            return new Date(row.scheduled_date) >= fromDate
          })
        }
        setInspections(filteredInspections)

        // ----- MRL summary -----
        const totalTests = filteredSamples.length
        const passedTests = filteredSamples.filter(r => r.lab_status === 'pass').length
        const failedTests = filteredSamples.filter(r => r.lab_status === 'fail').length
        const mrlComplianceRate = totalTests
          ? Number(((passedTests / totalTests) * 100).toFixed(1))
          : 0

        setMrlSummary({
          totalTests,
          passedTests,
          failedTests,
          complianceRate: mrlComplianceRate
        })

        // ----- AMU summary -----
        const totalAMU = filteredAmu.length
        const compliant = filteredAmu.filter(r => r.compliance_status === 'compliant').length
        const nonCompliant = filteredAmu.filter(
          r =>
            r.compliance_status &&
            r.compliance_status !== 'compliant' &&
            r.compliance_status !== 'pending'
        ).length

        let underWithdrawal = 0
        let overdueWithdrawal = 0
        filteredAmu.forEach(r => {
          if (!r.withdrawal_end_date) return
          const end = new Date(r.withdrawal_end_date)
          if (r.status === 'active') {
            if (today <= end) underWithdrawal += 1
            if (today > end) overdueWithdrawal += 1
          }
        })

        const amuComplianceRate = totalAMU
          ? Number(((compliant / totalAMU) * 100).toFixed(1))
          : 0

        setAmuSummary({
          totalRecords: totalAMU,
          compliant,
          nonCompliant,
          underWithdrawal,
          overdueWithdrawal,
          complianceRate: amuComplianceRate
        })

        // ----- Overall overview -----
        const nonCompliantSampleRows = filteredSamples.filter(row =>
          row.lab_status === 'fail' ||
          !!row.mrl_violation ||
          (row.high_risk_drugs && Object.keys(row.high_risk_drugs || {}).length > 0)
        )

        const nonCompliantFarmIds = new Set(
          nonCompliantSampleRows
            .map(row => row.farm_db_id)
            .filter(Boolean)
        )

        const nonCompliantFarms = nonCompliantFarmIds.size
        const compliantFarms = Math.max(0, (totalFarms || 0) - nonCompliantFarms)
        const farmComplianceRate = totalFarms
          ? Number(((compliantFarms / totalFarms) * 100).toFixed(1))
          : 0

        const criticalViolations = nonCompliantSampleRows.filter(row =>
          row.high_risk_drugs && Object.keys(row.high_risk_drugs || {}).length > 0
        ).length

        const pendingInspections = filteredInspections.filter(i =>
          i.status === 'scheduled' || i.status === 'in_progress'
        ).length

        setOverview({
          totalFarms: totalFarms || 0,
          compliantFarms,
          nonCompliantFarms,
          complianceRate: farmComplianceRate,
          pendingInspections,
          criticalViolations
        })

        // ----- Violations list (for Violations tab) -----
        const violationItems = nonCompliantSampleRows
          .sort((a, b) => {
            const da = a.test_completed_at ? new Date(a.test_completed_at).getTime() : 0
            const db = b.test_completed_at ? new Date(b.test_completed_at).getTime() : 0
            return db - da
          })
          .slice(0, 40)
          .map(row => {
            const hasHighRisk =
              row.high_risk_drugs && Object.keys(row.high_risk_drugs || {}).length > 0
            const severity = hasHighRisk ? 'critical' : 'high'
            const location =
              [row.farm_district, row.farm_state].filter(Boolean).join(', ') ||
              row.farm_location ||
              '—'

            return {
              id: row.sample_code || row.sample_id,
              sample_id: row.sample_id,
              batch_id: row.batch_id,
              farm_db_id: row.farm_db_id,
              farm_state: row.farm_state,
              farm_district: row.farm_district,
              farm_pincode: row.farm_pincode,
              farmName: row.farm_name || 'Unlinked Farm',
              location,
              violationType: hasHighRisk ? 'High-risk antimicrobial residue' : 'MRL Violation',
              severity,
              detectedSubstance: row.mrl_violation || null,
              level: null,
              limit: null,
              detectionDate: row.test_completed_at,
              animalId: null,
              status: 'under_investigation',
              inspector: 'Unassigned',
              actions: hasHighRisk
                ? [
                    'Batch flagged in supply chain',
                    'Automatic alert to district regulator',
                    'Inspection recommended'
                  ]
                : [
                    'Warning sent to farm',
                    'Flag for closer monitoring'
                  ]
            }
          })

        setViolations(violationItems)

        // ----- Metrics cards (for Metrics tab) -----
        const metricsData = [
          {
            category: 'Drug Residue Testing (MRL)',
            totalTests,
            passedTests,
            failedTests,
            complianceRate: mrlComplianceRate,
            trend: 'stable'
          },
          {
            category: 'Antimicrobial Use (AMU)',
            totalCases: totalAMU,
            compliantCases: compliant,
            violations: nonCompliant + overdueWithdrawal,
            complianceRate: amuComplianceRate,
            trend: 'stable'
          }
        ]
        setMetrics(metricsData)
      } catch (err) {
        console.error('Error loading compliance data:', err)
        toast.error('Failed to load compliance reports')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateRange, getFromDate, regulatorType, jurisdiction])

  // ----- Charts data (metrics tab) -----

  const mrlTrendData = useMemo(() => {
    const map = {}
    samples.forEach(row => {
      if (!row.test_completed_at) return
      const d = new Date(row.test_completed_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { period: key, totalTests: 0, failedTests: 0 }
      map[key].totalTests += 1
      if (row.lab_status === 'fail') map[key].failedTests += 1
    })
    return Object.values(map).sort((a, b) => (a.period > b.period ? 1 : -1))
  }, [samples])

  const amuTrendData = useMemo(() => {
    const map = {}
    amuRecords.forEach(row => {
      if (!row.administration_date) return
      const d = new Date(row.administration_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { period: key, totalRecords: 0, violations: 0 }
      map[key].totalRecords += 1
      const isViolation =
        row.compliance_status &&
        row.compliance_status !== 'compliant' &&
        row.compliance_status !== 'pending'
      if (isViolation) map[key].violations += 1
    })
    return Object.values(map).sort((a, b) => (a.period > b.period ? 1 : -1))
  }, [amuRecords])

  const complianceCompareData = useMemo(
    () => [
      { metric: 'MRL', compliance: mrlSummary.complianceRate },
      { metric: 'AMU', compliance: amuSummary.complianceRate }
    ],
    [mrlSummary.complianceRate, amuSummary.complianceRate]
  )

  // ----- Export CSV -----

  const handleExport = () => {
    if (!samples || samples.length === 0) {
      toast('No data to export for selected period')
      return
    }

    const rows = samples
    const keys = [
      'sample_code',
      'batch_id',
      'lab_status',
      'sample_type',
      'test_completed_at',
      'farm_name',
      'farm_state',
      'farm_district',
      'farm_pincode',
      'batch_mrl_status',
      'batch_flagged',
      'mrl_violation'
    ]

    const header = keys.join(',')
    const csvRows = rows.map(r =>
      keys
        .map(k =>
          `"${String(r[k] ?? '')
            .replace(/"/g, '""')
            .replace(/\n/g, ' ')}"`
        )
        .join(',')
    )

    const csv = [header, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compliance_report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Compliance CSV ready')
  }

  // ----- Schedule Inspection -----

  const openScheduleModal = (violation) => {
    setInspectionDraft(violation)
    setInspectionForm(prev => ({
      ...prev,
      scheduled_date: new Date().toISOString().slice(0, 10),
      inspection_type: 'Violation Investigation',
      priority: 'high'
    }))
    setShowInspectionModal(true)
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    if (!inspectionDraft || !inspectionForm.scheduled_date) {
      toast.error('Please select a date')
      return
    }

    try {
      const v = inspectionDraft
      const { data, error } = await supabase
        .from('inspections')
        .insert([{
          farm_id: v.farm_db_id || null,
          farm_name: v.farmName,
          location: v.location,
          batch_id: v.batch_id || null,
          sample_id: v.sample_id || null,
          inspector_name: inspectionForm.inspector_name || 'Regulatory Officer',
          inspection_type: inspectionForm.inspection_type,
          priority: inspectionForm.priority,
          scheduled_date: inspectionForm.scheduled_date,
          state: v.farm_state || null,
          district: v.farm_district || null,
          pincode: v.farm_pincode || null,
          notes: inspectionForm.notes || null
        }])
        .select()
        .single()

      if (error) throw error

      setInspections(prev => [data, ...prev])
      toast.success('Inspection scheduled')
      setShowInspectionModal(false)
      setInspectionDraft(null)
      setInspectionForm({
        scheduled_date: '',
        inspection_type: 'Violation Investigation',
        priority: 'high',
        inspector_name: '',
        notes: ''
      })
    } catch (err) {
      console.error('Schedule inspection error:', err)
      toast.error('Failed to schedule inspection')
    }
  }

  // ----- Derived for "Recent Activity" -----

  const latestViolation = violations[0]
  const upcomingInspections = inspections.filter(i =>
    i.status === 'scheduled' || i.status === 'in_progress'
  )
  const completedInspection = inspections.find(i => i.status === 'completed')

  // ----- UI -----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance & Inspection Management</h1>
          <p className="text-gray-600">
            Government regulator view – monitor MRL compliance, AMU practices, and inspection status across all farms.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="last_year">Last Year</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 space-x-2 text-sm text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top overview cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{overview.totalFarms}</div>
              <div className="text-sm text-gray-600">Total Registered Farms</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {overview.complianceRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Farm-Level Compliance (MRL)</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{overview.criticalViolations}</div>
              <div className="text-sm text-gray-600">Critical Violations</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{overview.pendingInspections}</div>
              <div className="text-sm text-gray-600">Open Inspections</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'violations', name: 'Violations' },
            { id: 'metrics', name: 'Metrics' },
            { id: 'inspections', name: 'Inspections' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading compliance data…</div>
      )}

      {/* OVERVIEW TAB */}
      {!loading && activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* MRL Compliance distribution */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                MRL Compliance Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">MRL-Compliant Tests</span>
                  <span className="font-medium text-green-600">
                    {mrlSummary.passedTests}/{mrlSummary.totalTests}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-green-600 rounded-full"
                    style={{
                      width:
                        mrlSummary.totalTests > 0
                          ? `${(mrlSummary.passedTests / mrlSummary.totalTests) * 100}%`
                          : '0%'
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-gray-600">MRL Failures</span>
                  <span className="font-medium text-red-600">
                    {mrlSummary.failedTests}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-red-600 rounded-full"
                    style={{
                      width:
                        mrlSummary.totalTests > 0
                          ? `${(mrlSummary.failedTests / mrlSummary.totalTests) * 100}%`
                          : '0%'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Recent regulatory activity */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Recent Regulatory Activity
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                  <span className="text-gray-600">
                    {latestViolation
                      ? <>Latest violation detected at <span className="font-medium">{latestViolation.farmName}</span> ({latestViolation.location}).</>
                      : 'No violations in the selected period.'}
                  </span>
                </div>

                <div className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                  <span className="text-gray-600">
                    {completedInspection
                      ? <>Inspection <span className="font-medium">{completedInspection.id}</span> completed at <span className="font-medium">{completedInspection.farm_name || 'farm'}</span>.</>
                      : 'No completed inspections recorded in this period.'}
                  </span>
                </div>

                <div className="flex items-start">
                  <ClockIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                  <span className="text-gray-600">
                    {upcomingInspections.length > 0
                      ? `${upcomingInspections.length} inspection(s) scheduled or in progress.`
                      : 'No upcoming inspections scheduled.'}
                  </span>
                </div>
              </div>
            </div>

            {/* AMU snapshot */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                AMU & Withdrawal Compliance
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AMU Records in this period</span>
                  <span className="font-medium text-gray-900">
                    {amuSummary.totalRecords}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Compliant Records</span>
                  <span className="font-medium text-green-600">
                    {amuSummary.compliant}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Flagged / Non-compliant</span>
                  <span className="font-medium text-red-600">
                    {amuSummary.nonCompliant}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-600">Under Withdrawal Period</span>
                  <span className="font-medium text-yellow-700">
                    {amuSummary.underWithdrawal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Withdrawal Overdue (risk)</span>
                  <span className="font-medium text-red-700">
                    {amuSummary.overdueWithdrawal}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">AMU Compliance Rate</span>
                    <span className="font-bold text-gray-900">
                      {amuSummary.complianceRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 mt-1 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-green-600 rounded-full"
                      style={{ width: `${amuSummary.complianceRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIOLATIONS TAB */}
      {!loading && activeTab === 'violations' && (
        <div className="space-y-4">
          {violations.length === 0 && (
            <div className="p-6 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm">
              No violations detected in the selected period.
            </div>
          )}

          {violations.map((violation, index) => (
            <motion.div
              key={violation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {violation.violationType}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {violation.farmName} • {violation.location}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                      violation.severity
                    )}`}
                  >
                    {violation.severity.toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                      violation.status
                    )}`}
                  >
                    {violation.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4 text-sm md:grid-cols-3">
                <div>
                  <h4 className="mb-1 font-medium text-gray-900">Sample / Batch</h4>
                  <p className="text-gray-600">
                    {violation.id}{violation.batch_id ? ` • Batch ${violation.batch_id}` : ''}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-medium text-gray-900">Detection Date</h4>
                  <p className="text-gray-600">
                    {violation.detectionDate
                      ? new Date(violation.detectionDate).toLocaleDateString('en-IN')
                      : '—'}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-medium text-gray-900">Inspector</h4>
                  <p className="text-gray-600">{violation.inspector}</p>
                </div>
              </div>

              {violation.detectedSubstance && (
                <div className="p-3 mb-4 text-sm border border-red-200 rounded-lg bg-red-50">
                  <h4 className="mb-2 font-medium text-red-900">Substance / Violation Detail</h4>
                  <p className="text-red-800">
                    {violation.detectedSubstance}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <h4 className="mb-2 font-medium text-gray-900">Regulatory Actions</h4>
                <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                  {violation.actions.map((action, actionIndex) => (
                    <li key={actionIndex}>{action}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  {violation.animalId && `Animal ID: ${violation.animalId}`}
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <button className="flex items-center font-medium text-blue-600 hover:text-blue-800">
                    <EyeIcon className="w-4 h-4 mr-1" />
                    View Sample
                  </button>
                  <button
                    className="flex items-center font-medium text-green-600 hover:text-green-800"
                    onClick={() => openScheduleModal(violation)}
                  >
                    <CalendarDaysIcon className="w-4 h-4 mr-1" />
                    Schedule Inspection
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* METRICS TAB */}
      {!loading && activeTab === 'metrics' && (
        <div className="space-y-6">
          {metrics.length === 0 && (
            <div className="p-6 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm">
              No metrics available for this period.
            </div>
          )}

          {/* Metrics cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.category}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {metric.category}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(metric.trend)}
                    <span className="text-sm text-gray-600 capitalize">
                      {metric.trend}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Compliance Rate</span>
                    <span className="text-lg font-bold text-gray-900">
                      {metric.complianceRate.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full h-3 bg-gray-200 rounded-full">
                    <div
                      className={`h-3 rounded-full ${
                        metric.complianceRate >= 95
                          ? 'bg-green-600'
                          : metric.complianceRate >= 85
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${metric.complianceRate}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Total</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {metric.totalTests ??
                          metric.totalCases ??
                          0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Violations</span>
                      <span className="ml-2 font-medium text-red-600">
                        {metric.failedTests ??
                          metric.violations ??
                          0}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts row: MRL trend & AMU trend */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  MRL Testing Trend (by Month)
                </h3>
                <ChartBarIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mrlTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalTests"
                      name="Total Tests"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="failedTests"
                      name="MRL Failures"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  AMU Records & Violations (by Month)
                </h3>
                <ChartBarIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={amuTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalRecords"
                      name="AMU Records"
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="violations"
                      name="AMU Violations"
                      stroke="#f97316"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Compliance comparison bar chart */}
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Compliance Comparison: MRL vs AMU
              </h3>
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceCompareData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="compliance" name="Compliance %" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTIONS TAB */}
      {!loading && activeTab === 'inspections' && (
        <div className="space-y-4">
          {inspections.length === 0 && (
            <div className="p-6 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm">
              No inspections scheduled in the selected period.
            </div>
          )}

          {inspections.map((inspection, index) => (
            <motion.div
              key={inspection.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {inspection.inspection_type}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {inspection.farm_name || 'Farm'} •{' '}
                    {inspection.location ||
                      [inspection.district, inspection.state].filter(Boolean).join(', ') ||
                      '—'}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                      inspection.priority
                    )}`}
                  >
                    {inspection.priority.toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                      inspection.status
                    )}`}
                  >
                    {inspection.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <h4 className="mb-1 font-medium text-gray-900">Scheduled Date</h4>
                  <p className="text-gray-600">
                    {inspection.scheduled_date
                      ? new Date(inspection.scheduled_date).toLocaleDateString('en-IN')
                      : '—'}
                  </p>
                </div>

                <div>
                  <h4 className="mb-1 font-medium text-gray-900">Inspector</h4>
                  <p className="text-gray-600">
                    {inspection.inspector_name || 'Not assigned'}
                  </p>
                </div>

                <div>
                  <h4 className="mb-1 font-medium text-gray-900">Batch / Sample</h4>
                  <p className="text-gray-600">
                    {inspection.batch_id || inspection.sample_id || '—'}
                  </p>
                </div>
              </div>

              {inspection.notes && (
                <div className="mt-4 text-sm text-gray-700">
                  <h4 className="mb-1 font-medium text-gray-900">Notes</h4>
                  <p>{inspection.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end pt-4 mt-4 space-x-3 text-sm border-t border-gray-200">
                <button className="flex items-center font-medium text-blue-600 hover:text-blue-800">
                  <EyeIcon className="w-4 h-4 mr-1" />
                  View Schedule
                </button>
                {/* You can later wire Update Status to a modal */}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Schedule Inspection Modal */}
      {showInspectionModal && inspectionDraft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Schedule Inspection – {inspectionDraft.farmName}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              {inspectionDraft.location}
            </p>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-gray-700">Inspection Type</label>
                  <select
                    value={inspectionForm.inspection_type}
                    onChange={e =>
                      setInspectionForm(f => ({ ...f, inspection_type: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Violation Investigation">Violation Investigation</option>
                    <option value="Follow-up Inspection">Follow-up Inspection</option>
                    <option value="Routine Compliance">Routine Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-gray-700">Priority</label>
                  <select
                    value={inspectionForm.priority}
                    onChange={e =>
                      setInspectionForm(f => ({ ...f, priority: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-gray-700">Scheduled Date</label>
                  <input
                    type="date"
                    value={inspectionForm.scheduled_date}
                    onChange={e =>
                      setInspectionForm(f => ({ ...f, scheduled_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-700">Inspector Name</label>
                  <input
                    type="text"
                    value={inspectionForm.inspector_name}
                    onChange={e =>
                      setInspectionForm(f => ({ ...f, inspector_name: e.target.value }))
                    }
                    placeholder="e.g. District Officer"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={inspectionForm.notes}
                  onChange={e =>
                    setInspectionForm(f => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  placeholder="Enter inspection focus, sampling instructions, etc."
                />
              </div>

              <div className="flex items-center justify-end pt-3 space-x-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowInspectionModal(false)
                    setInspectionDraft(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-700 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplianceReports
