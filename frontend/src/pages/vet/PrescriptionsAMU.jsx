import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  CalculatorIcon,
  CameraIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'
import drugDatabase from '../../data/drug_database.json'
import { useFarmStore } from '../../store/farmStore'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import vetHelpers from '../../services/vetHelpers'

const PrescriptionsAMU = () => {
  const { user, profile } = useAuthStore()
  const { animals } = useFarmStore()
  const [activeTab, setActiveTab] = useState('create') // 'create', 'active', 'history'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [drugSearchTerm, setDrugSearchTerm] = useState('')
  const [animalSearch, setAnimalSearch] = useState('')
  const [currentRequest, setCurrentRequest] = useState(null)
  const [activePrescriptions, setActivePrescriptions] = useState([])
  const [prescriptionHistory, setPrescriptionHistory] = useState([])
  const [availableAnimals, setAvailableAnimals] = useState([])
  const [allLivestock, setAllLivestock] = useState([])
  const [loading, setLoading] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannerError, setScannerError] = useState(null)
  const [manualLivestockId, setManualLivestockId] = useState('')
  const scannerRef = useRef(null)
  const qrScannerInstanceRef = useRef(null)
  
  // Dosage Calculator state
  const [showDosageCalculator, setShowDosageCalculator] = useState(false)
  const [dosageCalc, setDosageCalc] = useState({
    animalWeight: '',
    requiredDosage: '',
    drugConcentration: '',
    calculatedVolume: 0
  })
  
  // Image Capture state
  const [showImageCapture, setShowImageCapture] = useState(false)
  const [capturedImages, setCapturedImages] = useState([])
  const [geoLocation, setGeoLocation] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const imageStreamRef = useRef(null)

  // Form state
  const [prescriptionForm, setFormData] = useState({
    animalId: '',
    farmName: '',
    farmerName: '',
    diagnosis: '',
    selectedDrugs: [],
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    urgency: 'normal',
    autoLogAMU: false, // New field for optional AMU logging
    geoTaggedImages: [] // Store geo-tagged images
  })

  // Load treatment request from localStorage
  useEffect(() => {
    const requestData = localStorage.getItem('currentTreatmentRequest')
    if (requestData) {
      const request = JSON.parse(requestData)
      setCurrentRequest(request)
      
      // Pre-fill form with request data
      setFormData(prev => ({
        ...prev,
        animalId: request.livestock_id,
        farmName: request.farmer_district || '',
        farmerName: request.farmer_name,
        diagnosis: request.disease || ''
      }))
      
      // Auto-open create modal
      setShowCreateModal(true)
    }
  }, [])

  // Load prescriptions from Supabase
  useEffect(() => {
    if (user?.id) {
      loadPrescriptions()
    }
  }, [user])

  // Fetch all livestock for manual selection
  useEffect(() => {
    const fetchAllLivestock = async () => {
      try {
        // Get farms assigned to this vet
        const { data: farms } = await vetHelpers.getAssignedFarms(user.id)
        
        if (!farms || farms.length === 0) {
          setAllLivestock([])
          return
        }

        const farmIds = farms.map(f => f.id)
        
        // Get livestock for these farms
        const { data: livestockData } = await vetHelpers.getLivestockForFarms(farmIds)

        if (livestockData) {
          const formattedLivestock = livestockData.map(animal => ({
            id: animal.id,
            name: animal.tag_id || 'Unknown',
            tag: animal.tag_id,
            species: animal.species,
            breed: animal.breed,
            farmName: animal.farm?.name || 'Unknown Farm',
            farmerId: animal.farm?.farmer_id
          }))
          setAllLivestock(formattedLivestock)
        }
      } catch (error) {
        console.error('Error fetching livestock:', error)
      }
    }

    if (user?.id) {
      fetchAllLivestock()
    }
  }, [user])

  // Fetch livestock for current request
  useEffect(() => {
    const fetchLivestock = async () => {
      if (currentRequest?.livestock_id) {
        try {
          const { data, error } = await supabase
            .from('livestock')
            .select('*')
            .eq('id', currentRequest.livestock_id)
            .single()

          if (error) throw error

          if (data) {
            setAvailableAnimals([{
              id: data.id,
              name: data.tag_id || 'Unknown',
              tag: data.tag_id,
              farm: currentRequest.farmer_district || 'Unknown Farm',
              species: data.species,
              breed: data.breed,
              farmerId: currentRequest.farmer_id
            }])
          }
        } catch (error) {
          console.error('Error fetching livestock:', error)
          toast.error('Failed to load animal details')
        }
      } else {
        // If no current request, use all livestock
        setAvailableAnimals(allLivestock)
      }
    }

    fetchLivestock()
  }, [currentRequest, allLivestock])

  const diagnoses = [
    'Mastitis',
    'Fever',
    'Digestive Issues',
    'Respiratory Infection',
    'Foot and Mouth Disease',
    'Pneumonia',
    'Diarrhea',
    'Skin Infection',
    'Eye Infection',
    'Lameness'
  ]

  // Filter drugs based on diagnosis
  const suggestedDrugs = useMemo(() => {
    if (!prescriptionForm.diagnosis) return []
    
    // Simple keyword matching for drug suggestions
    const diagnosisLower = prescriptionForm.diagnosis.toLowerCase()
    return drugDatabase.filter(drug => {
      if (diagnosisLower.includes('mastitis')) {
        return drug.category === 'Antibiotic' || drug.salt_name.includes('tetracycline')
      }
      if (diagnosisLower.includes('fever')) {
        return drug.category === 'Anti-inflammatory' || drug.category === 'Antibiotic'
      }
      if (diagnosisLower.includes('digestive')) {
        return drug.salt_name.includes('Metronidazole') || drug.salt_name.includes('Sulfadimidine')
      }
      return drug.category === 'Antibiotic'
    }).slice(0, 10)
  }, [prescriptionForm.diagnosis])

  // Search drugs
  const filteredDrugs = useMemo(() => {
    if (!drugSearchTerm.trim()) return suggestedDrugs
    
    const searchLower = drugSearchTerm.toLowerCase()
    return drugDatabase.filter(drug =>
      drug.salt_name.toLowerCase().includes(searchLower) ||
      drug.category.toLowerCase().includes(searchLower)
    ).slice(0, 10)
  }, [drugSearchTerm, suggestedDrugs])

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-fill farm and farmer when animal is selected
    if (name === 'animalId' && availableAnimals.length > 0) {
      const animal = availableAnimals.find(a => a.id === value)
      if (animal) {
        // Fetch farmer details
        try {
          const { data: farmerData, error } = await supabase
            .from('profiles')
            .select('name, mobile_number')
            .eq('id', animal.farmerId)
            .single()

          if (!error && farmerData) {
            setFormData(prev => ({ 
              ...prev, 
              farmName: animal.farmName,
              farmerName: farmerData.name || farmerData.mobile_number
            }))
          } else {
            setFormData(prev => ({ ...prev, farmName: animal.farmName }))
          }
        } catch (error) {
          console.error('Error fetching farmer:', error)
          setFormData(prev => ({ ...prev, farmName: animal.farmName }))
        }
      }
    }
  }

  const handleQRScan = async (scannedData) => {
    try {
      // Parse QR data (assuming format: livestock_id or JSON)
      let livestockTextId = scannedData.trim()
      
      if (livestockTextId.startsWith('{')) {
        const parsed = JSON.parse(livestockTextId)
        livestockTextId = parsed.livestock_id || parsed.id
      }

      // Stop scanner immediately after successful scan
      if (qrScannerInstanceRef.current) {
        try {
          await qrScannerInstanceRef.current.stop()
          qrScannerInstanceRef.current = null
        } catch (stopErr) {
          console.warn('Error stopping scanner:', stopErr)
          qrScannerInstanceRef.current = null
        }
      }

      // Fetch livestock details using livestock_id (text field, not UUID id)
      const { data: livestock, error } = await supabase
        .from('livestock')
        .select(`
          *,
          farm:farms!livestock_farm_id_fkey(
            id,
            name,
            farmer_id
          )
        `)
        .eq('livestock_id', livestockTextId)
        .single()

      if (error) throw error

      if (livestock) {
        const farm = livestock.farm
        
        // Fetch farmer details separately
        const { data: farmerData } = await supabase
          .from('profiles')
          .select('name, mobile_number')
          .eq('id', farm.farmer_id)
          .single()

        setFormData(prev => ({
          ...prev,
          animalId: livestock.id,
          farmName: farm?.name || 'Unknown Farm',
          farmerName: farmerData?.name || farmerData?.mobile_number || 'Unknown'
        }))

        setShowQRScanner(false)
        setManualLivestockId('')
        setScannerError(null)
        toast.success('✅ Animal loaded successfully!')
      } else {
        throw new Error('Livestock not found')
      }
    } catch (error) {
      console.error('QR scan error:', error)
      toast.error('Failed to load livestock: ' + error.message)
      setScannerError(error.message)
    }
  }

  const handleManualSubmit = () => {
    if (!manualLivestockId.trim()) {
      toast.error('Please enter a livestock ID')
      return
    }
    handleQRScan(manualLivestockId)
  }

  // Initialize QR Scanner when modal opens
  useEffect(() => {
    if (showQRScanner && !qrScannerInstanceRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(async () => {
        try {
          // Create new scanner instance
          const html5QrCode = new Html5Qrcode('qr-reader')
          qrScannerInstanceRef.current = html5QrCode

          // Detect if it's mobile/tablet or desktop
          const isMobileOrTablet = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
            navigator.userAgent.toLowerCase()
          ) || window.innerWidth < 1024

          // Responsive QR box sizing
          const boxSize = window.innerWidth < 768 ? Math.min(250, window.innerWidth - 80) : 300

          const config = {
            fps: 10,
            qrbox: { width: boxSize, height: boxSize },
            aspectRatio: window.innerWidth < 768 ? 16 / 9 : 1.0,
            showTorchButtonIfSupported: true,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: false
            }
          }

          let cameraConfig

          if (isMobileOrTablet) {
            // Mobile/Tablet → Force BACK CAMERA
            cameraConfig = { facingMode: 'environment' }
          } else {
            // Desktop/Laptop → Try to pick FRONT camera
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
              console.log('Selected desktop camera:', frontCamera?.label || 'First camera')
            } else {
              selectedCameraId = devices[0]?.id
            }

            if (selectedCameraId) {
              cameraConfig = { deviceId: { exact: selectedCameraId } }
            } else {
              cameraConfig = { facingMode: 'user' }
            }
          }

          // Start camera with chosen config
          await html5QrCode.start(
            cameraConfig,
            config,
            (decodedText) => {
              // Success callback
              handleQRScan(decodedText)
            },
            () => {
              // Error callback - ignore continuous scanning errors
            }
          )

          console.log('Camera started successfully')
          toast.success('Camera started')
        } catch (err) {
          console.error('Camera error:', err)
          
          if (err.name === 'NotAllowedError') {
            setScannerError('Camera permission denied. Please allow camera access in your browser settings.')
            toast.error('Camera permission denied')
          } else if (err.name === 'NotFoundError') {
            setScannerError('No camera found on this device.')
            toast.error('No camera found')
          } else if (err.message?.includes('NotReadableError')) {
            setScannerError('Camera is being used by another application.')
            toast.error('Camera in use')
          } else {
            setScannerError('Unable to access camera: ' + (err.message || 'Unknown error'))
            toast.error('Camera access failed')
          }
          
          qrScannerInstanceRef.current = null
        }
      }, 100)

      return () => clearTimeout(timer)
    }

    // Cleanup on unmount or when scanner closes
    return () => {
      if (qrScannerInstanceRef.current) {
        qrScannerInstanceRef.current.stop().catch(console.error)
        qrScannerInstanceRef.current = null
      }
    }
  }, [showQRScanner])

  const handleDrugSelect = (drug) => {
    setFormData(prev => ({
      ...prev,
      selectedDrugs: [drug],
      withdrawalPeriod: drug.withdrawal_period_days
    }))
    setDrugSearchTerm('')
  }

  const calculateWithdrawalDate = () => {
    if (!prescriptionForm.selectedDrugs.length) return null
    const today = new Date()
    const withdrawalDays = prescriptionForm.selectedDrugs[0].withdrawal_period_days
    const withdrawalDate = new Date(today)
    withdrawalDate.setDate(withdrawalDate.getDate() + withdrawalDays)
    return withdrawalDate.toLocaleDateString('en-IN')
  }

  // Dosage Calculator
  const handleDosageCalcChange = (e) => {
    const { name, value } = e.target
    setDosageCalc(prev => ({ ...prev, [name]: value }))
  }

  const calculateDosageVolume = () => {
    const { animalWeight, requiredDosage, drugConcentration } = dosageCalc
    
    if (!animalWeight || !requiredDosage || !drugConcentration) {
      toast.error('Please fill all calculator fields')
      return
    }

    // Formula: Volume (mL) = (Animal Weight × Required Dosage) / Drug Concentration
    const totalDrugNeeded = parseFloat(animalWeight) * parseFloat(requiredDosage)
    const volumeToAdminister = totalDrugNeeded / parseFloat(drugConcentration)

    setDosageCalc(prev => ({ ...prev, calculatedVolume: volumeToAdminister.toFixed(2) }))
    toast.success(`Calculated: ${volumeToAdminister.toFixed(2)} mL`)
  }

  const applyCalculatedDosage = () => {
    if (dosageCalc.calculatedVolume > 0) {
      setFormData(prev => ({ ...prev, dosage: `${dosageCalc.calculatedVolume} mL` }))
      setShowDosageCalculator(false)
      toast.success('Dosage applied to prescription')
    }
  }

  // Image Capture with Geolocation
  const startCamera = async () => {
    try {
      // Get geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGeoLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString()
            })
            toast.success('📍 Location captured')
          },
          (error) => {
            console.error('Geolocation error:', error)
            toast.error('Unable to get location. Photos will be saved without geotags.')
          }
        )
      }

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        imageStreamRef.current = stream
      }
    } catch (error) {
      console.error('Camera error:', error)
      toast.error('Unable to access camera')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)

    // Create image object with geolocation
    const imageObj = {
      id: Date.now(),
      data: imageData,
      timestamp: new Date().toISOString(),
      location: geoLocation ? {
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        accuracy: geoLocation.accuracy
      } : null
    }

    setCapturedImages(prev => [...prev, imageObj])
    toast.success('📸 Photo captured with location')
  }

  const stopCamera = () => {
    if (imageStreamRef.current) {
      imageStreamRef.current.getTracks().forEach(track => track.stop())
      imageStreamRef.current = null
    }
  }

  const removeImage = (imageId) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId))
    toast.success('Image removed')
  }

  const applyImagesToForm = () => {
    setFormData(prev => ({ ...prev, geoTaggedImages: capturedImages }))
    setShowImageCapture(false)
    stopCamera()
    toast.success(`${capturedImages.length} image(s) attached to prescription`)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const loadPrescriptions = async () => {
    try {
      setLoading(true)

      // Load treatments using vetHelpers
      const { data: treatments, error } = await vetHelpers.getTreatments({
        vetId: user.id
      })

      if (error) throw error

      // Separate active and completed
      const today = new Date().toISOString().split('T')[0]
      const active = (treatments || []).filter(t => t.withdrawal_end_date >= today)
      const history = (treatments || []).filter(t => t.withdrawal_end_date < today)

      setActivePrescriptions(active)
      setPrescriptionHistory(history)
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      toast.error('Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPrescription = async () => {
    if (!prescriptionForm.animalId || !prescriptionForm.diagnosis || !prescriptionForm.selectedDrugs.length) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      setLoading(true)

      const selectedDrug = prescriptionForm.selectedDrugs[0]
      const administrationDate = new Date()
      const withdrawalEndDate = new Date(administrationDate)
      withdrawalEndDate.setDate(withdrawalEndDate.getDate() + selectedDrug.withdrawal_period_days)

      // Get farmer_id from selected animal
      const selectedAnimal = availableAnimals.find(a => a.id === prescriptionForm.animalId)
      const farmerId = currentRequest?.farmer_id || selectedAnimal?.farmerId

      if (!farmerId) {
        toast.error('Unable to determine farmer for this animal')
        setLoading(false)
        return
      }

      // Only create treatment record if vet chooses to auto-log AMU
      let treatmentId = null
      if (prescriptionForm.autoLogAMU) {
        const { data: treatment, error: treatmentError } = await vetHelpers.createTreatment({
          livestock_id: prescriptionForm.animalId,
          farmer_id: farmerId,
          veterinarian_id: user.id,
          drug_name: selectedDrug.salt_name,
          salt_name: selectedDrug.salt_name,
          category: selectedDrug.category,
          dosage: prescriptionForm.dosage,
          administration_route: 'injection',
          administration_date: administrationDate.toISOString().split('T')[0],
          withdrawal_period_milk: selectedDrug.withdrawal_period_milk,
          withdrawal_period_meat: selectedDrug.withdrawal_period_meat,
          withdrawal_period_days: selectedDrug.withdrawal_period_days,
          purpose: 'therapeutic',
          mrl_limit_milk: selectedDrug.mrl_limit_milk,
          mrl_limit_meat: selectedDrug.mrl_limit_meat,
          regulatory_status: selectedDrug.regulatory_status,
          notes: prescriptionForm.instructions
        })

        if (treatmentError) throw treatmentError
        treatmentId = treatment.id
      }

      // Update treatment request if it exists
      if (currentRequest) {
        const prescriptionDetails = {
          treatment_id: treatmentId,
          drug: selectedDrug.salt_name,
          category: selectedDrug.category,
          dosage: prescriptionForm.dosage,
          frequency: prescriptionForm.frequency,
          duration: prescriptionForm.duration,
          diagnosis: prescriptionForm.diagnosis,
          instructions: prescriptionForm.instructions,
          withdrawal_end: withdrawalEndDate.toISOString().split('T')[0],
          withdrawal_period_days: selectedDrug.withdrawal_period_days,
          prescribed_by: user.email,
          prescribed_at: new Date().toISOString(),
          amu_logged_by_vet: prescriptionForm.autoLogAMU
        }

        const { error: updateError } = await supabase
          .from('treatment_requests')
          .update({
            status: 'prescription_given',
            prescription_details: JSON.stringify(prescriptionDetails),
            prescription_date: new Date().toISOString(),
            veterinarian_name: profile?.name || user.email
          })
          .eq('id', currentRequest.id)

        if (updateError) throw updateError

        // Clear from localStorage
        localStorage.removeItem('currentTreatmentRequest')
        setCurrentRequest(null)
      }

      const message = prescriptionForm.autoLogAMU 
        ? '✅ Prescription created and AMU logged!'
        : '✅ Prescription sent to farmer for AMU recording!'
      
      toast.success(message)
      
      // Reset form
      setFormData({
        animalId: '',
        farmName: '',
        farmerName: '',
        diagnosis: '',
        selectedDrugs: [],
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        urgency: 'normal',
        autoLogAMU: false
      })
      
      setShowCreateModal(false)
      loadPrescriptions()

      // Only redirect if coming from a request
      if (currentRequest) {
        setTimeout(() => {
          window.location.href = '/veterinarian/requests'
        }, 1500)
      }
    } catch (error) {
      console.error('Error creating prescription:', error)
      toast.error('Failed to create prescription: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-3 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col mb-4 space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:mb-6">
          <div className="flex-1">
            <div className="flex items-center mb-2 space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <ClipboardDocumentListIcon className="w-5 h-5 text-green-600 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">
                Prescriptions & AMU
              </h1>
            </div>
            <p className="text-xs text-gray-600 sm:text-sm">
              Create and manage animal prescriptions with auto-withdrawal tracking
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center w-full px-4 py-2.5 space-x-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 sm:w-auto sm:text-base"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New e-Prescription</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-4 bg-white rounded-lg shadow-sm sm:mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Create Prescription</span>
            <span className="sm:hidden">Create</span>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Active ({activePrescriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>History</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'create' && (
          <div className="p-4 text-center bg-white shadow-lg sm:p-8 rounded-2xl">
            {currentRequest ? (
              <div className="p-3 mb-4 text-left border border-blue-200 rounded-lg sm:p-4 sm:mb-6 bg-blue-50">
                <h4 className="mb-2 text-sm font-semibold text-blue-900 sm:text-base">Active Treatment Request</h4>
                <div className="space-y-1 text-xs text-blue-800 sm:text-sm">
                  <p><strong>Farmer:</strong> {currentRequest.farmer_name}</p>
                  <p><strong>Animal:</strong> {currentRequest.animal_species} ({currentRequest.animal_tag})</p>
                  <p><strong>Disease:</strong> {currentRequest.disease}</p>
                  <p><strong>Symptoms:</strong> {currentRequest.symptoms}</p>
                </div>
              </div>
            ) : null}
            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 text-gray-400 sm:w-16 sm:h-16 sm:mb-4" />
            <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
              Create New e-Prescription
            </h3>
            <p className="mb-4 text-sm text-gray-600 sm:text-base">
              Click the button to start creating a new prescription
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
            >
              {currentRequest ? 'Prescribe for Request' : 'Create e-Prescription'}
            </button>
          </div>
        )}

        {activeTab === 'active' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-green-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading prescriptions...</p>
              </div>
            ) : activePrescriptions.length === 0 ? (
              <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                <ClipboardDocumentListIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No Active Prescriptions</h3>
                <p className="text-gray-600">No active prescriptions with ongoing withdrawal periods.</p>
              </div>
            ) : (
              activePrescriptions.map((prescription) => {
                const daysRemaining = Math.ceil((new Date(prescription.withdrawal_end_date) - new Date()) / (1000 * 60 * 60 * 24))
                return (
                  <motion.div
                    key={prescription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white shadow-lg sm:p-6 rounded-2xl"
                  >
                    <div className="flex flex-col mb-3 space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 sm:mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 sm:text-lg">
                          {prescription.drug_name || prescription.salt_name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                          <span className="inline-block px-2 py-0.5 mr-2 text-xs text-purple-700 bg-purple-100 rounded-full">
                            {prescription.category}
                          </span>
                          <span className="text-xs">Created: {new Date(prescription.created_at).toLocaleDateString()}</span>
                        </p>
                      </div>
                      <div className="">
                        <span className="inline-block px-2.5 py-1 text-xs sm:text-sm font-medium text-orange-700 bg-orange-100 rounded-full whitespace-nowrap">
                          {daysRemaining} days left
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 sm:gap-4 sm:mb-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-blue-50">
                        <p className="text-xs text-blue-600">Drug Prescribed</p>
                        <p className="text-sm font-semibold text-gray-900 truncate sm:text-base">{prescription.drug_name || prescription.salt_name}</p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-lg bg-purple-50">
                        <p className="text-xs text-purple-600">Category</p>
                        <p className="text-sm font-semibold text-gray-900 sm:text-base">{prescription.category}</p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-lg bg-green-50">
                        <p className="text-xs text-green-600">Dosage</p>
                        <p className="text-sm font-semibold text-gray-900 sm:text-base">{prescription.dosage}</p>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-lg bg-orange-50">
                        <p className="text-xs text-orange-600">Withdrawal End</p>
                        <p className="text-sm font-semibold text-gray-900 sm:text-base">
                          {new Date(prescription.withdrawal_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t sm:pt-4">
                      <p className="text-xs text-gray-500">
                        Prescribed on: {new Date(prescription.administration_date).toLocaleDateString()}
                      </p>
                      {prescription.notes && (
                        <p className="mt-2 text-xs text-gray-700 sm:text-sm">Notes: {prescription.notes}</p>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-green-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading history...</p>
              </div>
            ) : prescriptionHistory.length === 0 ? (
              <div className="py-12 text-center">
                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No History</h3>
                <p className="text-gray-600">No completed prescriptions yet.</p>
              </div>
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:px-6">
                          Drug
                        </th>
                        <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:px-6">
                          Category
                        </th>
                        <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:px-6">
                          Dosage
                        </th>
                        <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:px-6">
                          Administered
                        </th>
                        <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:px-6">
                          Period
                        </th>
                        <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase sm:px-6">
                          Ended
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prescriptionHistory.map((prescription) => (
                        <tr key={prescription.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 text-xs text-gray-900 sm:px-6 sm:py-4 sm:text-sm">
                            <div className="font-medium">{prescription.drug_name || prescription.salt_name}</div>
                            {prescription.notes && (
                              <div className="hidden mt-1 text-xs text-gray-500 sm:block">{prescription.notes.substring(0, 50)}{prescription.notes.length > 50 ? '...' : ''}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                              {prescription.category}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-900 sm:px-6 sm:py-4 sm:text-sm whitespace-nowrap">
                            {prescription.dosage}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 sm:px-6 sm:py-4 sm:text-sm whitespace-nowrap">
                            {new Date(prescription.administration_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-900 sm:px-6 sm:py-4 sm:text-sm whitespace-nowrap">
                            {prescription.withdrawal_period_days}d
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 sm:px-6 sm:py-4 sm:text-sm whitespace-nowrap">
                            {new Date(prescription.withdrawal_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Prescription Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-4xl mx-3 bg-white shadow-2xl sm:mx-0 rounded-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 sm:text-2xl">Create e-Prescription</h2>
                    {currentRequest && (
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <span className="mr-1 font-medium text-gray-900">Request ID:</span>
                          {currentRequest.request_id}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1 font-medium text-gray-900">Farmer:</span>
                          {currentRequest.farmer_name}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
                  {/* Request Info Banner */}
                  {currentRequest && (
                    <div className="p-3 border border-blue-200 rounded-lg sm:p-4 bg-blue-50">
                      <div className="flex items-start space-x-3">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="mb-2 font-semibold text-blue-900">Treatment Request Details</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-blue-700">Animal:</span>
                              <p className="font-medium text-blue-900">
                                {currentRequest.animal_species} ({currentRequest.animal_tag})
                              </p>
                            </div>
                            <div>
                              <span className="text-blue-700">Disease:</span>
                              <p className="font-medium text-blue-900">{currentRequest.disease}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-blue-700">Symptoms:</span>
                              <p className="font-medium text-blue-900">{currentRequest.symptoms}</p>
                            </div>
                            {currentRequest.temperature && (
                              <div>
                                <span className="text-blue-700">Temperature:</span>
                                <p className="font-medium text-blue-900">{currentRequest.temperature}°F</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Animal Selection */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Select Animal/Farm *
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="animalId"
                          value={prescriptionForm.animalId}
                          onChange={handleInputChange}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          required
                          disabled={currentRequest !== null}
                        >
                          <option value="">Choose animal...</option>
                          {availableAnimals.map((animal) => (
                            <option key={animal.id} value={animal.id}>
                              {animal.tag} - {animal.species} ({animal.breed})
                            </option>
                          ))}
                        </select>
                        {!currentRequest && (
                          <button
                            type="button"
                            onClick={() => setShowQRScanner(true)}
                            className="px-4 py-3 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                            title="Scan QR Code"
                          >
                            <QrCodeIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {currentRequest && (
                        <p className="mt-1 text-xs text-gray-600">
                          ℹ️ Animal pre-selected from treatment request
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Farmer Name
                      </label>
                      <input
                        type="text"
                        value={prescriptionForm.farmerName}
                        disabled
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Farm Name */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Farm Name
                    </label>
                    <input
                      type="text"
                      value={prescriptionForm.farmName}
                      disabled
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg"
                    />
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Select Diagnosis *
                    </label>
                    <select
                      name="diagnosis"
                      value={prescriptionForm.diagnosis}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Choose diagnosis...</option>
                      {diagnoses.map((diagnosis) => (
                        <option key={diagnosis} value={diagnosis}>
                          {diagnosis}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Drug Selection */}
                  {prescriptionForm.diagnosis && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Select Drug * {prescriptionForm.diagnosis && <span className="text-blue-600">(Suggested based on diagnosis)</span>}
                      </label>
                      <div className="relative mb-3">
                        <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                        <input
                          type="text"
                          placeholder="Search drugs..."
                          value={drugSearchTerm}
                          onChange={(e) => setDrugSearchTerm(e.target.value)}
                          className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      {prescriptionForm.selectedDrugs.length === 0 && (
                        <div className="space-y-2 overflow-y-auto max-h-60">
                          {filteredDrugs.map((drug) => (
                            <div
                              key={drug.id}
                              onClick={() => handleDrugSelect(drug)}
                              className="p-2.5 sm:p-3 transition-colors border border-gray-200 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900 sm:text-base">{drug.salt_name}</p>
                                  <p className="mt-1 text-xs text-gray-600">
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full mr-2">
                                      {drug.category}
                                    </span>
                                    <span className="text-xs">Withdrawal: <span className="font-semibold text-orange-600">{drug.withdrawal_period_days}d</span></span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {prescriptionForm.selectedDrugs.length > 0 && (
                        <div className="p-3 border-2 border-green-500 rounded-lg sm:p-4 bg-green-50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate sm:text-base">{prescriptionForm.selectedDrugs[0].salt_name}</p>
                              <p className="text-xs text-gray-600 sm:text-sm">
                                Category: {prescriptionForm.selectedDrugs[0].category}
                              </p>
                              <p className="mt-2 text-xs font-semibold text-orange-600 sm:text-sm">
                                🔒 Auto-Withdrawal: {prescriptionForm.selectedDrugs[0].withdrawal_period_days} days
                              </p>
                              <p className="text-xs text-gray-600">
                                Safe date: {calculateWithdrawalDate()}
                              </p>
                            </div>
                            <button
                              onClick={() => setFormData(prev => ({ ...prev, selectedDrugs: [] }))}
                              className="flex-shrink-0 p-1.5 sm:p-2 text-red-600 transition-colors rounded-lg hover:bg-red-100"
                            >
                              <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dosage and Instructions */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Dosage *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="dosage"
                          value={prescriptionForm.dosage}
                          onChange={handleInputChange}
                          placeholder="e.g., 5ml"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowDosageCalculator(true)}
                          className="px-3 py-3 text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
                          title="Dosage Calculator"
                        >
                          <CalculatorIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Frequency *
                      </label>
                      <select
                        name="frequency"
                        value={prescriptionForm.frequency}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="once">Once daily</option>
                        <option value="twice">Twice daily</option>
                        <option value="thrice">Thrice daily</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        name="duration"
                        value={prescriptionForm.duration}
                        onChange={handleInputChange}
                        placeholder="e.g., 5"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Instructions
                    </label>
                    <textarea
                      name="instructions"
                      value={prescriptionForm.instructions}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Additional instructions for the farmer..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Urgency Level
                    </label>
                    <select
                      name="urgency"
                      value={prescriptionForm.urgency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  {/* Optional AMU Auto-Logging */}
                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prescriptionForm.autoLogAMU}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoLogAMU: e.target.checked }))}
                        className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Log AMU Record Immediately (Optional)
                        </span>
                        <p className="mt-1 text-xs text-gray-600">
                          By default, the farmer will record the AMU after receiving the prescription. 
                          Check this only if you are administering the treatment yourself.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Geo-Tagged Image Capture */}
                  <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Treatment Documentation</h4>
                        <p className="text-xs text-gray-600">Capture geo-tagged photos for verification</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowImageCapture(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
                      >
                        <CameraIcon className="w-4 h-4" />
                        Capture Photos
                      </button>
                    </div>
                    {prescriptionForm.geoTaggedImages.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {prescriptionForm.geoTaggedImages.map((img) => (
                          <div key={img.id} className="relative flex-shrink-0">
                            <img 
                              src={img.data} 
                              alt="Treatment" 
                              className="object-cover w-20 h-20 border border-gray-300 rounded-lg"
                            />
                            {img.location && (
                              <MapPinIcon className="absolute w-4 h-4 text-green-600 top-1 right-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:gap-3">
                    <button
                      onClick={handleSubmitPrescription}
                      disabled={loading}
                      className="flex items-center justify-center flex-1 px-5 py-2.5 sm:px-6 sm:py-3 space-x-2 text-sm sm:text-base font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white rounded-full sm:w-5 sm:h-5 border-t-transparent animate-spin"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Create Prescription</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      disabled={loading}
                      className="px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-medium text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Scanner Modal */}
        <AnimatePresence>
          {showQRScanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={async () => {
                setShowQRScanner(false)
                if (qrScannerInstanceRef.current) {
                  try {
                    await qrScannerInstanceRef.current.stop()
                  } catch (err) {
                    console.warn('Error stopping camera:', err)
                  }
                  qrScannerInstanceRef.current = null
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg mx-3 bg-white shadow-2xl sm:mx-0 rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Scan Animal QR Code</h3>
                    <button
                      onClick={async () => {
                        setShowQRScanner(false)
                        if (qrScannerInstanceRef.current) {
                          try {
                            await qrScannerInstanceRef.current.stop()
                          } catch (err) {
                            console.warn('Error stopping camera:', err)
                          }
                          qrScannerInstanceRef.current = null
                        }
                      }}
                      className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* QR Scanner Container */}
                  <div className="mb-4">
                    <div 
                      id="qr-reader" 
                      ref={scannerRef}
                      className="w-full overflow-hidden rounded-lg"
                    ></div>
                  </div>

                  {scannerError && (
                    <div className="p-3 mb-4 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
                      <p className="font-medium">Error:</p>
                      <p>{scannerError}</p>
                    </div>
                  )}

                  {/* Manual Entry */}
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="mb-3 text-sm font-medium text-gray-700">Or enter Livestock ID manually:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualLivestockId}
                        onChange={(e) => setManualLivestockId(e.target.value)}
                        placeholder="Enter livestock ID..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleManualSubmit()
                          }
                        }}
                      />
                      <button
                        onClick={handleManualSubmit}
                        className="px-6 py-3 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Load
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Example: PRDL00-20251130-000001</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dosage Calculator Modal */}
        <AnimatePresence>
          {showDosageCalculator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDosageCalculator(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-2xl mx-3 bg-white shadow-2xl sm:mx-0 rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <CalculatorIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Dosage Calculator</h3>
                        <p className="text-sm text-gray-600">Scientific dosage calculation</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDosageCalculator(false)}
                      className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Formula Display */}
                  <div className="p-4 mb-6 border-2 border-indigo-200 rounded-lg bg-indigo-50">
                    <p className="mb-2 text-sm font-semibold text-indigo-900">Formula:</p>
                    <div className="p-3 font-mono text-sm text-center text-indigo-800 bg-white rounded">
                      Volume (mL) = (Animal Weight × Required Dosage) / Drug Concentration
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Animal Weight (kg) *
                      </label>
                      <input
                        type="number"
                        name="animalWeight"
                        value={dosageCalc.animalWeight}
                        onChange={handleDosageCalcChange}
                        placeholder="e.g., 400"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Required Dosage (mg/kg) *
                      </label>
                      <input
                        type="number"
                        name="requiredDosage"
                        value={dosageCalc.requiredDosage}
                        onChange={handleDosageCalcChange}
                        placeholder="e.g., 10"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Check drug label or veterinary formulary</p>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Drug Concentration (mg/mL) *
                      </label>
                      <input
                        type="number"
                        name="drugConcentration"
                        value={dosageCalc.drugConcentration}
                        onChange={handleDosageCalcChange}
                        placeholder="e.g., 200"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Found on the drug bottle label</p>
                    </div>
                  </div>

                  {/* Calculate Button */}
                  <button
                    onClick={calculateDosageVolume}
                    className="w-full px-6 py-3 mt-6 text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Calculate Volume
                  </button>

                  {/* Result Display */}
                  {dosageCalc.calculatedVolume > 0 && (
                    <div className="p-4 mt-4 border-2 border-green-200 rounded-lg bg-green-50">
                      <p className="mb-2 text-sm font-medium text-green-700">Calculated Result:</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-green-900">
                            {dosageCalc.calculatedVolume} mL
                          </p>
                          <p className="text-xs text-green-700">
                            Total Drug: {(parseFloat(dosageCalc.animalWeight) * parseFloat(dosageCalc.requiredDosage)).toFixed(0)} mg
                          </p>
                        </div>
                        <button
                          onClick={applyCalculatedDosage}
                          className="px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Apply to Form
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Example */}
                  <div className="p-4 mt-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="mb-2 text-xs font-semibold text-gray-700">Example:</p>
                    <p className="text-xs text-gray-600">
                      400 kg Cow × 10 mg/kg ÷ 200 mg/mL = <strong>20 mL</strong>
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Capture Modal */}
        <AnimatePresence>
          {showImageCapture && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setShowImageCapture(false)
                stopCamera()
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-3xl mx-3 bg-white shadow-2xl sm:mx-0 rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <CameraIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Capture Treatment Photos</h3>
                        <p className="text-sm text-gray-600">Photos will be geo-tagged with location</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowImageCapture(false)
                        stopCamera()
                      }}
                      className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Location Status */}
                  {geoLocation && (
                    <div className="flex items-center gap-2 p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
                      <MapPinIcon className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Location Captured</p>
                        <p className="text-xs text-green-700">
                          {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)} 
                          <span className="ml-2">(±{geoLocation.accuracy.toFixed(0)}m)</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Camera View */}
                  <div className="mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg"
                      onLoadedMetadata={startCamera}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Capture Button */}
                  <button
                    onClick={capturePhoto}
                    className="w-full px-6 py-3 mb-4 text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    <CameraIcon className="inline-block w-5 h-5 mr-2" />
                    Capture Photo
                  </button>

                  {/* Captured Images */}
                  {capturedImages.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Captured Images ({capturedImages.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {capturedImages.map((img) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={img.data}
                              alt="Treatment"
                              className="object-cover w-full h-32 border-2 border-gray-300 rounded-lg"
                            />
                            {img.location && (
                              <div className="absolute px-2 py-1 text-xs text-white bg-green-600 rounded top-2 left-2">
                                <MapPinIcon className="inline-block w-3 h-3 mr-1" />
                                Tagged
                              </div>
                            )}
                            <button
                              onClick={() => removeImage(img.id)}
                              className="absolute p-1 text-white transition-opacity bg-red-600 rounded-full opacity-0 top-2 right-2 group-hover:opacity-100"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={applyImagesToForm}
                        className="w-full px-6 py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        Attach {capturedImages.length} Image(s) to Prescription
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default PrescriptionsAMU
