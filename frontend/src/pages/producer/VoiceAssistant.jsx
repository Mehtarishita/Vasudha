import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  StopCircleIcon,
  LanguageIcon,
  XMarkIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  PhotoIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import {
  initializeAI,
  startListening,
  speak,
  stopSpeaking,
  processVoiceCommand,
  loadVoices,
  getAvailableVoices
} from '../../services/voiceAssistant'
import { getLivestock } from '../../services/livestockHelpers'
import { createTreatment } from '../../services/treatmentHelpers'
import drugDatabase from '../../data/drug_database.json'
import Tesseract from 'tesseract.js'
import toast from 'react-hot-toast'

const VoiceAssistant = () => {
  const { user } = useAuthStore()
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('') // Real-time transcript
  const [response, setResponse] = useState('')
  const [language, setLanguage] = useState('en') // 'en' or 'hi'
  const [speakLanguage, setSpeakLanguage] = useState('en-IN') // TTS language
  const [isInitialized, setIsInitialized] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableVoices, setAvailableVoices] = useState([])
  const [aiProvider, setAiProvider] = useState('auto') // 'auto', 'gemini', 'groq'
  const [textInput, setTextInput] = useState('') // Text fallback input
  const [showTextInput, setShowTextInput] = useState(false)
  const recognitionRef = useRef(null)
  const processingTimeoutRef = useRef(null)
  const lastProcessTimeRef = useRef(0)

  // AMU Recording States
  const [amuMode, setAmuMode] = useState(false) // Is AMU recording active?
  const [amuStep, setAmuStep] = useState(0) // 0: idle, 1: animal, 2: drug, 3: form, 4: confirm
  const [livestock, setLivestock] = useState([])
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [matchedDrugs, setMatchedDrugs] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [treatmentData, setTreatmentData] = useState({
    dosage: '',
    administration_route: 'oral',
    administration_date: new Date().toISOString().split('T')[0],
    purpose: 'therapeutic',
    veterinarian_name: '',
    batch_number: '',
    notes: ''
  })
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Language options for TTS
  const ttsLanguages = [
    { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
    { code: 'hi-IN', name: 'हिंदी (भारत)', flag: '🇮🇳' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
    { code: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳' },
  ]

  // Initialize AI on component mount
  useEffect(() => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
    const groqKey = import.meta.env.VITE_GROQ_API_KEY
    
    if (!geminiKey && !groqKey) {
      toast.error('No AI API keys found. Please add to .env')
      return
    }

    const success = initializeAI(geminiKey, groqKey)
    setIsInitialized(success)

    if (success) {
      const providers = []
      if (geminiKey) providers.push('Gemini 2.0 Flash')
      if (groqKey) providers.push('Groq')
      
      // Welcome message on page load
      const welcomeMessage = language === 'hi' 
        ? 'नमस्ते! मैं वसुधा हूं। आपके खेत में आपकी मदद के लिए तैयार हूं। कुछ भी पूछें!'
        : 'Hello! I am VASUDHA. Ready to assist you with your farm. Ask me anything!'
      
      speak(welcomeMessage, speakLanguage, () => setIsSpeaking(false))
      toast.success(`Voice Assistant ready! (${providers.join(' + ')})`)
    } else {
      toast.error('Failed to initialize Voice Assistant')
    }

    // Load available voices
    loadVoices((voices) => {
      console.log('Available voices:', voices.length)
      setAvailableVoices(voices)
    })

    // Load livestock for AMU recording
    if (user?.id) {
      loadLivestock()
    }
  }, [user])

  const loadLivestock = async () => {
    try {
      const data = await getLivestock(user.id)
      setLivestock(data || [])
    } catch (error) {
      console.error('Error loading livestock:', error)
    }
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle voice input with INSTANT recognition (0.5s silence)
  const handleStartListening = () => {
    if (!isInitialized) {
      toast.error('Voice Assistant not initialized')
      return
    }

    // Prevent starting new recognition while processing a command
    if (isProcessing) {
      toast.error(language === 'hi' ? 'कृपया प्रतीक्षा करें, पिछली कमांड प्रोसेस हो रही है' : 'Please wait, processing previous command')
      return
    }

    setIsListening(true)
    setTranscript('')
    setInterimTranscript('')
    setResponse('')

    // Create speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.continuous = true // Keep listening
    recognition.interimResults = true // Enable interim results for real-time display
    recognition.maxAlternatives = 1 // Faster processing
    
    let silenceTimer = null
    let lastFinalTranscript = ''
    let allFinalTranscripts = '' // Accumulate all final results
    
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      
      // Show interim results in REAL-TIME (instant display)
      setInterimTranscript(interim)
      
      // Handle final transcript IMMEDIATELY
      if (final) {
        allFinalTranscripts += ' ' + final
        lastFinalTranscript = allFinalTranscripts.trim()
        
        // Show final transcript IMMEDIATELY (no waiting)
        setTranscript(lastFinalTranscript)
        
        // Clear existing silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }
        
        // REDUCED wait time: 0.5 seconds of silence (INSTANT!)
        silenceTimer = setTimeout(() => {
          console.log('🔇 Processing after 0.5s silence:', lastFinalTranscript)
          // Stop recognition immediately before processing
          if (recognitionRef.current) {
            recognitionRef.current.stop()
          }
          handleVoiceCommand(lastFinalTranscript)
          lastFinalTranscript = ''
          allFinalTranscripts = ''
        }, 500) // Changed from 1200ms to 500ms for INSTANT response
      }
    }
    
    recognition.onerror = (event) => {
      setIsListening(false)
      setInterimTranscript('')
      
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
      
      const errorMessages = {
        'no-speech': language === 'hi' ? 'कुछ सुनाई नहीं दिया' : 'No speech detected',
        'audio-capture': language === 'hi' ? 'माइक्रोफोन की समस्या' : 'Microphone error',
        'not-allowed': language === 'hi' ? 'माइक्रोफोन की अनुमति दें' : 'Microphone permission denied'
      }
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(errorMessages[event.error] || event.error)
      }
    }
    
    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      if (silenceTimer) {
        clearTimeout(silenceTimer)
      }
    }
    
    recognition.start()
    console.log('🎤 Listening... (will process after 2.5s silence)')
  }

  const handleVoiceCommand = async (text) => {
    // Debounce: Prevent processing if last command was less than 3 seconds ago
    const now = Date.now()
    const timeSinceLastProcess = now - lastProcessTimeRef.current
    
    if (timeSinceLastProcess < 3000 && lastProcessTimeRef.current !== 0) {
      console.log('⏭️ Skipping - too soon after last command')
      setIsListening(false)
      setInterimTranscript('')
      return
    }
    
    lastProcessTimeRef.current = now
    
    setIsListening(false)
    setTranscript(text)
    setInterimTranscript('')
    setIsProcessing(true)

    // Check if user wants to record AMU - Support both Hindi and English
    const lowerText = text.toLowerCase()
    
    // Hindi: "इलाज रिकॉर्ड करें", "ट्रीटमेंट रिकॉर्ड करो", "AMU रिकॉर्ड करना है", "इलाज दर्ज करो"
    // English: "record treatment", "record AMU", "log treatment"
    const isAMUCommand = (
      (lowerText.includes('amu') || lowerText.includes('इलाज') || lowerText.includes('ilaj') || lowerText.includes('treatment') || lowerText.includes('ट्रीटमेंट') || lowerText.includes('treatmen')) &&
      (lowerText.includes('record') || lowerText.includes('रिकॉर्ड') || lowerText.includes('रिकार्ड') || lowerText.includes('दर्ज') || lowerText.includes('darj') || lowerText.includes('करो') || lowerText.includes('करें') || lowerText.includes('karo') || lowerText.includes('kare') || lowerText.includes('karna') || lowerText.includes('करना') || lowerText.includes('log'))
    )
    
    if (isAMUCommand) {
      // Trigger AMU mode
      setAmuMode(true)
      setAmuStep(1)
      setIsProcessing(false)
      speak(
        language === 'hi' 
          ? 'ठीक है। AMU रिकॉर्डिंग शुरू करते हैं। पहले अपने पशु को चुनें। आप स्क्रीन पर क्लिक करें या पशु का नाम बोलें।'
          : 'Okay. Starting AMU recording. First, select your animal. You can click on screen or speak the animal name.',
        speakLanguage,
        () => setIsSpeaking(false)
      )
      return
    }

    // Add user message to conversation
    setConversationHistory(prev => [
      ...prev,
      { type: 'user', text, timestamp: new Date() }
    ])

    try {
      // Process with AI
      const result = await processVoiceCommand(text, user.id, language)

      setResponse(result.response)
      setIsProcessing(false)

      // Add assistant response to conversation
      setConversationHistory(prev => [
        ...prev,
        {
          type: 'assistant',
          text: result.response,
          data: result.data,
          function: result.function,
          timestamp: new Date()
        }
      ])

      // Speak the response
      setIsSpeaking(true)
      speak(
        result.response,
        speakLanguage,
        () => setIsSpeaking(false)
      )

      if (!result.success) {
        toast.error('Command failed: ' + result.response)
      }

    } catch (error) {
      console.error('Error processing command:', error)
      const errorMsg = language === 'hi'
        ? 'माफ करें, कुछ गड़बड़ी हो गई।'
        : 'Sorry, something went wrong.'
      
      setResponse(errorMsg)
      setIsProcessing(false)
      toast.error(errorMsg)
    }
  }

  // Handle text input submission
  const handleTextSubmit = async (e) => {
    e?.preventDefault()
    if (!textInput.trim() || !isInitialized) return

    const text = textInput.trim()
    setTextInput('')
    await handleVoiceCommand(text)
  }

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setInterimTranscript('')
  }

  const handleStopSpeaking = () => {
    stopSpeaking()
    setIsSpeaking(false)
  }

  const handleClearHistory = () => {
    setConversationHistory([])
    setTranscript('')
    setResponse('')
  }

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'hi' : 'en'
    setLanguage(newLang)
    toast.success(newLang === 'hi' ? 'हिंदी में बदल गया' : 'Changed to English')
  }

  // AMU Recording Functions
  const selectAnimal = (animal) => {
    setSelectedAnimal(animal)
    setAmuStep(2)
    speak(
      language === 'hi'
        ? `${animal.name || animal.tag_id} चुना गया। अब दवा चुनें - सूची से चुनें या फोटो क्लिक करें।`
        : `Selected ${animal.name || animal.tag_id}. Now select drug - choose from list or take photo.`,
      speakLanguage
    )
  }

  const selectDrug = (drug) => {
    setSelectedDrug(drug)
    setAmuStep(3)
    setTreatmentData(prev => ({
      ...prev,
      withdrawal_period_days: drug.withdrawal_period_days || 0
    }))
    speak(
      language === 'hi' 
        ? `${drug.salt_name} चुनी गई। विदड्रॉल पीरियड ${drug.withdrawal_period_days || 0} दिन है। अब फॉर्म भरें। खुराक, दवा देने का तरीका, तारीख, और डॉक्टर का नाम दें।` 
        : `${drug.salt_name} selected. Withdrawal period is ${drug.withdrawal_period_days || 0} days. Now fill the form with dosage, route, date, and veterinarian name.`,
      speakLanguage
    )
  }

  const processImageWithOCR = async (imageSource) => {
    setIsScanning(true)
    setOcrProgress(0)
    speak(
      language === 'hi' 
        ? 'कृपया प्रतीक्षा करें। दवा के लेबल को स्कैन कर रहे हैं। इसमें कुछ सेकंड लगेंगे।' 
        : 'Please wait. Scanning medicine label. This will take a few seconds.',
      speakLanguage
    )
    try {
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
          }
        }
      })
      const text = result.data.text.toLowerCase()
      const matches = drugDatabase.filter(drug =>
        text.includes(drug.salt_name.toLowerCase()) ||
        drug.salt_name.toLowerCase().split(' ').some(word => text.includes(word))
      )
      setMatchedDrugs(matches)
      speak(
        language === 'hi'
          ? matches.length > 0 ? `${matches.length} दवाएं मिलीं। सूची से चुनें।` : 'कोई दवा नहीं मिली। कृपया सूची से चुनें।'
          : matches.length > 0 ? `${matches.length} drugs found! Select from list.` : 'No match found. Please select from list.',
        speakLanguage
      )
      toast.success(matches.length > 0 ? `${matches.length} drugs found!` : 'No match found')
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('Failed to scan image')
    } finally {
      setIsScanning(false)
      setShowCamera(false)
      stopCamera()
    }
  }

  const startCamera = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      toast.error('Camera not supported in this browser')
      return
    }

    // 1) Show the camera preview box so <video> actually exists
    setShowCamera(true)

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
        toast.error('No camera found on this device')
        setShowCamera(false)
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
        streamRef.current = stream
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
        setShowCamera(false)
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
      setShowCamera(false)

      if (err.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera found on this device')
      } else {
        toast.error('Unable to access camera. Please check permissions.')
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = canvas.toDataURL('image/png')
    stopCamera()
    processImageWithOCR(imageData)
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => processImageWithOCR(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const submitTreatment = async () => {
    try {
      const treatmentPayload = {
        livestock_id: selectedAnimal.id,
        drug_name: selectedDrug.salt_name,
        category: selectedDrug.category,
        withdrawal_period_days: selectedDrug.withdrawal_period_days || 0,
        dosage: treatmentData.dosage,
        administration_route: treatmentData.administration_route,
        administration_date: treatmentData.administration_date,
        purpose: treatmentData.purpose || 'therapeutic',
        veterinarian_name: treatmentData.veterinarian_name || '',
        batch_number: treatmentData.batch_number || '',
        notes: treatmentData.notes || ''
      }

      await createTreatment(treatmentPayload, user.id)
      
      speak(language === 'hi' ? 'इलाज सफलतापूर्वक दर्ज हो गया।' : 'Treatment recorded successfully.', speakLanguage)
      toast.success('Treatment recorded!')
      resetAMUMode()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Database error: ' + (error.message || 'Failed to record treatment'))
    }
  }

  const resetAMUMode = () => {
    setAmuMode(false)
    setAmuStep(0)
    setSelectedAnimal(null)
    setSelectedDrug(null)
    setMatchedDrugs([])
    setTreatmentData({
      dosage: '',
      administration_route: 'oral',
      administration_date: new Date().toISOString().split('T')[0],
      purpose: 'therapeutic',
      veterinarian_name: '',
      batch_number: '',
      notes: ''
    })
  }

  return (
    <div className="min-h-screen p-3 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                🎙️ Voice Assistant
              </h1>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">
                {language === 'hi' 
                  ? 'अपने खेत के बारे में पूछें'
                  : 'Ask about your farm'}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                ⚡ {language === 'hi' 
                  ? 'तुरंत जवाब - बोलें और 0.5 सेकंड रुकें'
                  : 'Instant response - speak and pause 0.5 seconds'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {/* Text Input Toggle */}
              <button
                onClick={() => setShowTextInput(!showTextInput)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-sm sm:text-base text-white transition-colors rounded-lg ${
                  showTextInput ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{showTextInput ? (language === 'hi' ? 'टेक्स्ट' : 'Text') : (language === 'hi' ? 'टेक्स्ट' : 'Text')}</span>
              </button>

              {/* STT Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2 py-2 text-sm text-white transition-colors bg-indigo-600 rounded-lg sm:gap-2 sm:px-4 sm:text-base hover:bg-indigo-700"
              >
                <LanguageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {language === 'hi' ? 'हिंदी' : 'English'}
              </button>
              
              {/* TTS Language Selector */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700">
                  <GlobeAltIcon className="w-5 h-5" />
                  <span className="text-sm">
                    {ttsLanguages.find(l => l.code === speakLanguage)?.flag || '🔊'}
                  </span>
                </button>
                <div className="absolute right-0 z-10 hidden w-48 mt-2 overflow-hidden bg-white rounded-lg shadow-xl group-hover:block">
                  <div className="p-2 text-xs font-semibold text-gray-600 bg-gray-50">Voice Language</div>
                  {ttsLanguages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSpeakLanguage(lang.code)
                        toast.success(`Voice: ${lang.name}`)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center gap-2 ${
                        speakLanguage === lang.code ? 'bg-indigo-100 font-semibold' : ''
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {conversationHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors bg-white rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Voice Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 mb-4 bg-white shadow-xl sm:p-8 sm:mb-6 rounded-2xl"
        >
          <div className="flex flex-col items-center">
            {/* Microphone Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isListening ? handleStopListening : handleStartListening}
              disabled={!isInitialized || isProcessing}
              className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500'
                  : isProcessing
                  ? 'bg-yellow-500'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {isListening ? (
                <StopCircleIcon className="w-16 h-16 text-white" />
              ) : (
                <MicrophoneIcon className="w-16 h-16 text-white" />
              )}
              {isListening && (
                <>
                  <motion.div
                    className="absolute inset-0 border-4 border-red-300 rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 border-4 border-red-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </>
              )}
            </motion.button>

            {/* Status Text */}
            <div className="mt-6 text-center">
              <p className="text-xl font-semibold text-gray-900">
                {isListening
                  ? language === 'hi' ? '🎤 सुन रहा हूं...' : '🎤 Listening...'
                  : isProcessing
                  ? language === 'hi' ? '⚙️ प्रोसेस हो रहा है...' : '⚙️ Processing...'
                  : isSpeaking
                  ? language === 'hi' ? '🔊 बोल रहा हूं...' : '🔊 Speaking...'
                  : language === 'hi'
                  ? 'बोलने के लिए माइक बटन दबाएं'
                  : 'Tap microphone to speak'}
              </p>
              {!isInitialized && (
                <p className="mt-2 text-sm text-red-600">
                  {language === 'hi' 
                    ? 'वॉयस असिस्टेंट शुरू नहीं हुआ'
                    : 'Voice Assistant not initialized'}
                </p>
              )}
            </div>

            {/* Real-time Transcript Display - ALWAYS VISIBLE */}
            <AnimatePresence>
              {(isListening || transcript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-2xl mt-6"
                >
                  {/* Interim (Real-time) Transcript */}
                  {isListening && interimTranscript && (
                    <div className="px-6 py-4 mb-3 border-2 border-blue-300 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                      <p className="flex items-center gap-2 mb-2 text-xs font-bold text-blue-700">
                        <span className="animate-pulse">🎙️</span>
                        {language === 'hi' ? 'सुन रहा हूं...' : 'Listening...'}
                      </p>
                      <p className="text-lg italic font-medium leading-relaxed text-gray-900">
                        "{interimTranscript}"
                      </p>
                    </div>
                  )}
                  
                  {/* Final Transcript */}
                  {transcript && (
                    <div className="px-6 py-4 border-2 border-green-400 shadow-md bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                      <p className="flex items-center gap-2 mb-2 text-xs font-bold text-green-700">
                        <CheckCircleIcon className="w-4 h-4" />
                        {language === 'hi' ? 'पकड़ लिया!' : 'Captured!'}
                      </p>
                      <p className="text-lg font-semibold leading-relaxed text-gray-900">
                        "{transcript}"
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stop Speaking Button */}
            {isSpeaking && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleStopSpeaking}
                className="flex items-center gap-2 px-6 py-3 mt-4 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
              >
                <StopCircleIcon className="w-5 h-5" />
                {language === 'hi' ? 'रोकें' : 'Stop'}
              </motion.button>
            )}
          </div>

          {/* Text Input Fallback */}
          <AnimatePresence>
            {showTextInput && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleTextSubmit}
                className="pt-6 mt-6 border-t"
              >
                <p className="mb-3 text-sm text-gray-600">
                  {language === 'hi' 
                    ? '💬 आवाज़ काम नहीं कर रही? यहाँ टाइप करें:'
                    : '💬 Voice not working? Type your question here:'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={language === 'hi' ? 'अपना सवाल यहां लिखें...' : 'Type your question here...'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!textInput.trim() || isProcessing}
                    className="flex items-center gap-2 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                    {language === 'hi' ? 'भेजें' : 'Send'}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Current Transcript & Response */}
          {(transcript || response) && (
            <div className="mt-8 space-y-4">
              {transcript && (
                <div className="p-4 rounded-lg bg-blue-50">
                  <p className="text-sm font-semibold text-blue-900">
                    {language === 'hi' ? 'आपने कहा:' : 'You said:'}
                  </p>
                  <p className="mt-1 text-gray-800">{transcript}</p>
                </div>
              )}
              {response && (
                <div className="p-4 rounded-lg bg-green-50">
                  <p className="text-sm font-semibold text-green-900">
                    {language === 'hi' ? 'जवाब:' : 'Response:'}
                  </p>
                  <p className="mt-1 text-gray-800">{response}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* AMU Recording Workflow */}
        <AnimatePresence>
          {amuMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 mb-4 bg-white border-2 border-green-500 shadow-xl sm:mb-6 sm:p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 sm:text-2xl">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-green-600 sm:w-7 sm:h-7" />
                  {language === 'hi' ? 'AMU रिकॉर्ड करें' : 'Record AMU'}
                </h2>
                <button
                  onClick={resetAMUMode}
                  className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Animal Selection */}
              {amuStep === 1 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">
                    {language === 'hi' ? 'पशु चुनें' : 'Select Animal'}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {livestock.map((animal) => (
                      <button
                        key={animal.id}
                        onClick={() => selectAnimal(animal)}
                        className="p-4 text-left transition-all border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">
                            {animal.species === 'cattle' ? '🐄' : '🐃'}
                          </div>
                          <div>
                            <p className="font-bold">{animal.name || 'Unnamed'}</p>
                            <p className="text-sm text-gray-600">Tag: {animal.tag_id}</p>
                            <p className="text-xs text-gray-500 capitalize">{animal.species}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Drug Selection */}
              {amuStep === 2 && (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {language === 'hi' ? 'दवा चुनें' : 'Select Drug'}
                  </h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Animal: <strong>{selectedAnimal?.name || selectedAnimal?.tag_id}</strong>
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click()
                        speak(language === 'hi' ? 'फ़ोटो चुनें' : 'Select photo', speakLanguage)
                      }}
                      className="p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50"
                    >
                      <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-sm font-semibold">Upload Photo</p>
                    </button>
                    <button
                      onClick={() => {
                        startCamera()
                        speak(language === 'hi' ? 'कैमरा खुल रहा है। दवा के लेबल को फ्रेम में रखें।' : 'Opening camera. Position the medicine label in frame.', speakLanguage)
                      }}
                      className="p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50"
                    >
                      <CameraIcon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm font-semibold">Take Photo</p>
                    </button>
                    <button
                      onClick={() => setMatchedDrugs([])}
                      className="p-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-purple-500 hover:bg-purple-50"
                    >
                      <span className="block mb-1 text-3xl">🔍</span>
                      <p className="text-sm font-semibold">Manual Search</p>
                    </button>
                  </div>

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

                  {isScanning && (
                    <div className="p-3 mb-4 rounded-lg bg-blue-50">
                      <p className="mb-2 text-sm font-semibold text-blue-800">Scanning... {ocrProgress}%</p>
                      <div className="w-full h-2 bg-blue-200 rounded-full">
                        <div className="h-2 transition-all bg-blue-600 rounded-full" style={{ width: `${ocrProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-96">
                    {(matchedDrugs.length > 0 ? matchedDrugs : drugDatabase.slice(0, 20)).map((drug) => (
                      <button
                        key={drug.id}
                        onClick={() => selectDrug(drug)}
                        className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50"
                      >
                        <p className="font-bold text-gray-800">{drug.salt_name}</p>
                        <p className="text-sm text-gray-600 capitalize">{drug.category}</p>
                        <span className="inline-block px-2 py-1 mt-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                          Withdrawal: {drug.withdrawal_period_days} days
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Treatment Form */}
              {amuStep === 3 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">
                    {language === 'hi' ? 'इलाज की जानकारी' : 'Treatment Details'}
                  </h3>
                  <div className="p-3 mb-4 rounded-lg bg-green-50">
                    <p className="text-sm"><strong>Animal:</strong> {selectedAnimal?.name || selectedAnimal?.tag_id}</p>
                    <p className="text-sm"><strong>Drug:</strong> {selectedDrug?.salt_name}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-semibold">Dosage *</label>
                      <input
                        type="text"
                        value={treatmentData.dosage}
                        onChange={(e) => setTreatmentData(prev => ({ ...prev, dosage: e.target.value }))}
                        placeholder="e.g., 10 ml"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-semibold">Route *</label>
                      <select
                        value={treatmentData.administration_route}
                        onChange={(e) => setTreatmentData(prev => ({ ...prev, administration_route: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500"
                      >
                        <option value="oral">Oral</option>
                        <option value="injection">Injection</option>
                        <option value="topical">Topical</option>
                        <option value="intramammary">Intramammary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-semibold">Date</label>
                      <input
                        type="date"
                        value={treatmentData.administration_date}
                        onChange={(e) => setTreatmentData(prev => ({ ...prev, administration_date: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-semibold">Veterinarian</label>
                      <input
                        type="text"
                        value={treatmentData.veterinarian_name}
                        onChange={(e) => setTreatmentData(prev => ({ ...prev, veterinarian_name: e.target.value }))}
                        placeholder="Dr. Name"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block mb-2 text-sm font-semibold">Notes</label>
                      <textarea
                        value={treatmentData.notes}
                        onChange={(e) => setTreatmentData(prev => ({ ...prev, notes: e.target.value }))}
                        rows="2"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500"
                      />
                    </div>
                  </div>

                  {selectedDrug?.withdrawal_period_days > 0 && (
                    <div className="p-3 mt-4 border-2 border-yellow-300 rounded-lg bg-yellow-50">
                      <p className="font-semibold text-yellow-800">
                        ⚠️ Withdrawal Period: {selectedDrug.withdrawal_period_days} days
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setAmuStep(4)
                      speak(language === 'hi'
                        ? 'कृपया सभी जानकारी जांच लें। यदि सब सही है तो Confirm बटन दबाएं या "Confirm karo" बोलें।'
                        : 'Please review all information. If everything is correct, click Confirm button or say "Confirm".', language)
                    }}
                    disabled={!treatmentData.dosage}
                    className="w-full py-3 mt-4 font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {language === 'hi' ? 'आगे बढ़ें' : 'Next'}
                  </button>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {amuStep === 4 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">
                    {language === 'hi' ? 'पुष्टि करें' : 'Confirm Treatment'}
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                      <p className="mb-2 font-semibold text-gray-800">Animal Details</p>
                      <p className="text-sm">Name: {selectedAnimal?.name || 'N/A'}</p>
                      <p className="text-sm">Tag: {selectedAnimal?.tag_id}</p>
                      <p className="text-sm">Species: {selectedAnimal?.species}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
                      <p className="mb-2 font-semibold text-gray-800">Drug Details</p>
                      <p className="text-sm">Drug: {selectedDrug?.salt_name}</p>
                      <p className="text-sm">Category: {selectedDrug?.category}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                      <p className="mb-2 font-semibold text-gray-800">Treatment Details</p>
                      <p className="text-sm">Dosage: {treatmentData.dosage}</p>
                      <p className="text-sm">Route: {treatmentData.administration_route}</p>
                      <p className="text-sm">Date: {new Date(treatmentData.administration_date).toLocaleDateString()}</p>
                      {treatmentData.veterinarian_name && <p className="text-sm">Vet: {treatmentData.veterinarian_name}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={resetAMUMode}
                      className="flex-1 py-3 font-semibold border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitTreatment}
                      className="flex items-center justify-center flex-1 gap-2 py-3 font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Confirm
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-center text-gray-500">
                    {language === 'hi' ? 'बोलें: "Confirm karo"' : 'Say: "Confirm"'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera Modal */}
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-90"
            >
              <div className="relative w-full max-w-2xl">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full bg-black rounded-lg"
                  style={{ maxHeight: '70vh' }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute left-0 right-0 flex justify-center gap-4 bottom-4">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-3 font-semibold text-white bg-green-500 rounded-full hover:bg-green-600"
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => { setShowCamera(false); stopCamera(); }}
                    className="px-6 py-3 font-semibold text-white bg-red-500 rounded-full hover:bg-red-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white shadow-lg rounded-xl"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {language === 'hi' ? '📜 बातचीत का इतिहास' : '📜 Conversation History'}
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-96">
              <AnimatePresence>
                {conversationHistory.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: msg.type === 'user' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg ${
                      msg.type === 'user'
                        ? 'bg-blue-100 ml-8'
                        : 'bg-green-100 mr-8'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-700">
                      {msg.type === 'user' 
                        ? (language === 'hi' ? '👤 आप' : '👤 You')
                        : (language === 'hi' ? '🤖 असिस्टेंट' : '🤖 Assistant')}
                    </p>
                    <p className="mt-1 text-gray-900">{msg.text}</p>
                    {msg.function && (
                      <p className="mt-1 text-xs text-gray-600">
                        📌 Function: {msg.function}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Quick Commands Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 mt-6 bg-white shadow-lg rounded-xl"
        >
          <p className="text-sm text-center text-gray-600">
            {language === 'hi' 
              ? '🎙️ अपने खेत के बारे में पूछने के लिए माइक आइकन पर क्लिक करें'
              : '🎙️ Click the mic icon to ask about your farm'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default VoiceAssistant
