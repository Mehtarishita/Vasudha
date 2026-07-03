import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BeakerIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { getFarmDetails } from '../../services/collectorHelpers'
import toast from 'react-hot-toast'

const FarmDetailView = () => {
  const { farmId } = useParams()
  const navigate = useNavigate()
  const [farm, setFarm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview, livestock, production, treatments

  useEffect(() => {
    if (farmId) {
      loadFarmDetails()
    }
  }, [farmId])

  const loadFarmDetails = async () => {
    try {
      setLoading(true)
      const data = await getFarmDetails(farmId)
      setFarm(data)
    } catch (error) {
      console.error('Error loading farm details:', error)
      toast.error('Failed to load farm details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!farm) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Farm not found</p>
        <button
          onClick={() => navigate('/collector/farms')}
          className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
        >
          Back to Farms
        </button>
      </div>
    )
  }

  const productionPercentage = farm.total_animals > 0
    ? ((farm.healthy_animals / farm.total_animals) * 100).toFixed(0)
    : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/collector/farms')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{farm.name}</h1>
            <p className="text-sm text-gray-500">Farm ID: {farm.farm_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {farm.livestock_on_withdrawal > 0 ? (
            <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
              ⚠️ Withdrawal Period Active
            </span>
          ) : (
            <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
              ✅ Safe to Collect
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Animals</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{farm.total_animals}</p>
            </div>
            <BuildingOfficeIcon className="w-10 h-10 text-blue-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Healthy Animals</p>
              <p className="mt-1 text-3xl font-bold text-green-600">{farm.healthy_animals}</p>
              <p className="text-xs text-gray-500">{productionPercentage}% of total</p>
            </div>
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Production</p>
              <p className="mt-1 text-3xl font-bold text-purple-600">{farm.avg_production_per_animal}L</p>
              <p className="text-xs text-gray-500">per animal/day</p>
            </div>
            <ChartBarIcon className="w-10 h-10 text-purple-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Withdrawal</p>
              <p className="mt-1 text-3xl font-bold text-orange-600">{farm.livestock_on_withdrawal}</p>
              <p className="text-xs text-gray-500">animals</p>
            </div>
            <ExclamationTriangleIcon className="w-10 h-10 text-orange-600" />
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['overview', 'livestock', 'production', 'treatments'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Farmer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Farmer Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{farm.farmer_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{farm.farmer_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium text-gray-900">{farm.location || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Farm Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Farm Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Farm Type</p>
                    <p className="font-medium text-gray-900 capitalize">{farm.farm_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Size</p>
                    <p className="font-medium text-gray-900">{farm.size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Registration Number</p>
                    <p className="font-medium text-gray-900">{farm.registration_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Production</p>
                    <p className="font-medium text-gray-900">{farm.total_production}L/day</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Livestock Composition */}
            {farm.farm_livestock && farm.farm_livestock.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Livestock Composition</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {farm.farm_livestock.map((type, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{type.livestock_type}</p>
                      <p className="text-2xl font-bold text-gray-900">{type.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'livestock' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">All Livestock ({farm.livestock?.length || 0})</h3>
            <div className="space-y-3">
              {farm.livestock && farm.livestock.length > 0 ? (
                farm.livestock.map((animal) => (
                  <div key={animal.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900">{animal.tag_id}</p>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {animal.species}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            animal.health_status === 'Healthy' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {animal.health_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Breed: {animal.breed}</span>
                          <span>Gender: {animal.gender}</span>
                          <span>Avg Produce: {animal.avg_produce}L/day</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-gray-500">No livestock records found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Production Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">Total Daily Production</p>
                <p className="mt-2 text-4xl font-bold text-blue-600">{farm.total_production}L</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-sm text-green-900 font-medium">Average Per Animal</p>
                <p className="mt-2 text-4xl font-bold text-green-600">{farm.avg_production_per_animal}L</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-sm text-purple-900 font-medium">Production Efficiency</p>
                <p className="mt-2 text-4xl font-bold text-purple-600">{productionPercentage}%</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="p-6 space-y-6">
            {/* Active Treatments */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
                Active Withdrawal Periods ({farm.active_treatments?.length || 0})
              </h3>
              {farm.active_treatments && farm.active_treatments.length > 0 ? (
                <div className="space-y-3">
                  {farm.active_treatments.map((treatment) => {
                    const daysRemaining = Math.ceil(
                      (new Date(treatment.withdrawal_end_date) - new Date()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <div key={treatment.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{treatment.drug_name}</p>
                            <p className="text-sm text-gray-600">
                              Category: {treatment.category} • Dosage: {treatment.dosage}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-orange-600">
                              {daysRemaining} days remaining
                            </p>
                            <p className="text-xs text-gray-600">
                              Ends: {new Date(treatment.withdrawal_end_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">No active withdrawal periods</p>
              )}
            </div>

            {/* Recent Treatments */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-gray-600" />
                Recent Treatments (Last 30 Days)
              </h3>
              {farm.recent_treatments && farm.recent_treatments.length > 0 ? (
                <div className="space-y-3">
                  {farm.recent_treatments.map((treatment) => (
                    <div key={treatment.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{treatment.drug_name}</p>
                          <p className="text-sm text-gray-600">
                            {treatment.category} • {treatment.dosage}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(treatment.administration_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-gray-500">No recent treatments</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FarmDetailView
