import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import {
  CameraIcon,
  PhotoIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import Tesseract from 'tesseract.js'
import drugDatabase from '../../data/drug_database.json'
import { useAuthStore } from '../../store/authStore'
import { getLivestock } from '../../services/livestockHelpers'
import { 
  createTreatment, 
  getTreatments, 
  getTreatmentStats,
  getActiveTreatments,
  getDaysRemaining,
  getWithdrawalStatus,
  getStatusColor
} from '../../services/treatmentHelpers'

const TreatmentRecording = () => {
  const { user } = useAuthStore()
  
  // Data states
  const [livestock, setLivestock] = useState([])
  const [treatments, setTreatments] = useState([])
  const [activeTreatments, setActiveTreatments] = useState([])
  const [stats, setStats] = useState({
    totalTreatments: 0,
    activeWithdrawals: 0,
    antibioticUse: 0,
    activeAMU: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Image / camera states
  const [isScanning, setIsScanning] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const [detectedDrug, setDetectedDrug] = useState(null)
  const [matchedDrugs, setMatchedDrugs] = useState([])
  const [error, setError] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    livestock_id: '',
    drug_id: null,
    drug_name: '',
    salt_name: '',
    category: '',
    concentration: '', // Drug concentration from label
    amu_volume: '', // Calculated AMU volume in mcg
    dosage: '', // Bottle quantity (manual entry)
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
  
  // Refs
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [livestockData, treatmentsData, activeTreatmentsData, statsData] = await Promise.all([
        getLivestock(user.id),
        getTreatments(user.id),
        getActiveTreatments(user.id),
        getTreatmentStats(user.id)
      ])
      
      setLivestock(livestockData || [])
      setTreatments(treatmentsData || [])
      setActiveTreatments(activeTreatmentsData || [])
      setStats(statsData || { totalTreatments: 0, activeWithdrawals: 0, antibioticUse: 0, activeAMU: 0 })
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Fuzzy matching for drug detection
  const fuzzyMatch = (text, target) => {
    const textLower = text.toLowerCase()
    const targetLower = target.toLowerCase()
    
    if (textLower.includes(targetLower)) return 100
    
    const distance = levenshteinDistance(textLower, targetLower)
    const maxLength = Math.max(textLower.length, targetLower.length)
    const similarity = ((maxLength - distance) / maxLength) * 100
    
    return similarity
  }

  const levenshteinDistance = (str1, str2) => {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  const extractComposition = (text) => {
    const cleanText = text
      .replace(/[^a-zA-Z0-9\s\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim()
    
    const keywords = [
      'composition',
      'contains',
      'active ingredient',
      'each tablet contains',
      'each ml contains',
      'each gram contains',
      'each sachet contains',
      'formula',
      'content',
      'ingredient'
    ]
    
    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    let compositionText = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const keyword of keywords) {
        if (line.includes(keyword)) {
          compositionText = lines.slice(i, Math.min(i + 5, lines.length)).join(' ')
          break
        }
      }
      if (compositionText) break
    }
    
    return compositionText || cleanText
  }

  // Extract drug name, concentration, and AMU volume from OCR text
  const extractDrugDetails = (text) => {
    const details = {
      drugName: '',
      concentration: '',
      amu_volume: '',
      confidence: 0
    }

    // Extract drug name (usually first line or capitalized text)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // Drug name is typically in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i]
      // Look for capitalized words or brand names
      if (line.match(/^[A-Z][A-Z\s]+$/) && line.length > 3 && line.length < 30) {
        details.drugName = line.trim()
        break
      }
    }

    // Extract concentration (patterns like "1%", "10mg", "100mg/ml", "1% w/v")
    const concentrationPatterns = [
      /(\d+\.?\d*)\s*%\s*(w\/v|w\/w)?/i,
      /(\d+\.?\d*)\s*(mg|g|mcg|ug|iu)\/?(ml|g|kg)?/i,
      /(\d+\.?\d*)\s*(mg|g|mcg)?\s*per\s*(ml|g)/i
    ]

    for (const pattern of concentrationPatterns) {
      const match = text.match(pattern)
      if (match) {
        details.concentration = match[0].trim()
        break
      }
    }

    // Extract bottle volume (patterns like "10ml", "50 ml", "100mL")
    const volumePatterns = [
      /(\d+\.?\d*)\s*(ml|mL|ML|cc|l|L)/,
      /volume[:\s]*(\d+\.?\d*)\s*(ml|mL|cc)/i,
      /net\s*quantity[:\s]*(\d+\.?\d*)\s*(ml|mL)/i
    ]

    let bottleVolume = 0
    for (const pattern of volumePatterns) {
      const match = text.match(pattern)
      if (match) {
        const volMatch = match[0].match(/(\d+\.?\d*)/)
        if (volMatch) {
          bottleVolume = parseFloat(volMatch[1])
        }
        break
      }
    }

    // Calculate AMU volume: concentration × bottle volume (in milligrams)
    if (details.concentration && bottleVolume > 0) {
      // Extract numeric value from concentration
      const concMatch = details.concentration.match(/(\d+\.?\d*)/)
      const concValue = concMatch ? parseFloat(concMatch[1]) : 0

      if (concValue > 0) {
        // Calculate AMU volume (concentration × volume in mg)
        const amuVol = concValue * bottleVolume
        details.amu_volume = `${amuVol.toFixed(2)} mg`
      }
    }

    // Calculate confidence based on what was extracted
    let confidence = 0
    if (details.drugName) confidence += 40
    if (details.concentration) confidence += 40
    if (details.amu_volume) confidence += 20
    details.confidence = confidence

    return details
  }

  const matchWithDatabase = (text) => {
    const compositionText = extractComposition(text)
    const fullText = text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ')
    const matches = []
    
    drugDatabase.forEach(drug => {
      const saltName = drug.salt_name.toLowerCase()
      const words = saltName.split(' ')
      
      let maxScore = 0
      
      if (fullText.includes(saltName)) {
        maxScore = Math.max(maxScore, 95)
      }
      
      words.forEach(word => {
        if (word.length > 3 && fullText.includes(word)) {
          maxScore = Math.max(maxScore, 85)
        }
      })
      
      const fuzzyScore = fuzzyMatch(compositionText, saltName)
      maxScore = Math.max(maxScore, fuzzyScore)
      
      const fullFuzzyScore = fuzzyMatch(fullText, saltName)
      maxScore = Math.max(maxScore, fullFuzzyScore)
      
      const firstWord = words[0]
      if (firstWord && firstWord.length > 4 && fullText.includes(firstWord)) {
        maxScore = Math.max(maxScore, 75)
      }
      
      if (maxScore > 50) {
        matches.push({ ...drug, matchScore: maxScore })
      }
    })
    
    matches.sort((a, b) => b.matchScore - a.matchScore)
    return matches
  }

  // OCR
  const processImageWithOCR = async (imageSource) => {
    setError(null)
    setOcrProgress(0)
    setIsScanning(true)
    
    try {
      const result = await Tesseract.recognize(
        imageSource,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100))
            }
          }
        }
      )
      
      const text = result.data.text
      setExtractedText(text)
      
      // Extract drug details (name, concentration, AMU volume)
      const drugDetails = extractDrugDetails(text)
      console.log('Extracted Drug Details:', drugDetails)
      
      // Match with database
      const matches = matchWithDatabase(text)
      setMatchedDrugs(matches)
      
      if (matches.length > 0) {
        const topMatch = matches[0]
        setDetectedDrug(topMatch)
        
        setFormData(prev => ({
          ...prev,
          drug_id: topMatch.id,
          drug_name: drugDetails.drugName || topMatch.salt_name,
          salt_name: topMatch.salt_name,
          category: topMatch.category,
          concentration: drugDetails.concentration || '',
          amu_volume: drugDetails.amu_volume || '',
          withdrawal_period_milk: topMatch.withdrawal_period_milk,
          withdrawal_period_meat: topMatch.withdrawal_period_meat,
          withdrawal_period_days: topMatch.withdrawal_period_days,
          mrl_limit_milk: topMatch.mrl_limit_milk,
          mrl_limit_meat: topMatch.mrl_limit_meat,
          regulatory_status: topMatch.regulatory_status
        }))
        
        setShowWarning(true)
        
        // Show success with extracted details
        const detailsMsg = []
        if (drugDetails.drugName) detailsMsg.push(`Name: ${drugDetails.drugName}`)
        if (drugDetails.concentration) detailsMsg.push(`Concentration: ${drugDetails.concentration}`)
        if (drugDetails.amu_volume) detailsMsg.push(`AMU Volume: ${drugDetails.amu_volume}`)
        
        toast.success(
          `Drug detected!\n${detailsMsg.join('\n')}`,
          { duration: 5000 }
        )
      } else {
        // Even if no match, show extracted details
        const drugDetails = extractDrugDetails(text)
        if (drugDetails.drugName || drugDetails.concentration) {
          setFormData(prev => ({
            ...prev,
            drug_name: drugDetails.drugName || '',
            concentration: drugDetails.concentration || '',
            amu_volume: drugDetails.amu_volume || ''
          }))
          
          toast.warning(
            `Extracted details:\n${drugDetails.drugName ? `Name: ${drugDetails.drugName}\n` : ''}${drugDetails.concentration ? `Concentration: ${drugDetails.concentration}\n` : ''}${drugDetails.amu_volume ? `AMU Volume: ${drugDetails.amu_volume}` : ''}`,
            { duration: 5000 }
          )
        } else {
          setError('No matching drug found in database. Please enter manually.')
          toast.error('No drug match found')
        }
      }
      
      setIsScanning(false)
    } catch (err) {
      console.error('OCR Error:', err)
      setError('Failed to read text from image. Please ensure the image is clear and try again.')
      toast.error('Image processing failed')
      setIsScanning(false)
    }
  }

  // Camera handlers
  const startCamera = async () => {
    setError(null)

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      setError('Camera not supported in this browser.')
      toast.error('Camera not supported in this browser')
      return
    }

    // 1) Show the preview box so <video> actually exists
    setIsCameraOpen(true)

    // 2) Wait a tick for React to render video element
    await new Promise(resolve => setTimeout(resolve, 80))

    try {
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase()
      )

      // Safety: stop any old stream
      if (videoRef.current?.srcObject) {
        const oldTracks = videoRef.current.srcObject.getTracks()
        oldTracks.forEach(t => t.stop())
        videoRef.current.srcObject = null
      }

      // First, simple permission request (some browsers need this to expose labels)
      const tmpStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      tmpStream.getTracks().forEach(t => t.stop())

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')

      if (!videoDevices.length) {
        setError('No camera found on this device')
        toast.error('No camera found')
        setIsCameraOpen(false)
        return
      }

      // Choose preferred camera
      let preferredDeviceId = null

      if (isMobile) {
        const backCam =
          videoDevices.find(d => /back|rear|environment/i.test(d.label)) ||
          videoDevices[videoDevices.length - 1]
        preferredDeviceId = backCam.deviceId
      } else {
        const frontCam =
          videoDevices.find(d => /front|user|face|webcam/i.test(d.label)) ||
          videoDevices[0]
        preferredDeviceId = frontCam.deviceId
      }

      // Now open the real stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: isMobile ? 'environment' : 'user'
        },
        audio: false
      })

      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = stream
        video.setAttribute('playsinline', 'true') // iOS
        video.muted = true

        const playPromise = video.play()
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(err => {
            console.error('Video play error:', err)
            toast.error('Failed to start camera preview')
          })
        }
      } else {
        // If somehow video doesn't exist, stop stream
        stream.getTracks().forEach(t => t.stop())
        setIsCameraOpen(false)
        setError('Unable to show camera preview.')
        toast.error('Unable to show camera preview')
        return
      }

      toast.success('Camera opened successfully')
    } catch (err) {
      console.error('Camera error:', err)

      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(t => t.stop())
        videoRef.current.srcObject = null
      }
      setIsCameraOpen(false)

      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
        toast.error('Camera permission denied')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device')
        toast.error('No camera found')
      } else {
        setError('Unable to access camera. Please check permissions.')
        toast.error('Failed to access camera: ' + err.message)
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOpen(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = canvas.toDataURL('image/png')
    setSelectedImage(imageData)
    stopCamera()
    processImageWithOCR(imageData)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // File upload handler
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target.result)
      processImageWithOCR(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle drug selection from dropdown
  const handleDrugSelect = (drugId) => {
    const drug = drugDatabase.find(d => d.id === parseInt(drugId))
    if (drug) {
      setFormData(prev => ({
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
      setDetectedDrug(drug)
    }
  }

  // Submit treatment record
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.livestock_id) {
      toast.error('Please select a livestock')
      return
    }
    if (!formData.drug_name) {
      toast.error('Please select a drug')
      return
    }
    if (!formData.dosage) {
      toast.error('Please enter dosage')
      return
    }

    if (formData.regulatory_status === 'BANNED') {
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
      
      const treatmentData = {
        ...formData,
        drug_image_url: selectedImage || null
      }

      await createTreatment(treatmentData, user.id)
      
      toast.success('Treatment recorded successfully!')
      
      resetForm()
      await loadData()
      
    } catch (error) {
      console.error('Error saving treatment:', error)
      toast.error('Failed to save treatment record')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
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
    setSelectedImage(null)
    setExtractedText('')
    setDetectedDrug(null)
    setMatchedDrugs([])
    setShowWarning(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading treatment records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 sm:p-6">
      <Toaster position="top-right" />
      
      {/* Header (keep top bar outside this file as you already have) */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Treatment Recording & AMU Tracking
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Capture drug labels, record treatments, and track withdrawal periods
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 sm:text-sm">Total Treatments</p>
              <p className="text-xl font-bold text-gray-900 sm:text-2xl">{stats.totalTreatments}</p>
            </div>
            <BeakerIcon className="w-8 h-8 text-blue-500 sm:w-10 sm:h-10" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 sm:text-sm">Active Withdrawals</p>
              <p className="text-xl font-bold text-yellow-600 sm:text-2xl">{stats.activeWithdrawals}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-500 sm:w-10 sm:h-10" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 sm:text-sm">Antibiotic Use</p>
              <p className="text-xl font-bold text-purple-600 sm:text-2xl">{stats.antibioticUse}</p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-purple-500 sm:w-10 sm:h-10" />
          </div>
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 sm:text-sm">Active AMU</p>
              <p className="text-xl font-bold text-green-600 sm:text-2xl">{stats.activeAMU}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500 sm:w-10 sm:h-10" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Image Capture */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
              Capture Drug Label
            </h2>
            
            {/* If we already have a captured/uploaded image */}
            {selectedImage ? (
              <div className="space-y-4">
                <img
                  src={selectedImage}
                  alt="Captured"
                  className="object-contain w-full rounded-lg max-h-72 bg-gray-50"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null)
                    setExtractedText('')
                    setDetectedDrug(null)
                    setMatchedDrugs([])
                    setShowWarning(false)
                  }}
                  className="w-full py-2 text-sm font-medium text-red-600 transition-colors border border-red-600 rounded-lg hover:bg-red-50"
                >
                  Retake / Upload Another Image
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full p-4 space-y-2 transition-colors border-2 border-gray-300 border-dashed rounded-lg sm:p-6 hover:border-blue-500 hover:bg-blue-50"
                >
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    Upload Image
                  </span>
                  <span className="text-xs text-gray-500">
                    JPG, PNG – clear photo of packet label
                  </span>
                </button>
                
                {/* Capture button */}
                <button
                  onClick={startCamera}
                  className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <CameraIcon className="w-5 h-5" />
                  <span>Capture with Camera</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Camera Box */}
                <AnimatePresence>
                  {isCameraOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-3 mt-3 space-y-3 border border-gray-200 rounded-lg bg-gray-50 sm:p-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800">
                          Live Camera Preview
                        </p>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="inline-flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:bg-gray-100"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative w-full overflow-hidden bg-black rounded-lg h-[420px] sm:h-[460px] md:h-[520px]">
                        <video
                          ref={videoRef}
                          className="object-contain w-full h-full"
                          autoPlay
                          playsInline
                          muted
                        />
                      </div>
                      <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={captureImage}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Capture & Scan
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* OCR Progress */}
            {isScanning && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600 sm:text-sm">Processing image...</span>
                  <span className="text-xs font-semibold text-blue-600 sm:text-sm">{ocrProgress}%</span>
                </div>
                <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                  <div
                    className="h-full transition-all duration-300 bg-blue-600"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="p-3 mt-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  <p className="text-xs text-red-800 sm:text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {/* Matched Drugs */}
            {matchedDrugs.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-700 sm:text-sm">Detected Drugs:</h3>
                {matchedDrugs.slice(0, 3).map((drug) => (
                  <button
                    type="button"
                    key={drug.id}
                    className={`w-full p-3 text-left border rounded-lg cursor-pointer transition-colors ${
                      detectedDrug?.id === drug.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleDrugSelect(drug.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {drug.salt_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(drug.matchScore)}% match
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{drug.category}</p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Middle + right - Treatment Form + Active withdrawals */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
              Record Treatment
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Livestock Selection */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Select Livestock *
                </label>
                <select
                  required
                  value={formData.livestock_id}
                  onChange={(e) => setFormData({ ...formData, livestock_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose livestock</option>
                  {livestock.map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.tag_id} - {animal.species} ({animal.breed})
                    </option>
                  ))}
                </select>
              </div>

              {/* Drug Selection */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Select Drug *
                </label>
                <select
                  required
                  value={formData.drug_id || ''}
                  onChange={(e) => handleDrugSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose drug</option>
                  {drugDatabase.map(drug => (
                    <option key={drug.id} value={drug.id}>
                      {drug.salt_name} ({drug.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Detected Drug Info */}
              {detectedDrug && (
                <div className={`p-4 border rounded-lg ${
                  detectedDrug.regulatory_status === 'BANNED' 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-green-300 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                      {detectedDrug.salt_name}
                    </h3>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                      detectedDrug.regulatory_status === 'BANNED' 
                        ? 'bg-red-200 text-red-900' 
                        : detectedDrug.regulatory_status === 'Restricted'
                        ? 'bg-yellow-200 text-yellow-900'
                        : 'bg-green-200 text-green-900'
                    }`}>
                      {detectedDrug.regulatory_status}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-gray-700 sm:text-sm">
                    {detectedDrug.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
                    <div>
                      <span className="text-gray-600">Milk Withdrawal:</span>
                      <span className="ml-1 font-semibold">
                        {detectedDrug.withdrawal_period_milk} days
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Meat Withdrawal:</span>
                      <span className="ml-1 font-semibold">
                        {detectedDrug.withdrawal_period_meat} days
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">MRL Milk:</span>
                      <span className="ml-1 font-semibold">
                        {detectedDrug.mrl_limit_milk}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">MRL Meat:</span>
                      <span className="ml-1 font-semibold">
                        {detectedDrug.mrl_limit_meat}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Concentration and AMU Volume Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Concentration */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Concentration *
                    <span className="ml-1 text-xs text-gray-500">(Auto-detected from image)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.concentration}
                    onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                    placeholder="e.g., 1% w/v, 10mg/ml"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* AMU Volume */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    AMU Volume (mg)
                    <span className="ml-1 text-xs text-gray-500">(Auto-calculated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.amu_volume}
                    onChange={(e) => setFormData({ ...formData, amu_volume: e.target.value })}
                    placeholder="e.g., 100 mg, 500 mg"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Dosage (Bottle Quantity) */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Dosage (Bottle Quantity) *
                    <span className="ml-1 text-xs text-gray-500">(Enter manually)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 5ml, 2 tablets, 1 bottle"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Administration Route */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Administration Route
                  </label>
                  <select
                    value={formData.administration_route}
                    onChange={(e) => setFormData({ ...formData, administration_route: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="oral">Oral</option>
                    <option value="injection">Injection</option>
                    <option value="intramuscular">Intramuscular</option>
                    <option value="intravenous">Intravenous</option>
                    <option value="topical">Topical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Administration Date */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Administration Date
                  </label>
                  <input
                    type="date"
                    value={formData.administration_date}
                    onChange={(e) => setFormData({ ...formData, administration_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Purpose
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="therapeutic">Therapeutic</option>
                    <option value="prophylactic">Prophylactic</option>
                    <option value="metaphylactic">Metaphylactic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Batch Number */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Veterinarian Name */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Veterinarian Name
                  </label>
                  <input
                    type="text"
                    value={formData.veterinarian_name}
                    onChange={(e) => setFormData({ ...formData, veterinarian_name: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details (symptoms, vet instructions, etc.)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg sm:text-base hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Recording...' : 'Record Treatment'}
              </button>
            </form>
          </motion.div>

          {/* Active Treatments */}
          {activeTreatments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 mt-6 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6"
            >
              <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
                Active Withdrawal Periods
              </h2>
              
              <div className="space-y-3">
                {activeTreatments.slice(0, 5).map((treatment) => {
                  const daysLeft = getDaysRemaining(treatment.withdrawal_end_date)
                  const status = getWithdrawalStatus(treatment.withdrawal_end_date)
                  const colorClass = getStatusColor(status)
                  
                  return (
                    <div
                      key={treatment.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900 sm:text-base">
                          {treatment.tag_id}
                        </span>
                        <span
                          className={`px-3 py-1 text-[11px] font-bold rounded-full sm:text-xs ${colorClass}`}
                        >
                          {daysLeft} days left
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 sm:text-sm">
                        <p>
                          <strong>Drug:</strong>{' '}
                          {treatment.drug_name || treatment.salt_name}
                        </p>
                        <p>
                          <strong>Safe Date:</strong>{' '}
                          {new Date(treatment.withdrawal_end_date).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>Category:</strong> {treatment.category}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TreatmentRecording
