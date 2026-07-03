/**
 * Voice Indicator Component
 * Shows real-time voice recognition status
 */

import React from 'react'
import { motion } from 'framer-motion'
import { MicrophoneIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid'

const VoiceIndicator = ({ isListening, isSpeaking, transcript, interimTranscript }) => {
  if (!isListening && !isSpeaking && !transcript) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-2"
    >
      {/* Listening Indicator */}
      {isListening && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="relative">
            <MicrophoneIcon className="w-6 h-6 text-green-600" />
            <motion.div
              className="absolute inset-0 bg-green-400 rounded-full opacity-50"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              Listening... (will process after 2.5s silence)
            </p>
            {interimTranscript && (
              <p className="text-sm text-green-700 italic mt-1">
                "{interimTranscript}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="relative">
            <SpeakerWaveIcon className="w-6 h-6 text-blue-600" />
            <motion.div
              className="absolute inset-0 bg-blue-400 rounded-full opacity-50"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          </div>
          <p className="text-sm font-semibold text-blue-800">
            Speaking...
          </p>
        </div>
      )}

      {/* Last Transcript */}
      {transcript && !isListening && (
        <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Last command:</p>
          <p className="text-sm font-semibold text-gray-800">
            "{transcript}"
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default VoiceIndicator
