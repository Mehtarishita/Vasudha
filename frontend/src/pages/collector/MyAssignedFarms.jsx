import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  QrCodeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { getAssignedFarms, getFarmByQR, searchFarms } from '../../services/collectorHelpers'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const MyAssignedFarms = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [farms, setFarms] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [addFarmMethod, setAddFarmMethod] = useState('search') // 'search' or 'qr'
  const [farmSearchQuery, setFarmSearchQuery] = useState('')
  const [farmSearchResults, setFarmSearchResults] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [showFarmAssignForm, setShowFarmAssignForm] = useState(false)
  const [assignAvgYield, setAssignAvgYield] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [searchingFarms, setSearchingFarms] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadAssignedFarms()
    }
  }, [user])

  const loadAssignedFarms = async () => {
    try {
      setLoading(true)
      const data = await getAssignedFarms(user.id)
      setFarms(data)
    } catch (error) {
      console.error('Error loading farms:', error)
      toast.error('Failed to load farms')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchFarms = async () => {
    if (!farmSearchQuery.trim()) {
      toast.error('Please enter farm ID or name')
      return
    }

    try {
      setSearchingFarms(true)
      const results = await searchFarms(farmSearchQuery)
      setFarmSearchResults(results)
      if (results.length === 0) {
        toast.error('No farms found')
      }
    } catch (error) {
      console.error('Error searching farms:', error)
      toast.error('Failed to search farms')
    } finally {
      setSearchingFarms(false)
    }
  }

  const handleQRScan = async (qrData) => {
    try {
      const farm = await getFarmByQR(qrData)
      if (farm) {
        toast.success(`Farm ${farm.farm_id} scanned successfully!`)
        setShowQRScanner(false)
        setShowAddModal(false)
        loadAssignedFarms()
      }
    } catch (error) {
      console.error('Error scanning QR:', error)
      toast.error('Failed to scan farm QR code')
    }
  }

  const handleAddFarm = async (farm) => {
    setSelectedFarm(farm)
    setShowFarmAssignForm(true)
    setAssignAvgYield('')
    setAssignNotes('')
  }

  const filteredFarms = farms.filter(farm => {
    const matchesSearch = 
      (farm.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (farm.farm_id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (farm.farmer_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (farm.location?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    
    const matchesFilter = 
      filterStatus === 'all' ||
      farm.status === filterStatus

    return matchesSearch && matchesFilter
  })

  const statusCounts = {
    all: farms.length,
    safe: farms.filter(f => f.status === 'safe').length,
    warning: farms.filter(f => f.status === 'warning').length,
    blocked: farms.filter(f => f.status === 'blocked').length
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe': return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
      case 'blocked': return <XCircleIcon className="w-5 h-5 text-red-600" />
      default: return null
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      safe: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      blocked: 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const handleFarmAssignSubmit = async () => {
    if (!user?.id || !selectedFarm) return
    try {
      await import('../../services/collectorHelpers').then(({ assignFarm }) =>
        assignFarm(user.id, selectedFarm, {
          avg_yield: assignAvgYield,
          notes: assignNotes
        })
      )
      toast.success(`Farm ${selectedFarm.farm_id} added to your route!`)
      setShowFarmAssignForm(false)
      setShowAddModal(false)
      setFarmSearchResults([])
      setFarmSearchQuery('')
      setSelectedFarm(null)
      await loadAssignedFarms()
    } catch (error) {
      toast.error(error?.message || 'Failed to add farm')
    }
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
          <h1 className="text-2xl font-bold text-gray-900">My Assigned Farms</h1>
          <p className="mt-1 text-sm text-gray-500">Directory of farms in your collection route</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Farm</span>
          </button>
          <BuildingOfficeIcon className="w-10 h-10 text-blue-600" />
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setFilterStatus('all')}
          className={`p-6 bg-white border-2 rounded-lg shadow-sm cursor-pointer transition-all ${
            filterStatus === 'all' ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">Total Farms</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{statusCounts.all}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => setFilterStatus('safe')}
          className={`p-6 bg-white border-2 rounded-lg shadow-sm cursor-pointer transition-all ${
            filterStatus === 'safe' ? 'border-green-500' : 'border-gray-200 hover:border-green-300'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">Safe to Collect</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{statusCounts.safe}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => setFilterStatus('warning')}
          className={`p-6 bg-white border-2 rounded-lg shadow-sm cursor-pointer transition-all ${
            filterStatus === 'warning' ? 'border-yellow-500' : 'border-gray-200 hover:border-yellow-300'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">Partial Restriction</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{statusCounts.warning}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => setFilterStatus('blocked')}
          className={`p-6 bg-white border-2 rounded-lg shadow-sm cursor-pointer transition-all ${
            filterStatus === 'blocked' ? 'border-red-500' : 'border-gray-200 hover:border-red-300'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">Blocked</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{statusCounts.blocked}</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-4"
      >
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by farm name, ID, farmer, or village..."
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Farms List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {filterStatus === 'all' ? 'All Farms' : 
             filterStatus === 'safe' ? 'Safe Farms' :
             filterStatus === 'warning' ? 'Warning Farms' : 'Blocked Farms'}
          </h3>
          
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading farms...</p>
              </div>
            ) : filteredFarms.length > 0 ? (
              filteredFarms.map((farm) => (
                <div key={farm.id} className="p-4 transition-colors border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 gap-4">
                      {getStatusIcon(farm.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-gray-900">{farm.name}</p>
                          <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded">
                            {farm.farm_id}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(farm.status)}`}>
                            {farm.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {farm.farmer_name} • {farm.location}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-600">Animals: <span className="font-medium text-gray-900">{farm.total_animals || 0}</span></span>
                          <span className="text-gray-600">Avg Yield: <span className="font-medium text-gray-900">{farm.avgDailyYield || 0}L</span></span>
                          <span className="text-gray-600">Compliance: <span className="font-medium text-green-600">{farm.compliance_score}%</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <button 
                        onClick={() => navigate(`/collector/farms/${farm.id}`)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 rounded-lg bg-blue-50 hover:bg-blue-100"
                      >
                        View Farm
                      </button>
                    </div>
                  </div>

                  {farm.withdrawalStatus && (
                    <div className="p-3 mt-3 border border-yellow-200 rounded bg-yellow-50">
                      <p className="text-sm font-medium text-yellow-900">
                        Active Withdrawal Period: {farm.withdrawalStatus.drugName} - {farm.withdrawalStatus.daysRemaining} days remaining
                      </p>
                      <p className="mt-1 text-xs text-yellow-700">
                        Affected animals: {farm.withdrawalStatus.affectedAnimals}/{farm.total_animals}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <BuildingOfficeIcon className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No farms found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Add Farm Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Add Farm to Route</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 text-gray-500 rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Method Selection */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setAddFarmMethod('search')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      addFarmMethod === 'search'
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2" />
                    Search Farm
                  </button>
                  <button
                    onClick={() => {
                      setAddFarmMethod('qr')
                      setShowQRScanner(true)
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      addFarmMethod === 'qr'
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <QrCodeIcon className="w-6 h-6 mx-auto mb-2" />
                    Scan QR Code
                  </button>
                </div>

                {/* Search Form */}
                {addFarmMethod === 'search' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Farm ID or Name..."
                        value={farmSearchQuery}
                        onChange={(e) => setFarmSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchFarms()}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSearchFarms}
                        disabled={searchingFarms}
                        className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {searchingFarms ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {/* Search Results */}
                    {farmSearchResults.length > 0 && (
                      <div className="space-y-2 overflow-y-auto max-h-96">
                        {farmSearchResults.map((farm) => (
                          <div
                            key={farm.id}
                            className="p-4 transition-all border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50"
                            onClick={() => handleAddFarm(farm)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{farm.name}</p>
                                <p className="text-sm text-gray-600">
                                  ID: {farm.farm_id} • {farm.farmer_name} • {farm.location}
                                </p>
                              </div>
                              <PlusIcon className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                        ))}
                            {/* Farm Assign Popup Form */}
                            <AnimatePresence>
                              {showFarmAssignForm && selectedFarm && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                                  onClick={() => setShowFarmAssignForm(false)}
                                >
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="p-6">
                                      <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-900">Assign Farm to Route</h2>
                                        <button
                                          onClick={() => setShowFarmAssignForm(false)}
                                          className="p-2 text-gray-500 rounded-lg hover:bg-gray-100"
                                        >
                                          <XMarkIcon className="w-6 h-6" />
                                        </button>
                                      </div>
                                      {/* Locked farm details */}
                                      <div className="mb-4 space-y-2">
                                        <div className="flex gap-2">
                                          <span className="font-semibold">Farm Name:</span>
                                          <span className="text-gray-700">{selectedFarm.name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <span className="font-semibold">Farm ID:</span>
                                          <span className="text-gray-700">{selectedFarm.farm_id}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <span className="font-semibold">Farmer:</span>
                                          <span className="text-gray-700">{selectedFarm.farmer_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <span className="font-semibold">Location:</span>
                                          <span className="text-gray-700">{selectedFarm.location}</span>
                                        </div>
                                        <div className="flex gap-2">
                                          <span className="font-semibold">Total Animals:</span>
                                          <span className="text-gray-700">{selectedFarm.total_animals}</span>
                                        </div>
                                      </div>
                                      {/* Collector input fields */}
                                      <div className="mb-4 space-y-4">
                                        <div>
                                          <label className="block mb-1 text-sm font-medium text-gray-700">Average Yield (L/day)</label>
                                          <input
                                            type="number"
                                            value={assignAvgYield}
                                            onChange={e => setAssignAvgYield(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter average yield..."
                                          />
                                        </div>
                                        <div>
                                          <label className="block mb-1 text-sm font-medium text-gray-700">Notes</label>
                                          <textarea
                                            value={assignNotes}
                                            onChange={e => setAssignNotes(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Any notes for this farm..."
                                            rows={3}
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={handleFarmAssignSubmit}
                                        className="w-full py-3 mt-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                      >
                                        Assign Farm
                                      </button>
                                    </div>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Scanner */}
                {showQRScanner && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full h-64 bg-gray-100 border-2 border-gray-300 border-dashed rounded-lg">
                      <div className="text-center">
                        <QrCodeIcon className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-600">Position QR code within frame</p>
                        <p className="text-xs text-gray-500">Camera will activate automatically</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Or enter manually:</p>
                      <input
                        type="text"
                        placeholder="Enter farm ID from QR code..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            handleQRScan(e.target.value)
                          }
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">Press Enter to confirm</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MyAssignedFarms

export const assignFarm = async (collectorId, farmData, extraFields = {}) => {
  const { id: farmId } = farmData

  // Get the next available route order for the collector
  const { data: routeData, error: routeError } = await supabase
    .from('collector_farm_assignments')
    .select('route_order')
    .eq('collector_id', collectorId)
    .order('route_order', { ascending: false })
    .limit(1)
    .single()

  if (routeError && routeError.code !== 'PGRST116') {
    throw new Error('Failed to check route order')
  }

  const nextRouteOrder = routeData ? routeData.route_order + 1 : 1

  // Assign the farm to the collector
  const { data: assignment, error: assignError } = await supabase
    .from('collector_farm_assignments')
    .insert({
      collector_id: collectorId,
      farm_id: farm.id,
      route_order: nextRouteOrder,
      status: 'active',
      avg_yield: extraFields.avg_yield,
      notes: extraFields.notes
    })
    .select()
    .single()

  if (assignError) {
    throw new Error('Failed to assign farm to collector')
  }

  return assignment
}
