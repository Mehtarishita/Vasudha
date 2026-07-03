import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { 
  PaperAirplaneIcon, 
  SparklesIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BeakerIcon,
  ShieldCheckIcon,
  TruckIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

const AIAssistant = () => {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Role-specific suggestions
  const getSuggestions = () => {
    switch (user?.role) {
      case 'producer':
        return [
          { icon: DocumentTextIcon, text: 'Show withdrawal periods for my animals', color: 'text-blue-600' },
          { icon: ChartBarIcon, text: 'Analyze my farm health trends', color: 'text-green-600' },
          { icon: LightBulbIcon, text: 'Suggest compliance improvements', color: 'text-yellow-600' },
          { icon: BeakerIcon, text: 'Explain recent test results', color: 'text-purple-600' }
        ]
      case 'veterinarian':
        return [
          { icon: DocumentTextIcon, text: 'Draft prescription for mastitis treatment', color: 'text-blue-600' },
          { icon: ChartBarIcon, text: 'Show AMU trends in my farms', color: 'text-green-600' },
          { icon: BeakerIcon, text: 'Review recent MRL violations', color: 'text-red-600' },
          { icon: LightBulbIcon, text: 'Suggest alternative treatments', color: 'text-yellow-600' }
        ]
      case 'lab':
        return [
          { icon: BeakerIcon, text: 'Summarize flagged samples today', color: 'text-red-600' },
          { icon: ChartBarIcon, text: 'Show testing trends this month', color: 'text-green-600' },
          { icon: DocumentTextIcon, text: 'Generate MRL violation report', color: 'text-orange-600' },
          { icon: LightBulbIcon, text: 'Explain testing procedures', color: 'text-blue-600' }
        ]
      case 'collector':
        return [
          { icon: TruckIcon, text: 'Optimize my collection route', color: 'text-blue-600' },
          { icon: ChartBarIcon, text: 'Show fraud detection insights', color: 'text-red-600' },
          { icon: BeakerIcon, text: 'Review sample quality trends', color: 'text-green-600' },
          { icon: LightBulbIcon, text: 'Suggest farm visit schedule', color: 'text-yellow-600' }
        ]
      case 'regulator':
        return [
          { icon: ShieldCheckIcon, text: 'Analyze compliance violations', color: 'text-red-600' },
          { icon: ChartBarIcon, text: 'Show AMU/AMR trends', color: 'text-blue-600' },
          { icon: DocumentTextIcon, text: 'Draft inspection notice', color: 'text-orange-600' },
          { icon: BeakerIcon, text: 'Review high-risk areas', color: 'text-purple-600' }
        ]
      case 'retailer':
        return [
          { icon: ChartBarIcon, text: 'Analyze sales patterns', color: 'text-green-600' },
          { icon: DocumentTextIcon, text: 'Check stock compliance', color: 'text-blue-600' },
          { icon: LightBulbIcon, text: 'Suggest restocking strategy', color: 'text-yellow-600' },
          { icon: ShieldCheckIcon, text: 'Review prescription records', color: 'text-purple-600' }
        ]
      default:
        return [
          { icon: LightBulbIcon, text: 'How can I improve compliance?', color: 'text-blue-600' },
          { icon: ChartBarIcon, text: 'Show system analytics', color: 'text-green-600' },
          { icon: DocumentTextIcon, text: 'Explain regulations', color: 'text-purple-600' }
        ]
    }
  }

  // Initial greeting based on role
  useEffect(() => {
    const greetings = {
      producer: 'Hello! I can help you manage farm health, track withdrawal periods, analyze trends, and ensure compliance. What would you like to know?',
      veterinarian: 'Hello! I can assist with prescriptions, AMU tracking, lab reports, treatment recommendations, and farm oversight. How can I help?',
      lab: 'Hello! I can help analyze test results, track MRL violations, generate reports, and explain testing procedures. What do you need?',
      collector: 'Hello! I can optimize collection routes, detect fraud patterns, analyze quality trends, and schedule farm visits. How can I assist?',
      regulator: 'Hello! I can analyze compliance data, track violations, draft notices, and provide risk insights. What would you like to do?',
      retailer: 'Hello! I can help analyze sales, manage stock compliance, track prescriptions, and optimize inventory. What can I do for you?',
      admin: 'Hello! I can help with system analytics, user management, and overall platform insights. What do you need?'
    }

    setMessages([{
      from: 'assistant',
      text: greetings[user?.role] || 'Hello! How can I assist you today?',
      timestamp: new Date()
    }])
  }, [user?.role])

  const generateResponse = (userText) => {
    const lowerText = userText.toLowerCase()
    
    // Role-specific responses
    if (user?.role === 'producer') {
      if (lowerText.includes('withdrawal') || lowerText.includes('period')) {
        return '🔍 **Active Withdrawal Periods:**\n\n• Animal #1234 - Oxytetracycline: 5 days remaining\n• Animal #5678 - Ceftiofur: 3 days remaining\n\n✅ All other animals are clear for production.'
      }
      if (lowerText.includes('health') || lowerText.includes('trend')) {
        return '📊 **Farm Health Summary (Last 30 Days):**\n\n• Mastitis cases: ↓ 15%\n• AMU compliance: 98%\n• Average milk quality: Grade A\n• Recommended: Schedule preventive vet visit'
      }
    }

    if (user?.role === 'collector') {
      if (lowerText.includes('fraud') || lowerText.includes('detect')) {
        return '🚨 **Fraud Detection Insights:**\n\n• 2 farms flagged this week\n• Common pattern: Volume exceeds safe threshold\n• Recommendation: Increase random sampling\n• Alert: Farm F-002 requires verification'
      }
      if (lowerText.includes('route') || lowerText.includes('optimize')) {
        return '🗺️ **Optimized Route Suggestion:**\n\n1. Start: Sunshine Dairy (8:00 AM)\n2. Green Pastures Farm (8:45 AM)\n3. Valley View Ranch (9:30 AM)\n4. Morning Mist Dairy (10:15 AM)\n\n⏱️ Total time saved: 35 minutes'
      }
    }

    if (user?.role === 'veterinarian') {
      if (lowerText.includes('prescription') || lowerText.includes('mastitis')) {
        return '📋 **Mastitis Treatment Protocol:**\n\n**Recommended:** Ceftiofur 125mg IM\n• Dosage: 1 mg/kg body weight\n• Duration: 3-5 days\n• Withdrawal: Milk 72h, Meat 28 days\n\n⚠️ Remember to update digital prescription system'
      }
      if (lowerText.includes('amu') || lowerText.includes('trend')) {
        return '📊 **AMU Trends (Your Farms):**\n\n• Total prescriptions: 45 this month\n• Most used: Oxytetracycline (35%)\n• Compliance rate: 96%\n• Alert: 2 farms nearing AMU threshold'
      }
    }

    if (user?.role === 'lab') {
      if (lowerText.includes('flagged') || lowerText.includes('violation')) {
        return '⚠️ **Flagged Samples Today:**\n\n• Sample #S-2025-345: Oxytetracycline 520 ppb (Limit: 300 ppb)\n• Sample #S-2025-347: Ceftiofur 180 ppb (Limit: 100 ppb)\n\n📧 Notifications sent to producers and regulators'
      }
      if (lowerText.includes('report') || lowerText.includes('generate')) {
        return '📄 **Generating MRL Violation Report...**\n\n✅ Report includes:\n• All violations (last 30 days)\n• Farm-wise breakdown\n• Drug categories\n• Regulatory actions taken\n\n🔗 Download ready in your Test History'
      }
    }

    if (user?.role === 'regulator') {
      if (lowerText.includes('compliance') || lowerText.includes('violation')) {
        return '🛡️ **Compliance Overview:**\n\n• Active violations: 12\n• High-risk farms: 5\n• Pending inspections: 8\n• Recent improvement: ↑ 22%\n\n🎯 Recommended: Focus on Sector A this week'
      }
    }

    if (user?.role === 'retailer') {
      if (lowerText.includes('sales') || lowerText.includes('pattern')) {
        return '📊 **Sales Analysis (Last 30 Days):**\n\n• Top seller: Oxytetracycline (250 units)\n• Revenue: ↑ 18%\n• Prescription compliance: 100%\n• Low stock alert: Ceftiofur (restock in 3 days)'
      }
    }

    // Generic helpful response
    return `I understand you're asking about "${userText}". Based on your role as a ${user?.role}, I can help with:\n\n• Data analysis and insights\n• Compliance guidance\n• Report generation\n• Best practice recommendations\n\nCould you be more specific about what you need?`
  }

  const send = () => {
    if (!input.trim()) return
    
    const userMsg = { 
      from: 'user', 
      text: input,
      timestamp: new Date()
    }
    
    setMessages((m) => [...m, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate AI processing with realistic delay
    setTimeout(() => {
      setIsTyping(false)
      const response = generateResponse(input)
      setMessages((m) => [...m, { 
        from: 'assistant', 
        text: response,
        timestamp: new Date()
      }])
    }, 1000 + Math.random() * 1000)
  }

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
  }

  const suggestions = getSuggestions()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-sm text-gray-600">
              Your intelligent helper for {user?.role} tasks
            </p>
          </div>
        </div>
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <p className="mb-3 text-xs font-medium text-gray-500 uppercase">Quick Suggestions</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion, idx) => {
              const Icon = suggestion.icon
              return (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center p-3 space-x-3 text-left transition-all bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md group"
                >
                  <Icon className={`w-5 h-5 ${suggestion.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm text-gray-700">{suggestion.text}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Messages Container */}
      <div className="flex-1 p-4 mb-4 overflow-y-auto border border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
        <AnimatePresence>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 ${m.from === 'assistant' ? 'mr-auto' : 'ml-auto'} max-w-2xl`}
            >
              <div className={`flex ${m.from === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`
                  px-4 py-3 rounded-2xl shadow-sm
                  ${m.from === 'assistant' 
                    ? 'bg-white text-gray-800 rounded-tl-none' 
                    : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none'
                  }
                `}>
                  <div className="whitespace-pre-line">{m.text}</div>
                  <div className={`text-xs mt-1 ${m.from === 'assistant' ? 'text-gray-400' : 'text-blue-100'}`}>
                    {m.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-gray-500"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">AI is thinking...</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Type your question... (Press Enter to send, Shift+Enter for new line)"
              className="w-full px-4 py-3 transition-all border border-gray-300 resize-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
            />
            <p className="mt-1 text-xs text-gray-500">
              💡 Tip: Ask specific questions about your {user?.role} workflow
            </p>
          </div>
          <button 
            onClick={send}
            disabled={!input.trim() || isTyping}
            className="p-3 text-white transition-all shadow-md bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
          >
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIAssistant
