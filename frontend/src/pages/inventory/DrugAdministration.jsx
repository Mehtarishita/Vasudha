import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import QRCode from 'react-qr-code'
import { useAuthStore } from '../../store/authStore'
import { getLivestock } from '../../services/livestockHelpers'
import { createTreatment, getActiveTreatments, getTreatmentStats, getDaysRemaining, getWithdrawalStatus, getStatusColor } from '../../services/treatmentHelpers'
import drugDatabase from '../../data/drug_database.json'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const DrugAdministration = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const [livestock, setLivestock] = useState([])
  const [activeTreatments, setActiveTreatments] = useState([])
  const [stats, setStats] = useState({
    totalTreatments: 0,
    activeWithdrawals: 0,
    antibioticUse: 0,
    activeAMU: 0
  })
  const [loading, setLoading] = useState(true)
  
  const [administrationForm, setAdministrationForm] = useState({
    livestock_id: '',
    drug_id: null,
    drug_name: '',
    salt_name: '',
    category: '',
    concentration: '',
    volume: '',
    amu_volume: '',
    dosage: '',
    administration_route: 'oral',
    administration_date: new Date().toISOString().split('T')[0],
    purpose: 'therapeutic',
    batch_number: '',
    veterinarian_name: '',
    withdrawal_period_milk: 0,
    withdrawal_period_meat: 0,
    withdrawal_period_days: 0,
    mrl_limit_milk: '',
    mrl_limit_meat: '',
    regulatory_status: '',
    notes: ''
  })

  const [scannedData, setScannedData] = useState(null)
  const [withdrawalCalculation, setWithdrawalCalculation] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)

  // Calculate AMU volume when concentration or volume changes
  useEffect(() => {
    const calculateAMUVolume = () => {
      const { concentration, volume } = administrationForm
      
      if (!concentration || !volume) {
        setAdministrationForm(prev => ({ ...prev, amu_volume: '' }))
        return
      }

      // Extract numeric values from concentration (e.g., "1% w/v" -> 1, "10mg/ml" -> 10)
      const concMatch = concentration.match(/(\d+\.?\d*)/);
      const concValue = concMatch ? parseFloat(concMatch[1]) : 0;

      // Extract numeric value from volume (e.g., "10ml" -> 10)
      const volMatch = volume.match(/(\d+\.?\d*)/);
      const volValue = volMatch ? parseFloat(volMatch[1]) : 0;

      if (concValue > 0 && volValue > 0) {
        // Calculate AMU volume (concentration × volume in mg)
        const amuVol = concValue * volValue;
        setAdministrationForm(prev => ({ ...prev, amu_volume: `${amuVol.toFixed(2)} mg` }))
      } else {
        setAdministrationForm(prev => ({ ...prev, amu_volume: '' }))
      }
    }

    calculateAMUVolume()
  }, [administrationForm.concentration, administrationForm.volume])

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [livestockData, treatmentsData, statsData] = await Promise.all([
        getLivestock(user.id),
        getActiveTreatments(user.id),
        getTreatmentStats(user.id)
      ])
      
      setLivestock(livestockData || [])
      setActiveTreatments(treatmentsData || [])
      setStats(statsData || { totalTreatments: 0, activeWithdrawals: 0, antibioticUse: 0, activeAMU: 0 })
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDrugSelect = (drugId) => {
    const drug = drugDatabase.find(d => d.id === parseInt(drugId))
    if (drug) {
      setAdministrationForm(prev => ({
        ...prev,
        drug_id: drug.id,
        drug_name: drug.salt_name,
        salt_name: drug.salt_name,
        category: drug.category,
        withdrawal_period_milk: drug.withdrawal_period_milk,
        withdrawal_period_meat: drug.withdrawal_period_meat,
        withdrawal_period_days: drug.withdrawal_period_days,
        mrl_limit_milk: drug.mrl_limit_milk,
        mrl_limit_meat: drug.mrl_limit_meat,
        regulatory_status: drug.regulatory_status
      }))
      
      setSelectedDrug(drug)
      
      // Calculate withdrawal end date
      const administrationDate = new Date(administrationForm.administration_date)
      const withdrawalEndDate = new Date(administrationDate)
      withdrawalEndDate.setDate(withdrawalEndDate.getDate() + drug.withdrawal_period_days)
      
      setWithdrawalCalculation({
        drug: drug.salt_name,
        withdrawalPeriod: drug.withdrawal_period_days,
        withdrawalEndDate: withdrawalEndDate.toLocaleDateString(),
        mrlLimit: drug.mrl_limit_milk
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!administrationForm.livestock_id || !administrationForm.drug_name || !administrationForm.dosage) {
      toast.error('Please fill all required fields')
      return
    }

    // Check if drug is banned
    if (administrationForm.regulatory_status === 'BANNED') {
      toast.error('This drug is BANNED and cannot be used!', {
        duration: 5000,
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          fontWeight: 'bold',
          border: '2px solid #dc2626'
        }
      })
      return
    }

    try {
      setLoading(true)
      
      await createTreatment(administrationForm, user.id)
      
      toast.success('Treatment recorded successfully!')
      
      // Reset form
      setAdministrationForm({
        livestock_id: '',
        drug_id: null,
        drug_name: '',
        salt_name: '',
        category: '',
        concentration: '',
        volume: '',
        dosage: '',
        administration_route: 'oral',
        administration_date: new Date().toISOString().split('T')[0],
        purpose: 'therapeutic',
        batch_number: '',
        veterinarian_name: '',
        withdrawal_period_milk: 0,
        withdrawal_period_meat: 0,
        withdrawal_period_days: 0,
        mrl_limit_milk: '',
        mrl_limit_meat: '',
        regulatory_status: '',
        notes: ''
      })
      setWithdrawalCalculation(null)
      setSelectedDrug(null)
      
      // Reload data
      await loadData()
    } catch (error) {
      console.error('Error saving treatment:', error)
      toast.error('Failed to save treatment record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Administration</h1>
          <p className="text-gray-600">Record and track drug administration with QR traceability</p>
        </div>
        <button
          onClick={() => navigate('/app/treatment-recording')}
          className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <CameraIcon className="w-5 h-5" />
          <span>Capture Drug Image</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Treatments</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalTreatments}</p>
            </div>
            <ClipboardDocumentListIcon className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Withdrawals</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.activeWithdrawals}</p>
            </div>
            <CalendarDaysIcon className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Antibiotic Use</p>
              <p className="text-2xl font-bold text-purple-600">{stats.antibioticUse}</p>
            </div>
            <ExclamationTriangleIcon className="w-10 h-10 text-purple-500" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active AMU</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeAMU}</p>
            </div>
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Administration Form */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-center mb-6 space-x-2">
              <ClipboardDocumentListIcon className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Record Administration</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Select Livestock *
                  </label>
                  <select
                    required
                    value={administrationForm.livestock_id}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, livestock_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose livestock</option>
                    {livestock.map(animal => (
                      <option key={animal.id} value={animal.id}>
                        {animal.tag_id} - {animal.species} ({animal.breed})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Select Drug *
                  </label>
                  <select
                    required
                    value={administrationForm.drug_id || ''}
                    onChange={(e) => handleDrugSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose a drug</option>
                    {drugDatabase.map(drug => (
                      <option key={drug.id} value={drug.id}>
                        {drug.salt_name} ({drug.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Concentration
                  </label>
                  <input
                    type="text"
                    value={administrationForm.concentration}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, concentration: e.target.value })}
                    placeholder="e.g., 1% w/v, 10mg/ml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Volume
                  </label>
                  <input
                    type="text"
                    value={administrationForm.volume}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, volume: e.target.value })}
                    placeholder="e.g., 10ml, 50ml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* AMU Volume Display */}
              {administrationForm.amu_volume && (
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">AMU Volume</p>
                      <p className="text-xs text-blue-700">Concentration × Volume</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{administrationForm.amu_volume}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={administrationForm.batch_number}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, batch_number: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    value={administrationForm.dosage}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, dosage: e.target.value })}
                    placeholder="e.g., 5ml, 2 tablets"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Route of Administration
                  </label>
                  <select
                    value={administrationForm.administration_route}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, administration_route: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="oral">Oral</option>
                    <option value="injection">Injection</option>
                    <option value="topical">Topical</option>
                    <option value="intravenous">Intravenous</option>
                    <option value="intramuscular">Intramuscular</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Purpose
                  </label>
                  <select
                    value={administrationForm.purpose}
                    onChange={(e) => setAdministrationForm({ ...administrationForm, purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="therapeutic">Therapeutic</option>
                    <option value="prophylactic">Prophylactic</option>
                    <option value="metaphylactic">Metaphylactic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={administrationForm.notes}
                  onChange={(e) => setAdministrationForm({ ...administrationForm, notes: e.target.value })}
                  placeholder="Additional notes about the treatment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Withdrawal Period Calculation */}
              {withdrawalCalculation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-yellow-200 rounded-lg bg-yellow-50"
                >
                  <div className="flex items-center mb-2 space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-sm font-medium text-yellow-800">Withdrawal Period Warning</h3>
                  </div>
                  <div className="space-y-1 text-sm text-yellow-700">
                    <p><strong>Drug:</strong> {withdrawalCalculation.drug}</p>
                    <p><strong>Withdrawal Period:</strong> {withdrawalCalculation.withdrawalPeriod} days</p>
                    <p><strong>Safe for consumption after:</strong> {withdrawalCalculation.withdrawalEndDate}</p>
                    <p><strong>MRL Limit:</strong> {withdrawalCalculation.mrlLimit}</p>
                  </div>
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-3 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
              >
                Record Administration
              </button>
            </form>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* QR Code Display */}
          {scannedData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Generated QR Code</h3>
              <div className="flex justify-center mb-4">
                <QRCode value={scannedData} size={150} />
              </div>
              <p className="text-sm text-center text-gray-600">
                Scan this QR code for traceability
              </p>
            </motion.div>
          )}

          {/* Active Treatments */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Active Withdrawal Periods</h3>
            
            {loading ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : activeTreatments.length === 0 ? (
              <p className="text-sm text-gray-600">No active treatments</p>
            ) : (
              <div className="space-y-3">
                {activeTreatments.slice(0, 5).map((treatment) => {
                  const daysLeft = getDaysRemaining(treatment.withdrawal_end_date)
                  const status = getWithdrawalStatus(treatment.withdrawal_end_date)
                  const colorClass = getStatusColor(status)
                  
                  return (
                    <div key={treatment.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{treatment.tag_id}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>Drug:</strong> {treatment.drug_name || treatment.salt_name}</p>
                        <p><strong>Dosage:</strong> {treatment.dosage}</p>
                        <p><strong>Withdrawal ends:</strong> {new Date(treatment.withdrawal_end_date).toLocaleDateString()}</p>
                        {treatment.veterinarian_name && (
                          <p><strong>Vet:</strong> {treatment.veterinarian_name}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            <button 
              onClick={() => navigate('/app/treatment-recording')}
              className="w-full py-2 mt-4 text-sm text-blue-600 border-t border-gray-200 hover:text-blue-800"
            >
              View all treatments
            </button>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/app/treatment-recording')}
                className="flex items-center w-full p-3 space-x-2 text-left transition-colors border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <CameraIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Capture Drug Image (OCR)</span>
              </button>
              
              <button className="flex items-center w-full p-3 space-x-2 text-left transition-colors border border-gray-200 rounded-lg hover:bg-gray-50">
                <CalendarDaysIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm">Check Withdrawal Periods</span>
              </button>
              
              <button className="flex items-center w-full p-3 space-x-2 text-left transition-colors border border-gray-200 rounded-lg hover:bg-gray-50">
                <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm">Compliance Check</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default DrugAdministration
