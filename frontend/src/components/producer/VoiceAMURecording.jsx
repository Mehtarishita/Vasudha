/**
 * Voice-Enabled AMU Recording Component
 * Mixed mode: Voice + Visual interface for recording animal treatments
 * 
 * Flow:
 * 1. Voice: "Mere pashu ka AMU record karna hai"
 * 2. Visual: Show animal selection grid
 * 3. Voice confirms OR user clicks
 * 4. Visual: Show drug selection (manual list + OCR camera)
 * 5. Voice/Visual: Fill remaining details
 * 6. Voice: "Confirm karo" → Submit
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MicrophoneIcon,
  StopIcon,
  CameraIcon,
  PhotoIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { getLivestock } from '../../services/livestockHelpers'
import { createTreatment } from '../../services/treatmentHelpers'
import drugDatabase from '../../data/drug_database.json'

// Import sub-components
import AnimalSelector from './AMU/AnimalSelector'
import DrugSelector from './AMU/DrugSelector'
import TreatmentForm from './AMU/TreatmentForm'
import ConfirmationModal from './AMU/ConfirmationModal'
import VoiceIndicator from './AMU/VoiceIndicator'

const VoiceAMURecording = () => {
  const { user } = useAuthStore()
  
  // State management
  const [currentStep, setCurrentStep] = useState(0) // 0: idle, 1: animal selection, 2: drug selection, 3: form filling, 4: confirmation
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  
  // Data states
  const [livestock, setLivestock] = useState([])
  const [selectedAnimal, setSelectedAnimal] = useState(null)
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [treatmentData, setTreatmentData] = useState({
    livestock_id: '',
    drug_id: null,
    drug_name: '',
    dosage: '',
    administration_route: 'oral',
    administration_date: new Date().toISOString().split('T')[0],
    purpose: 'therapeutic',
    batch_number: '',
    veterinarian_name: '',
    withdrawal_period_days: 0,
    notes: ''
  })
  
  // Voice recognition ref
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)

  // Load livestock on mount
  useEffect(() => {
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
      toast.error('Failed to load animals')
    }
  }

  // Voice recognition with 2.5s silence detection
  const startVoiceRecognition = (language = 'hi-IN') => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    let lastFinalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
        } else {
          interim += text
        }
      }

      // Update interim display
      setInterimTranscript(interim)

      // Handle final transcript
      if (final) {
        lastFinalTranscript = final
        
        // Clear existing timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }

        // Wait 2.5 seconds of silence before processing
        silenceTimerRef.current = setTimeout(() => {
          console.log('🔇 Processing after silence:', lastFinalTranscript)
          processVoiceInput(lastFinalTranscript)
          setTranscript(lastFinalTranscript)
          setInterimTranscript('')
          lastFinalTranscript = ''
        }, 2500)
      }
    }

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(`Voice error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }

    recognition.start()
    setIsListening(true)
    console.log('🎤 Listening... (will process after 2.5s silence)')
  }

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    setIsListening(false)
    setInterimTranscript('')
  }

  // Text-to-speech
  const speak = (text, language = 'hi-IN') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = 1.0
      utterance.pitch = 1.0
      
      const voices = window.speechSynthesis.getVoices()
      const hindiVoices = ['Google हिन्दी', 'Microsoft Swara']
      const englishVoices = ['Google India Male', 'Microsoft Ravi']
      
      const isHindi = language.includes('hi')
      const voiceList = isHindi ? hindiVoices : englishVoices
      
      for (const voiceName of voiceList) {
        const voice = voices.find(v => v.name.includes(voiceName))
        if (voice) {
          utterance.voice = voice
          break
        }
      }
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      
      window.speechSynthesis.speak(utterance)
    }
  }

  // Process voice input based on current step
  const processVoiceInput = (text) => {
    const lowerText = text.toLowerCase()
    
    switch (currentStep) {
      case 0: // Idle - trigger AMU recording
        if (lowerText.includes('amu') || lowerText.includes('illaj') || lowerText.includes('treatment')) {
          setCurrentStep(1)
          speak('ठीक है। आपको किस पशु का इलाज दर्ज करना है? कृपया चुनें।', 'hi-IN')
        }
        break
        
      case 1: // Animal selection
        handleAnimalSelection(text)
        break
        
      case 2: // Drug selection
        handleDrugSelection(text)
        break
        
      case 3: // Form filling
        handleFormInput(text)
        break
        
      case 4: // Confirmation
        if (lowerText.includes('confirm') || lowerText.includes('yes') || lowerText.includes('haan')) {
          submitTreatment()
        } else if (lowerText.includes('cancel') || lowerText.includes('no') || lowerText.includes('nahi')) {
          resetForm()
        }
        break
    }
  }

  const handleAnimalSelection = (text) => {
    // Try to match tag number from speech
    const tagMatch = text.match(/tag\s*(\w+)/i) || text.match(/(\w+\d+)/i)
    if (tagMatch) {
      const tag = tagMatch[1]
      const animal = livestock.find(a => a.tag_id?.toLowerCase() === tag.toLowerCase())
      if (animal) {
        selectAnimal(animal)
      }
    }
  }

  const selectAnimal = (animal) => {
    setSelectedAnimal(animal)
    setTreatmentData(prev => ({ ...prev, livestock_id: animal.id }))
    setCurrentStep(2)
    speak(`${animal.name || animal.tag_id} चुना गया। अब दवा चुनें - सूची से चुनें या फोटो क्लिक करें।`, 'hi-IN')
  }

  const handleDrugSelection = (text) => {
    // Voice can say drug name
    const matches = drugDatabase.filter(drug => 
      drug.salt_name.toLowerCase().includes(text.toLowerCase()) ||
      text.toLowerCase().includes(drug.salt_name.toLowerCase())
    )
    
    if (matches.length === 1) {
      selectDrug(matches[0])
    } else if (matches.length > 1) {
      speak(`${matches.length} दवाइयां मिलीं। कृपया स्क्रीन से सही वाली चुनें।`, 'hi-IN')
    }
  }

  const selectDrug = (drug) => {
    setSelectedDrug(drug)
    setTreatmentData(prev => ({
      ...prev,
      drug_id: drug.id,
      drug_name: drug.salt_name,
      withdrawal_period_days: drug.withdrawal_period_days || 0
    }))
    setCurrentStep(3)
    speak('दवा चुनी गई। अब खुराक बताएं।', 'hi-IN')
  }

  const handleFormInput = (text) => {
    // Extract dosage from speech
    const dosageMatch = text.match(/(\d+\.?\d*)\s*(ml|mg|gram|liter|tablet)/i)
    if (dosageMatch) {
      setTreatmentData(prev => ({
        ...prev,
        dosage: `${dosageMatch[1]} ${dosageMatch[2]}`
      }))
      speak('खुराक दर्ज की गई। कुछ और जानकारी है?', 'hi-IN')
    }
  }

  const submitTreatment = async () => {
    try {
      await createTreatment({
        ...treatmentData,
        farmer_id: user.id
      })
      
      speak('इलाज सफलतापूर्वक दर्ज हो गया।', 'hi-IN')
      toast.success('Treatment recorded successfully!')
      resetForm()
    } catch (error) {
      console.error('Error submitting treatment:', error)
      toast.error('Failed to record treatment')
      speak('त्रुटि हुई। कृपया फिर से कोशिश करें।', 'hi-IN')
    }
  }

  const resetForm = () => {
    setCurrentStep(0)
    setSelectedAnimal(null)
    setSelectedDrug(null)
    setTreatmentData({
      livestock_id: '',
      drug_id: null,
      drug_name: '',
      dosage: '',
      administration_route: 'oral',
      administration_date: new Date().toISOString().split('T')[0],
      purpose: 'therapeutic',
      batch_number: '',
      veterinarian_name: '',
      withdrawal_period_days: 0,
      notes: ''
    })
    setTranscript('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <ClipboardDocumentListIcon className="w-8 h-8 text-green-600" />
                Voice AMU Recording
              </h1>
              <p className="text-gray-600 mt-2">बोलकर या चुनकर इलाज दर्ज करें</p>
            </div>
            
            {/* Voice Control Button */}
            <button
              onClick={isListening ? stopVoiceRecognition : () => startVoiceRecognition('hi-IN')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <StopIcon className="w-5 h-5 inline mr-2" />
                  बंद करें
                </>
              ) : (
                <>
                  <MicrophoneIcon className="w-5 h-5 inline mr-2" />
                  बोलें
                </>
              )}
            </button>
          </div>
          
          {/* Voice Indicator */}
          <VoiceIndicator 
            isListening={isListening}
            isSpeaking={isSpeaking}
            transcript={transcript}
            interimTranscript={interimTranscript}
          />
        </div>

        {/* Main Content - Step-based rendering */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-lg p-8 text-center"
            >
              <MicrophoneIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                बोलें: "मेरे पशु का AMU record करना है"
              </h2>
              <p className="text-gray-600">
                या नीचे दिए गए बटन से शुरू करें
              </p>
              <button
                onClick={() => {
                  setCurrentStep(1)
                  speak('ठीक है। आपको किस पशु का इलाज दर्ज करना है?', 'hi-IN')
                }}
                className="mt-6 px-8 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
              >
                Start Recording
              </button>
            </motion.div>
          )}

          {currentStep === 1 && (
            <AnimalSelector
              livestock={livestock}
              onSelect={selectAnimal}
              selectedAnimal={selectedAnimal}
            />
          )}

          {currentStep === 2 && (
            <DrugSelector
              onSelect={selectDrug}
              selectedDrug={selectedDrug}
              selectedAnimal={selectedAnimal}
            />
          )}

          {currentStep === 3 && (
            <TreatmentForm
              treatmentData={treatmentData}
              setTreatmentData={setTreatmentData}
              onNext={() => setCurrentStep(4)}
              selectedAnimal={selectedAnimal}
              selectedDrug={selectedDrug}
            />
          )}

          {currentStep === 4 && (
            <ConfirmationModal
              treatmentData={treatmentData}
              selectedAnimal={selectedAnimal}
              selectedDrug={selectedDrug}
              onConfirm={submitTreatment}
              onCancel={resetForm}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default VoiceAMURecording
