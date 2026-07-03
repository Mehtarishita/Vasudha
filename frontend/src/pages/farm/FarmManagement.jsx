import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlusIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { getFarms, createFarm, updateFarm, deleteFarm } from '../../services/farmHelpers'
import { supabase } from '../../config/supabase'
import FarmQRCodeDisplay from '../../components/common/FarmQRCodeDisplay'

const FarmManagement = () => {
  const { user, profile } = useAuthStore()
  const [farms, setFarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingFarm, setEditingFarm] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [showQRCode, setShowQRCode] = useState(null)
  const [viewFarm, setViewFarm] = useState(null)
  const [farmWithdrawalCount, setFarmWithdrawalCount] = useState(0)

  const livestockTypes = [
    'Cattle (Bovines)',
    'Sheep (Ovine)',
    'Goats (Caprine)',
    'Pigs (Swine)',
    'Poultry (Avian)',
    'Camels',
    'Equines',
    'Rabbits',
    'Fish (Aquaculture)',
    'Others (Region-Specific)'
  ]

  const [newFarm, setNewFarm] = useState({
    name: '',
    location: '',
    farm_type: 'dairy',
    size: '',
    phone: profile?.mobile || '',
    registration_number: '',
    livestock: [{ type: '', count: '' }]
  })

  // Load farms from Supabase
  useEffect(() => {
    loadFarms()
  }, [user])

  // Update phone when profile loads
  useEffect(() => {
    if (profile?.mobile) {
      setNewFarm(prev => ({ ...prev, phone: profile.mobile }))
    }
  }, [profile])

  // Load phone from KYC on mount
  useEffect(() => {
    const loadKYCPhone = async () => {
      if (user && profile) {
        try {
          const { data: kycData } = await supabase
            .from('kyc_details')
            .select('phone_number, name')
            .eq('user_id', user.id)
            .single()
          
          if (kycData?.phone_number) {
            // Update profile with KYC phone if not already set
            if (!profile.mobile || profile.mobile === 'N/A') {
              profile.mobile = kycData.phone_number
            }
            if (!profile.name && kycData.name) {
              profile.name = kycData.name
            }
          }
        } catch (error) {
          console.error('Error loading KYC phone:', error)
        }
      }
    }
    loadKYCPhone()
  }, [user, profile])

  const loadFarms = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const data = await getFarms(user.id)
      setFarms(data || [])
    } catch (error) {
      console.error('Error loading farms:', error)
      setFarms([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddFarm = async (e) => {
    e.preventDefault()
    
    if (!user || !profile?.unique_id) {
      alert('Please complete KYC verification first')
      return
    }

    try {
      // Ensure phone number is included from profile
      const farmDataWithPhone = {
        ...newFarm,
        phone: profile?.mobile || newFarm.phone
      }

      await createFarm(
        farmDataWithPhone,
        user.id,
        profile.unique_id
      )

      await loadFarms()
      setNewFarm({
        name: '',
        location: '',
        farm_type: 'dairy',
        size: '',
        phone: profile?.mobile || '',
        registration_number: '',
        livestock: [{ type: '', count: '' }]
      })
      setShowAddModal(false)
    } catch (error) {
      alert('Error creating farm: ' + error.message)
    }
  }

  const handleEditFarm = (farm) => {
    setEditingFarm({
      ...farm,
      livestock: farm.farm_livestock?.map(l => ({
        type: l.livestock_type,
        count: l.count
      })) || [{ type: '', count: '' }]
    })
    setShowEditModal(true)
  }

  const handleUpdateFarm = async (e) => {
    e.preventDefault()
    
    try {
      await updateFarm(editingFarm.id, editingFarm)
      await loadFarms()
      setEditingFarm(null)
      setShowEditModal(false)
    } catch (error) {
      alert('Error updating farm: ' + error.message)
    }
  }

  const handleDeleteFarm = async (farmId) => {
    try {
      await deleteFarm(farmId)
      await loadFarms()
      setDeleteTarget(null)
    } catch (error) {
      alert('Error deleting farm: ' + error.message)
    }
  }

  const addLivestockField = (isEditing = false) => {
    if (isEditing) {
      setEditingFarm({
        ...editingFarm,
        livestock: [...(editingFarm.livestock || []), { type: '', count: '' }]
      })
    } else {
      setNewFarm({
        ...newFarm,
        livestock: [...newFarm.livestock, { type: '', count: '' }]
      })
    }
  }

  const removeLivestockField = (index, isEditing = false) => {
    if (isEditing) {
      const updated = editingFarm.livestock.filter((_, i) => i !== index)
      setEditingFarm({ ...editingFarm, livestock: updated })
    } else {
      const updated = newFarm.livestock.filter((_, i) => i !== index)
      setNewFarm({ ...newFarm, livestock: updated })
    }
  }

  const updateLivestockField = (index, field, value, isEditing = false) => {
    if (isEditing) {
      const updated = [...editingFarm.livestock]
      updated[index][field] = value
      setEditingFarm({ ...editingFarm, livestock: updated })
    } else {
      const updated = [...newFarm.livestock]
      updated[index][field] = value
      setNewFarm({ ...newFarm, livestock: updated })
    }
  }

  const fetchWithdrawalCount = async (farmId) => {
    try {
      const { data: livestock, error: livestockError } = await supabase
        .from('livestock')
        .select('id')
        .eq('farm_id', farmId)

      if (livestockError) throw livestockError

      if (!livestock || livestock.length === 0) {
        setFarmWithdrawalCount(0)
        return
      }

      const livestockIds = livestock.map(l => l.id)
      const today = new Date()

      const { data: treatments, error: treatmentsError } = await supabase
        .from('treatments')
        .select('livestock_id, withdrawal_end_date')
        .in('livestock_id', livestockIds)
        .gte('withdrawal_end_date', today.toISOString().split('T')[0])

      if (treatmentsError) throw treatmentsError

      // Count unique livestock IDs under withdrawal
      const uniqueLivestock = new Set(treatments?.map(t => t.livestock_id) || [])
      setFarmWithdrawalCount(uniqueLivestock.size)
    } catch (error) {
      console.error('Error fetching withdrawal count:', error)
      setFarmWithdrawalCount(0)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-b-2 border-green-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Management</h1>
          <p className="text-gray-600">Manage and monitor registered farms</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              List
            </button>
          </div>
          
          <button
            onClick={() => {
              setNewFarm(prev => ({ ...prev, phone: profile?.mobile || '' }))
              setShowAddModal(true)
            }}
            className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Farm</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{farms.length}</div>
              <div className="text-sm text-gray-600">Total Farms</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <UserGroupIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {farms.reduce((sum, farm) => sum + (farm.total_livestock || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Livestock</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <MapPinIcon className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {new Set(farms.map(f => f.location.split(',')[0])).size}
              </div>
              <div className="text-sm text-gray-600">Locations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Farm List/Grid */}
      {farms.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
          <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No farms yet</h3>
          <p className="mb-6 text-gray-600">Get started by adding your first farm</p>
          <button
            onClick={() => {
              setNewFarm(prev => ({ ...prev, phone: profile?.mobile || '' }))
              setShowAddModal(true)
            }}
            className="inline-flex items-center px-6 py-3 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Farm</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm, index) => (
            <motion.div
              key={farm.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-6 transition-shadow bg-white border border-gray-100 shadow rounded-2xl hover:shadow-lg group"
            >
              {/* Farm ID badge */}
              <div className="absolute px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full shadow-sm top-4 right-4">
                {farm.farm_id}
              </div>
              
              {/* Card header */}
              <div className="flex items-center gap-3 mb-3">
                <BuildingOfficeIcon className="text-blue-500 h-7 w-7" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold leading-tight text-gray-900">{farm.name}</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-0.5">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    {farm.location}
                  </div>
                </div>
              </div>
              
              {/* Card body */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
                <div className="text-gray-500">Type</div>
                <div className="font-medium text-gray-900 capitalize">{farm.farm_type}</div>
                <div className="text-gray-500">Livestock</div>
                <div className="font-medium text-gray-900">{farm.total_livestock}</div>
                <div className="text-gray-500">Size</div>
                <div className="font-medium text-gray-900">{farm.size}</div>
                <div className="text-gray-500">Farmer ID</div>
                <div className="text-xs font-medium text-gray-900">{farm.farmer_unique_id}</div>
              </div>
              
              {/* Livestock types */}
              {farm.farm_livestock && farm.farm_livestock.length > 0 && (
                <div className="pt-2 mb-3 border-t border-gray-100">
                  <div className="mb-1 text-xs text-gray-500">Livestock Types:</div>
                  <div className="flex flex-wrap gap-1">
                    {farm.farm_livestock.map((livestock, idx) => (
                      <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        {livestock.livestock_type}: {livestock.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  className="p-1.5 rounded-full hover:bg-purple-50 transition-all duration-200 hover:scale-110"
                  title="QR Code"
                  onClick={async (e) => {
                    e.stopPropagation()
                    await fetchWithdrawalCount(farm.id)
                    setShowQRCode(farm)
                  }}
                >
                  <QrCodeIcon className="w-4 h-4 text-purple-500" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                  title="View Details"
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewFarm(farm)
                  }}
                >
                  <EyeIcon className="w-4 h-4 text-blue-500" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-green-50 transition-all duration-200 hover:scale-110"
                  title="Edit Farm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditFarm(farm)
                  }}
                >
                  <PencilSquareIcon className="w-4 h-4 text-green-500" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-red-50 transition-all duration-200 hover:scale-110"
                  title="Delete Farm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(farm)
                  }}
                >
                  <TrashIcon className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Farm
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Livestock
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Size
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {farms.map((farm) => (
                <tr key={farm.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{farm.name}</div>
                      <div className="text-sm text-gray-500">{farm.farm_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {farm.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">{farm.farm_type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {farm.total_livestock}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {farm.size}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        className="font-medium text-purple-600 transition-colors hover:text-purple-900"
                        onClick={async () => {
                          await fetchWithdrawalCount(farm.id)
                          setShowQRCode(farm)
                        }}
                        title="View QR Code"
                      >QR</button>
                      <button
                        className="font-medium text-blue-600 transition-colors hover:text-blue-900"
                        onClick={() => setViewFarm(farm)}
                        title="View Details"
                      >View</button>
                      <button
                        className="font-medium text-green-600 transition-colors hover:text-green-900"
                        onClick={() => handleEditFarm(farm)}
                        title="Edit Farm"
                      >Edit</button>
                      <button
                        className="font-medium text-red-600 transition-colors hover:text-red-900"
                        onClick={() => setDeleteTarget(farm)}
                        title="Delete Farm"
                      >Delete</button>
                    </div>
      {/* Edit Farm Modal */}
      {showEditModal && editingFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Edit Farm</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateFarm} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingFarm.name}
                  onChange={(e) => setEditingFarm({ ...editingFarm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Farm ID
                </label>
                <input
                  type="text"
                  disabled
                  value={editingFarm.farm_id}
                  className="w-full px-3 py-2 font-mono text-sm text-gray-600 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingFarm.location}
                  onChange={(e) => setEditingFarm({ ...editingFarm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farm Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingFarm.farm_type}
                    onChange={(e) => setEditingFarm({ ...editingFarm, farm_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="dairy">Dairy</option>
                    <option value="poultry">Poultry</option>
                    <option value="mixed">Mixed</option>
                    <option value="cattle">Cattle</option>
                    <option value="sheep">Sheep</option>
                    <option value="goat">Goat</option>
                    <option value="pig">Pig</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farm Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingFarm.size}
                    onChange={(e) => setEditingFarm({ ...editingFarm, size: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Livestock Section */}
              <div className="pt-4 mt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Livestock Details
                  </label>
                  <button
                    type="button"
                    onClick={() => addLivestockField(true)}
                    className="flex items-center text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add More
                  </button>
                </div>

                <div className="space-y-3">
                  {editingFarm.livestock?.map((livestock, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-1">
                        <select
                          value={livestock.type}
                          onChange={(e) => updateLivestockField(index, 'type', e.target.value, true)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select livestock type</option>
                          {livestockTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          value={livestock.count}
                          onChange={(e) => updateLivestockField(index, 'count', e.target.value, true)}
                          placeholder="Count"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      {editingFarm.livestock.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLivestockField(index, true)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 space-x-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col w-full max-w-md p-8 bg-white shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center mb-6">
                <div className="p-3 bg-red-100 rounded-full">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <h3 className="mb-3 text-xl font-bold text-center text-gray-900">Delete Farm?</h3>
              
              <div className="p-4 mb-6 rounded-lg bg-gray-50">
                <p className="mb-2 text-sm text-gray-600">You are about to delete:</p>
                <p className="text-base font-semibold text-gray-900">{deleteTarget.name}</p>
                <p className="mt-1 text-sm text-gray-500">Farm ID: {deleteTarget.farm_id}</p>
              </div>
              
              <div className="w-auto mb-6 text-sm text-center text-gray-600 text-wrap">
                This action cannot be undone. All farm data and livestock records will be permanently removed.
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteFarm(deleteTarget.id)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-200"
                >
                  Delete Farm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Farm Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Farm</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddFarm} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFarm.name}
                  onChange={(e) => setNewFarm({...newFarm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter farm name"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farmer Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.name || ''}
                    className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    disabled
                    value={profile?.mobile || ''}
                    className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Farmer Unique ID
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.unique_id || ''}
                  className="w-full px-3 py-2 font-mono text-sm text-gray-600 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFarm.location}
                  onChange={(e) => setNewFarm({...newFarm, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Village, Taluka, District, State"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farm Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newFarm.farm_type}
                    onChange={(e) => setNewFarm({...newFarm, farm_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="dairy">Dairy</option>
                    <option value="poultry">Poultry</option>
                    <option value="mixed">Mixed</option>
                    <option value="cattle">Cattle</option>
                    <option value="sheep">Sheep</option>
                    <option value="goat">Goat</option>
                    <option value="pig">Pig</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farm Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFarm.size}
                    onChange={(e) => setNewFarm({...newFarm, size: e.target.value})}
                    placeholder="e.g., 50 acres"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Livestock Section */}
              <div className="pt-4 mt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Livestock Details
                  </label>
                  <button
                    type="button"
                    onClick={() => addLivestockField(false)}
                    className="flex items-center text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add More
                  </button>
                </div>

                <div className="space-y-3">
                  {newFarm.livestock.map((livestock, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-1">
                        <select
                          value={livestock.type}
                          onChange={(e) => updateLivestockField(index, 'type', e.target.value, false)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select livestock type</option>
                          {livestockTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          value={livestock.count}
                          onChange={(e) => updateLivestockField(index, 'count', e.target.value, false)}
                          placeholder="Count"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      {newFarm.livestock.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLivestockField(index, false)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-end pt-4 space-x-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700"
                >
                  Add Farm
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <FarmQRCodeDisplay
            farm={showQRCode}
            withdrawalCount={farmWithdrawalCount}
            onClose={() => {
              setShowQRCode(null)
              setFarmWithdrawalCount(0)
            }}
          />
        )}
      </AnimatePresence>

      {/* View Farm Modal */}
      <AnimatePresence>
        {viewFarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setViewFarm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 px-8 py-6 bg-gradient-to-r from-green-600 to-green-500 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg bg-opacity-20">
                      <BuildingOfficeIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{viewFarm.name}</h2>
                      <p className="text-sm font-medium text-green-100">Farm ID: {viewFarm.farm_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewFarm(null)}
                    className="p-2 text-white transition-colors rounded-lg hover:bg-white hover:bg-opacity-20"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                    <div className="w-1 h-6 mr-3 bg-green-600 rounded-full"></div>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center mb-2 space-x-2">
                        <MapPinIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">Location</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{viewFarm.location}</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center mb-2 space-x-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">Farm Type</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900 capitalize">{viewFarm.farm_type}</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center mb-2 space-x-2">
                        <ChartBarIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">Farm Size</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{viewFarm.size}</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center mb-2 space-x-2">
                        <UserGroupIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">Total Livestock</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{viewFarm.total_livestock}</p>
                    </div>
                  </div>
                </div>

                {/* Farmer Information */}
                <div>
                  <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                    <div className="w-1 h-6 mr-3 bg-blue-600 rounded-full"></div>
                    Farmer Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-blue-50">
                      <span className="block mb-1 text-sm font-medium text-blue-600">Farmer ID</span>
                      <p className="font-mono text-base font-semibold text-gray-900">{viewFarm.farmer_unique_id}</p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-blue-50">
                      <span className="block mb-1 text-sm font-medium text-blue-600">Phone Number</span>
                      <p className="text-base font-semibold text-gray-900">{viewFarm.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Livestock Details */}
                {viewFarm.farm_livestock && viewFarm.farm_livestock.length > 0 && (
                  <div>
                    <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                      <div className="w-1 h-6 mr-3 bg-purple-600 rounded-full"></div>
                      Livestock Details
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {viewFarm.farm_livestock.map((livestock, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-purple-50">
                          <div>
                            <p className="text-sm font-medium text-purple-600">{livestock.livestock_type}</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{livestock.count}</p>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-full">
                            <UserGroupIcon className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registration Info */}
                {viewFarm.registration_number && (
                  <div>
                    <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                      <div className="w-1 h-6 mr-3 bg-orange-600 rounded-full"></div>
                      Registration Details
                    </h3>
                    <div className="p-4 rounded-lg bg-orange-50">
                      <span className="block mb-1 text-sm font-medium text-orange-600">Registration Number</span>
                      <p className="text-base font-semibold text-gray-900">{viewFarm.registration_number}</p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-6 border-t">
                  <div className="grid grid-cols-1 gap-4 text-sm text-gray-500 md:grid-cols-2">
                    <div>
                      <span className="font-medium">Created:</span> {new Date(viewFarm.created_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {new Date(viewFarm.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <button
                    onClick={async () => {
                      await fetchWithdrawalCount(viewFarm.id)
                      setViewFarm(null)
                      setShowQRCode(viewFarm)
                    }}
                    className="flex-1 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                    <span>View QR Code</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewFarm(null)
                      handleEditFarm(viewFarm)
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                    <span>Edit Farm</span>
                  </button>
                  <button
                    onClick={() => setViewFarm(null)}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FarmManagement
