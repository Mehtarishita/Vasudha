import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCodeIcon,
  PhotoIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  InformationCircleIcon,
  UserIcon,
  BuildingStorefrontIcon,
  HomeIcon,
  HeartIcon,
  CubeIcon,
  BeakerIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Html5Qrcode } from 'html5-qrcode'
import toast from 'react-hot-toast'

const QRScanner = () => {
  const [scanMode, setScanMode] = useState('camera')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [recentScans, setRecentScans] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [scannerKey, setScannerKey] = useState(0) // Key to force re-render
  const [isMobile, setIsMobile] = useState(false)

  const html5QrCodeRef = useRef(null)
  const isMountedRef = useRef(true)
  const scannerDivId = 'qr-reader'

  const parseQRData = (qrText) => {
    try {
      const parsed = JSON.parse(qrText)
      return { raw: qrText, parsed, isJSON: true }
    } catch {
      return { raw: qrText, parsed: { text: qrText }, isJSON: false }
    }
  }

  const onScanSuccess = async (decodedText) => {
    try {
      setError(null)

      const qrData = parseQRData(decodedText)
      const result = {
        raw: qrData.raw,
        data: qrData.parsed,
        isJSON: qrData.isJSON,
        timestamp: new Date().toISOString()
      }

      setScanResult(result)

      setRecentScans(prev => [
        { ...result, id: Date.now() },
        ...prev.slice(0, 4)
      ])

      toast.success('QR Code scanned successfully!')

      // Stop scanner immediately after successful scan
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
          html5QrCodeRef.current = null
          setIsScanning(false)
        } catch (stopErr) {
          console.warn('Error stopping scanner:', stopErr)
          html5QrCodeRef.current = null
          setIsScanning(false)
        }
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError('Failed to process QR code')
      toast.error('Failed to read QR code')
    }
  }

  const startCamera = async () => {
    setError(null)
    setScanResult(null)
    setUploadedImage(null)
    setLoading(true)

    try {
      // Stop any existing scanner first
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop().catch(() => {})
        } catch (err) {
          // ignore
        }
        html5QrCodeRef.current = null
      }

      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create new scanner instance
      const html5QrCode = new Html5Qrcode(scannerDivId)
      html5QrCodeRef.current = html5QrCode

      // Detect if it's truly mobile/tablet (not desktop)
      const isMobileOrTablet =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          navigator.userAgent.toLowerCase()
        ) || window.innerWidth < 1024

      // Responsive QR box sizing
      const boxSize = isMobile ? Math.min(250, window.innerWidth - 80) : 300

      const config = {
        fps: 10,
        qrbox: { width: boxSize, height: boxSize },
        aspectRatio: isMobile ? 16 / 9 : 1.0,
        showTorchButtonIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      }

      let cameraConfig

      if (isMobileOrTablet) {
        // ✅ MOBILE/TABLET → FORCE BACK CAMERA
        cameraConfig = { facingMode: 'environment' }
      } else {
        // 💻 DESKTOP/LAPTOP → try to pick a front camera by id
        const devices = await Html5Qrcode.getCameras()
        console.log('Available cameras:', devices)

        let selectedCameraId = null

        if (devices.length > 1) {
          const frontCamera = devices.find(device =>
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('user') ||
            device.label.toLowerCase().includes('facetime')
          )
          selectedCameraId = frontCamera ? frontCamera.id : devices[0].id
          console.log(
            'Selected desktop camera:',
            frontCamera?.label || 'First camera in list'
          )
        } else {
          selectedCameraId = devices[0]?.id
        }

        if (selectedCameraId) {
          // use deviceId for desktop
          cameraConfig = { deviceId: { exact: selectedCameraId } }
        } else {
          // fallback: just ask for "user" (front)
          cameraConfig = { facingMode: 'user' }
        }
      }

      // Start with the chosen config
      await html5QrCode.start(
        cameraConfig,
        config,
        onScanSuccess,
        () => {} // onScanFailure - ignore
      )

      if (isMountedRef.current) {
        setIsScanning(true)
        setLoading(false)
        toast.success('Camera started successfully')
      }
    } catch (err) {
      console.error('Camera error:', err)
      setLoading(false)

      if (err.name === 'NotAllowedError') {
        setError(
          'Camera permission denied. Please allow camera access in your browser settings.'
        )
        toast.error('Camera permission denied')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
        toast.error('No camera found')
      } else if (err.message?.includes('NotReadableError')) {
        setError(
          'Camera is being used by another application. Please close other apps using the camera.'
        )
        toast.error('Camera in use')
      } else {
        setError('Unable to access camera: ' + (err.message || 'Unknown error'))
        toast.error('Camera access failed')
      }
      html5QrCodeRef.current = null
    }
  }

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
        setIsScanning(false)
        toast.success('Camera stopped')
      }
    } catch (err) {
      console.error('Error stopping camera:', err)
      html5QrCodeRef.current = null
      setIsScanning(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setLoading(true)
    setScanResult(null)

    const imageUrl = URL.createObjectURL(file)
    setUploadedImage(imageUrl)

    try {
      // Create a temporary div for file scanning
      const tempDivId = 'qr-temp-' + Math.random().toString(36).substring(7)
      const tempDiv = document.createElement('div')
      tempDiv.id = tempDivId
      tempDiv.style.display = 'none'
      document.body.appendChild(tempDiv)

      const html5QrCode = new Html5Qrcode(tempDivId)

      try {
        const decodedText = await html5QrCode.scanFile(file, true)
        await onScanSuccess(decodedText)
        toast.success('QR code found in image!')
        // Clean up uploaded image after successful scan
        setTimeout(() => {
          setUploadedImage(null)
        }, 500)
      } finally {
        // Always clean up, even if scan fails
        try {
          // Just remove the temp div, don't call clear()
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv)
          }
        } catch (cleanupErr) {
          console.warn('Cleanup error:', cleanupErr)
        }
      }
    } catch (err) {
      console.error('Upload scan error:', err)
      setError('No valid QR code found in the uploaded image. Please try another image.')
      toast.error('No QR code detected')
      URL.revokeObjectURL(imageUrl)
      setUploadedImage(null)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setError(null)
    setUploadedImage(null)
    setScannerKey(prev => prev + 1) // Force re-render of scanner div
  }

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      // Clean up on unmount
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => { })
        html5QrCodeRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (scanMode === 'upload') {
      // Stop and cleanup scanner when switching to upload mode
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => { })
        html5QrCodeRef.current = null
      }
      setIsScanning(false)
    }
  }, [scanMode])

  const getTypeIcon = (data) => {
    if (!data) return QrCodeIcon

    const dataStr = JSON.stringify(data).toLowerCase()

    if (dataStr.includes('farm') && !dataStr.includes('farmer')) return HomeIcon
    if (dataStr.includes('livestock') || dataStr.includes('animal') || dataStr.includes('cattle')) return HeartIcon
    if (dataStr.includes('drug') || dataStr.includes('medicine')) return CubeIcon
    if (dataStr.includes('sample')) return BeakerIcon
    if (dataStr.includes('farmer')) return UserIcon
    if (dataStr.includes('retailer') || dataStr.includes('shop')) return BuildingStorefrontIcon
    if (dataStr.includes('veterinarian') || dataStr.includes('doctor')) return DocumentTextIcon

    return QrCodeIcon
  }

  const getTypeColor = (data) => {
    if (!data) return 'bg-gray-500'

    const dataStr = JSON.stringify(data).toLowerCase()

    if (dataStr.includes('farm') && !dataStr.includes('farmer')) return 'bg-green-500'
    if (dataStr.includes('livestock') || dataStr.includes('animal') || dataStr.includes('cattle')) return 'bg-pink-500'
    if (dataStr.includes('drug') || dataStr.includes('medicine')) return 'bg-blue-500'
    if (dataStr.includes('sample')) return 'bg-purple-500'
    if (dataStr.includes('farmer')) return 'bg-yellow-500'
    if (dataStr.includes('retailer') || dataStr.includes('shop')) return 'bg-orange-500'
    if (dataStr.includes('veterinarian') || dataStr.includes('doctor')) return 'bg-indigo-500'

    return 'bg-gray-500'
  }

  const renderValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="p-2 overflow-x-auto text-xs bg-gray-100 rounded">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }
    return <span className="text-sm font-semibold text-gray-900 break-words">{String(value)}</span>
  }

  return (
    <div className="p-3 space-y-4 sm:p-4 md:p-6 sm:space-y-6">
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        #qr-reader video {
          border-radius: 0 !important;
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        /* Mirror front camera preview for laptops/desktop only */
        @media (min-width: 1024px) {
          #qr-reader video {
            transform: scaleX(-1) !important;
          }
        }
        #qr-reader {
          border: none !important;
          width: 100% !important;
          position: relative !important;
        }
        #qr-reader > div {
          width: 100% !important;
        }
        /* Hide the default white scanning box */
        #qr-reader__scan_region {
          border: none !important;
        }
        #qr-reader__dashboard_section_csr {
          display: none !important;
        }
        #qr-reader__dashboard_section_csr > div:first-child {
          display: none !important;
        }
        #qr-shaded-region {
          border: none !important;
        }
        /* Hide all default overlays from html5-qrcode */
        #qr-reader div[style*="position: absolute"] {
          display: none !important;
        }
        /* Center the video properly */
        #qr-reader__camera_permission_button {
          display: none !important;
        }
      `}</style>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">QR Code Scanner</h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">Scan QR codes to view information</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
            <div className="flex p-1 mb-4 bg-gray-100 rounded-lg sm:mb-6">
              <button
                onClick={() => { setScanMode('camera'); resetScanner(); }}
                className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${scanMode === 'camera' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <CameraIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Live Camera</span>
                <span className="sm:hidden">Camera</span>
              </button>
              <button
                onClick={() => { setScanMode('upload'); stopCamera(); }}
                className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${scanMode === 'upload' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <PhotoIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Image</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </div>

            <div className="relative">
              {/* Conditionally render scanner div only in camera mode */}
              {scanMode === 'camera' ? (
                  <div className="space-y-4">
                  {/* Scanner container with border frame */}
                  <div className="relative overflow-hidden bg-black shadow-2xl rounded-xl">
                    <div
                      id={scannerDivId}
                      key={scannerKey}
                      className="relative w-full bg-black"
                      style={{ 
                        height: isMobile ? '400px' : '500px',
                        minHeight: isMobile ? '400px' : '500px'
                      }}
                    />

                    {/* Scanning frame overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* Scanning box - responsive sizing */}
                          <div className="relative" style={{
                            width: isMobile ? Math.min(250, window.innerWidth - 80) : 300,
                            height: isMobile ? Math.min(250, window.innerWidth - 80) : 300
                          }}>
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 sm:w-10 sm:h-10 md:w-12 md:h-12"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 sm:w-10 sm:h-10 md:w-12 md:h-12"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 sm:w-10 sm:h-10 md:w-12 md:h-12"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 sm:w-10 sm:h-10 md:w-12 md:h-12"></div>

                            {/* Scanning line animation */}
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan"></div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute left-0 right-0 text-center top-2 sm:top-4">
                          <div className="inline-block px-3 py-2 text-sm font-bold text-white bg-green-600 rounded-full shadow-xl sm:px-6 sm:py-3 sm:text-base backdrop-blur-sm bg-opacity-90">
                            <span className="inline-block w-2 h-2 mr-2 bg-white rounded-full animate-pulse"></span>
                            Scanning... {/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()) || window.innerWidth < 1024 ? '(Back Camera)' : '(Front Camera)'}
                          </div>
                        </div>
                      </div>
                    )}                    {!isScanning && !loading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-gradient-to-br from-gray-900 to-gray-800">
                        <div className="px-4 text-center">
                          <div className="inline-block p-4 mb-4 bg-green-500 rounded-full shadow-2xl sm:p-6 sm:mb-6">
                            <CameraIcon className="w-12 h-12 text-white sm:w-16 sm:h-16" />
                          </div>
                          <p className="mb-2 text-lg font-bold text-white sm:text-2xl">Camera Ready</p>
                          <p className="text-sm text-gray-300 sm:text-base">Click "Start Camera" below to begin scanning</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Camera controls - moved outside scanner container */}
                  <div>
                    {!isScanning ? (
                      <button
                        onClick={startCamera}
                        disabled={loading}
                        className="flex items-center justify-center w-full gap-2 px-4 py-3 text-base font-semibold text-white transition-all transform bg-green-600 shadow-lg sm:px-6 sm:py-4 sm:text-lg rounded-xl hover:bg-green-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                            <span>Starting Camera...</span>
                          </>
                        ) : (
                          <>
                            <CameraIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span>Start Camera</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="flex items-center justify-center w-full gap-2 px-4 py-3 text-base font-semibold text-white transition-all transform bg-red-600 shadow-lg sm:px-6 sm:py-4 sm:text-lg rounded-xl hover:bg-red-700 hover:scale-105"
                      >
                        <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span>Stop Camera</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {scanMode === 'upload' && (
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer min-h-[400px] flex items-center justify-center group"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {uploadedImage ? (
                      <div className="space-y-4">
                        <img src={uploadedImage} alt="Uploaded" className="mx-auto rounded-lg shadow-lg max-h-96" />
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-600">
                          <div className="w-4 h-4 border-2 border-green-600 rounded-full border-t-transparent animate-spin"></div>
                          <span>Scanning image...</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="inline-block p-6 mb-4 transition-transform bg-gray-100 rounded-full group-hover:scale-110 group-hover:bg-green-100">
                          <PhotoIcon className="w-20 h-20 text-gray-400 group-hover:text-green-600" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-gray-900">Upload QR Code Image</h3>
                        <p className="mb-4 text-gray-600">Click or drag and drop an image file</p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Supported formats: JPG, PNG, WebP</p>
                          <p className="text-xs text-gray-400">Maximum file size: 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} disabled={loading} className="hidden" />

                  <button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={loading}
                    className="flex items-center justify-center w-full gap-2 px-4 py-3 text-base font-semibold text-white transition-all transform bg-green-600 shadow-lg sm:px-6 sm:py-4 sm:text-lg rounded-xl hover:bg-green-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span>Choose Image File</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center p-4 mt-4 space-x-3 border border-red-200 rounded-lg bg-red-50">
                  <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 text-red-500" />
                  <p className="flex-1 text-red-700">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {scanResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-white border-2 border-green-200 rounded-lg shadow-sm sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className={`p-2 sm:p-3 ${getTypeColor(scanResult.data)} rounded-xl`}>
                      {React.createElement(getTypeIcon(scanResult.data), { className: 'h-5 w-5 sm:h-6 sm:w-6 text-white' })}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 sm:text-xl">QR Code Information</h3>
                      <p className="text-xs text-gray-500 sm:text-sm">Scanned successfully</p>
                    </div>
                  </div>
                  <button onClick={resetScanner} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs font-semibold tracking-wide text-gray-700 uppercase sm:text-sm">Extracted Information</h4>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {Object.entries(scanResult.data).map(([key, value]) => (
                      <div key={key} className="p-3 border border-gray-200 rounded-lg sm:p-4 bg-gray-50">
                        <span className="block mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {renderValue(value)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200 sm:mt-6">
                  <button onClick={resetScanner}
                    className="flex items-center justify-center w-full px-4 py-3 space-x-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">
                    <QrCodeIcon className="w-5 h-5" />
                    <span>Scan Another QR Code</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
            <div className="flex items-center mb-4 space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Scanning Tips</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Hold steady with good lighting</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Position QR within frame</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Scan at arm's length</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Upload image if camera fails</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6">
            <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Recent Scans</h3>
            {recentScans.length === 0 ? (
              <div className="py-8 text-sm text-center text-gray-500">
                <QrCodeIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No scans yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan) => {
                  const Icon = getTypeIcon(scan.data)
                  return (
                    <div key={scan.id} className="flex items-center p-3 space-x-3 transition-colors border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      onClick={() => setScanResult(scan)}>
                      <div className={`p-2 ${getTypeColor(scan.data)} rounded-lg flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {scan.isJSON ? 'JSON Data' : 'Text Data'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{new Date(scan.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRScanner
