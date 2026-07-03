import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const qrRegionId = 'lab-sample-qr-region'

const SampleReception = () => {
  const { user, profile } = useAuthStore()

  const [selectedSample, setSelectedSample] = useState(null)
  const [selectedMeta, setSelectedMeta] = useState(null)
  const [conditionChecks, setConditionChecks] = useState({
    sealIntact: false,
    temperatureOk: false,
    labelClear: false
  })
  const [labId, setLabId] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [searchCode, setSearchCode] = useState('')

  const [pendingSamples, setPendingSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const collectorDisplayId =
    profile?.unique_id || (user?.id ? user.id.slice(0, 8) : '')

  // --------- Helpers ----------

  const generateLabId = (sampleCode) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const suffix = sampleCode
      ? sampleCode.slice(-4)
      : Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `LAB-${today}-${suffix}`
  }

  const resetState = () => {
    setSelectedSample(null)
    setSelectedMeta(null)
    setConditionChecks({ sealIntact: false, temperatureOk: false, labelClear: false })
    setLabId('')
  }

  const loadPendingSamples = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .eq('reception_status', 'awaiting')
        .order('collected_at', { ascending: false })

      if (error) throw error
      setPendingSamples(data || [])
    } catch (err) {
      console.error('Error loading pending samples:', err)
      toast.error('Failed to load pending samples')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingSamples()
    // eslint-disable-next-line
  }, [])

  // --------- Start / stop QR camera with html5-qrcode ----------

  useEffect(() => {
    if (!showCamera) return

    let html5QrCode

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(qrRegionId)
        const config = { fps: 10, qrbox: { width: 250, height: 250 } }

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScanResult(decodedText)
            // stop after first successful scan
            html5QrCode
              .stop()
              .then(() => html5QrCode.clear())
              .catch(() => {})
            setShowCamera(false)
          },
          () => {
            // scan failure callback – ignore noisy errors
          }
        )
      } catch (err) {
        console.error('QR scanner error:', err)
        toast.error('Unable to start camera for QR scanning')
        setShowCamera(false)
      }
    }

    startScanner()

    return () => {
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch(() => {})
      }
    }
  }, [showCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  // --------- Load sample by code ----------

  const loadSampleByCode = async (sampleCode, qrPayload = null) => {
    if (!sampleCode) {
      toast.error('Please enter a Sample Code or scan a QR')
      return
    }

    try {
      setActionLoading(true)

      const { data: sample, error } = await supabase
        .from('samples')
        .select('*')
        .eq('sample_code', sampleCode)
        .maybeSingle()

      if (error) throw error

      if (!sample) {
        toast.error(`No sample found for code ${sampleCode}`)
        resetState()
        return
      }

      setSelectedSample(sample)

      setConditionChecks({
        sealIntact: !!sample.seal_intact,
        temperatureOk: !!sample.temperature_ok,
        labelClear: !!sample.label_clear
      })

      setLabId(sample.lab_internal_id || generateLabId(sample.sample_code))

      let meta = {
        sample_code: sample.sample_code,
        batch_id: sample.batch_id,
        collector_id: qrPayload?.collector_id || null,
        collector_display_id: qrPayload?.collector_display_id || null,
        collector_name: qrPayload?.collector_name || null,
        collector_mobile: qrPayload?.collector_mobile || null,
        collection_date: qrPayload?.collection_date || null
      }

      if (!meta.collector_name || !meta.collector_mobile || !meta.collection_date) {
        const { data: batchRow, error: batchErr } = await supabase
          .from('batches')
          .select('batch_id, collector_name, collector_mobile, collection_date')
          .eq('batch_id', sample.batch_id)
          .maybeSingle()

        if (!batchErr && batchRow) {
          meta = {
            ...meta,
            collector_name: meta.collector_name || batchRow.collector_name,
            collector_mobile: meta.collector_mobile || batchRow.collector_mobile,
            collection_date: meta.collection_date || batchRow.collection_date
          }
        }
      }

      setSelectedMeta(meta)

      if (sample.reception_status === 'accepted') {
        toast.success('Sample already accepted at reception')
      } else if (sample.reception_status === 'rejected') {
        toast.error('Sample was rejected at reception')
      } else {
        toast.success('Sample loaded. Complete checklist to accept or reject.')
      }
    } catch (err) {
      console.error('Error loading sample by code:', err)
      toast.error('Failed to load sample')
      resetState()
    } finally {
      setActionLoading(false)
    }
  }

  // --------- QR scan handler ----------

  const handleScanResult = async (rawValue) => {
    if (!rawValue) return

    let payload = null
    let sampleCode = ''

    try {
      payload = JSON.parse(rawValue)
      sampleCode = payload.sample_code || payload.sampleCode || ''
    } catch {
      sampleCode = rawValue.trim()
    }

    if (!sampleCode) {
      toast.error('QR code did not contain a valid sample code')
      return
    }

    await loadSampleByCode(sampleCode, payload)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchCode.trim()) {
      toast.error('Enter a Sample Code to search')
      return
    }
    await loadSampleByCode(searchCode.trim())
  }

  // --------- Accept / Reject ----------

  const handleAccept = async () => {
    if (!selectedSample) return

    if (
      !conditionChecks.sealIntact ||
      !conditionChecks.temperatureOk ||
      !conditionChecks.labelClear
    ) {
      toast.error('All condition checks must pass before accepting the sample!')
      return
    }

    if (selectedSample.reception_status === 'accepted') {
      toast.success('Sample already accepted.')
      return
    }

    try {
      setActionLoading(true)

      const { error } = await supabase
        .from('samples')
        .update({
          status: 'in-transit',
          reception_status: 'accepted',
          seal_intact: conditionChecks.sealIntact,
          temperature_ok: conditionChecks.temperatureOk,
          label_clear: conditionChecks.labelClear,
          lab_internal_id: labId,
          received_at: new Date().toISOString(),
          received_by: user?.id || null
        })
        .eq('id', selectedSample.id)

      if (error) throw error

      toast.success(`Sample ${labId} accepted and added to pending lab queue!`)

      await loadPendingSamples()
      resetState()
    } catch (err) {
      console.error('Error accepting sample:', err)
      toast.error('Failed to accept sample. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSample) return

    try {
      setActionLoading(true)

      const { error } = await supabase
        .from('samples')
        .update({
          reception_status: 'rejected',
          reception_notes:
            'Rejected at lab reception due to failed condition checks',
          seal_intact: conditionChecks.sealIntact,
          temperature_ok: conditionChecks.temperatureOk,
          label_clear: conditionChecks.labelClear,
          received_at: new Date().toISOString(),
          received_by: user?.id || null
        })
        .eq('id', selectedSample.id)

      if (error) throw error

      toast.error('Sample rejected and flagged for discrepancy.')

      await loadPendingSamples()
      resetState()
    } catch (err) {
      console.error('Error rejecting sample:', err)
      toast.error('Failed to reject sample. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const isAcceptDisabled =
    !selectedSample ||
    selectedSample.reception_status === 'accepted' ||
    !conditionChecks.sealIntact ||
    !conditionChecks.temperatureOk ||
    !conditionChecks.labelClear

  // --------- JSX ----------

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4 sm:p-6 text-white"
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Sample Reception</h1>
        <p className="text-sm sm:text-base opacity-90">Check-in and verify incoming samples from field collectors</p>
        {profile?.name && (
          <p className="mt-2 text-xs opacity-90">
            Lab User: <span className="font-semibold">{profile.name}</span>
            {collectorDisplayId && (
              <>
                {' '}
                • ID: <span className="font-mono">{collectorDisplayId}</span>
              </>
            )}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR + Search */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <QrCodeIcon className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Scan or Search Sample</h2>
            </div>
            <button
              onClick={() => setShowCamera((prev) => !prev)}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {showCamera ? 'Hide Camera' : 'Use Camera'}
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                type="text"
                placeholder="Enter Sample Code (e.g. S-20251121-XXXX)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </form>

          {/* Camera / Info panel */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {showCamera && (
              <div className="mb-4">
                <div
                  id={qrRegionId}
                  className="w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Point the camera at the Sample QR code.
                </p>
              </div>
            )}

            {!selectedSample ? (
              !showCamera && (
                <>
                  <QrCodeIcon className="w-16 h-16 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">
                    Turn on camera to scan sample QR, or search by Sample Code above.
                  </p>
                </>
              )
            ) : (
              <div className="text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Sample Code
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedSample.sample_code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Batch ID
                  </span>
                  <span className="text-sm font-mono text-gray-900">
                    {selectedSample.batch_id}
                  </span>
                </div>
                {selectedMeta && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Collector
                      </span>
                      <span className="text-sm text-gray-900">
                        {selectedMeta.collector_name || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Collector Phone
                      </span>
                      <span className="text-sm text-gray-900">
                        {selectedMeta.collector_mobile || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Collection Date
                      </span>
                      <span className="text-sm text-gray-900">
                        {selectedMeta.collection_date || '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Status info */}
          {selectedSample && (
            <div className="mt-4 p-3 rounded-lg border flex items-start gap-2 bg-gray-50">
              {selectedSample.reception_status === 'accepted' ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-xs text-green-800">
                    <p className="font-medium">Sample already accepted.</p>
                    <p>
                      Lab ID:{' '}
                      <span className="font-mono">
                        {selectedSample.lab_internal_id || labId}
                      </span>
                    </p>
                  </div>
                </>
              ) : selectedSample.reception_status === 'rejected' ? (
                <>
                  <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-medium">Sample was rejected at reception.</p>
                    <p>{selectedSample.reception_notes}</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">Sample ready for condition checks.</p>
                    <p>Only accepted samples move to lab testing queue.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Condition Checklist */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center mb-4">
            <ClipboardDocumentCheckIcon className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Condition Checklist</h2>
          </div>

          {selectedSample ? (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Seal Intact?</span>
                  <button
                    onClick={() =>
                      setConditionChecks((prev) => ({
                        ...prev,
                        sealIntact: !prev.sealIntact
                      }))
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      conditionChecks.sealIntact
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {conditionChecks.sealIntact ? 'Yes' : 'No'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Temperature OK?</span>
                  <button
                    onClick={() =>
                      setConditionChecks((prev) => ({
                        ...prev,
                        temperatureOk: !prev.temperatureOk
                      }))
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      conditionChecks.temperatureOk
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {conditionChecks.temperatureOk ? 'Yes' : 'No'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">
                    Label Clear & Matched?
                  </span>
                  <button
                    onClick={() =>
                      setConditionChecks((prev) => ({
                        ...prev,
                        labelClear: !prev.labelClear
                      }))
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      conditionChecks.labelClear
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {conditionChecks.labelClear ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Lab ID
                </label>
                <input
                  type="text"
                  value={labId}
                  onChange={(e) => setLabId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated identifier used inside the lab. You can adjust if needed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  disabled={isAcceptDisabled || actionLoading}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  {actionLoading ? 'Processing...' : 'Accept Sample'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={!selectedSample || actionLoading}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <XCircleIcon className="w-5 h-5 mr-2" />
                  {actionLoading ? 'Processing...' : 'Reject Sample'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4" />
              <p>Scan a sample QR code or search by Sample Code to begin verification</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Pending samples table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Awaiting Reception
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading samples...</p>
        ) : pendingSamples.length === 0 ? (
          <p className="text-sm text-gray-500">
            No samples are currently awaiting reception.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="py-2 text-left">Sample Code</th>
                  <th className="py-2 text-left">Batch ID</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Collected At</th>
                  <th className="py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingSamples.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 font-mono">{s.sample_code}</td>
                    <td className="py-2 font-mono">{s.batch_id}</td>
                    <td className="py-2">{s.sample_type || 'milk'}</td>
                    <td className="py-2">
                      {s.collected_at
                        ? new Date(s.collected_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => loadSampleByCode(s.sample_code)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                      >
                        Load for Check-in
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default SampleReception
