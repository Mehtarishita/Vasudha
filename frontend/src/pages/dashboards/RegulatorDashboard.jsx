import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheckIcon,
  MapIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BeakerIcon,
  BellAlertIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  FireIcon,
  FlagIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import StatCard from '../../components/common/StatCard'
import QuickActions from '../../components/common/QuickActions'
import RecentActivity from '../../components/common/RecentActivity'
import AlertsPanel from '../../components/common/AlertsPanel'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const initialTraceability = {
  batchId: '',
  tanker: '',
  farms: [],
  drugSource: {
    farm: '',
    drug: '',
    retailer: '',
    prescriptionStatus: '',
    action: ''
  }
}

const RegulatorDashboard = () => {
  const { user, profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchBatchId, setSearchBatchId] = useState('')
  const [showTraceabilityTree, setShowTraceabilityTree] = useState(false)
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)

  const [stats, setStats] = useState({
    registeredFarms: 0,
    collectorsRegistered: 0,
    labsRegistered: 0,
    veterinariansRegistered: 0,
    pharmaciesRegistered: 0,
    inspectionsCount: 0,
    amuRecordsCount: 0,
    nationalAvg: 92,
    activeViolations: 0,
    criticalAlerts: 0,
    amuVolume: 0,
    totalLivestock: 0
  })

  const [traceabilityData, setTraceabilityData] = useState(initialTraceability)
  const [traceLoading, setTraceLoading] = useState(false)
  const [traceError, setTraceError] = useState('')

  const [complianceData, setComplianceData] = useState([])
  const [violationTypes, setViolationTypes] = useState([])
  const [amuTrendData, setAmuTrendData] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [alerts, setAlerts] = useState([])

  // Fetch regulator type and jurisdiction
  useEffect(() => {
    const fetchRegulatorType = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('regulator_verifications')
          .select('regulator_type, jurisdiction_area, state, district, block_tehsil, can_view_national_dashboard, can_view_state_dashboard, can_access_command_center, can_conduct_inspections')
          .eq('user_id', user.id)
          .eq('status', 'verified')
          .single()

        if (error) {
          console.log('No verified regulator type found')
          return
        }

        setRegulatorType(data.regulator_type)
        setJurisdiction(data)
      } catch (error) {
        console.error('Error fetching regulator type:', error)
      }
    }

    fetchRegulatorType()
  }, [user])

  useEffect(() => {
    const fetchStats = async () => {
      if (!regulatorType) return // Wait for regulator type to load
      
      try {
        // Build queries with jurisdiction filtering
        let farmsQuery = supabase.from('farms').select('id, farmer_id')
        let collectorsQuery = supabase.from('profiles').select('id')
        let labsQuery = supabase.from('profiles').select('id')
        let vetsQuery = supabase.from('profiles').select('id')
        let pharmaciesQuery = supabase.from('retailer_shops').select('id')
        let inspectionsQuery = supabase.from('inspections').select('id')
        
        // Apply jurisdiction filters
        if (regulatorType === 'state' && jurisdiction?.state) {
          collectorsQuery = collectorsQuery.eq('state', jurisdiction.state).eq('user_type', 'collector').eq('kyc_status', 'verified')
          labsQuery = labsQuery.eq('state', jurisdiction.state).eq('user_type', 'lab').eq('kyc_status', 'verified')
          vetsQuery = vetsQuery.eq('state', jurisdiction.state).eq('user_type', 'veterinarian').eq('kyc_status', 'verified')
          pharmaciesQuery = pharmaciesQuery.eq('state', jurisdiction.state)
          inspectionsQuery = inspectionsQuery.eq('state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          collectorsQuery = collectorsQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district).eq('user_type', 'collector').eq('kyc_status', 'verified')
          labsQuery = labsQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district).eq('user_type', 'lab').eq('kyc_status', 'verified')
          vetsQuery = vetsQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district).eq('user_type', 'veterinarian').eq('kyc_status', 'verified')
          pharmaciesQuery = pharmaciesQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district)
          inspectionsQuery = inspectionsQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district)
        } else if (regulatorType === 'central') {
          collectorsQuery = collectorsQuery.eq('user_type', 'collector').eq('kyc_status', 'verified')
          labsQuery = labsQuery.eq('user_type', 'lab').eq('kyc_status', 'verified')
          vetsQuery = vetsQuery.eq('user_type', 'veterinarian').eq('kyc_status', 'verified')
        }
        // Central sees all data (no state/district filters applied)
        
        // Get jurisdiction-filtered collectors for batches filtering
        let batchCollectorIds = []
        if (regulatorType !== 'central') {
          const { data: batchCollectors } = await collectorsQuery
          batchCollectorIds = batchCollectors?.map(c => c.id) || []
        }
        
        const [
          farmersRes,
          collectorsRes,
          labsRes,
          vetsRes,
          pharmaciesRes,
          batchesRes,
          flaggedRes,
          mrlRes,
          inspectionsRes,
          amuRes,
          livestockRes
        ] = await Promise.all([
          regulatorType === 'central' 
            ? supabase.from('profiles').select('id').eq('user_type', 'producer').eq('kyc_status', 'verified')
            : (regulatorType === 'state' && jurisdiction?.state)
              ? supabase.from('profiles').select('id').eq('user_type', 'producer').eq('kyc_status', 'verified').eq('state', jurisdiction.state)
              : (jurisdiction?.state && jurisdiction?.district)
                ? supabase.from('profiles').select('id').eq('user_type', 'producer').eq('kyc_status', 'verified').eq('state', jurisdiction.state).eq('district', jurisdiction.district)
                : supabase.from('profiles').select('id').eq('user_type', 'producer').eq('kyc_status', 'verified'),
          collectorsQuery,
          labsQuery,
          vetsQuery,
          pharmaciesQuery,
          regulatorType === 'central'
            ? supabase.from('batches').select('compliance_score')
            : batchCollectorIds.length > 0
              ? supabase.from('batches').select('compliance_score').in('collector_id', batchCollectorIds)
              : supabase.from('batches').select('compliance_score').limit(0),
          regulatorType === 'central'
            ? supabase.from('batches').select('id').eq('flagged', true)
            : batchCollectorIds.length > 0
              ? supabase.from('batches').select('id').eq('flagged', true).in('collector_id', batchCollectorIds)
              : supabase.from('batches').select('id').eq('flagged', true).limit(0),
          regulatorType === 'central'
            ? supabase.from('samples').select('id').eq('lab_status', 'fail')
            : batchCollectorIds.length > 0
              ? supabase.from('samples').select('id, batch_id').eq('lab_status', 'fail')
              : supabase.from('samples').select('id').eq('lab_status', 'fail').limit(0),
          inspectionsQuery,
          // AMU records - get from amu_records table
          regulatorType === 'central'
            ? supabase.from('amu_records').select('id, dosage, farmer_id, administration_date, drug_name')
            : supabase.from('amu_records').select('id, dosage, farmer_id, administration_date, drug_name'),
          // Total livestock count
          regulatorType === 'central'
            ? supabase.from('livestock').select('id, farmer_id')
            : supabase.from('livestock').select('id, farmer_id')
        ])

        if (farmersRes.error) console.error('Supabase farmers error:', farmersRes.error)
        if (collectorsRes.error) console.error('Supabase collectors error:', collectorsRes.error)
        if (labsRes.error) console.error('Supabase labs error:', labsRes.error)
        if (vetsRes.error) console.error('Supabase vets error:', vetsRes.error)
        if (pharmaciesRes.error) console.error('Supabase pharmacies error:', pharmaciesRes.error)
        if (batchesRes.error) console.error('Supabase batches error:', batchesRes.error)
        if (flaggedRes.error) console.error('Supabase flagged batches error:', flaggedRes.error)
        if (mrlRes.error) console.error('Supabase mrlFailures error:', mrlRes.error)
        if (inspectionsRes.error) console.error('Supabase inspections error:', inspectionsRes.error)
        if (amuRes.error) console.error('Supabase AMU error:', amuRes.error)
        if (livestockRes.error) console.error('Supabase livestock error:', livestockRes.error)

        console.log('=== AMU Data Debug ===')
        console.log('Regulator Type:', regulatorType)
        console.log('AMU records received:', amuRes.data?.length, 'records')
        console.log('Sample AMU records:', amuRes.data?.slice(0, 3))
        console.log('Farmers count:', farmersRes.data?.length)

        // Filter AMU and livestock by jurisdiction if needed (only for non-central regulators)
        let amuData = amuRes.data || []
        let livestockData = livestockRes.data || []
        
        if (regulatorType !== 'central') {
          const farmerIds = farmersRes.data?.map(f => f.id) || []
          console.log('Filtering by farmer IDs:', farmerIds.length, 'farmers')
          if (farmerIds.length > 0) {
            amuData = amuData.filter(a => !a.farmer_id || farmerIds.includes(a.farmer_id))
            livestockData = livestockData.filter(l => !l.farmer_id || farmerIds.includes(l.farmer_id))
          }
          console.log('After filtering - AMU records:', amuData.length)
        }
        
        // Calculate total AMU volume (dosage is stored as text like "100 mg" or "10ml")
        const totalAmuVolume = amuData.reduce((sum, record) => {
          if (!record.dosage) return sum
          // Extract numeric value from string like "100 mg" or "50.5 mg"
          const match = record.dosage.match(/(\d+\.?\d*)/)
          const volume = match ? parseFloat(match[1]) : 0
          return sum + volume
        }, 0)

        const batches = batchesRes.data || []
        const amuRecordsCount = amuData.length

        console.log('Final AMU Stats:', {
          amuRecordsCount,
          totalAmuVolume: totalAmuVolume.toFixed(2),
          totalLivestock: livestockData.length
        })

        setStats(prev => ({
          ...prev,
          registeredFarms: farmersRes.data?.length || 0,
          collectorsRegistered: collectorsRes.data?.length || 0,
          labsRegistered: labsRes.data?.length || 0,
          veterinariansRegistered: vetsRes.data?.length || 0,
          pharmaciesRegistered: pharmaciesRes.data?.length || 0,
          inspectionsCount: inspectionsRes.data?.length || 0,
          amuRecordsCount,
          activeViolations: flaggedRes.data?.length || 0,
          criticalAlerts: mrlRes.data?.length || 0,
          amuVolume: Math.round(totalAmuVolume * 100) / 100,
          totalLivestock: livestockData.length
        }))
      } catch (error) {
        console.error('Supabase fetchStats exception:', error)
      }
    }

    const fetchComplianceData = async () => {
      if (!regulatorType) return
      
      let query = supabase.from('batches').select('collection_date, batch_mrl_status, collector_id')
      
      // Apply jurisdiction filtering for batches (only for non-central regulators)
      if (regulatorType !== 'central') {
        // Get collectors from this jurisdiction first
        let collectorsQuery = supabase.from('profiles').select('id')
        
        if (jurisdiction?.state) {
          collectorsQuery = collectorsQuery.eq('state', jurisdiction.state)
        }
        if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.district) {
          collectorsQuery = collectorsQuery.eq('district', jurisdiction.district)
        }
        
        const { data: collectors } = await collectorsQuery
        const collectorIds = collectors?.map(c => c.id) || []
        
        if (collectorIds.length > 0) {
          query = query.in('collector_id', collectorIds)
        }
      }

      const { data: batches, error } = await query

      if (error) {
        console.error('Supabase compliance error:', error)
        return
      }

      const monthly = {}
      batches?.forEach(b => {
        const month = b.collection_date
          ? new Date(b.collection_date).toLocaleString('default', { month: 'short' })
          : 'Unknown'
        if (!monthly[month]) monthly[month] = { compliant: 0, violations: 0, month }
        if (b.batch_mrl_status === 'pass') monthly[month].compliant += 1
        else if (b.batch_mrl_status === 'fail') monthly[month].violations += 1
      })
      setComplianceData(Object.values(monthly))
    }

    const fetchViolationTypes = async () => {
      if (!regulatorType) return
      
      let query = supabase.from('samples').select('mrl_violation, batch_id')
      
      // Apply jurisdiction filtering through batches (only for non-central regulators)
      if (regulatorType !== 'central') {
        let collectorsQuery = supabase.from('profiles').select('id')
        
        if (jurisdiction?.state) {
          collectorsQuery = collectorsQuery.eq('state', jurisdiction.state)
        }
        if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.district) {
          collectorsQuery = collectorsQuery.eq('district', jurisdiction.district)
        }
        
        const { data: collectors } = await collectorsQuery
        const collectorIds = collectors?.map(c => c.id) || []
        
        if (collectorIds.length > 0) {
          const { data: batches } = await supabase
            .from('batches')
            .select('batch_id')
            .in('collector_id', collectorIds)
          
          const batchIds = batches?.map(b => b.batch_id) || []
          if (batchIds.length > 0) {
            query = query.in('batch_id', batchIds)
          } else {
            query = query.limit(0)
          }
        } else {
          query = query.limit(0)
        }
      }

      const { data: samples, error } = await query

      if (error) {
        console.error('Supabase violation types error:', error)
        return
      }

      const types = {}
      samples?.forEach(s => {
        const type = s.mrl_violation || 'Others'
        types[type] = (types[type] || 0) + 1
      })
      const total = samples?.length || 1
      setViolationTypes(
        Object.entries(types).map(([name, value], idx) => ({
          name,
          value: Math.round((value / total) * 100),
          color: ['#ef4444', '#f59e0b', '#eab308', '#6b7280'][idx % 4]
        }))
      )
    }

    // Regional data: farms.location + samples.lab_status → compliance %


    const fetchAmuTrendData = async () => {
      const { data: amu, error } = await supabase
        .from('amu_records')
        .select('administration_date, dosage')

      if (error) {
        console.error('Supabase AMU trend error:', error)
        return
      }

      const monthly = {}
      amu?.forEach(a => {
        const month = a.administration_date
          ? new Date(a.administration_date).toLocaleString('default', { month: 'short' })
          : 'Unknown'
        if (!monthly[month]) monthly[month] = { month, usage: 0 }
        monthly[month].usage += 1 // counting records; dosage is text
      })
      setAmuTrendData(Object.values(monthly))
    }

    const fetchRecentActivities = async () => {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Supabase recent activities error:', error)
        return
      }

      setRecentActivities(
        logs?.map(log => ({
          id: log.id,
          type: log.event_type,
          message: log.action,
          time: new Date(log.event_time).toLocaleString(),
          status:
            log.event_type === 'ERROR'
              ? 'error'
              : log.event_type === 'INFO'
              ? 'success'
              : 'pending'
        })) || []
      )
    }

    const fetchAlerts = async () => {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Supabase alerts error:', error)
        return
      }

      setAlerts(
        logs
          ?.filter(l => l.event_type === 'ERROR' || l.event_type === 'WARN')
          .map(log => ({
            id: log.id,
            type: log.event_type === 'ERROR' ? 'error' : 'warning',
            title: log.action,
            message: log.details,
            time: new Date(log.event_time).toLocaleString()
          })) || []
      )
    }

    fetchStats()
    fetchComplianceData()
    fetchViolationTypes()
    fetchAmuTrendData()
    fetchRecentActivities()
    fetchAlerts()
  }, [regulatorType, jurisdiction])

  const handleTrace = async () => {
    if (!searchBatchId) return

    setTraceLoading(true)
    setTraceError('')
    setTraceabilityData(initialTraceability)

    try {
      // 1. Batch
      const { data: batchRows, error: batchError } = await supabase
        .from('batches')
        .select('id, batch_id, tanker_id')
        .eq('batch_id', searchBatchId.trim())
        .limit(1)

      if (batchError) {
        console.error('Traceability batch error:', batchError)
        setTraceError('Failed to fetch batch details')
        return
      }

      const batch = batchRows?.[0]
      if (!batch) {
        setTraceError('No batch found with this ID')
        return
      }

      // 2. Collections + samples for that batch
      const [
        { data: collections, error: collError },
        { data: samples, error: samplesError }
      ] = await Promise.all([
        supabase
          .from('collection_records')
          .select('farm_id, quantity_collected')
          .eq('batch_number', batch.batch_id),
        supabase
          .from('samples')
          .select('id, farm_id, lab_status')
          .eq('batch_id', batch.batch_id)
      ])

      if (collError) console.error('Traceability collections error:', collError)
      if (samplesError) console.error('Traceability samples error:', samplesError)

      const farmIds = Array.from(
        new Set((collections || []).map(c => c.farm_id).filter(Boolean))
      )

      // 3. Farms involved
      let farms = []
      if (farmIds.length) {
        const { data: farmsData, error: farmsError } = await supabase
          .from('farms')
          .select('id, farm_id, name')
          .in('id', farmIds)

        if (farmsError) console.error('Traceability farms error:', farmsError)
        farms = farmsData || []
      }

      const totalQty = (collections || []).reduce(
        (sum, c) => sum + (Number(c.quantity_collected) || 0),
        0
      )

      const samplesByFarm = new Map()
      ;(samples || []).forEach(s => {
        const arr = samplesByFarm.get(s.farm_id) || []
        arr.push(s)
        samplesByFarm.set(s.farm_id, arr)
      })

      const farmCards = farms.map(f => {
        const collForFarm = (collections || []).filter(c => c.farm_id === f.id)
        const qty = collForFarm.reduce(
          (sum, c) => sum + (Number(c.quantity_collected) || 0),
          0
        )
        const contribution = totalQty
          ? `${((qty / totalQty) * 100).toFixed(1)}% of batch`
          : '—'

        const farmSamples = samplesByFarm.get(f.id) || []
        const hasFail = farmSamples.some(s => s.lab_status === 'fail')

        return {
          id: f.farm_id || f.id,
          name: f.name,
          contribution,
          status: hasFail ? 'flagged' : 'normal'
        }
      })

      const flaggedFarm = farmCards.find(f => f.status === 'flagged')

      setTraceabilityData({
        batchId: batch.batch_id,
        tanker: batch.tanker_id || 'N/A',
        farms: farmCards,
        drugSource: {
          farm: flaggedFarm?.name || 'Not identified',
          drug: 'Check AMU/treatment records for this farm',
          retailer: 'Trace via retailer sales (not auto-linked yet)',
          prescriptionStatus: 'Not evaluated automatically',
          action:
            'Review AMU and prescription records for this farm and associated retailers. Consider targeted inspection if repeated failures are observed.'
        }
      })
    } catch (error) {
      console.error('Traceability error:', error)
      setTraceError('Something went wrong while tracing this batch')
    } finally {
      setTraceLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'AMU & AMR Analytics',
      description: 'Antimicrobial usage & resistance',
      icon: ChartBarIcon,
      color: 'bg-blue-500',
      href: '/app/regulator/amu-analytics'
    },
    {
      title: 'Retailer Monitoring',
      description: 'Track pharmacy compliance',
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500',
      href: '/app/regulator/retailer-monitoring'
    },
    {
      title: 'Lab & Testing Reports',
      description: 'View sample test results',
      icon: BeakerIcon,
      color: 'bg-green-500',
      href: '/app/regulator/lab-reports'
    },
    {
      title: 'Policy & Alerts',
      description: 'Broadcast advisories',
      icon: BellAlertIcon,
      color: 'bg-orange-500',
      href: '/app/regulator/policy-alerts'
    },
    {
      title: 'User Registry',
      description: 'Manage stakeholder registry',
      icon: UserGroupIcon,
      color: 'bg-indigo-500',
      href: '/app/regulator/user-registry'
    },
    {
      title: 'Scanner',
      description: 'Track batch to source',
      icon: MagnifyingGlassIcon,
      color: 'bg-red-500',
      action: () => {
        setTraceError('')
        setShowTraceabilityTree(true)
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header - Command Center */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-white rounded-lg bg-gradient-to-r from-red-600 to-orange-600"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2 text-2xl font-bold">
              {regulatorType === 'central' && '🇮🇳 National Dashboard - Central Oversight'}
              {regulatorType === 'state' && `📍 State Dashboard - ${jurisdiction?.state || 'State'} Administration`}
              {regulatorType === 'district' && `⚡ Command Center - ${jurisdiction?.district || 'District'} Enforcement`}
              {regulatorType === 'block' && `🔍 Field Inspector - ${jurisdiction?.block_tehsil || 'Block'} Level`}
              {!regulatorType && '🛡️ Command Center - Government Regulator'}
            </h1>
            <p className="opacity-90">
              {getGreeting()}, {profile?.name || user?.name || 'Officer'}
              {regulatorType && ` (${regulatorType.charAt(0).toUpperCase() + regulatorType.slice(1)} Level Regulator)`}
            </p>
            {jurisdiction?.jurisdiction_area && (
              <p className="mt-1 text-sm opacity-75">
                Jurisdiction: {jurisdiction.jurisdiction_area}
              </p>
            )}
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm">
            <div className="text-sm opacity-90">Today's Date</div>
            <div className="text-lg font-semibold">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
          <div className="p-3 rounded-lg bg-white/20">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.amuRecordsCount}</div>
              <ShieldCheckIcon className="w-6 h-6 opacity-75" />
            </div>
            <div className="text-sm opacity-90">AMU Records</div>
            <div className="mt-1 text-xs opacity-75">
              Total Recorded
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/20">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.activeViolations}</div>
              <ExclamationTriangleIcon className="w-6 h-6 opacity-75" />
            </div>
            <div className="text-sm opacity-90">Active Violations</div>
            <div className="mt-1 text-xs opacity-75">Farms Flagged</div>
          </div>
          <div className="p-3 rounded-lg bg-white/20">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.criticalAlerts}</div>
              <FireIcon className="w-6 h-6 opacity-75" />
            </div>
            <div className="text-sm opacity-90">MRL Failures</div>
            <div className="mt-1 text-xs opacity-75">Failed Lab Tests</div>
          </div>
          <div className="p-3 rounded-lg bg-white/20">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.amuVolume.toFixed(1)}kg</div>
              <BeakerIcon className="w-6 h-6 opacity-75" />
            </div>
            <div className="text-sm opacity-90">AMU Volume</div>
            <div className="mt-1 text-xs opacity-75">Total Administered</div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Registered Producers"
          value={stats.registeredFarms}
          change={regulatorType === 'central' ? 'Nationwide' : (jurisdiction?.state ? `In ${jurisdiction.state}` : 'Nationwide')}
          changeType="neutral"
          icon={UserGroupIcon}
          color="blue"
        />
        <StatCard
          title="Collectors"
          value={stats.collectorsRegistered}
          change={regulatorType === 'central' ? 'Nationwide' : (jurisdiction?.state ? `In ${jurisdiction.state}` : 'Nationwide')}
          changeType="neutral"
          icon={BuildingOfficeIcon}
          color="green"
        />
        <StatCard
          title="Total Livestock"
          value={stats.totalLivestock}
          change={regulatorType === 'central' ? 'Nationwide' : (jurisdiction?.state ? `In ${jurisdiction.state}` : 'Nationwide')}
          changeType="neutral"
          icon={UserGroupIcon}
          color="orange"
        />
        <StatCard
          title="AMU Volume (kg)"
          value={stats.amuVolume.toFixed(1)}
          change="Total administered"
          changeType="neutral"
          icon={BeakerIcon}
          color="red"
        />
        <StatCard
          title="Pharmacies"
          value={stats.pharmaciesRegistered}
          change={regulatorType === 'central' ? 'Nationwide' : (jurisdiction?.state ? `In ${jurisdiction.state}` : 'Nationwide')}
          changeType="neutral"
          icon={BuildingOfficeIcon}
          color="purple"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuickActions actions={quickActions} />



          {/* Compliance Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Compliance Trend
                </h3>
                <p className="text-sm text-gray-500">
                  Monthly farm compliance status
                </p>
              </div>
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="compliant"
                  fill="#22c55e"
                  name="Compliant"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="violations"
                  fill="#ef4444"
                  name="Violations"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* AMU Usage Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  AMU Usage Trend
                </h3>
                <p className="text-sm text-gray-500">
                  Total antimicrobial usage (kg)
                </p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={amuTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="usage"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  name="Usage (records)"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <div className="space-y-6">
          <AlertsPanel alerts={alerts} />

          {/* Violation Types Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Violation Types
            </h3>

            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={violationTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {violationTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {violationTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{type.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {type.value}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>



          <RecentActivity activities={recentActivities} />
        </div>
      </div>

      {/* Traceability Tree Modal */}
      {showTraceabilityTree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Traceability Tree
              </h3>
              <button
                onClick={() => {
                  setShowTraceabilityTree(false)
                  setTraceError('')
                  setTraceabilityData(initialTraceability)
                  setSearchBatchId('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Enter Batch ID to Trace
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={searchBatchId}
                  onChange={e => setSearchBatchId(e.target.value)}
                  placeholder="e.g., MS-2025-1142"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleTrace}
                  disabled={traceLoading}
                  className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {traceLoading ? 'Tracing...' : 'Trace'}
                </button>
              </div>
              {traceError && (
                <p className="mt-2 text-sm text-red-600">{traceError}</p>
              )}
            </div>

            {/* Traceability Visualization */}
            {traceabilityData.batchId ? (
              <div className="p-8 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
                <div className="space-y-6">
                  {/* Failed Batch */}
                  <div className="flex justify-center">
                    <div className="px-6 py-4 text-white bg-red-600 rounded-lg shadow-lg">
                      <div className="text-sm opacity-90">Batch</div>
                      <div className="text-xl font-bold">
                        {traceabilityData.batchId}
                      </div>
                      <div className="mt-1 text-sm">
                        Lab result: see sample report
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-1 h-12 bg-gray-400"></div>
                  </div>

                  {/* Tanker */}
                  <div className="flex justify-center">
                    <div className="px-6 py-4 text-white bg-orange-500 rounded-lg shadow-lg">
                      <div className="text-sm opacity-90">
                        Collection Tanker
                      </div>
                      <div className="text-lg font-bold">
                        {traceabilityData.tanker}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-1 h-12 bg-gray-400"></div>
                  </div>

                  {/* Farms */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {traceabilityData.farms.map((farm, index) => (
                      <div
                        key={index}
                        className={`${
                          farm.status === 'flagged'
                            ? 'bg-red-100 border-2 border-red-500'
                            : 'bg-green-100 border-2 border-green-500'
                        } px-4 py-3 rounded-lg shadow text-center`}
                      >
                        <div className="text-xs text-gray-600">Farm</div>
                        <div className="font-bold text-gray-900">
                          {farm.id}
                        </div>
                        <div className="text-sm text-gray-700">
                          {farm.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {farm.contribution}
                        </div>
                        {farm.status === 'flagged' && (
                          <div className="mt-2">
                            <span className="px-2 py-1 text-xs text-white bg-red-500 rounded-full">
                              SOURCE CANDIDATE
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Drug Source Details */}
                  <div className="p-6 bg-white border-2 border-red-300 rounded-lg shadow-lg">
                    <h4 className="mb-4 text-lg font-bold text-gray-900">
                      Root Cause Analysis (First Pass)
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-sm text-gray-600">
                          Affected Farm
                        </div>
                        <div className="font-semibold text-gray-900">
                          {traceabilityData.drugSource.farm}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Drug Administered
                        </div>
                        <div className="font-semibold text-gray-900">
                          {traceabilityData.drugSource.drug}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Purchased From
                        </div>
                        <div className="font-semibold text-gray-900">
                          {traceabilityData.drugSource.retailer}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Prescription Status
                        </div>
                        <div className="font-semibold text-red-600">
                          {traceabilityData.drugSource.prescriptionStatus}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 mt-6 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start space-x-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-red-900">
                            Recommended Action
                          </div>
                          <div className="mt-1 text-sm text-red-700">
                            {traceabilityData.drugSource.action}
                          </div>
                          <div className="flex mt-3 space-x-3">
                            <button className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">
                              Issue Show Cause Notice
                            </button>
                            <button className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                              Schedule Inspection
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-sm text-gray-500 bg-gray-50 rounded-xl">
                Enter a batch ID above and click <b>Trace</b> to see the
                traceability graph.
              </div>
            )}

            <div className="mt-6 text-sm text-center text-gray-500">
              Traceability powered by Vasudha AI (batch → farms from Supabase
              data)
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default RegulatorDashboard
