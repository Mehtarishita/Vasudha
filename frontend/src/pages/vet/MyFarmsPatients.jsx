import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon,
  MapPinIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import vetHelpers from '../../services/vetHelpers'

const MyFarmsPatients = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('farms') // 'farms', 'animals', 'herds'
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [farms, setFarms] = useState([])
  const [animals, setAnimals] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [showFarmDetails, setShowFarmDetails] = useState(false)

  // Fetch farms with same district as veterinarian
  useEffect(() => {
    const fetchFarms = async () => {
      if (!user?.id) return

      setLoading(true)
      try {
        // Use vetHelpers to get assigned farms (now filters by district)
        const { data: farmsData, error } = await vetHelpers.getAssignedFarms(user.id)

        if (error) throw error

        setFarms(farmsData || [])
      } catch (error) {
        console.error('Error fetching farms:', error)
        toast.error('Failed to load farms')
      } finally {
        setLoading(false)
      }
    }

    fetchFarms()
  }, [user])

  // Fetch all animals from registered farms
  useEffect(() => {
    const fetchAnimals = async () => {
      if (farms.length === 0) return

      try {
        const farmIds = farms.map(f => f.id)

        // Use vetHelpers to fetch livestock
        const { data: livestockData, error } = await vetHelpers.getLivestockForFarms(farmIds)

        if (error) throw error

        // Enrich with farm details
        const animalsWithFarm = (livestockData || []).map(animal => {
          const farm = farms.find(f => f.id === animal.farm_id)
          return {
            ...animal,
            farm_name: farm?.name || 'Unknown Farm',
            farmer_name: farm?.farmer_name || 'Unknown'
          }
        })

        setAnimals(animalsWithFarm)
      } catch (error) {
        console.error('Error fetching animals:', error)
        toast.error('Failed to load animals')
      }
    }

    fetchAnimals()
  }, [farms])

  // Use real animal records from Supabase
  const animalRecords = animals

  // Generate herd data from real farms
  const herds = farms.map(farm => {
    const livestock = farm.livestock || []
    const healthy = livestock.filter(l => l.health_status === 'Healthy').length
    const sick = livestock.filter(l => l.health_status === 'Sick').length
    const underTreatment = livestock.filter(l => l.health_status === 'Under Treatment').length
    
    return {
      id: farm.id,
      farmName: farm.name,
      totalAnimals: farm.livestock_count || 0,
      healthy,
      underTreatment,
      sick,
      underWithdrawal: 0, // TODO: Calculate from withdrawal periods
      complianceScore: 85 // TODO: Calculate actual compliance score
    }
  })

  // Filter data based on search
  const filteredFarms = farms.filter(farm =>
    (farm.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (farm.farmer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (farm.farm_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const filteredAnimals = animalRecords.filter(animal =>
    (animal.tag_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (animal.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (animal.farm_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const filteredHerds = herds.filter(herd =>
    herd.farmName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getComplianceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getHealthStatusBadge = (status) => {
    const statusConfig = {
      healthy: { color: 'bg-green-100 text-green-700', label: 'Healthy' },
      'under-treatment': { color: 'bg-yellow-100 text-yellow-700', label: 'Under Treatment' },
      sick: { color: 'bg-red-100 text-red-700', label: 'Sick' }
    }
    const config = statusConfig[status] || statusConfig.healthy
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2 space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              My Farms & Patients
            </h1>
          </div>
          <p className="text-gray-600">
            Manage your assigned farms and patient animals
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Search by farm name, owner, animal tag, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('farms')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'farms'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BuildingOfficeIcon className="w-5 h-5" />
            <span>Farmers & Farms</span>
          </button>
          <button
            onClick={() => setActiveTab('animals')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'animals'
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            <span>Animal Records</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'farms' && (
          <div>
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading farms...</p>
              </div>
            ) : filteredFarms.length === 0 ? (
              <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                <BuildingOfficeIcon className="w-16 h-16 mx-auto text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Farms Found</h3>
                <p className="mt-2 text-gray-600">
                  No farms have been registered by farmers in your area (pincode) yet.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Farmers need to create farms before adding animals.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredFarms.map((farm) => (
                  <motion.div
                    key={farm.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-white shadow-lg rounded-2xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{farm.name}</h3>
                        <p className="text-sm text-gray-600">ID: {farm.farm_id}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                        {farm.farm_type}
                      </span>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <UserGroupIcon className="w-4 h-4 mr-2 text-gray-400" />
                        Owner: <span className="ml-1 font-medium">{farm.farmer_name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                        {farm.location} • Pin: {farm.pincode}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <HeartIcon className="w-4 h-4 mr-2 text-gray-400" />
                        {farm.livestock_count} Animals • Size: {farm.size}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <a
                        href={`tel:${farm.farmer_phone}`}
                        className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Call Owner
                      </a>
                      <button
                        onClick={() => {
                          setSelectedFarm(farm)
                          setShowFarmDetails(true)
                        }}
                        className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'animals' && (
          <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Tag/ID
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Animal
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Farm
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Health Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Withdrawal
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Last Checkup
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnimals.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No animals found
                      </td>
                    </tr>
                  ) : (
                    filteredAnimals.map((animal) => {
                      const age = animal.date_of_birth 
                        ? `${Math.floor((new Date() - new Date(animal.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                        : 'Unknown'
                      
                      return (
                        <tr key={animal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{animal.tag_id}</div>
                            <div className="text-xs text-gray-500">{animal.livestock_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{animal.name || animal.species}</div>
                            <div className="text-xs text-gray-500">{animal.breed} • {age}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{animal.farm_name}</div>
                            <div className="text-xs text-gray-500">{animal.farmer_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getHealthStatusBadge(animal.health_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                              None
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(animal.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Farm Details Modal */}
      <AnimatePresence>
        {showFarmDetails && selectedFarm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 text-white bg-green-600 rounded-t-xl">
                <div>
                  <h2 className="text-2xl font-bold">{selectedFarm.name}</h2>
                  <p className="text-sm text-green-100">Farm ID: {selectedFarm.farm_id}</p>
                </div>
                <button
                  onClick={() => {
                    setShowFarmDetails(false)
                    setSelectedFarm(null)
                  }}
                  className="p-2 transition-colors rounded-lg hover:bg-green-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Farm Information */}
                <div>
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold text-gray-900">
                    <BuildingOfficeIcon className="w-5 h-5 text-green-600" />
                    Farm Information
                  </h3>
                  <div className="p-4 space-y-2 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Farm Type</p>
                        <p className="font-medium text-gray-900 capitalize">{selectedFarm.farm_type || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Size</p>
                        <p className="font-medium text-gray-900">{selectedFarm.size || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPinIcon className="w-4 h-4" />
                          Location
                        </p>
                        <p className="font-medium text-gray-900">{selectedFarm.location || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Information */}
                <div>
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold text-gray-900">
                    <UserGroupIcon className="w-5 h-5 text-green-600" />
                    Owner Information
                  </h3>
                  <div className="p-4 space-y-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{selectedFarm.farmer_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4" />
                        Phone
                      </p>
                      <p className="font-medium text-gray-900">{selectedFarm.farmer_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4" />
                        Address
                      </p>
                      <p className="font-medium text-gray-900">{selectedFarm.farmer_address || 'N/A'}</p>
                      <p className="mt-1 text-sm text-gray-600">Pincode: {selectedFarm.pincode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Livestock Summary */}
                <div>
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold text-gray-900">
                    <ChartBarIcon className="w-5 h-5 text-green-600" />
                    Livestock Summary
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-2xl font-bold text-gray-900">{selectedFarm.total_livestock || 0}</p>
                      <p className="text-sm text-gray-600">Total Animals</p>
                    </div>
                    {selectedFarm.livestock_summary && selectedFarm.livestock_summary.length > 0 ? (
                      <div className="space-y-2">
                        {selectedFarm.livestock_summary.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-t border-gray-200 first:border-0">
                            <span className="text-sm font-medium text-gray-700 capitalize">{item.livestock_type}</span>
                            <span className="px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-sm text-center text-gray-500">No livestock data available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowFarmDetails(false)
                    setSelectedFarm(null)
                  }}
                  className="px-4 py-2 font-medium text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}


export default MyFarmsPatients
