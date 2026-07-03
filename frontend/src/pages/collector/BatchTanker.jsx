import React, { useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { motion } from 'framer-motion'
import {
  TruckIcon,
  LockClosedIcon,
  CheckCircleIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../config/supabase'
import { getFarm } from '../../services/farmHelpers'

const BatchTanker = () => {
  const { user, profile } = useAuthStore()
  const [activeBatch, setActiveBatch] = useState(null)
  const [showSealConfirm, setShowSealConfirm] = useState(false)
  const [todayCollections, setTodayCollections] = useState([])
  const [batchHistory, setBatchHistory] = useState([])
  const [sampleMap, setSampleMap] = useState({})
  const [farmDetailsMap, setFarmDetailsMap] = useState({})
  const [showQR, setShowQR] = useState(false)
  const [qrBatch, setQrBatch] = useState(null)

  // Friendly collector ID from profile (preferred) or short UUID fallback
  const collectorDisplayId =
    profile?.unique_id || (user?.id ? user.id.slice(0, 8) : '')

  // Fetch farm details for QR batch (history) when QR popup opens
  useEffect(() => {
    const loadQrBatchFarms = async () => {
      if (!qrBatch) return

      // Try to parse QR code data (new format) or use farms_included (old format)
      let farmIds = []
      try {
        const qrData = JSON.parse(qrBatch.qr_code_url || '{}')
        if (qrData.farms_included && Array.isArray(qrData.farms_included)) {
          // Check if farms_included already has details (new format)
          if (qrData.farms_included.length > 0 && qrData.farms_included[0].farm_name) {
            // Already has farm details in QR data, use them directly
            const farmMap = {}
            qrData.farms_included.forEach((farm) => {
              farmMap[farm.farm_id] = {
                id: farm.farm_id,
                name: farm.farm_name,
                code: farm.farm_code,
                farmer: farm.farmer_name
              }
            })
            setFarmDetailsMap((prev) => ({ ...prev, ...farmMap }))
            return
          } else {
            // Old format with just IDs
            farmIds = qrData.farms_included
          }
        }
      } catch {
        // Fallback to farms_included from batch record
        farmIds = qrBatch.farms_included || []
      }

      if (farmIds.length === 0) return

      // Fetch farm details from database
      const farmDetailPromises = farmIds.map(async (farmId) => {
        try {
          const farm = await getFarm(farmId)
          return {
            id: farmId,
            name: farm.farm_name || farm.name || '',
            code: farm.farm_id || farm.farm_code || '',
            farmer: farm.farmer_name || farm.farmer || ''
          }
        } catch {
          return { id: farmId, name: '', code: '', farmer: '' }
        }
      })

      const farmDetailsArr = await Promise.all(farmDetailPromises)
      const farmMap = {}
      farmDetailsArr.forEach((f) => {
        farmMap[f.id] = f
      })
      setFarmDetailsMap((prev) => ({ ...prev, ...farmMap }))
    }

    if (qrBatch) loadQrBatchFarms()
  }, [qrBatch])

  useEffect(() => {
    if (user?.id) {
      fetchBatchData()
    }
    // eslint-disable-next-line
  }, [user])

  const fetchBatchData = async () => {
    const today = new Date().toISOString().slice(0, 10)

    // Get today's collections
    const { data: collections } = await supabase
      .from('collection_records')
      .select('farm_id, quantity_collected')
      .eq('collector_id', user.id)
      .eq('collection_date', today)

    setTodayCollections(collections || [])

    // Get active (unsealed) batch for today
    let { data: batch } = await supabase
      .from('batches')
      .select('*')
      .eq('collector_id', user.id)
      .eq('collection_date', today)
      .eq('sealed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setActiveBatch(batch)

    // Fetch farm details for all farms in active batch
    if (batch?.farms_included?.length) {
      const farmDetailPromises = batch.farms_included.map(async (farmId) => {
        try {
          const farm = await getFarm(farmId)
          return {
            id: farmId,
            name: farm.farm_name || farm.name || '',
            code: farm.farm_id || farm.farm_code || '',
            farmer: farm.farmer_name || farm.farmer || ''
          }
        } catch {
          return { id: farmId, name: '', code: '', farmer: '' }
        }
      })
      const farmDetailsArr = await Promise.all(farmDetailPromises)
      const farmMap = {}
      farmDetailsArr.forEach((f) => {
        farmMap[f.id] = f
      })
      setFarmDetailsMap(farmMap)
    }

    // Get batch history - only today's sealed batches
    const { data: batches } = await supabase
      .from('batches')
      .select('*')
      .eq('collector_id', user.id)
      .eq('collection_date', today)
      .eq('sealed', true)
      .order('sealed_time', { ascending: false })

    setBatchHistory(batches || [])

    // Migrate old batches to new JSON format
    if (batches && batches.length > 0) {
      for (const batch of batches) {
        // Check if batch has old URL format
        if (batch.qr_code_url && batch.qr_code_url.startsWith('https://')) {
          try {
            // Extract details from old URL
            const url = new URL(batch.qr_code_url)
            const detailsParam = url.searchParams.get('details')
            if (detailsParam) {
              const oldDetails = JSON.parse(decodeURIComponent(detailsParam))
              
              // Fetch farm details if needed
              const farmIds = oldDetails.farms_included || []
              const farmsReadable = []
              
              for (const farmId of farmIds) {
                try {
                  const farm = await getFarm(farmId)
                  farmsReadable.push(`${farm.farm_name || farm.name || 'Unknown Farm'} (${farm.farm_id || farm.farm_code || farmId})`)
                } catch {
                  farmsReadable.push(`Unknown Farm (${farmId})`)
                }
              }
              
              const sealedTime = new Date(batch.sealed_time)
              // Create new JSON format
              const newQrData = {
                batch_id: oldDetails.batch_id,
                collector_vasudha_id: oldDetails.collector_display_id,
                collector_name: oldDetails.collector_name,
                collector_mobile: oldDetails.collector_mobile,
                collection_date: oldDetails.collection_date,
                farms: farmsReadable.join(', ') || 'No farms',
                volume: `${oldDetails.total_volume}L`,
                sample_id: oldDetails.sample_id || 'Not collected',
                sample_code: oldDetails.sample_code || 'N/A',
                sealed_time: sealedTime.toLocaleString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })
              }
              
              // Update batch with new format
              await supabase
                .from('batches')
                .update({ qr_code_url: JSON.stringify(newQrData, null, 2) })
                .eq('id', batch.id)
              
              // Update local state
              batch.qr_code_url = JSON.stringify(newQrData, null, 2)
            }
          } catch (error) {
            console.error('Error migrating batch:', batch.batch_id, error)
          }
        }
      }
    }

    // Get samples for batches
    const batchIds = (batches || []).map((b) => b.batch_id)
    if (batchIds.length > 0) {
      const { data: samples } = await supabase
        .from('samples')
        .select('id, batch_id, sample_code')
        .in('batch_id', batchIds)

      const map = {}
      samples?.forEach((s) => {
        map[s.batch_id] = s.sample_code
      })
      setSampleMap(map)
    }
  }

  const fillPercentage =
    activeBatch && !activeBatch.sealed
      ? (Number(activeBatch.total_volume || 0) / 1000) * 100
      : 0

  const handleSealBatch = async () => {
    if (!activeBatch) return

    // Prepare farm details for QR in readable format
    const farmsReadable = (activeBatch.farms_included || []).map((farmId) => {
      const farm = farmDetailsMap[farmId]
      return `${farm?.name || 'Unknown Farm'} (${farm?.code || farmId})`
    }).join(', ')

    const sealedTime = new Date()
    const qrDetails = {
      batch_id: activeBatch.batch_id,
      collector_vasudha_id: collectorDisplayId,
      collector_name: activeBatch.collector_name,
      collector_mobile: activeBatch.collector_mobile,
      collection_date: activeBatch.collection_date,
      farms: farmsReadable || 'No farms',
      volume: `${activeBatch.total_volume}L`,
      sample_id: activeBatch.sample_id || 'Not collected',
      sample_code: sampleMap[activeBatch.batch_id] || 'N/A',
      sealed_time: sealedTime.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    }

    // Store as properly formatted JSON string
    const qrCodeData = JSON.stringify(qrDetails, null, 2)

    await supabase
      .from('batches')
      .update({  
        sealed: true,
        sealed_time: sealedTime.toISOString(),
        qr_code_url: qrCodeData
      })
      .eq('id', activeBatch.id)

    toast.success(
      <div>
        <p className="font-bold">Batch Sealed Successfully</p>
        <p className="text-sm">Batch ID: {activeBatch.batch_id}</p>
        <p className="text-sm">QR Code generated for processing plant</p>
      </div>,
      { duration: 5000 }
    )

    setShowSealConfirm(false)
    setActiveBatch(null)
    setTodayCollections([])
    setFarmDetailsMap({})
    setSampleMap({})
    fetchBatchData()
  }

  const handleCreateBatch = async () => {
    const today = new Date().toISOString().slice(0, 10)
    
    // Get count of today's batches to generate unique ID
    const { count } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('collector_id', user.id)
      .eq('collection_date', today)
    
    const batchNumber = (count || 0) + 1
    const batchId = `BATCH-${today.replace(/-/g, '')}-${user.id.slice(0, 8)}-${batchNumber}`
    
    const { data: newBatch, error } = await supabase
      .from('batches')
      .insert({
        batch_id: batchId,
        collector_id: user.id,
        collector_name: profile?.name,
        collector_mobile: profile?.mobile_number,
        collection_date: today,
        farms_included: [],
        total_volume: 0,
        sealed: false
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create batch: ' + error.message)
      return
    }

    toast.success('New batch created: ' + batchId)
    setActiveBatch(newBatch)
    fetchBatchData()
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
          <h1 className="text-2xl font-bold text-gray-900">Batch & Tanker</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aggregation & sealing management
          </p>
          {collectorDisplayId && (
            <p className="mt-1 text-xs text-gray-500">
              Collector ID:{' '}
              <span className="font-mono font-semibold">
                {collectorDisplayId}
              </span>
            </p>
          )}
        </div>
        <TruckIcon className="w-10 h-10 text-blue-600" />
      </motion.div>

      {activeBatch ? (
        <>
          {/* Active Batch Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 text-white rounded-lg bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{activeBatch.batch_id}</h2>
                <p className="opacity-90">
                  Collector: {activeBatch.collector_name} (
                  {activeBatch.collector_mobile})
                </p>
                {collectorDisplayId && (
                  <p className="text-xs opacity-90">
                    Collector ID:{' '}
                    <span className="font-mono">{collectorDisplayId}</span>
                  </p>
                )}
                <p className="opacity-90">Date: {activeBatch.collection_date}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {Math.round(fillPercentage)}%
                </p>
                <p className="opacity-90">Full</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-white/20">
                <p className="text-sm opacity-90">Current Volume</p>
                <p className="text-2xl font-bold">
                  {activeBatch.total_volume}L
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <p className="text-sm opacity-90">Farms Included</p>
                <p className="text-2xl font-bold">
                  {activeBatch.farms_included?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/20">
                <p className="text-sm opacity-90">Sample</p>
                {activeBatch.sample_id ? (
                  <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                    Sample ID: {sampleMap[activeBatch.batch_id]}
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                    No sample collected
                  </span>
                )}
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full h-6 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full transition-all duration-500 bg-white"
                  style={{ width: `${fillPercentage}%` }}
                ></div>
              </div>
            </div>
          </motion.div>

          {/* Live Traceability */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Live Traceability
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              All farms currently included in this tanker batch
            </p>
            <div className="space-y-2">
              {activeBatch.farms_included?.map((farmId, index) => {
                const farm = farmDetailsMap[farmId]
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Farm:{' '}
                          <span className="font-mono text-blue-700">
                            {farm?.name || 'Unknown Farm'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600">
                          Farm ID:{' '}
                          <span className="font-mono">
                            {farm?.code || farmId}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600">
                          Farmer: {farm?.farmer || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Added to batch
                      </p>
                      <p className="text-xs text-gray-500">Verified safe</p>
                    </div>
                  </div>
                )
              })}
            </div>
            {(!activeBatch.farms_included ||
              activeBatch.farms_included.length === 0) && (
              <div className="py-8 text-center text-gray-500">
                <TruckIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No farms added to this batch yet</p>
              </div>
            )}
          </motion.div>

          {/* Seal Batch Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Seal Batch
            </h3>
            {!activeBatch.sealed ? (
              <div>
                <div className="p-4 mb-4 border border-green-200 rounded-lg bg-green-50">
                  <p className="text-sm text-green-800">
                    Tanker is {Math.round(fillPercentage)}% full. You can seal
                    the batch at any time.
                  </p>
                </div>
                {!showSealConfirm ? (
                  <button
                    onClick={() => setShowSealConfirm(true)}
                    className="flex items-center justify-center w-full gap-2 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <LockClosedIcon className="w-5 h-5" />
                    Seal Batch
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border-2 border-yellow-400 rounded-lg bg-yellow-50">
                      <p className="mb-2 font-bold text-yellow-900">
                        Confirm Batch Sealing
                      </p>
                      <p className="text-sm text-yellow-800">
                        Once sealed, this batch cannot be modified. A
                        Certificate of Aggregation will be generated with full
                        details.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleSealBatch}
                        className="flex-1 px-6 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        Confirm Seal
                      </button>
                      <button
                        onClick={() => setShowSealConfirm(false)}
                        className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-700">Batch already sealed.</p>
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 text-center bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <TruckIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            No Active Batch
          </h3>
          <p className="text-gray-600">
            Create a new batch to start collecting milk or meat from farms.
          </p>
          <button
            onClick={handleCreateBatch}
            className="px-6 py-3 mt-6 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Create New Batch
          </button>
        </motion.div>
      )}

      {/* Create New Batch Button (shown even with active batch) */}
      {activeBatch && !activeBatch.sealed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            onClick={handleCreateBatch}
            className="px-6 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            + Create Another Batch
          </button>
        </motion.div>
      )}

      {/* Sealed Batches History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Today's Sealed Batches
        </h3>
        <div className="space-y-3">
          {batchHistory.length > 0 ? (
            batchHistory.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <LockClosedIcon className="w-6 h-6 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {batch.batch_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      {batch.farms_included?.length || 0} farms •{' '}
                      {batch.total_volume}L
                    </p>
                    <p className="mt-1 text-xs">
                      {batch.sample_id ? (
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
                          Sample ID: {sampleMap[batch.batch_id]}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                          No sample collected
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">Sealed</p>
                  <p className="text-xs text-gray-500">
                    {batch.sealed_time
                      ? new Date(batch.sealed_time).toLocaleString()
                      : ''}
                  </p>
                  <div className="mt-2">
                    <button
                      className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-blue-700 rounded-lg hover:bg-blue-900"
                      onClick={() => {
                        setShowQR(true)
                        setQrBatch(batch)
                      }}
                    >
                      <QrCodeIcon className="w-5 h-5" />
                      View QR
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <LockClosedIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No sealed batches today</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 border border-blue-200 rounded-lg bg-blue-50"
      >
        <p className="text-sm text-blue-800">
          <span className="font-medium">Traceability:</span> Each sealed batch
          receives a unique Certificate QR code that processing plants scan to
          view complete farm-level traceability data. Supports both milk and meat collection.
        </p>
      </motion.div>

      {/* QR Popup */}
      {showQR && qrBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-2xl p-8 overflow-y-auto bg-white rounded-lg shadow-lg max-h-[90vh]">
            <button
              className="absolute text-xl font-bold text-gray-500 top-2 right-2 hover:text-gray-800"
              onClick={() => setShowQR(false)}
            >
              &times;
            </button>
            <h2 className="mb-4 text-xl font-bold text-center text-blue-700">
              Batch Certificate QR
            </h2>
            <div className="flex flex-col items-center gap-4">
              <QRCodeCanvas 
                value={qrBatch.qr_code_url || JSON.stringify({ batch_id: qrBatch.batch_id })} 
                size={200} 
              />
              <div className="w-full mt-4 space-y-2 text-sm text-gray-800">
                <div>
                  <span className="font-bold">Batch ID:</span>{' '}
                  {qrBatch.batch_id}
                </div>
                <div>
                  <span className="font-bold">Collector:</span>{' '}
                  {qrBatch.collector_name} ({qrBatch.collector_mobile})
                </div>
                {collectorDisplayId && (
                  <div>
                    <span className="font-bold">Collector ID:</span>{' '}
                    <span className="font-mono">{collectorDisplayId}</span>
                  </div>
                )}
                <div>
                  <span className="font-bold">Collection Date:</span>{' '}
                  {qrBatch.collection_date}
                </div>
                <div>
                  <span className="font-bold">Farms:</span>{' '}
                  {(() => {
                    try {
                      // First try to get farms from QR data
                      const qrData = JSON.parse(qrBatch.qr_code_url || '{}')
                      const farmsInQR = qrData.farms_included || []
                      
                      // Check if QR data has farm details
                      if (farmsInQR.length > 0 && farmsInQR[0].farm_name) {
                        return farmsInQR.map((farm, idx) => (
                          <span key={idx} className="block ml-2">
                            {farm.farm_name}{' '}
                            <span className="text-xs text-gray-600">
                              (ID: <span className="font-mono">{farm.farm_code}</span>)
                            </span>
                          </span>
                        ))
                      }
                      
                      // Fallback to farmDetailsMap for old batches
                      const farmIds = Array.isArray(qrBatch.farms_included) 
                        ? qrBatch.farms_included 
                        : (Array.isArray(farmsInQR) ? farmsInQR : [])
                      
                      if (farmIds.length === 0) {
                        return <span className="ml-2">None</span>
                      }
                      
                      return farmIds.map((farmId, idx) => {
                        const farm = farmDetailsMap[farmId]
                        return (
                          <span key={idx} className="block ml-2">
                            {farm?.name || 'Loading...'}{' '}
                            <span className="text-xs text-gray-600">
                              (ID: <span className="font-mono">{farm?.code || farmId}</span>)
                            </span>
                          </span>
                        )
                      })
                    } catch (e) {
                      // Final fallback for old URL format batches
                      const farmIds = qrBatch.farms_included || []
                      if (farmIds.length === 0) {
                        return <span className="ml-2">None</span>
                      }
                      return farmIds.map((farmId, idx) => {
                        const farm = farmDetailsMap[farmId]
                        return (
                          <span key={idx} className="block ml-2">
                            {farm?.name || 'Loading...'}{' '}
                            <span className="text-xs text-gray-600">
                              (ID: <span className="font-mono">{farm?.code || farmId}</span>)
                            </span>
                          </span>
                        )
                      })
                    }
                  })()}
                </div>
              </div>
              
              {/* JSON Data Display */}
              
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchTanker
