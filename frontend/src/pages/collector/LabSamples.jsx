import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import {
  BeakerIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { getFarm } from '../../services/farmHelpers'

const LabSamples = () => {
  const { user, profile } = useAuthStore()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newSample, setNewSample] = useState({
    farmId: '',
    batchId: '',
    sampleType: 'milk'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [samples, setSamples] = useState([])
  const [batches, setBatches] = useState([])
  const [farms, setFarms] = useState([])

  const [statusFilter, setStatusFilter] = useState('all')

  // NEW: Modal for batch + sample info
  const [batchDetailsModal, setBatchDetailsModal] = useState(null)

  // Friendly collector ID: unique_id if set, else short UUID
  const collectorDisplayId =
    profile?.unique_id || (user?.id ? user.id.slice(0, 8) : '')

  const getStatusChipClasses = (status) => {
    switch (status) {
      case 'tested':
        return 'bg-green-100 text-green-800'
      case 'in-transit':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getLabStatusChipClasses = (labStatus) => {
    if (labStatus === 'pass') return 'bg-green-100 text-green-800'
    if (labStatus === 'fail') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getLabStatusIcon = (status, labStatus) => {
    if (status !== 'tested') return <ClockIcon className="w-8 h-8 text-yellow-600" />
    if (labStatus === 'pass') return <CheckCircleIcon className="w-8 h-8 text-green-600" />
    if (labStatus === 'fail') return <XCircleIcon className="w-8 h-8 text-red-600" />
    return <ClockIcon className="w-8 h-8 text-yellow-600" />
  }

  // ---------- Fetch initial data ----------
  useEffect(() => {
    if (!user?.id) return
    const fetchData = async () => {
      try {
        setLoading(true)

        // 1. Sealed batches for this collector
        const { data: batchRows, error: batchErr } = await supabase
          .from('batches')
          .select('batch_id, farms_included, collection_date, total_volume, sample_id')
          .eq('collector_id', user.id)
          .eq('sealed', true)
          .order('collection_date', { ascending: false })

        if (batchErr) throw batchErr
        setBatches(batchRows || [])

        // 2. Unique farm UUIDs from those batches
        const farmIdSet = new Set()
        ;(batchRows || []).forEach((b) => {
          ;(b.farms_included || []).forEach((fid) => {
            if (fid) farmIdSet.add(fid)
          })
        })
        const farmIds = Array.from(farmIdSet)

        // 3. Fetch farm details
        const farmList = []
        for (const farmId of farmIds) {
          try {
            const farm = await getFarm(farmId)
            farmList.push({
              id: farmId,
              code: farm.farm_id || farm.farm_code || '',
              name: farm.farm_name || farm.name || '',
              farmer: farm.farmer_name || ''
            })
          } catch (e) {
            farmList.push({
              id: farmId,
              code: '',
              name: '',
              farmer: ''
            })
          }
        }
        setFarms(farmList)

        // 4. Fetch samples for these batches for this collector
        const batchIds = (batchRows || []).map((b) => b.batch_id)
        let sampleQuery = supabase
          .from('samples')
          .select('*')
          .eq('collector_id', user.id)
          .order('collected_at', { ascending: false })

        if (batchIds.length > 0) {
          sampleQuery = sampleQuery.in('batch_id', batchIds)
        }

        const { data: sampleRows, error: sampleErr } = await sampleQuery
        if (sampleErr) throw sampleErr

        setSamples(sampleRows || [])
      } catch (err) {
        console.error('Error loading lab samples:', err)
        toast.error('Failed to load lab samples. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // ---------- Derived stats ----------
  const statusCounts = {
    total: samples.length,
    pending: samples.filter((s) => s.status === 'pending').length,
    inTransit: samples.filter((s) => s.status === 'in-transit').length,
    tested: samples.filter((s) => s.status === 'tested').length
  }

  const filteredSamples =
    statusFilter === 'all'
      ? samples
      : samples.filter((s) => s.status === statusFilter)

  // ---------- Add new sample ----------
  const handleAddSample = async (e) => {
    e.preventDefault()
    if (!user?.id) return

    if (!newSample.batchId || !newSample.farmId) {
      toast.error('Please select both batch and farm.')
      return
    }

    try {
      setSaving(true)

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const suffix = newSample.batchId.slice(-4)
      const sampleCode = `S-${today}-${suffix}`

      const { data: inserted, error: insertErr } = await supabase
        .from('samples')
        .insert({
          batch_id: newSample.batchId,
          sample_code: sampleCode,
          collector_id: user.id,
          farm_id: newSample.farmId,
          sample_type: newSample.sampleType,
          status: 'pending'
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      await supabase
        .from('batches')
        .update({ sample_id: inserted.id })
        .eq('batch_id', newSample.batchId)

      setSamples((prev) => [inserted, ...prev])

      const farmInfo = farms.find((f) => f.id === newSample.farmId)

      toast.success(
        <div>
          <p className="font-bold">Sample Logged Successfully</p>
          <p className="text-sm">Sample Code: {sampleCode}</p>
          <p className="text-sm">
            Batch: {newSample.batchId}{' '}
            {farmInfo?.code ? `• Farm: ${farmInfo.code}` : ''}
          </p>
        </div>,
        { duration: 4000 }
      )

      setNewSample({ farmId: '', batchId: '', sampleType: 'milk' })
      setShowAddForm(false)
    } catch (err) {
      console.error('Error adding sample:', err)
      toast.error('Failed to log sample. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getFarmCode = (farmId) => {
    const f = farms.find((farm) => farm.id === farmId)
    return f?.code || ''
  }

  const getFarmName = (farmId) => {
    const f = farms.find((farm) => farm.id === farmId)
    return f?.name || ''
  }

  const getBatchLabel = (batchId) =>
    batches.find((b) => b.batch_id === batchId)?.batch_id || batchId

  const getBatchById = (batchId) =>
    batches.find((b) => b.batch_id === batchId) || null

  const buildSampleBatchQR = (sample, batch) => {
  const payload = {
    sample_code: sample?.sample_code,
    batch_id: sample?.batch_id,
    collector_id: user?.id,
    collector_display_id: collectorDisplayId,
    collector_name: profile?.name,
    collector_mobile: profile?.mobile_number,
    collection_date: batch?.collection_date
  }
  return JSON.stringify(payload)
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
          <h1 className="text-2xl font-bold text-gray-900">Lab Samples</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track samples sent for MRL testing (linked to sealed batches)
          </p>
          {profile?.name && (
            <p className="mt-1 text-xs text-gray-500">
              Collector:{' '}
              <span className="font-semibold">{profile.name}</span>
              {collectorDisplayId && (
                <>
                  {' '}
                  • ID:{' '}
                  <span className="font-mono">{collectorDisplayId}</span>
                </>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Log New Sample
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Total Samples</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {statusCounts.total}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">In Transit</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">
            {statusCounts.inTransit}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Pending Results</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">
            {statusCounts.pending}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Tested</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {statusCounts.tested}
          </p>
        </motion.div>
      </div>

      {/* Add Sample Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Log New Sample
          </h3>
          <form onSubmit={handleAddSample} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Farm */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Farm
                </label>
                <select
                  value={newSample.farmId}
                  onChange={(e) =>
                    setNewSample({ ...newSample, farmId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select farm...</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.code || 'FARM'} - {farm.name || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Batch (sealed)
                </label>
                <select
                  value={newSample.batchId}
                  onChange={(e) =>
                    setNewSample({ ...newSample, batchId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select batch...</option>
                  {batches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Type */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Sample Type
                </label>
                <select
                  value={newSample.sampleType}
                  onChange={(e) =>
                    setNewSample({ ...newSample, sampleType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="milk">Milk</option>
                  <option value="meat">Meat</option>
                  <option value="feed">Feed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Log Sample'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Samples List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Sample Status Tracker
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="in-transit">In Transit</option>
                <option value="tested">Tested</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-gray-500">Loading samples...</p>
          ) : filteredSamples.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <BeakerIcon className="w-10 h-10 mb-2 text-gray-400" />
              <p>No samples logged yet.</p>
              <p className="text-xs">
                Log your first sample from a sealed batch above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSamples.map((sample) => {
                const status = sample.status || 'pending'
                const labStatus = sample.lab_status || null
                const collected =
                  sample.collected_at &&
                  new Date(sample.collected_at).toLocaleString()
                const farmCode = getFarmCode(sample.farm_id)
                const farmName = getFarmName(sample.farm_id)
                const batch = getBatchById(sample.batch_id)

                return (
                  <div
                    key={sample.id}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 gap-4">
                        {getLabStatusIcon(status, labStatus)}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-900">
                              {sample.sample_code}
                            </p>
                            {farmCode && (
                              <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded">
                                {farmCode}
                              </span>
                            )}
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getStatusChipClasses(
                                status
                              )}`}
                            >
                              {status.toUpperCase()}
                            </span>
                            {labStatus && (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${getLabStatusChipClasses(
                                  labStatus
                                )}`}
                              >
                                {labStatus === 'pass'
                                  ? 'PASS'
                                  : labStatus === 'fail'
                                  ? 'FAIL'
                                  : 'PENDING'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {farmName || 'Farm'} •{' '}
                            {sample.sample_type || 'milk'} • Collected:{' '}
                            {collected || '—'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Batch: {getBatchLabel(sample.batch_id)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        {/* NEW: View batch & collector info popup */}
                        <button
                          type="button"
                          onClick={() =>
                            setBatchDetailsModal({ sample, batch })
                          }
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 rounded-lg bg-blue-50 hover:bg-blue-100"
                        >
                          <QrCodeIcon className="w-4 h-4" />
                          Lab Sample Info QR
                        </button>

                        {status === 'tested' && labStatus === 'pass' && (
                          <button className="block w-full px-3 py-2 text-xs font-medium text-green-600 rounded-lg bg-green-50 hover:bg-green-100">
                            View Results
                          </button>
                        )}
                        {status === 'tested' && labStatus === 'fail' && (
                          <button className="block w-full px-3 py-2 text-xs font-medium text-red-600 rounded-lg bg-red-50 hover:bg-red-100">
                            View Violation
                          </button>
                        )}
                      </div>
                    </div>

                    {sample.test_results && (
                      <div className="p-3 mt-3 bg-white border border-gray-200 rounded">
                        <p className="mb-2 text-sm font-medium text-gray-900">
                          Test Results:
                        </p>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          {Object.entries(sample.test_results).map(
                            ([drug, value]) => (
                              <div key={drug} className="text-sm">
                                <span className="text-gray-600">{drug}:</span>
                                <span className="ml-1 font-medium text-gray-900">
                                  {value} ppb
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {sample.mrl_violation && (
                      <div className="p-3 mt-3 border border-red-200 rounded bg-red-50">
                        <p className="text-sm font-medium text-red-900">
                          {sample.mrl_violation}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal: Batch & Collector Details */}
      {batchDetailsModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
      <button
        className="absolute text-xl font-bold text-gray-500 top-2 right-3 hover:text-gray-800"
        onClick={() => setBatchDetailsModal(null)}
      >
        &times;
      </button>
      <h2 className="mb-4 text-lg font-bold text-center text-blue-700">
        Lab Sample Details
      </h2>

      {/* QR Code */}
      <div className="flex justify-center mb-4">
        <QRCodeCanvas
          value={buildSampleBatchQR(
            batchDetailsModal.sample,
            batchDetailsModal.batch
          )}
          size={180}
        />
      </div>

      {/* Text details */}
      <div className="space-y-2 text-sm text-gray-800">
        <div>
          <span className="font-bold">Sample Code:</span>{' '}
          {batchDetailsModal.sample?.sample_code}
        </div>
        <div>
          <span className="font-bold">Batch ID:</span>{' '}
          {batchDetailsModal.sample?.batch_id}
        </div>
        <div>
          <span className="font-bold">Collector ID:</span>{' '}
          <span className="font-mono">
            {collectorDisplayId || user?.id}
          </span>
        </div>
        <div>
          <span className="font-bold">Collector Name:</span>{' '}
          {profile?.name || '-'}
        </div>
        <div>
          <span className="font-bold">Collector Phone:</span>{' '}
          {profile?.mobile_number || '-'}
        </div>
        <div>
          <span className="font-bold">Collection Date:</span>{' '}
          {batchDetailsModal.batch?.collection_date || '—'}
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  )
}

export default LabSamples
