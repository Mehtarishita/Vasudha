import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCartIcon,
  QrCodeIcon,
  UserIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import drugDatabase from '../../data/drug_database.json'
import { Link } from 'react-router-dom'
import FarmerQRScanner from '../../components/retailer/FarmerQRScanner'

const RecordSales = () => {
  const { user } = useAuthStore()
  const [shopProfile, setShopProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [availableStock, setAvailableStock] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [buyerMethod, setBuyerMethod] = useState('qr')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerFarmerId, setBuyerFarmerId] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerDistrict, setBuyerDistrict] = useState('')
  const [buyerState, setBuyerState] = useState('')
  const [prescriptionAvailable, setPrescriptionAvailable] = useState(false)
  const [prescriptionId, setPrescriptionId] = useState('')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [fetchedFarmerData, setFetchedFarmerData] = useState(null)

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

      if (error) throw error
      setShopProfile(data)
      
      if (data) {
        loadAvailableStock()
      }
    } catch (error) {
      console.error('Error checking shop profile:', error)
      toast.error('Failed to verify shop profile')
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id && shopProfile) {
      loadAvailableStock()
    }
  }, [user, shopProfile])

  const loadAvailableStock = async () => {
    try {
      const { data, error } = await supabase
        .from('retailer_stock')
        .select('*')
        .eq('user_id', user.id)
        .gt('quantity_available', 0)
        .order('drug_name')

      if (error) throw error
      setAvailableStock(data || [])
    } catch (error) {
      console.error('Error loading stock:', error)
      toast.error('Failed to load available stock')
    }
  }

  const handleStockSelect = (stockId) => {
    const stock = availableStock.find(s => s.id === stockId)
    if (stock) {
      setSelectedStock(stock)
      const drug = drugDatabase.find(d => d.salt_name === stock.salt_name)
      setSelectedDrug(drug)
    }
  }

  const handleQRScanSuccess = (farmerData) => {
    console.log('Received farmer data:', farmerData)
    setBuyerName(farmerData.farmer_name)
    setBuyerPhone(farmerData.farmer_phone)
    setBuyerFarmerId(farmerData.farmer_unique_id)
    setBuyerAddress(farmerData.address || farmerData.location)
    setBuyerDistrict(farmerData.district)
    setBuyerState(farmerData.state)
    setShowQRScanner(false)
    setBuyerMethod('qr')
    toast.success('Farmer details loaded from QR code')
  }

  const handleFetchFarmerDetails = async () => {
    if (!buyerFarmerId) {
      toast.error('Please enter Farmer ID')
      return
    }

    try {
      // Fetch farmer details from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('name, mobile_number, district, state, address')
        .eq('unique_id', buyerFarmerId)
        .eq('user_type', 'producer')
        .single()

      if (error) {
        console.error('Error fetching farmer:', error)
        toast.error('Farmer not found with this ID')
        return
      }

      if (!data) {
        toast.error('No farmer found with this ID')
        return
      }

      // Store fetched data and show confirmation modal
      setFetchedFarmerData(data)
      setShowConfirmModal(true)

    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to fetch farmer details')
    }
  }

  const handleConfirmFarmerDetails = () => {
    if (fetchedFarmerData) {
      setBuyerName(fetchedFarmerData.name)
      setBuyerPhone(fetchedFarmerData.mobile_number)
      setBuyerDistrict(fetchedFarmerData.district)
      setBuyerState(fetchedFarmerData.state)
      setBuyerAddress(fetchedFarmerData.address)
      setShowConfirmModal(false)
      toast.success('Farmer details confirmed and loaded')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedStock) {
      toast.error('Please select a drug from stock')
      return
    }

    if (!quantity || quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (parseInt(quantity) > selectedStock.quantity_available) {
      toast.error(`Only ${selectedStock.quantity_available} units available in stock`)
      return
    }

    if (!buyerName || !buyerPhone || !buyerFarmerId) {
      toast.error('Buyer name, phone, and Farmer ID are mandatory. Please scan farmer QR code.')
      return
    }

    try {
      const totalAmount = pricePerUnit ? parseFloat(pricePerUnit) * parseInt(quantity) : null

      const salePayload = {
        user_id: user.id,
        stock_id: selectedStock.id,
        drug_name: selectedStock.drug_name,
        salt_name: selectedStock.salt_name,
        category: selectedStock.category,
        batch_number: selectedStock.batch_number,
        quantity_sold: parseInt(quantity),
        unit_type: selectedStock.unit_type,

        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_farmer_id: buyerFarmerId,
        buyer_district: buyerDistrict || null,
        buyer_state: buyerState || null,

        prescription_available: prescriptionAvailable,
        prescription_id: prescriptionId || null,

        expiry_date: selectedStock.expiry_date,
        withdrawal_period_days: selectedStock.withdrawal_period_days,
        regulatory_status: selectedStock.regulatory_status,

        price_per_unit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        total_amount: totalAmount,
        payment_method: paymentMethod
      }

      const { data, error } = await supabase
        .from('retailer_sales')
        .insert([salePayload])
        .select()

      if (error) throw error

      toast.success(
        <div>
          <p className="font-bold">Sale Recorded Successfully!</p>
          <p className="text-sm">{selectedStock.drug_name} - {quantity} units</p>
          <p className="text-sm">Sold to: {buyerName}</p>
          <p className="text-sm">Farmer ID: {buyerFarmerId}</p>
        </div>,
        { duration: 5000 }
      )

      setSelectedStock(null)
      setSelectedDrug(null)
      setQuantity('')
      setBuyerName('')
      setBuyerPhone('')
      setBuyerFarmerId('')
      setBuyerAddress('')
      setBuyerDistrict('')
      setBuyerState('')
      setPrescriptionAvailable(false)
      setPrescriptionId('')
      setPricePerUnit('')
      setBuyerMethod('qr')

      loadAvailableStock()

    } catch (error) {
      console.error('Error recording sale:', error)
      toast.error('Failed to record sale: ' + error.message)
    }
  }

  return (
    <div className="p-3 space-y-4 sm:p-4 md:p-6 sm:space-y-6">
      {/* Farmer Confirmation Modal */}
      {showConfirmModal && fetchedFarmerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900">Confirm Farmer Details</h3>
            <div className="mb-6 space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Farmer ID</p>
                <p className="font-mono font-bold text-gray-900">{buyerFarmerId}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-bold text-gray-900">{fetchedFarmerData.name}</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="font-mono font-bold text-gray-900">{fetchedFarmerData.mobile_number}</p>
              </div>
              {fetchedFarmerData.district && (
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-bold text-gray-900">{fetchedFarmerData.district}, {fetchedFarmerData.state}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmFarmerDetails}
                className="flex-1 px-4 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Confirm & Use
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setFetchedFarmerData(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Shop Profile Warning */}
      {profileLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="w-12 h-12 border-b-2 border-green-600 rounded-full animate-spin"></div>
        </div>
      ) : !shopProfile ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 text-center border-2 border-red-200 rounded-lg bg-red-50"
        >
          <XMarkIcon className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="mb-2 text-2xl font-bold text-red-900">Shop Profile Required</h2>
          <p className="mb-6 text-red-700">
            You must complete your shop profile before you can record sales. Please set up your shop details, location, and license information.
          </p>
          <Link
            to="/dashboard/retailer/shop-profile"
            className="inline-flex items-center px-6 py-3 font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Complete Shop Profile
          </Link>
        </motion.div>
      ) : (
        <>
          <FarmerQRScanner
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={handleQRScanSuccess}
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
          >
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Record Sales</h1>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">Log drug sales and link to buyer (Stock Out)</p>
            </div>
            <ShoppingCartIcon className="w-8 h-8 text-green-600 sm:w-10 sm:h-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Select Drug from Stock <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStock?.id || ''}
                    onChange={(e) => handleStockSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose a drug from your stock...</option>
                    {availableStock.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.drug_name} - Batch: {stock.batch_number} (Available: {stock.quantity_available} {stock.unit_type})
                      </option>
                    ))}
                  </select>
                  {availableStock.length === 0 && (
                    <p className="mt-1 text-sm text-orange-600">No stock available. Please add stock first.</p>
                  )}
                </div>

                {selectedStock && (
                  <div className="p-3 border border-gray-200 rounded-lg sm:p-4 bg-gray-50">
                <h4 className="mb-2 text-sm font-medium text-gray-900 sm:text-base">Drug Details</h4>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:text-sm">
                  <div><span className="text-gray-600">Category:</span> <span className="font-medium">{selectedStock.category}</span></div>
                  <div><span className="text-gray-600">Batch:</span> <span className="font-mono">{selectedStock.batch_number}</span></div>
                  <div><span className="text-gray-600">Expiry:</span> <span className="font-medium">{new Date(selectedStock.expiry_date).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-600">Regulatory:</span> <span className="font-medium">{selectedStock.regulatory_status}</span></div>
                  {selectedDrug && (
                    <>
                      <div><span className="text-gray-600">Withdrawal (Milk):</span> <span className="font-medium">{selectedDrug.withdrawal_period_milk} days</span></div>
                      <div><span className="text-gray-600">Withdrawal (Meat):</span> <span className="font-medium">{selectedDrug.withdrawal_period_meat} days</span></div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Quantity Sold <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter number of units"
                min="1"
                max={selectedStock?.quantity_available || 999}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              {selectedStock && (
                <p className="mt-1 text-sm text-gray-600">
                  Available: {selectedStock.quantity_available} {selectedStock.unit_type}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Buyer Details (Farmer) <span className="text-red-500">*MUST SCAN QR</span>
              </label>
              <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${buyerMethod === 'qr'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
                    }`}
                >
                  <QrCodeIcon className="w-5 h-5" />
                  Scan Farmer QR
                </button>
                <button
                  type="button"
                  onClick={() => setBuyerMethod('manual')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${buyerMethod === 'manual'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
                    }`}
                >
                  <UserIcon className="w-5 h-5" />
                  Enter Manually
                </button>
              </div>

              {buyerFarmerId && buyerName && (
                <div className="p-4 mb-4 border-2 border-green-500 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    <p className="text-lg font-bold text-green-800">Farmer Details Loaded ✓</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-white border border-green-200 rounded">
                      <span className="font-semibold text-gray-600">Farmer ID:</span> <span className="ml-2 font-mono font-bold text-gray-900">{buyerFarmerId}</span>
                    </div>
                    <div className="p-2 bg-white border border-green-200 rounded">
                      <span className="font-semibold text-gray-600">Name:</span> <span className="ml-2 font-bold text-gray-900">{buyerName}</span>
                    </div>
                    <div className="p-2 bg-white border border-green-200 rounded">
                      <span className="font-semibold text-gray-600">Phone:</span> <span className="ml-2 font-mono font-bold text-gray-900">{buyerPhone}</span>
                    </div>
                    {buyerDistrict && (
                      <div className="p-2 bg-white border border-green-200 rounded">
                        <span className="font-semibold text-gray-600">Location:</span> <span className="ml-2 font-bold text-gray-900">{buyerDistrict}, {buyerState}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {buyerMethod === 'manual' && (
                <div className="p-4 space-y-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start gap-2 mb-3 text-sm text-yellow-800">
                    <svg className="flex-shrink-0 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p>Enter Farmer ID to fetch details from database.</p>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Farmer ID <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={buyerFarmerId}
                        onChange={(e) => setBuyerFarmerId(e.target.value)}
                        placeholder="e.g., PRD-20251119-0002"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleFetchFarmerDetails}
                        className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Fetch Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Price Per Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>

            {pricePerUnit && quantity && (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Total Amount:</span> ₹{(parseFloat(pricePerUnit) * parseInt(quantity || 0)).toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Prescription Status</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prescriptionAvailable}
                    onChange={(e) => setPrescriptionAvailable(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Prescription Available?</span>
                </label>
              </div>

              {prescriptionAvailable && (
                <div className="mt-4">
                  <label className="block mb-1 text-sm font-medium text-gray-700">Prescription ID</label>
                  <input
                    type="text"
                    value={prescriptionId}
                    onChange={(e) => setPrescriptionId(e.target.value)}
                    placeholder="e.g., VET-RX-2025-0125"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
              <button
                type="submit"
                className="flex items-center justify-center flex-1 gap-2 px-6 py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Record Sale
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedStock(null)
                  setSelectedDrug(null)
                  setQuantity('')
                  setBuyerName('')
                  setBuyerPhone('')
                  setBuyerFarmId('')
                  setBuyerFarmerId('')
                  setBuyerDistrict('')
                  setBuyerState('')
                  setPrescriptionAvailable(false)
                  setPrescriptionId('')
                  setPricePerUnit('')
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 border border-blue-200 rounded-lg bg-blue-50"
      >
        <p className="text-sm text-blue-800">
          <span className="font-medium">Note:</span> All sales are recorded on the blockchain for traceability.
          For controlled drugs, prescription verification is mandatory before dispensing.
        </p>
      </motion.div>
        </>
      )}
    </div>
  )
}

export default RecordSales
