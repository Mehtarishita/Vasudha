import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCodeIcon, XMarkIcon, CheckCircleIcon, UserIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../../config/supabase'
import toast from 'react-hot-toast'

const FarmerQRScanner = ({ isOpen, onClose, onScanSuccess }) => {
  const [scanning, setScanning] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [html5QrCode, setHtml5QrCode] = useState(null)

  useEffect(() => {
    if (isOpen && !html5QrCode) {
      const scanner = new Html5Qrcode("qr-reader")
      setHtml5QrCode(scanner)
    }

    return () => {
      if (html5QrCode && scanning) {
        html5QrCode.stop().catch(err => console.error('Error stopping scanner:', err))
      }
    }
  }, [isOpen])

  const startScanning = async () => {
    if (!html5QrCode) return

    try {
      setScanning(true)
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        handleScanSuccess,
        handleScanFailure
      )
    } catch (err) {
      console.error('Error starting camera:', err)
      toast.error('Failed to start camera. Please check permissions.')
      setScanning(false)
    }
  }

  const handleScanSuccess = async (decodedText) => {
    try {
      // Parse QR code data
      const qrData = JSON.parse(decodedText)
      
      console.log('Scanned QR Data:', qrData)

      let farmerData = null

      // Check if it's a farmer profile QR (contains 'id' and 'type'='producer' or 'PRODUCER')
      if (qrData.id && (qrData.type === 'producer' || qrData.type === 'PRODUCER')) {
        // This is a farmer profile QR code - use data directly from QR without database verification
        
        farmerData = {
          farmer_id: null,
          farmer_unique_id: qrData.id,
          farmer_name: qrData.name || 'Unknown',
          farmer_phone: qrData.mobile || '',
          farm_id: '', // Can be filled manually later if needed
          farm_name: '',
          location: '',
          district: '',
          state: '',
          address: ''
        }

        console.log('Farmer Data from QR:', farmerData)

      } 
      // Check if it's a farm QR code (contains 'farm_id' and 'farmer_unique_id')
      else if (qrData.farm_id && qrData.farmer_unique_id) {
        // This is a farm QR code - use data directly from QR
        farmerData = {
          farmer_id: null,
          farmer_unique_id: qrData.farmer_unique_id,
          farmer_name: qrData.farmer_name || 'Unknown',
          farmer_phone: qrData.phone || '',
          farm_id: qrData.farm_id || '',
          farm_name: qrData.farm_name || '',
          location: qrData.location || '',
          district: qrData.location?.split(',')[0]?.trim() || '',
          state: qrData.location?.split(',')[1]?.trim() || '',
          address: qrData.location || ''
        }

        console.log('Farm Data from QR:', farmerData)
      }
      else {
        toast.error('Invalid QR code. Please scan a farmer profile or farm QR code.')
        return
      }

      if (!farmerData) {
        toast.error('Failed to load farmer details')
        return
      }

      // Stop scanning
      if (html5QrCode) {
        await html5QrCode.stop()
        setScanning(false)
      }

      toast.success('Farmer QR scanned successfully!')
      
      // Show scanned data in UI
      setScannedData(farmerData)

    } catch (err) {
      console.error('Error parsing QR code:', err)
      toast.error('Invalid QR code format. Please scan a valid farmer QR code.')
    }
  }

  const handleScanFailure = (error) => {
    // Silent - don't show error for every frame
  }

  const handleClose = async () => {
    if (html5QrCode && scanning) {
      await html5QrCode.stop()
      setScanning(false)
    }
    setScannedData(null)
    onClose()
  }

  const handleConfirm = () => {
    if (scannedData && onScanSuccess) {
      onScanSuccess(scannedData)
    }
    handleClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-lg mx-4 bg-white rounded-lg shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Scan Farmer QR Code</h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 rounded-lg hover:text-gray-600 hover:bg-gray-100"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="p-6">
            {!scannedData ? (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>
                
                {!scanning && (
                  <button
                    onClick={startScanning}
                    className="flex items-center justify-center w-full gap-2 px-6 py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                    Start Scanning
                  </button>
                )}

                <div className="text-sm text-center text-gray-600">
                  <p>Position the farmer's QR code within the frame</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Details will be displayed below after scanning
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success Banner */}
                <div className="flex items-center gap-3 p-4 border-2 border-green-500 rounded-lg bg-green-50">
                  <CheckCircleIcon className="flex-shrink-0 w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-green-800">Farmer QR Scanned Successfully!</p>
                    <p className="text-sm text-green-700">Details extracted from QR code</p>
                  </div>
                </div>

                {/* Farmer Details Display */}
                <div className="p-5 space-y-4 bg-white border-2 border-gray-200 rounded-lg">
                  <h3 className="pb-2 text-lg font-bold text-gray-900 border-b">Farmer Information</h3>
                  
                  {/* Farmer Unique ID */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">Farmer ID</label>
                      <p className="mt-1 font-mono text-lg font-bold text-gray-900">{scannedData.farmer_unique_id}</p>
                    </div>
                  </div>

                  {/* Farmer Name */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <UserIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">Farmer Name</label>
                      <p className="mt-1 text-lg font-bold text-gray-900">{scannedData.farmer_name}</p>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <PhoneIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                      <p className="mt-1 font-mono text-lg font-bold text-gray-900">{scannedData.farmer_phone}</p>
                    </div>
                  </div>

                  {/* Farm ID (if available) */}
                  {scannedData.farm_id && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <MapPinIcon className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase">Farm ID</label>
                        <p className="mt-1 font-mono text-lg font-bold text-gray-900">{scannedData.farm_id}</p>
                      </div>
                    </div>
                  )}

                  {/* Location (if available) */}
                  {scannedData.district && scannedData.state && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <MapPinIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase">Location</label>
                        <p className="mt-1 text-lg font-bold text-gray-900">{scannedData.district}, {scannedData.state}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-6 py-3 text-lg font-bold text-white transition-all bg-green-600 rounded-lg hover:bg-green-700 hover:shadow-lg"
                  >
                    ✓ Use This Farmer
                  </button>
                  <button
                    onClick={() => {
                      setScannedData(null)
                      startScanning()
                    }}
                    className="px-6 py-3 text-lg font-semibold text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Scan Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default FarmerQRScanner
