import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  UserIcon,
  TagIcon,
  CalendarDaysIcon,
  HeartIcon,
  ScaleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { getLivestock, createLivestock, updateLivestock, deleteLivestock, getLivestockStats } from '../../services/livestockHelpers'
import { getFarms } from '../../services/farmHelpers'
import { getLivestockTreatments, getDaysRemaining, getWithdrawalStatus, getStatusColor } from '../../services/treatmentHelpers'
import { supabase } from '../../config/supabase'
import LivestockQRCodeDisplay from '../../components/common/LivestockQRCodeDisplay'

const AnimalManagement = () => {
  const { user, profile } = useAuthStore()
  const [livestock, setLivestock] = useState([])
  const [farms, setFarms] = useState([])
  const [livestockTreatments, setLivestockTreatments] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    healthy: 0,
    underTreatment: 0,
    totalAMU: 0
  })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedLivestock, setSelectedLivestock] = useState(null)
  const [viewMode, setViewMode] = useState('grid')

  const [newAnimal, setNewAnimal] = useState({
    tag_id: '', // Will be auto-generated
    species: 'Cattle',
    breed: '',
    name: '',
    date_of_birth: '',
    gender: 'Female',
    weight: '',
    avg_produce: '',
    farm_id: '',
    health_status: 'Healthy'
  })

  const [editAnimal, setEditAnimal] = useState({
    tag_id: '', // Display only, not editable
    species: 'Cattle',
    breed: '',
    name: '',
    date_of_birth: '',
    gender: 'Female',
    weight: '',
    avg_produce: '',
    farm_id: '',
    health_status: 'Healthy'
  })

  // Generate random tag ID
  const generateTagId = () => {
    const prefix = 'TAG'
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const timestamp = Date.now().toString().slice(-4)
    return `${prefix}${random}${timestamp}`
  }

  // Load livestock and farms from Supabase
  useEffect(() => {
    if (user) {
      loadLivestock() // Commented out - livestock table not created yet
      loadFarms()
    }
  }, [user])

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

  const loadLivestock = async () => {
    try {
      setLoading(true)
      
      // First, sync all livestock health statuses based on active treatments
      await syncLivestockHealthStatus(user.id)
      
      const data = await getLivestock(user.id)
      setLivestock(data)

      // Calculate stats
      const statsData = await getLivestockStats(user.id)
      setStats(statsData)

      // Load active treatments for each livestock
      const treatmentsMap = {}
      for (const animal of data) {
        try {
          const treatments = await getLivestockTreatments(animal.id)
          // Filter only active treatments (withdrawal period not ended)
          const activeTreatments = treatments.filter(t => {
            const daysLeft = getDaysRemaining(t.withdrawal_end_date)
            return daysLeft >= 0
          })
          if (activeTreatments.length > 0) {
            treatmentsMap[animal.id] = activeTreatments
          }
        } catch (err) {
          console.error(`Error loading treatments for ${animal.tag_id}:`, err)
        }
      }
      setLivestockTreatments(treatmentsMap)
    } catch (error) {
      console.error('Error loading livestock:', error)
      setLivestock([])
      setStats({ total: 0, healthy: 0, underTreatment: 0, totalAMU: 0 })
    } finally {
      setLoading(false)
    }
  }

  // Function to sync livestock health status based on active treatments
  const syncLivestockHealthStatus = async (userId) => {
    try {
      // Get all livestock for this user
      const { data: livestockData } = await supabase
        .from('livestock')
        .select('id')
        .eq('farmer_id', userId)
      
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
      // (only if they were previously 'Under Treatment')
      const livestockNotUnderTreatment = livestockIds.filter(id => !livestockUnderTreatment.has(id))
      if (livestockNotUnderTreatment.length > 0) {
        await supabase
          .from('livestock')
          .update({ health_status: 'Healthy' })
          .in('id', livestockNotUnderTreatment)
          .eq('health_status', 'Under Treatment')
      }
    } catch (error) {
      console.error('Error syncing livestock health status:', error)
    }
  }

  const loadFarms = async () => {
    try {
      const farmsData = await getFarms(user.id)
      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
      setFarms([])
    }
  }

  const handleAddAnimal = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)

      // Generate tag ID
      const tagId = generateTagId()

      await createLivestock(
        { ...newAnimal, tag_id: tagId },
        user.id,
        profile.unique_id,
        newAnimal.farm_id
      )

      setNewAnimal({
        tag_id: '',
        species: 'Cattle',
        breed: '',
        name: '',
        date_of_birth: '',
        gender: 'Female',
        weight: '',
        avg_produce: '',
        farm_id: '',
        health_status: 'Healthy'
      })
      setShowAddModal(false)
      await loadLivestock()
    } catch (error) {
      console.error('Error adding livestock:', error)
      alert('Failed to add livestock. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditAnimal = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await updateLivestock(selectedLivestock.id, editAnimal)
      setShowEditModal(false)
      setSelectedLivestock(null)
      await loadLivestock()
    } catch (error) {
      console.error('Error updating livestock:', error)
      alert('Failed to update livestock. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAnimal = async () => {
    try {
      setLoading(true)
      await deleteLivestock(selectedLivestock.id)
      setShowDeleteModal(false)
      setSelectedLivestock(null)
      await loadLivestock()
    } catch (error) {
      console.error('Error deleting livestock:', error)
      alert('Failed to delete livestock. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openViewModal = (animal) => {
    setSelectedLivestock(animal)
    setShowViewModal(true)
  }

  const openEditModal = (animal) => {
    setSelectedLivestock(animal)
    setEditAnimal({
      tag_id: animal.tag_id,
      species: animal.species,
      breed: animal.breed,
      name: animal.name || '',
      date_of_birth: animal.date_of_birth,
      gender: animal.gender,
      weight: animal.weight || '',
      avg_produce: animal.avg_produce || '',
      farm_id: animal.farm_id,
      health_status: animal.health_status
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (animal) => {
    setSelectedLivestock(animal)
    setShowDeleteModal(true)
  }

  const openQRModal = (animal) => {
    setSelectedLivestock(animal)
    setShowQRModal(true)
  }

  const getHealthStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || ''
    switch (statusLower) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'under treatment':
      case 'under_treatment': return 'bg-yellow-100 text-yellow-800'
      case 'sick': return 'bg-red-100 text-red-800'
      case 'quarantine': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const speciesOptions = [
    'Cattle',
    'Sheep',
    'Goats',
    'Pigs',
    'Poultry',
    'Camels',
    'Equines',
    'Rabbits',
    'Fish',
    'Others'
  ]

  const genderOptions = ['Male', 'Female', 'Castrated']

  const healthStatusOptions = ['Healthy', 'Under Treatment', 'Sick', 'Quarantine']

  const getAge = (dateOfBirth) => {
    const today = new Date()
    const birth = new Date(dateOfBirth)
    const diffTime = Math.abs(today - birth)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)

    if (years > 0) {
      return `${years}y ${months}m`
    } else {
      return `${months}m`
    }
  }

  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Livestocks</h1>
          <p className="text-sm text-gray-600 sm:text-base">Manage and track your livestock records</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center w-full px-4 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg shadow sm:w-auto sm:px-5 sm:text-base hover:bg-green-700"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Livestock</span>
        </button>
      </div>



      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
          <div className="flex items-center">
            <UserIcon className="w-6 h-6 text-blue-600 sm:w-8 sm:h-8" />
            <div className="ml-3 sm:ml-4">
              <div className="text-xl font-bold text-gray-900 sm:text-2xl">{stats.total}</div>
              <div className="text-xs text-gray-600 sm:text-sm">Total Livestock</div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
          <div className="flex items-center">
            <HeartIcon className="w-6 h-6 text-green-600 sm:w-8 sm:h-8" />
            <div className="ml-3 sm:ml-4">
              <div className="text-xl font-bold text-gray-900 sm:text-2xl">{stats.healthy}</div>
              <div className="text-xs text-gray-600 sm:text-sm">Healthy</div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="w-6 h-6 text-yellow-600 sm:w-8 sm:h-8" />
            <div className="ml-3 sm:ml-4">
              <div className="text-xl font-bold text-gray-900 sm:text-2xl">{stats.underTreatment}</div>
              <div className="text-xs text-gray-600 sm:text-sm">Under Treatment</div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
          <div className="flex items-center">
            <ScaleIcon className="w-6 h-6 text-purple-600 sm:w-8 sm:h-8" />
            <div className="ml-3 sm:ml-4">
              <div className="text-xl font-bold text-gray-900 sm:text-2xl">{stats.totalAMU}</div>
              <div className="text-xs text-gray-600 sm:text-sm">Total AMU Recorded</div>
            </div>
          </div>
        </div>
      </div>

      {/* Livestock List/Grid */}
      {loading && livestock.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 mx-auto border-b-2 border-green-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading livestock...</p>
        </div>
      ) : livestock.length === 0 ? (
        <div className="py-12 text-center">
          <TagIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No livestock registered yet. Add your first livestock to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {livestock.map((animal, index) => {
            const hasActiveTreatment = livestockTreatments[animal.id] && livestockTreatments[animal.id].length > 0
            return (
              <motion.div
                key={animal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${hasActiveTreatment
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                  }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-6 h-6 text-green-500" />
                    <span className="text-lg font-bold text-gray-900">{animal.tag_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveTreatment ? (() => {
                      const nextTreatment = livestockTreatments[animal.id].sort((a, b) =>
                        new Date(a.withdrawal_end_date) - new Date(b.withdrawal_end_date)
                      )[0]
                      const daysLeft = getDaysRemaining(nextTreatment.withdrawal_end_date)
                      const status = getWithdrawalStatus(nextTreatment.withdrawal_end_date)
                      const colorClass = getStatusColor(status)

                      return (
                        <>
                          <span className="px-2 py-1 text-xs font-bold text-red-800 bg-red-100 border border-red-300 rounded-full">
                            Under Treatment
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded-full border ${colorClass}`}
                            title={`Withdrawal ends: ${new Date(nextTreatment.withdrawal_end_date).toLocaleDateString()}`}
                          >
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                          </span>
                        </>
                      )
                    })() : (
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${getHealthStatusColor(animal.health_status)}`}>
                        {animal.health_status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Livestock ID:</span>
                    <span className="font-medium text-gray-900">{animal.livestock_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Species:</span>
                    <span className="text-gray-900 capitalize">{animal.species}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Breed:</span>
                    <span className="text-gray-900">{animal.breed}</span>
                  </div>
                  {animal.name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Name:</span>
                      <span className="text-gray-900">{animal.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Farm:</span>
                    <span className="text-gray-900">{animal.farm_name}</span>
                  </div>
                  {animal.weight && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Weight:</span>
                      <span className="text-gray-900">{animal.weight} kg</span>
                    </div>
                  )}
                  {animal.avg_produce && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Produce:</span>
                      <span className="text-gray-900">{animal.avg_produce} L/day</span>
                    </div>
                  )}
                </div>

                {/* Give Treatment Button */}
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/app/administration')
                    }}
                    className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white transition-all bg-blue-600 rounded-lg hover:bg-blue-700 hover:scale-105"
                  >
                    <BeakerIcon className="w-4 h-4" />
                    
                    <span>Give Treatment</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    AMU Records: {animal.total_amu_records || 0}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openQRModal(animal)
                      }}
                      className="p-1 text-gray-400 transition-colors hover:text-green-600"
                      title="QR Code"
                    >
                      <QrCodeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openViewModal(animal)
                      }}
                      className="p-1 text-gray-400 transition-colors hover:text-blue-600"
                      title="View Details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(animal)
                      }}
                      className="p-1 text-gray-400 transition-colors hover:text-green-600"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteModal(animal)
                      }}
                      className="p-1 text-gray-400 transition-colors hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Livestock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add Livestock</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddAnimal} className="space-y-4">
              {/* Farmer Info (Read-only) */}
              <div className="p-4 mb-4 border border-green-200 rounded-lg bg-green-50">
                <h3 className="mb-2 text-sm font-semibold text-green-900">Farmer Information</h3>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-gray-600">Name: </span>
                    <span className="font-medium text-gray-900">{profile?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Farmer ID: </span>
                    <span className="font-medium text-gray-900">{profile?.unique_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone: </span>
                    <span className="font-medium text-gray-900">{profile?.mobile || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Tag ID Info */}
              <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Tag ID will be automatically generated when you add the livestock.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Species <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newAnimal.species}
                    onChange={e => setNewAnimal({ ...newAnimal, species: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {speciesOptions.map(species => (
                      <option key={species} value={species}>{species}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Breed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAnimal.breed}
                    onChange={e => setNewAnimal({ ...newAnimal, breed: e.target.value })}
                    placeholder="e.g., Holstein, Jersey"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newAnimal.name}
                    onChange={e => setNewAnimal({ ...newAnimal, name: e.target.value })}
                    placeholder="Livestock name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newAnimal.date_of_birth}
                    onChange={e => setNewAnimal({ ...newAnimal, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newAnimal.gender}
                    onChange={e => setNewAnimal({ ...newAnimal, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {genderOptions.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Weight (kg) (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAnimal.weight}
                    onChange={e => setNewAnimal({ ...newAnimal, weight: e.target.value })}
                    placeholder="Current weight"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Avg Produce (L/day) (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAnimal.avg_produce}
                    onChange={e => setNewAnimal({ ...newAnimal, avg_produce: e.target.value })}
                    placeholder="Daily production"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farm <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newAnimal.farm_id}
                    onChange={e => setNewAnimal({ ...newAnimal, farm_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a farm</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} ({farm.farm_id})
                      </option>
                    ))}
                  </select>
                  {farms.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">Please create a farm first</p>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Health Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newAnimal.health_status}
                    onChange={e => setNewAnimal({ ...newAnimal, health_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {healthStatusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Livestock'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* View Livestock Modal */}
      {showViewModal && selectedLivestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Livestock Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600">Livestock ID</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedLivestock.livestock_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tag ID</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedLivestock.tag_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Species</p>
                  <p className="font-medium text-gray-900">{selectedLivestock.species}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Breed</p>
                  <p className="font-medium text-gray-900">{selectedLivestock.breed}</p>
                </div>
              </div>

              {selectedLivestock.name && (
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{selectedLivestock.name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedLivestock.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium text-gray-900">{selectedLivestock.gender}</p>
                </div>
              </div>

              {(selectedLivestock.weight || selectedLivestock.avg_produce) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedLivestock.weight && (
                    <div>
                      <p className="text-sm text-gray-600">Weight</p>
                      <p className="font-medium text-gray-900">{selectedLivestock.weight} kg</p>
                    </div>
                  )}
                  {selectedLivestock.avg_produce && (
                    <div>
                      <p className="text-sm text-gray-600">Avg Produce</p>
                      <p className="font-medium text-gray-900">{selectedLivestock.avg_produce} L/day</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Health Status</p>
                <span className={`inline-block px-3 py-1 text-sm font-bold rounded-full ${getHealthStatusColor(selectedLivestock.health_status)}`}>
                  {selectedLivestock.health_status}
                </span>
              </div>

              <div className="pt-4 border-t">
                <p className="mb-2 text-sm font-semibold text-gray-700">Farm Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Farm Name</p>
                    <p className="font-medium text-gray-900">{selectedLivestock.farm_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Farm ID</p>
                    <p className="font-medium text-gray-900">{selectedLivestock.farm_farm_id}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="mb-2 text-sm font-semibold text-gray-700">Farmer Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Farmer ID</p>
                    <p className="font-medium text-gray-900">{selectedLivestock.farmer_unique_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{selectedLivestock.farmer_phone}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Total Treatments</p>
                  <p className="font-medium text-gray-900">{selectedLivestock.total_treatments || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">AMU Records</p>
                  <p className="font-medium text-gray-900">{selectedLivestock.total_amu_records || 0}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Created At</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedLivestock.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-6 space-x-4">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Livestock Modal */}
      {showEditModal && selectedLivestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Edit Livestock</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditAnimal} className="space-y-4">
              {/* Tag ID Info - Read Only */}
              <div className="p-3 mb-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-700">
                  <strong>Tag ID:</strong> <span className="font-mono text-gray-900">{editAnimal.tag_id}</span>
                  <span className="ml-2 text-gray-500">(Auto-generated, cannot be changed)</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Species <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editAnimal.species}
                    onChange={e => setEditAnimal({ ...editAnimal, species: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {speciesOptions.map(species => (
                      <option key={species} value={species}>{species}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Breed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editAnimal.breed}
                    onChange={e => setEditAnimal({ ...editAnimal, breed: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={editAnimal.name}
                    onChange={e => setEditAnimal({ ...editAnimal, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editAnimal.date_of_birth}
                    onChange={e => setEditAnimal({ ...editAnimal, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editAnimal.gender}
                    onChange={e => setEditAnimal({ ...editAnimal, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {genderOptions.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Weight (kg) (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAnimal.weight}
                    onChange={e => setEditAnimal({ ...editAnimal, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Avg Produce (L/day) (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAnimal.avg_produce}
                    onChange={e => setEditAnimal({ ...editAnimal, avg_produce: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Farm <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editAnimal.farm_id}
                    onChange={e => setEditAnimal({ ...editAnimal, farm_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} ({farm.farm_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Health Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editAnimal.health_status}
                    onChange={e => setEditAnimal({ ...editAnimal, health_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {healthStatusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 space-x-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLivestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl"
          >
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Livestock</h3>
              <p className="mb-6 text-sm text-gray-600">
                Are you sure you want to delete livestock <span className="font-semibold">{selectedLivestock.tag_id}</span>?
                This action cannot be undone and will remove all associated records.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAnimal}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-white transition-colors bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedLivestock && (
        <LivestockQRCodeDisplay
          livestock={selectedLivestock}
          treatments={livestockTreatments[selectedLivestock.id] || []}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  )
}

export default AnimalManagement
