import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCodeIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  TruckIcon,
  CameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getAssignedFarms } from '../../services/collectorHelpers'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { Html5Qrcode } from 'html5-qrcode'

const DailyCollection = () => {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [assignedFarms, setAssignedFarms] = useState([])
  const [farmCollections, setFarmCollections] = useState({})
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [collectionVolume, setCollectionVolume] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [showComplianceCheck, setShowComplianceCheck] = useState(false)
  const [activeTab, setActiveTab] = useState('collect')
  const [historyRecords, setHistoryRecords] = useState([])
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const html5QrCodeRef = useRef(null)
  const scannerDivId = 'farm-qr-reader'

  useEffect(() => {
    if (user?.id) {
      loadAssignedFarms()
    }
    
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || window.innerWidth < 768)
    }
    checkMobile()
    
    return () => {
      // Cleanup scanner on unmount
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
        html5QrCodeRef.current = null
      }
    }
    // eslint-disable-next-line
  }, [user])

  // Function to sync livestock health status for a farm
  const syncFarmLivestockHealthStatus = async (farmId) => {
    try {
      // Get all livestock for this farm
      const { data: livestockData } = await supabase
        .from('livestock')
        .select('id')
        .eq('farm_id', farmId)
      
      if (!livestockData || livestockData.length === 0) return
      
      const livestockIds = livestockData.map(l => l.id)
      const today = new Date().toISOString().split('T')[0]
      
      // Get all active treatments
      const { data: activeTreatments } = await supabase
        .from('treatments')
        .select('livestock_id')
        .in('livestock_id', livestockIds)
        .gte('withdrawal_end_date', today)
      
      const livestockUnderTreatment = new Set(activeTreatments?.map(t => t.livestock_id) || [])
      
      // Update livestock with active treatments to 'Under Treatment'
      if (livestockUnderTreatment.size > 0) {
        await supabase
          .from('livestock')
          .update({ health_status: 'Under Treatment' })
          .in('id', Array.from(livestockUnderTreatment))
      }
      
      // Update livestock without active treatments back to 'Healthy'
      const livestockNotUnderTreatment = livestockIds.filter(id => !livestockUnderTreatment.has(id))
      if (livestockNotUnderTreatment.length > 0) {
        await supabase
          .from('livestock')
          .update({ health_status: 'Healthy' })
          .in('id', livestockNotUnderTreatment)
          .eq('health_status', 'Under Treatment')
      }
    } catch (error) {
      console.error('Error syncing farm livestock health status:', error)
    }
  }

  const loadAssignedFarms = async () => {
    try {
      const farms = await getAssignedFarms(user.id)
      
      // Enhance farms with detailed withdrawal and compliance data
      const enhancedFarms = await Promise.all(farms.map(async (farm) => {
        // First sync livestock health status for this farm
        await syncFarmLivestockHealthStatus(farm.id)
        
        // Get livestock count for this farm
        const { data: livestock, error: livestockError } = await supabase
          .from('livestock')
          .select('id, health_status')
          .eq('farm_id', farm.id)
        
        if (livestockError) {
          console.error('Error fetching livestock for farm', farm.farm_id, ':', livestockError)
        }
        
        const totalAnimals = livestock?.length || 0
        const livestockIds = livestock?.map(l => l.id) || []
        
        // Count animals under treatment directly from health_status (already synced)
        const withdrawalCount = livestock?.filter(l => l.health_status === 'Under Treatment').length || 0
        
        // Get active withdrawals for detailed information
        const today = new Date()
        const { data: activeWithdrawals, error: withdrawalError } = await supabase
          .from('treatments')
          .select('livestock_id, drug_name, withdrawal_end_date, administration_date')
          .in('livestock_id', livestockIds)
          .gte('withdrawal_end_date', today.toISOString().split('T')[0])
        
        if (withdrawalError) {
          console.error('Error fetching withdrawals:', withdrawalError)
        }
        
        // Calculate compliance score
        // Factors: MRL test pass rate (40%), withdrawal compliance (30%), collection consistency (30%)
        let complianceScore = 100
        
        // Check recent MRL tests (last 90 days)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        const { data: samples } = await supabase
          .from('samples')
          .select('lab_status')
          .eq('farm_id', farm.id)
          .gte('collected_at', ninetyDaysAgo.toISOString())
          .eq('status', 'tested')
        
        if (samples && samples.length > 0) {
          const failedTests = samples.filter(s => s.lab_status === 'fail').length
          const mrlPassRate = ((samples.length - failedTests) / samples.length) * 100
          complianceScore = complianceScore - ((100 - mrlPassRate) * 0.4) // 40% weight
        }
        
        // Withdrawal compliance (animals under treatment)
        if (totalAnimals > 0) {
          const withdrawalRate = (withdrawalCount / totalAnimals) * 100
          if (withdrawalRate > 20) complianceScore -= 30 // Heavy penalty if >20% under treatment
          else if (withdrawalRate > 10) complianceScore -= 15 // Moderate penalty
          else complianceScore -= (withdrawalRate * 1.5) // Proportional penalty
        }
        
        // Collection consistency (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { data: recentCollections, count: collectionDays } = await supabase
          .from('collection_records')
          .select('collection_date', { count: 'exact' })
          .eq('farm_id', farm.id)
          .gte('collection_date', thirtyDaysAgo.toISOString().split('T')[0])
        
        const consistencyRate = (collectionDays / 30) * 100
        if (consistencyRate < 80) {
          complianceScore -= (80 - consistencyRate) * 0.3 // Up to 24 points deduction
        }
        
        complianceScore = Math.max(0, Math.round(complianceScore))
        
        return {
          ...farm,
          total_animals: totalAnimals,
          livestock_on_withdrawal: withdrawalCount,
          compliance_score: complianceScore,
          activeWithdrawals: activeWithdrawals || [],
          recentMRLTests: samples || []
        }
      }))
      
      setAssignedFarms(enhancedFarms)
      
      // Fetch today's collection for each farm
      const today = new Date().toISOString().slice(0, 10)
      const farmIds = enhancedFarms.map(f => f.id)
      if (farmIds.length > 0) {
        const { data: collections } = await supabase
          .from('collection_records')
          .select('farm_id, quantity_collected, collection_date')
          .eq('collector_id', user.id)
          .eq('collection_date', today)
        const farmCollectionsMap = {}
        collections?.forEach(rec => {
          farmCollectionsMap[rec.farm_id] = rec.quantity_collected
        })
        setFarmCollections(farmCollectionsMap)
      }
      
      // Fetch history records (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: history } = await supabase
        .from('collection_records')
        .select('farm_id, quantity_collected, collection_date, collection_time, unit')
        .eq('collector_id', user.id)
        .gte('collection_date', thirtyDaysAgo.toISOString().slice(0, 10))
        .order('collection_date', { ascending: false })
      setHistoryRecords(history || [])
    } catch (error) {
      console.error('Error loading assigned farms:', error)
      toast.error('Failed to load assigned farms')
    }
  }

  const handleQRScan = async () => {
    setShowQRScanner(true)
    setIsScanning(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const html5QrCode = new Html5Qrcode(scannerDivId)
      html5QrCodeRef.current = html5QrCode
      
      const boxSize = isMobile ? Math.min(250, window.innerWidth - 80) : 300
      
      const config = {
        fps: 10,
        qrbox: { width: boxSize, height: boxSize },
        aspectRatio: isMobile ? 16/9 : 1.0
      }
      
      const cameraConfig = isMobile 
        ? { facingMode: { exact: 'environment' } } 
        : { facingMode: 'user' }
      
      await html5QrCode.start(
        cameraConfig,
        config,
        async (decodedText) => {
          // QR scanned successfully
          try {
            // Parse QR data - expecting JSON with farm_id
            let farmData
            try {
              farmData = JSON.parse(decodedText)
            } catch {
              // If not JSON, treat as farm_id directly
              farmData = { farm_id: decodedText }
            }
            
            const farmId = farmData.farm_id || farmData.id || decodedText
            
            // Find farm in assigned farms
            const farm = assignedFarms.find(f => 
              f.farm_id === farmId || 
              f.id === farmId ||
              f.farm_id === farmId.toUpperCase()
            )
            
            if (farm) {
              await html5QrCode.stop()
              html5QrCodeRef.current = null
              setIsScanning(false)
              setShowQRScanner(false)
              setSelectedFarm(farm)
              setShowComplianceCheck(true)
              toast.success(`Farm ${farm.farm_id} scanned successfully`)
            } else {
              toast.error('Farm not found in your assigned route')
            }
          } catch (err) {
            console.error('Error processing QR:', err)
            toast.error('Invalid QR code')
          }
        },
        () => {} // onScanFailure - ignore
      )
    } catch (err) {
      console.error('Camera error:', err)
      setIsScanning(false)
      setShowQRScanner(false)
      
      if (err.name === 'NotAllowedError') {
        toast.error('Camera permission denied')
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera found')
      } else {
        toast.error('Unable to access camera')
      }
    }
  }
  
  const stopQRScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      }
      setIsScanning(false)
      setShowQRScanner(false)
    } catch (err) {
      console.error('Error stopping scanner:', err)
      setIsScanning(false)
      setShowQRScanner(false)
    }
  }

  const handleManualSearch = (farmId) => {
    const farm = assignedFarms.find(f => f.farm_id === farmId || f.farm_id === farmId.toUpperCase())
    if (farm) {
      setSelectedFarm(farm)
      setShowComplianceCheck(true)
      toast.success(`Farm ${farmId} found`)
    } else {
      toast.error('Farm not found')
    }
  }

  const handleCollectionSubmit = async () => {
    // Lock collection after 12 am for the day
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const currentHour = now.getHours()
    if (farmCollections[selectedFarm.id] && currentHour < 24) {
      toast.error('Collection already submitted for today. Please wait until after midnight to collect again.')
      return
    }
    if (!selectedFarm || !collectionVolume) {
      toast.error('Please enter collection volume')
      return
    }
    const volume = parseFloat(collectionVolume)
    // ...existing compliance logic...
    if (selectedFarm.status === 'blocked') {
      toast.error(
        <div>
          <p className="font-bold">Collection BLOCKED</p>
          <p className="text-sm">Recent MRL failure - farm under audit</p>
        </div>,
        { duration: 5000, icon: '🚫' }
      )
      return
    }
    if (selectedFarm.withdrawalStatus === 'active') {
      const { affectedAnimals, daysRemaining } = selectedFarm.withdrawalStatus
      const maxAllowed = selectedFarm.avgDailyYield * ((selectedFarm.total_animals - affectedAnimals) / selectedFarm.total_animals)
      if (volume > maxAllowed) {
        toast.error(
          <div>
            <p className="font-bold">Collection REJECTED</p>
            <p className="text-sm">Volume exceeds safe limit</p>
            <p className="text-sm">Max allowed: {Math.floor(maxAllowed)}L</p>
            <p className="text-sm">Suspected mixing of treated milk</p>
          </div>,
          { duration: 6000 }
        )
        return
      } else {
        toast.success(
          <div>
            <p className="font-bold">Partial Collection ACCEPTED</p>
            <p className="text-sm">{volume}L collected from {selectedFarm.total_animals - affectedAnimals} healthy animals</p>
            <p className="text-sm text-yellow-600">Warning: {affectedAnimals} animals under treatment</p>
          </div>,
          { duration: 5000 }
        )
      }
    } else {
      toast.success(
        <div>
          <p className="font-bold">Collection ACCEPTED</p>
          <p className="text-sm">{volume}L from {selectedFarm.name}</p>
          <p className="text-sm">Added to Batch B-2025-NOV-15-T101</p>
        </div>,
        { duration: 4000 }
      )
    }
    // Insert collection record
    try {
      await supabase.from('collection_records').insert({
        collector_id: user.id,
        farm_id: selectedFarm.id,
        collection_date: today,
        collection_time: now.toLocaleTimeString('en-GB', { hour12: false }),
        quantity_collected: volume,
        unit: 'liters',
        notes: '',
        can_accept: true
      })
      await loadAssignedFarms()
    } catch (error) {
      toast.error('Failed to record collection')
    }
    setSelectedFarm(null)
    setCollectionVolume('')
    setShowComplianceCheck(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return 'bg-green-100 border-green-500 text-green-800'
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      case 'blocked': return 'bg-red-100 border-red-500 text-red-800'
      default: return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe': return <CheckCircleIcon className="w-16 h-16 text-green-600" />
      case 'warning': return <ExclamationTriangleIcon className="w-16 h-16 text-yellow-600" />
      case 'blocked': return <XCircleIcon className="w-16 h-16 text-red-600" />
      default: return null
    }
  }

  const getStatusMessage = (farm) => {
    if (farm.status === 'blocked') {
      return 'STOP! Recent MRL Failure - Farm Under Audit'
    }
    if (farm.withdrawalStatus === 'active') {
      return 'PARTIAL RESTRICTION - Active Withdrawal Period'
    }
    return 'Safe to Collect - No Active Drugs'
  }

  return (
    <div className="p-6 space-y-6">
      <style>{`
        #farm-qr-reader video {
          border-radius: 0 !important;
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #farm-qr-reader {
          border: none !important;
        }
        #farm-qr-reader__dashboard_section_csr {
          display: none !important;
        }
      `}</style>
      
      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={stopQRScanner}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl overflow-hidden bg-white shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
                <h2 className="text-xl font-bold text-white">Scan Farm QR Code</h2>
                <button
                  onClick={stopQRScanner}
                  className="p-2 text-white transition-colors rounded-lg hover:bg-white/20"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="relative overflow-hidden bg-black shadow-2xl rounded-xl">
                  <div
                    id={scannerDivId}
                    className="relative w-full bg-black"
                    style={{ height: isMobile ? '400px' : '500px' }}
                  />
                  
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative" style={{
                          width: isMobile ? Math.min(250, window.innerWidth - 80) : 300,
                          height: isMobile ? Math.min(250, window.innerWidth - 80) : 300
                        }}>
                          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-400"></div>
                          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-400"></div>
                          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-400"></div>
                          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-400"></div>
                        </div>
                      </div>
                      <div className="absolute left-0 right-0 text-center top-4">
                        <div className="inline-block px-6 py-3 text-base font-bold text-white bg-green-600 rounded-full shadow-xl backdrop-blur-sm bg-opacity-90">
                          <span className="inline-block w-2 h-2 mr-2 bg-white rounded-full animate-pulse"></span>
                          Scanning Farm QR...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={stopQRScanner}
                  className="flex items-center justify-center w-full gap-2 px-6 py-3 mt-4 text-lg font-semibold text-white transition-all transform bg-red-600 shadow-lg rounded-xl hover:bg-red-700 hover:scale-105"
                >
                  <XMarkIcon className="w-6 h-6" />
                  <span>Cancel Scan</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Collection</h1>
          <p className="mt-1 text-sm text-gray-500">Farm gate verification & fraud detection</p>
        </div>
        <TruckIcon className="w-10 h-10 text-blue-600" />
      </motion.div>

      {/* Tabs for Collection and History */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'collect' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('collect')}
        >
          Daily Collection
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'collect' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Step 1: Identify Farm</h3>
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
            {/* QR Scanner */}
            <div className="p-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="text-center">
                <CameraIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <button
                  onClick={handleQRScan}
                  disabled={isScanning}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScanning ? 'Scanning...' : 'Scan Farm QR'}
                </button>
                <p className="mt-2 text-xs text-gray-500">Scan farm QR code</p>
              </div>
            </div>
            {/* Manual Search */}
            <div className="p-6 border-2 border-gray-300 rounded-lg">
              <div className="mb-4 text-center">
                <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="mb-4 text-sm font-medium text-gray-700">Manual Search</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Farm Code (e.g., F-001)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchQuery) {
                      handleManualSearch(searchQuery.toUpperCase())
                    }
                  }}
                />
                <button
                  onClick={() => searchQuery && handleManualSearch(searchQuery.toUpperCase())}
                  className="absolute px-4 py-1 text-sm text-white bg-blue-600 rounded right-2 top-2 hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
          {/* Quick Farm List */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700">Quick Select from Today's Route</h4>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {assignedFarms.slice(0, 8).map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => {
                    setSelectedFarm(farm)
                    setShowComplianceCheck(true)
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-blue-100 hover:text-blue-700"
                  disabled={farmCollections[farm.id]}
                >
                  {farm.farm_id}
                  {farmCollections[farm.id] && (
                    <span className="ml-2 text-xs text-green-600">({farmCollections[farm.id]}L collected)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Collection History (Last 30 Days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Farm Code</th>
                  <th className="px-4 py-2 text-left">Quantity</th>
                  <th className="px-4 py-2 text-left">Unit</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No records found</td>
                  </tr>
                ) : (
                  historyRecords.map((rec, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{rec.collection_date}</td>
                      <td className="px-4 py-2">{rec.farm_id}</td>
                      <td className="px-4 py-2">{rec.quantity_collected}</td>
                      <td className="px-4 py-2">{rec.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Step 2: Real-Time Compliance Check */}
      {showComplianceCheck && selectedFarm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border-4 rounded-lg p-6 ${getStatusColor(selectedFarm.status)}`}
        >
          <h3 className="mb-4 text-lg font-semibold">Step 2: Real-Time Compliance Check</h3>
          
          <div className="flex items-center justify-center mb-6">
            {getStatusIcon(selectedFarm.status)}
          </div>

          <div className="mb-6 text-center">
            <p className="text-lg font-medium">{selectedFarm.name} ({selectedFarm.farm_id})</p>
            <p className="text-sm text-gray-600">Farmer: {selectedFarm.farmer_name} • {selectedFarm.location}</p>
          </div>

          {/* Simplified Score Card */}
          <div className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Farm Compliance Score</p>
              <div className={`text-6xl font-bold mb-2 ${
                (selectedFarm.compliance_score ?? 0) >= 90 ? 'text-green-600' :
                (selectedFarm.compliance_score ?? 0) >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {selectedFarm.compliance_score ?? 0}<span className="text-3xl">/100</span>
              </div>
              <p className={`text-sm font-semibold ${
                (selectedFarm.compliance_score ?? 0) >= 90 ? 'text-green-700' :
                (selectedFarm.compliance_score ?? 0) >= 70 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {(selectedFarm.compliance_score ?? 0) >= 90 ? '✓ Excellent Compliance' :
                 (selectedFarm.compliance_score ?? 0) >= 70 ? '⚠ Fair Compliance' :
                 '✗ Poor Compliance'}
              </p>
            </div>

            {/* Farm Livestock Details */}
            <div className="p-4 mb-4 bg-white rounded-lg border-2 border-blue-300">
              <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Farm Livestock Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Total Animals</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedFarm.total_animals || 0}</p>
                </div>
                {(selectedFarm.livestock_on_withdrawal ?? 0) > 0 ? (
                  <>
                    <div className="p-3 bg-yellow-50 rounded-lg text-center border border-yellow-300">
                      <p className="text-xs text-yellow-700">Healthy</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {(selectedFarm.total_animals || 0) - (selectedFarm.livestock_on_withdrawal ?? 0)}
                      </p>
                    </div>
                    <div className="col-span-2 p-4 bg-red-50 rounded-lg text-center border-2 border-red-300">
                      <p className="text-xs text-red-700 font-semibold mb-1">⚠️ UNDER WITHDRAWAL PERIOD</p>
                      <p className="text-4xl font-bold text-red-600">{selectedFarm.livestock_on_withdrawal}</p>
                      <p className="text-xs text-red-600 mt-1">Animals cannot be collected</p>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Healthy</p>
                    <p className="text-2xl font-bold text-green-600">{selectedFarm.total_animals || 0}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Safe Collection Range */}
            <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
              <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Safe Collection Range</p>
              {(selectedFarm.livestock_on_withdrawal ?? 0) > 0 ? (
                <>
                  <p className="text-3xl font-bold text-center text-orange-600 mb-2">
                    0 - {Math.floor((selectedFarm.avgDailyYield ?? 0) * ((selectedFarm.total_animals - (selectedFarm.livestock_on_withdrawal ?? 0)) / (selectedFarm.total_animals || 1)))}L
                  </p>
                  <p className="text-xs text-center text-gray-600 mt-2">
                    Based on {selectedFarm.total_animals - (selectedFarm.livestock_on_withdrawal ?? 0)} healthy animals
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-center text-green-600 mb-2">
                    0 - {selectedFarm.avgDailyYield ?? 0}L
                  </p>
                  <p className="text-xs text-center text-gray-600 mt-2">
                    All {selectedFarm.total_animals} animals healthy
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Volume Entry */}
          {selectedFarm.status !== 'blocked' && (
            <div>
              <h4 className="mb-4 text-lg font-semibold">Step 3: Enter Collection Volume</h4>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={collectionVolume}
                  onChange={(e) => setCollectionVolume(e.target.value)}
                  placeholder="Enter liters collected"
                  className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
                <button
                  onClick={handleCollectionSubmit}
                  className="px-8 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Submit Collection
                </button>
                <button
                  onClick={() => {
                    setSelectedFarm(null)
                    setCollectionVolume('')
                    setShowComplianceCheck(false)
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedFarm.status === 'blocked' && (
            <div className="text-center">
              <button
                onClick={() => {
                  setSelectedFarm(null)
                  setShowComplianceCheck(false)
                }}
                className="px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Close - Collection Not Allowed
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Info Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 border border-blue-200 rounded-lg bg-blue-50"
      >
        <p className="text-sm text-blue-800">
          <span className="font-medium">Fraud Detection:</span> System automatically calculates safe collection limits based on 
          active withdrawal periods and animal health status to prevent mixing of contaminated products.
        </p>
      </motion.div>
    </div>
  )
}

export default DailyCollection
