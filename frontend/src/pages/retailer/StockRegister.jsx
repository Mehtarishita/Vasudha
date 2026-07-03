import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import { Link } from 'react-router-dom'
import drugDatabase from '../../data/drug_database.json'

const StockRegister = () => {
  const { user } = useAuthStore()
  const [shopProfile, setShopProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [stockData, setStockData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStock, setNewStock] = useState({
    drugName: '',
    saltName: '',
    category: '',
    batchNumber: '',
    quantityReceived: '',
    distributorName: '',
    distributorContact: '',
    expiryDate: '',
    costPerUnit: '',
    storageLocation: '',
    notes: ''
  })

  // Check shop profile first
  useEffect(() => {
    if (user?.id) {
      checkShopProfile()
    }
  }, [user])

  const checkShopProfile = async () => {
    try {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('retailer_shops')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking shop profile:', error)
        // If table doesn't exist, treat as no profile
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('retailer_shops table does not exist. Please run the SQL setup.')
          toast.error('Database setup required. Please contact administrator.')
          setShopProfile(null)
        } else {
          throw error
        }
      } else {
        setShopProfile(data)
        
        if (data) {
          loadStockData()
        }
      }
    } catch (error) {
      console.error('Error checking shop profile:', error)
      toast.error('Failed to verify shop profile: ' + error.message)
      setShopProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  // Load stock data from Supabase
  useEffect(() => {
    if (user?.id && shopProfile) {
      loadStockData()
    }
  }, [user, shopProfile])

  const loadStockData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('retailer_stock')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setStockData(data || [])
    } catch (error) {
      console.error('Error loading stock:', error)
      toast.error('Failed to load stock data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredStock = stockData.filter(item =>
    item.drug_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.distributor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockItems = stockData.filter(item => item.quantity_available < 20)

  const handleDrugSelect = (drugId) => {
    const drug = drugDatabase.find(d => d.id === parseInt(drugId))
    if (drug) {
      setNewStock(prev => ({
        ...prev,
        drugName: drug.name || drug.salt_name,
        saltName: drug.salt_name,
        category: drug.category
      }))
    }
  }

  const handleAddStock = async (e) => {
    e.preventDefault()

    if (!user?.id) {
      toast.error('You must be logged in to add stock')
      return
    }

    try {
      const selectedDrug = drugDatabase.find(d =>
        (d.name && d.name === newStock.drugName) || d.salt_name === newStock.saltName
      )

      const stockPayload = {
        user_id: user.id,
        drug_name: newStock.drugName,
        salt_name: newStock.saltName || selectedDrug?.salt_name,
        category: newStock.category || selectedDrug?.category,
        batch_number: newStock.batchNumber,
        quantity_received: parseInt(newStock.quantityReceived),
        quantity_available: parseInt(newStock.quantityReceived),
        unit_type: 'units',
        distributor_name: newStock.distributorName,
        distributor_contact: newStock.distributorContact,
        expiry_date: newStock.expiryDate,
        withdrawal_period_days: selectedDrug?.withdrawal_period_days,
        regulatory_status: selectedDrug?.regulatory_status,
        cost_per_unit: newStock.costPerUnit ? parseFloat(newStock.costPerUnit) : null,
        storage_location: newStock.storageLocation
      }

      const { data, error } = await supabase
        .from('retailer_stock')
        .insert([stockPayload])
        .select()

      if (error) throw error

      toast.success(
        <div>
          <p className="font-bold">Stock added successfully!</p>
          <p className="text-sm">{newStock.drugName}</p>
          <p className="text-sm">Batch: {newStock.batchNumber}</p>
          <p className="text-sm">Qty: {newStock.quantityReceived} units</p>
        </div>,
        { duration: 4000 }
      )

      // Reset form
      setNewStock({
        drugName: '',
        saltName: '',
        category: '',
        batchNumber: '',
        quantityReceived: '',
        distributorName: '',
        distributorContact: '',
        expiryDate: '',
        costPerUnit: '',
        storageLocation: '',
        notes: ''
      })
      setShowAddForm(false)

      // Reload stock data
      loadStockData()

    } catch (error) {
      console.error('Error adding stock:', error)
      toast.error('Failed to add stock: ' + error.message)
    }
  }

  return (
    <div className="p-3 space-y-4 sm:p-4 md:p-6 sm:space-y-6">
      {/* Shop Profile Warning */}
      {profileLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : !shopProfile ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center"
        >
          <XMarkIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Shop Profile Required</h2>
          <p className="text-red-700 mb-6">
            You must complete your shop profile before you can manage stock. Please set up your shop details, location, and license information.
          </p>
          <Link
            to="/dashboard/retailer/shop-profile"
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Complete Shop Profile
          </Link>
        </motion.div>
      ) : (
        <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Stock Register</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Manage inventory and log received stock (Stock In)</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm text-white transition-colors bg-green-600 rounded-lg sm:px-4 sm:text-base hover:bg-green-700 sm:w-auto"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Stock
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Stock Items</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stockData.length}</p>
            </div>
            <CubeIcon className="w-12 h-12 text-blue-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="mt-1 text-3xl font-bold text-orange-600">{lowStockItems.length}</p>
            </div>
            <ExclamationTriangleIcon className="w-12 h-12 text-orange-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Units Available</p>
              <p className="mt-1 text-3xl font-bold text-green-600">
                {stockData.reduce((sum, item) => sum + (item.quantity_available || 0), 0)}
              </p>
            </div>
            <TruckIcon className="w-12 h-12 text-green-600" />
          </div>
        </motion.div>
      </div>

      {/* Add Stock Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6"
        >
          <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Log Received Stock</h3>
          <form onSubmit={handleAddStock} className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Drug Name</label>
              <select
                value={newStock.drugName}
                onChange={(e) => {
                  const selectedDrugId = drugDatabase.find(d => (d.name || d.salt_name) === e.target.value)?.id
                  handleDrugSelect(selectedDrugId)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select drug...</option>
                {drugDatabase.map((drug) => (
                  <option key={drug.id} value={drug.name || drug.salt_name}>
                    {drug.name || drug.salt_name} - {drug.category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Batch Number</label>
              <input
                type="text"
                value={newStock.batchNumber}
                onChange={(e) => setNewStock({ ...newStock, batchNumber: e.target.value })}
                placeholder="e.g., AMX2025001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Quantity Received</label>
              <input
                type="number"
                value={newStock.quantityReceived}
                onChange={(e) => setNewStock({ ...newStock, quantityReceived: e.target.value })}
                placeholder="Enter quantity"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Distributor Name</label>
              <input
                type="text"
                value={newStock.distributorName}
                onChange={(e) => setNewStock({ ...newStock, distributorName: e.target.value })}
                placeholder="e.g., MediVet Supplies Ltd"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Distributor Contact</label>
              <input
                type="text"
                value={newStock.distributorContact}
                onChange={(e) => setNewStock({ ...newStock, distributorContact: e.target.value })}
                placeholder="+91-XXXXXXXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="date"
                value={newStock.expiryDate}
                onChange={(e) => setNewStock({ ...newStock, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Cost Per Unit (₹)</label>
              <input
                type="number"
                step="0.01"
                value={newStock.costPerUnit}
                onChange={(e) => setNewStock({ ...newStock, costPerUnit: e.target.value })}
                placeholder="Enter cost"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Storage Location</label>
              <input
                type="text"
                value={newStock.storageLocation}
                onChange={(e) => setNewStock({ ...newStock, storageLocation: e.target.value })}
                placeholder="e.g., Shelf A-3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                value={newStock.notes}
                onChange={(e) => setNewStock({ ...newStock, notes: e.target.value })}
                placeholder="Any additional information..."
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row md:col-span-2">
              <button
                type="submit"
                className="flex-1 px-6 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
              >
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Search Bar */}
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
            placeholder="Search by drug name, batch number, or distributor..."
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border border-orange-200 rounded-lg bg-orange-50"
        >
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800">Low Stock Alerts</h3>
          </div>
          <div className="space-y-1">
            {lowStockItems.map(item => (
              <p key={item.id} className="text-sm text-orange-700">
                {item.drug_name} - Only {item.quantity_available} {item.unit_type} remaining
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stock Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="p-4 sm:p-6">
          <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Current Stock View</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Drug Name</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Category</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Batch Number</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Quantity Available</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Distributor</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Expiry Date</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStock.map((item) => {
                  const isLowStock = item.quantity_available < 20
                  const expiryDate = new Date(item.expiry_date)
                  const monthsToExpiry = (expiryDate - new Date()) / (1000 * 60 * 60 * 24 * 30)
                  const isNearExpiry = monthsToExpiry < 3

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">{item.drug_name}</td>
                      <td className="py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="py-3 font-mono text-sm text-gray-600">{item.batch_number}</td>
                      <td className="py-3">
                        <span className={`text-sm font-medium ${isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
                          {item.quantity_available} {item.unit_type}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{item.distributor_name}</td>
                      <td className="py-3 text-sm text-gray-600">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="py-3">
                        {isLowStock ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                            Low Stock
                          </span>
                        ) : isNearExpiry ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                            Near Expiry
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredStock.length === 0 && (
            <div className="py-12 text-center">
              <CubeIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No stock records found</p>
            </div>
          )}
        </div>
      </motion.div>
      </>
      )}
    </div>
  )
}

export default StockRegister
