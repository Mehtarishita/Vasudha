/**
 * Voice Assistant with Gemini AI and Groq Integration
 * STT (Web Speech API) → AI (Gemini/Groq) → Supabase → TTS (Web Speech API)
 * Supports Hindi and English
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import * as producerDB from './producerVoiceAssistant'

// Initialize AI clients
let genAI = null
let geminiModel = null
let groqClient = null
let currentProvider = 'gemini' // 'gemini' or 'groq'

// Rate limiting
let lastCallTime = 0
const MIN_CALL_INTERVAL = 2000 // Minimum 2 seconds between API calls
let pendingCall = null

export const initializeAI = (geminiApiKey, groqApiKey) => {
  try {
    // Initialize Gemini 1.5 Flash (stable)
    if (geminiApiKey) {
      genAI = new GoogleGenerativeAI(geminiApiKey)
      geminiModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash' // Using Gemini 2.5 Flash (stable, higher quota)
      })
      console.log('✅ Gemini 2.5 Flash initialized successfully')
    }

    // Initialize Groq as fallback
    if (groqApiKey) {
      groqClient = new Groq({ 
        apiKey: groqApiKey,
        dangerouslyAllowBrowser: true // Allow client-side usage
      })
      console.log('✅ Groq initialized successfully')
    }

    if (!geminiModel && !groqClient) {
      throw new Error('No AI provider available')
    }

    return true
  } catch (error) {
    console.error('❌ AI initialization failed:', error)
    return false
  }
}

// Rate-limited API call wrapper
const rateLimitedCall = async (fn) => {
  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime
  
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    // Cancel pending call if exists
    if (pendingCall) {
      clearTimeout(pendingCall)
    }
    
    // Wait for remaining time
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall
    console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before next call`)
    
    return new Promise((resolve, reject) => {
      pendingCall = setTimeout(async () => {
        lastCallTime = Date.now()
        pendingCall = null
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, waitTime)
    })
  }
  
  lastCallTime = now
  return fn()
}

// Legacy function for backward compatibility
export const initializeGemini = (apiKey) => {
  return initializeAI(apiKey, null)
}

/**
 * Function definitions for Gemini to understand
 * Comprehensive producer voice assistant capabilities
 */
const FUNCTION_DEFINITIONS = [
  // Dashboard & Overview
  {
    name: 'getProducerDashboard',
    description: 'Get comprehensive dashboard with all key metrics: farms, livestock, collections, payments, health, compliance',
    parameters: {}
  },
  {
    name: 'getProducerProfile',
    description: 'Get producer profile and KYC verification status',
    parameters: {}
  },
  
  // Farm Management
  {
    name: 'getMyFarms',
    description: 'Get all farms registered under this producer',
    parameters: {}
  },
  {
    name: 'getFarmDetails',
    description: 'Get detailed information about a specific farm',
    parameters: {
      type: 'object',
      properties: {
        farm_id: { type: 'string', description: 'Farm ID' }
      },
      required: ['farm_id']
    }
  },
  
  // Livestock Management
  {
    name: 'getAllLivestock',
    description: 'Get all livestock animals with treatment status and withdrawal periods',
    parameters: {}
  },
  {
    name: 'getLivestockByTag',
    description: 'Get detailed animal info by tag number including treatments, prescriptions, and withdrawal status',
    parameters: {
      type: 'object',
      properties: {
        tag_number: {
          type: 'string',
          description: 'The tag number of the animal (e.g., "TAG001", "A123", "COW-007")'
        }
      },
      required: ['tag_number']
    }
  },
  {
    name: 'addLivestock',
    description: 'Register a new animal to the farm',
    parameters: {
      type: 'object',
      properties: {
        tag_number: { type: 'string', description: 'Unique tag ID' },
        name: { type: 'string', description: 'Animal name' },
        species: { type: 'string', description: 'cattle, buffalo, goat, sheep' },
        breed: { type: 'string', description: 'Breed name (e.g., Gir, Holstein, Murrah)' },
        gender: { type: 'string', description: 'male or female' },
        date_of_birth: { type: 'string', description: 'Birth date in YYYY-MM-DD format' },
        weight_kg: { type: 'number', description: 'Weight in kilograms' }
      },
      required: ['tag_number', 'species', 'gender']
    }
  },
  {
    name: 'searchLivestock',
    description: 'Search animals by criteria: species, gender, age range',
    parameters: {
      type: 'object',
      properties: {
        species: { type: 'string', description: 'cattle, buffalo, goat, sheep' },
        gender: { type: 'string', description: 'male or female' },
        minAge: { type: 'number', description: 'Minimum age in months' },
        maxAge: { type: 'number', description: 'Maximum age in months' }
      }
    }
  },
  
  // Health & Treatments
  {
    name: 'getTreatmentHistory',
    description: 'Get complete treatment history for a specific animal',
    parameters: {
      type: 'object',
      properties: {
        livestock_id: {
          type: 'string',
          description: 'The unique ID of the livestock animal'
        }
      },
      required: ['livestock_id']
    }
  },
  {
    name: 'getActivePrescriptions',
    description: 'Get all active prescriptions and animals under withdrawal period',
    parameters: {}
  },
  {
    name: 'logTreatment',
    description: 'Record a new treatment/AMU entry for an animal',
    parameters: {
      type: 'object',
      properties: {
        livestock_id: { type: 'string', description: 'Animal UUID' },
        drug_name: { type: 'string', description: 'Name of drug/medicine' },
        dosage: { type: 'string', description: 'Dosage amount (e.g., 10 ml, 2 tablets)' },
        administration_route: { type: 'string', description: 'oral, injection, topical, intramammary, pour_on' },
        administration_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        withdrawal_period_days: { type: 'number', description: 'Withdrawal period in days' },
        notes: { type: 'string', description: 'Additional notes' }
      },
      required: ['livestock_id', 'drug_name', 'dosage']
    }
  },
  {
    name: 'checkSaleReadiness',
    description: 'Check which animals are safe to sell milk from (no active withdrawal periods)',
    parameters: {}
  },
  {
    name: 'getFarmSummary',
    description: 'Get farm statistics: total animals, species breakdown, active treatments',
    parameters: {}
  },
  
  // Milk Collection & Payments
  {
    name: 'getCollectionHistory',
    description: 'Get milk collection history with quality, payments, and rejections',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30)'
        }
      }
    }
  },
  {
    name: 'getTodayCollection',
    description: 'Get today\'s milk collection details',
    parameters: {}
  },
  {
    name: 'getPendingPayments',
    description: 'Get all pending payments from collections',
    parameters: {}
  },
  
  // Lab Samples & Compliance
  {
    name: 'getLabSampleStatus',
    description: 'Get lab sample test results, failures, and MRL violations',
    parameters: {}
  },
  
  // Inspections
  {
    name: 'getUpcomingInspections',
    description: 'Get scheduled farm inspections',
    parameters: {}
  },
  
  // Analytics (Legacy - keeping for backward compatibility)
  {
    name: 'getMilkProduction',
    description: 'Get milk production records for recent days',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 7)'
        }
      }
    }
  },
  {
    name: 'getUpcomingVaccinations',
    description: 'Get upcoming vaccination schedules',
    parameters: {}
  }
]

/**
 * Execute the appropriate database function based on Gemini's decision
 */
const executeFunction = async (functionName, parameters, userId) => {
  console.log(`🔧 ${functionName}`)

  switch (functionName) {
    // Dashboard & Profile
    case 'getProducerDashboard':
      return await producerDB.getProducerDashboard(userId)
    
    case 'getProducerProfile':
      return await producerDB.getProducerProfile(userId)
    
    // Farm Management
    case 'getMyFarms':
      return await producerDB.getMyFarms(userId)
    
    case 'getFarmDetails':
      return await producerDB.getFarmDetails(parameters.farm_id)
    
    // Livestock Management
    case 'getAllLivestock':
      return await producerDB.getAllLivestock(userId)

    case 'getLivestockByTag':
      return await producerDB.getLivestockByTag(userId, parameters.tag_number)

    case 'getTreatmentHistory':
      return await producerDB.getTreatmentHistory(parameters.livestock_id)

    case 'getActivePrescriptions':
      return await producerDB.getActivePrescriptions(userId)

    case 'addLivestock':
      return await producerDB.addLivestock(userId, parameters)
    
    case 'searchLivestock':
      return await producerDB.searchLivestock(userId, parameters)

    // Health & Treatments
    case 'logTreatment':
      return await producerDB.logTreatment({
        ...parameters,
        farmer_id: userId
      })
    
    case 'checkSaleReadiness':
      return await producerDB.checkSaleReadiness(userId)

    case 'getFarmSummary':
      return await producerDB.getFarmSummary(userId)

    // Milk Collection & Payments
    case 'getCollectionHistory':
      return await producerDB.getCollectionHistory(userId, parameters.days || 30)
    
    case 'getTodayCollection':
      return await producerDB.getTodayCollection(userId)
    
    case 'getPendingPayments':
      return await producerDB.getPendingPayments(userId)

    // Lab Samples & Compliance
    case 'getLabSampleStatus':
      return await producerDB.getLabSampleStatus(userId)
    
    // Inspections
    case 'getUpcomingInspections':
      return await producerDB.getUpcomingInspections(userId)

    // Legacy Analytics
    case 'getMilkProduction':
      return await producerDB.getMilkProduction(userId, parameters.days || 7)

    case 'getUpcomingVaccinations':
      return await producerDB.getUpcomingVaccinations(userId)

    default:
      return {
        success: false,
        message: 'Function not found'
      }
  }
}

/**
 * Call AI provider (Gemini or Groq with fallback)
 * Now with rate limiting
 */
const callAI = async (prompt) => {
  return rateLimitedCall(async () => {
    // Try Gemini first
    if (geminiModel) {
      try {
        console.log('🤖 Gemini...')
        const result = await geminiModel.generateContent(prompt)
        const response = await result.response
        return response.text()
      } catch (error) {
        console.warn('⚠️ Trying Groq...')
      }
    }

    // Fallback to Groq
    if (groqClient) {
      try {
        console.log('🤖 Groq...')
        
        // Truncate prompt if too long (Groq has smaller context window)
        const maxPromptLength = 3000
        const truncatedPrompt = prompt.length > maxPromptLength 
          ? prompt.substring(0, maxPromptLength) + '...'
          : prompt
        
        const completion = await groqClient.chat.completions.create({
          model: 'llama-3.1-8b-instant', // Faster, better for short context
          messages: [
            {
              role: 'system',
              content: 'You are a helpful voice assistant for livestock farmers. Always respond in valid JSON format. Keep responses concise.'
            },
            {
              role: 'user',
              content: truncatedPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 512 // Reduced to avoid context issues
        })
        return completion.choices[0].message.content
      } catch (error) {
        console.error('❌ Groq failed:', error.status, error.message)
        
        // Provide more specific error message
        const errorMsg = error.error?.message || error.message
        throw new Error(`Groq API Error: ${errorMsg}`)
      }
    }

    throw new Error('No AI providers available')
  })
}

/**
 * Process user voice command with AI
 */
export const processVoiceCommand = async (transcript, userId, language = 'en') => {
  if (!geminiModel && !groqClient) {
    throw new Error('AI not initialized. Please call initializeAI() first.')
  }

  try {
    console.log(`🎤 "${transcript}" (${language})`)

    // Create the prompt for AI (keep it concise for Groq fallback)
    const prompt = `
You are a helpful voice assistant for a livestock farmer in India using the VASUDHA app.

User's question: "${transcript}"
Language: ${language === 'hi' ? 'Hindi' : 'English'}

Key functions available:
- getFarmSummary: Get farm overview and statistics
- getAllLivestock: List all animals
- getLivestockByTag: Get animal by tag number
- checkSaleReadiness: Check which animals can be sold
- getTreatmentHistory: Get treatment history
- logTreatment: Record new treatment/AMU
- getFinancialSummary: Get payments and earnings
- getRecentCollections: Get milk collection data
- getHealthAlerts: Get animal health alerts
- getComplianceStatus: Get compliance status

Task:
1. Understand what the user wants
2. Decide which function(s) to call
3. Extract necessary parameters from the user's input
4. Respond in JSON format

Response format:
{
  "intent": "brief description of user's intent",
  "function": "function_name_to_call",
  "parameters": { /* extracted parameters */ },
  "needsConfirmation": false,
  "response": "natural language response to user in ${language === 'hi' ? 'Hindi' : 'English'}"
}

If user is greeting or asking general questions, set function to "none" and just provide a friendly response.
If user's command is unclear, ask for clarification.

Examples:
- "मेरे कितने जानवर हैं?" → function: "getFarmSummary"
- "Show my animals" → function: "getAllLivestock"
- "TAG001 का इलाज का इतिहास बताओ" → function: "getLivestockByTag", parameters: {"tag_number": "TAG001"}
- "Which animals can I sell?" → function: "checkSaleReadiness"

Respond in JSON format only.
`

    const text = await callAI(prompt)

    // Parse AI JSON response
    let aiDecision
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
      aiDecision = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      return {
        success: false,
        response: language === 'hi' 
          ? 'माफ करें, मैं आपकी बात समझ नहीं पाया। कृपया दोबारा बोलें।'
          : 'Sorry, I could not understand. Please try again.'
      }
    }

    // If no function call needed, return the response directly
    if (aiDecision.function === 'none' || !aiDecision.function) {
      return {
        success: true,
        intent: aiDecision.intent,
        response: aiDecision.response,
        data: null
      }
    }

    // Execute the database function
    const dbResult = await executeFunction(
      aiDecision.function,
      aiDecision.parameters || {},
      userId
    )

    // Generate final response with database results
    // Truncate large database results to avoid context overflow
    const dbResultString = JSON.stringify(dbResult)
    const maxDbResultLength = 2000
    const truncatedDbResult = dbResultString.length > maxDbResultLength
      ? dbResultString.substring(0, maxDbResultLength) + '... (truncated)'
      : dbResultString
    
    const finalPrompt = `
User asked: "${transcript}"
Function called: ${aiDecision.function}
Result: ${truncatedDbResult}

Generate a natural response in ${language === 'hi' ? 'Hindi' : 'English'}:
- Answer using the database results
- Be friendly and concise (2-3 sentences max)
- Include specific numbers/details
- If failed, explain why simply

Respond with plain text only, no JSON.
`

    const finalText = await callAI(finalPrompt)

    return {
      success: dbResult.success,
      intent: aiDecision.intent,
      function: aiDecision.function,
      parameters: aiDecision.parameters,
      data: dbResult.data,
      response: finalText.trim(),
      rawDbResponse: dbResult.message
    }

  } catch (error) {
    console.error('❌ Error processing voice command:', error)
    return {
      success: false,
      response: language === 'hi'
        ? 'माफ करें, कुछ गड़बड़ी हो गई। कृपया दोबारा कोशिश करें।'
        : 'Sorry, something went wrong. Please try again.'
    }
  }
}

/**
 * Speech-to-Text using Web Speech API
 * Supports Hindi and English
 */
export const startListening = (language = 'en-IN', onResult, onError) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError('Speech recognition not supported in this browser')
    return null
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()

  // Set language (hi-IN for Hindi, en-IN for English)
  recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    console.log('🎤 Listening started...')
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    const confidence = event.results[0][0].confidence
    console.log(`📝 Transcript: "${transcript}" (confidence: ${confidence})`)
    onResult(transcript, confidence)
  }

  recognition.onerror = (event) => {
    console.error('❌ Speech recognition error:', event.error)
    onError(event.error)
  }

  recognition.onend = () => {
    console.log('🎤 Listening stopped')
  }

  recognition.start()
  return recognition
}

/**
 * Text-to-Speech using Web Speech API
 * Supports Hindi and English with Indian accent preference
 */
export const speak = (text, language = 'en-IN', onEnd) => {
  if (!('speechSynthesis' in window)) {
    console.error('Text-to-speech not supported')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  
  // Set language - accept both 'hi' and 'hi-IN' formats
  const isHindi = language === 'hi' || language === 'hi-IN'
  utterance.lang = isHindi ? 'hi-IN' : (language || 'en-IN')
  utterance.rate = 1.0 // Normal speed for better clarity
  utterance.pitch = 1.0
  utterance.volume = 1

  utterance.onend = () => {
    if (onEnd) onEnd()
  }

  utterance.onerror = (event) => {
    console.error('❌ Speech error:', event.error)
  }

  // Get available voices and prefer Indian/natural voices
  const voices = window.speechSynthesis.getVoices()
  
  let selectedVoice = null
  
  if (isHindi) {
    // Priority order for Hindi: Female voices preferred
    const hindiPriority = [
      'Google हिन्दी', // Google Hindi (usually female)
      'Microsoft Swara', // Microsoft Hindi Female
      'Microsoft Hemant', // Microsoft Hindi Male (fallback)
    ]
    
    // First try exact name matches (female voices)
    for (const priority of hindiPriority) {
      selectedVoice = voices.find(v => v.name.includes(priority))
      if (selectedVoice) break
    }
    
    // Then try any hi-IN female voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.includes('hi-IN') && v.name.toLowerCase().includes('female')
      )
    }
    
    // Fallback to any Hindi voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi'))
    }
  } else {
    // Priority order for English: Indian English male voices preferred
    const englishPriority = [
      'Google India Male', // Google Indian English Male
      'Google India', // Google Indian English (any gender)
      'Microsoft Ravi', // Microsoft Indian English (Male)
      'Microsoft Heera', // Microsoft Indian English (Female - fallback)
      'en-IN', // Any Indian English
      'Google UK English Male', // Clear British accent male
      'en-GB', // British English (closer to Indian English)
      'Google US English Male', // Natural voice male
      'en-US' // American English (last resort)
    ]
    
    for (const priority of englishPriority) {
      selectedVoice = voices.find(v => 
        v.name.includes(priority) || 
        (v.lang.includes(priority) && v.localService) // Prefer local voices
      )
      if (selectedVoice) break
    }
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice
    console.log(`🔊 ${isHindi ? 'हिंदी' : 'English'} (${selectedVoice.name})`)
  } else {
    console.log(`🔊 Speaking (${utterance.lang}) - using default voice`)
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * Stop any ongoing speech
 */
export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Get available voices for TTS
 */
export const getAvailableVoices = () => {
  if (!('speechSynthesis' in window)) {
    return []
  }

  return window.speechSynthesis.getVoices()
}

/**
 * Load voices (needed on some browsers)
 */
export const loadVoices = (callback) => {
  if (!('speechSynthesis' in window)) {
    callback([])
    return
  }

  const voices = window.speechSynthesis.getVoices()
  
  if (voices.length > 0) {
    callback(voices)
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      callback(window.speechSynthesis.getVoices())
    }
  }
}
