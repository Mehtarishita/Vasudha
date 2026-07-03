import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  UserIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  TagIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const PrescriptionManagement = () => {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('prescriptions')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)

  // Load prescriptions from Supabase
  useEffect(() => {
    if (user?.id) {
      loadPrescriptions()
    }
  }, [user])

  const loadPrescriptions = async () => {
    try {
      setLoading(true)

      // Fetch prescriptions created by this veterinarian
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          treatment_request:treatment_requests!prescriptions_request_id_fkey(
            farmer_name,
            farmer_phone,
            animal_species,
            animal_tag,
            symptoms
          ),
          livestock:livestock(
            tag_id,
            name,
            species,
            breed,
            farm:farms(name, location)
          )
        `)
        .eq('veterinarian_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPrescriptions(data || [])
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      toast.error('Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <ClockIcon className="w-5 h-5 text-blue-600" />
      case 'completed': return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'pending': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
      default: return <DocumentTextIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getStats = () => {
    const total = prescriptions.length
    const active = prescriptions.filter(p => p.status === 'active').length
    const completed = prescriptions.filter(p => p.status === 'completed').length
    const cancelled = prescriptions.filter(p => p.status === 'cancelled').length
    
    return { total, active, completed, cancelled }
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescription Management</h1>
          <p className="text-gray-600">Manage veterinary prescriptions and treatment records</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Prescription</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Prescriptions</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          {[
            { id: 'prescriptions', name: 'All Prescriptions' },
            { id: 'templates', name: 'Templates' },
            { id: 'reports', name: 'Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Prescription List */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {mockPrescriptions.map((prescription, index) => (
            <motion.div
              key={prescription.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(prescription.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{prescription.id}</h3>
                      <p className="text-sm text-gray-600">
                        Animal: {prescription.animalTag} • {prescription.farmName}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(prescription.status)}`}>
                    {prescription.status.toUpperCase()}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 transition-colors hover:text-blue-600">
                      <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 transition-colors hover:text-green-600">
                      <ShareIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-4 md:grid-cols-3">
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Veterinarian</h4>
                  <p className="text-sm text-gray-600">{prescription.veterinarian}</p>
                  <p className="text-xs text-gray-500">License: {prescription.vetLicense}</p>
                </div>
                
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Issue Date</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(prescription.issueDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Follow-up Date</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(prescription.followUpDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="mb-2 font-medium text-gray-900">Diagnosis</h4>
                <p className="mb-2 text-sm text-gray-700">{prescription.diagnosis}</p>
                <p className="text-sm text-gray-600">Symptoms: {prescription.symptoms}</p>
              </div>

              <div className="mb-4">
                <h4 className="mb-3 font-medium text-gray-900">Prescribed Medications</h4>
                {prescription.drugs.map((drug, drugIndex) => (
                  <div key={drugIndex} className="p-4 mb-3 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div>
                        <h5 className="font-medium text-gray-900">{drug.drugName}</h5>
                        <p className="text-sm text-gray-600">{drug.activeIngredient}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm"><span className="font-medium">Dosage:</span> {drug.dosage}</p>
                        <p className="text-sm"><span className="font-medium">Route:</span> {drug.route}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm"><span className="font-medium">Frequency:</span> {drug.frequency}</p>
                        <p className="text-sm"><span className="font-medium">Duration:</span> {drug.duration}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm"><span className="font-medium">Withdrawal:</span></p>
                        <p className="text-xs text-red-600">Meat: {drug.withdrawalPeriodMeat}</p>
                        <p className="text-xs text-red-600">Milk: {drug.withdrawalPeriodMilk}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Instructions</h4>
                  <p className="text-sm text-gray-700">{prescription.instructions}</p>
                </div>
                
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Notes</h4>
                  <p className="text-sm text-gray-700">{prescription.notes}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Created: {new Date(prescription.issueDate).toLocaleDateString()}
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedPrescription(prescription)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </button>
                  <button className="text-sm font-medium text-green-600 hover:text-green-800">
                    Edit
                  </button>
                  <button className="text-sm font-medium text-gray-600 hover:text-gray-800">
                    Duplicate
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
          <BeakerIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Prescription Templates</h3>
          <p className="mb-4 text-gray-600">
            Create and manage prescription templates for common treatments to save time.
          </p>
          <button className="px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">
            Create Template
          </button>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Prescription Reports</h3>
          <p className="mb-4 text-gray-600">
            Generate detailed reports on prescription patterns, drug usage, and compliance.
          </p>
          <button className="px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">
            Generate Report
          </button>
        </div>
      )}

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-75">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Create New Prescription</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Animal Tag ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., C001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Veterinarian *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select Veterinarian</option>
                    <option value="dr-priya">Dr. Priya Sharma</option>
                    <option value="dr-rajesh">Dr. Rajesh Kumar</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mastitis - Left Hind Quarter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Symptoms
                </label>
                <textarea
                  placeholder="Describe observed symptoms..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Prescribed Medications</h3>
                
                <div className="p-4 space-y-4 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Drug Name *
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Select Drug</option>
                        <option value="amoxicillin">Amoxicillin Injectable</option>
                        <option value="ivermectin">Ivermectin Pour-On</option>
                        <option value="calcium">Calcium Borogluconate</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Dosage *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 20ml"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Frequency *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Once daily"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Duration *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 5 days"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Route *
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Select Route</option>
                        <option value="intramuscular">Intramuscular</option>
                        <option value="subcutaneous">Subcutaneous</option>
                        <option value="oral">Oral</option>
                        <option value="topical">Topical</option>
                        <option value="intravenous">Intravenous</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <button className="mt-4 text-sm font-medium text-green-600 hover:text-green-800">
                  + Add Another Medication
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Instructions
                  </label>
                  <textarea
                    placeholder="Administration instructions..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    placeholder="Additional notes..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end pt-6 mt-6 space-x-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button className="px-6 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700">
                Create Prescription
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default PrescriptionManagement
