/**
 * Drug Selector Component
 * Shows both manual list selection and OCR camera option
 */

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CameraIcon, 
  PhotoIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import Tesseract from 'tesseract.js'
import drugDatabase from '../../../data/drug_database.json'
import toast from 'react-hot-toast'

const DrugSelector = ({ onSelect, selectedDrug, selectedAnimal }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [matchedDrugs, setMatchedDrugs] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Filter drugs based on search
  const filteredDrugs = searchQuery
    ? drugDatabase.filter(drug =>
        drug.salt_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : drugDatabase.slice(0, 20) // Show first 20 by default

  // OCR Processing
  const processImageWithOCR = async (imageSource) => {
    setIsScanning(true)
    setOcrProgress(0)

    try {
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
          }
        }
      })

      const text = result.data.text.toLowerCase()
      console.log('Extracted text:', text)

      // Match with database
      const matches = drugDatabase.filter(drug => {
        const saltName = drug.salt_name.toLowerCase()
        return text.includes(saltName) || saltName.split(' ').some(word => text.includes(word))
      }).sort((a, b) => {
        const aScore = text.includes(a.salt_name.toLowerCase()) ? 2 : 1
        const bScore = text.includes(b.salt_name.toLowerCase()) ? 2 : 1
        return bScore - aScore
      })

      setMatchedDrugs(matches)

      if (matches.length > 0) {
        toast.success(`${matches.length} drugs found!`)
      } else {
        toast.error('No matching drug found. Please select manually.')
      }
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('Failed to scan image')
    } finally {
      setIsScanning(false)
      setShowCamera(false)
      stopCamera()
    }
  }

  // Camera handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
      setShowCamera(true)
    } catch (error) {
      console.error('Camera error:', error)
      toast.error('Failed to access camera')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg')
      setCapturedImage(imageData)
      processImageWithOCR(imageData)
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCapturedImage(e.target.result)
        processImageWithOCR(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <motion.div
      key="drug-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        दवा चुनें / Select Drug
      </h2>
      <p className="text-gray-600 mb-6">
        Animal: <span className="font-semibold">{selectedAnimal?.name || selectedAnimal?.tag_id}</span>
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
        >
          <PhotoIcon className="w-6 h-6 text-green-600" />
          <span className="font-semibold">Upload Photo</span>
        </button>

        <button
          onClick={startCamera}
          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <CameraIcon className="w-6 h-6 text-blue-600" />
          <span className="font-semibold">Take Photo</span>
        </button>

        <button
          onClick={() => setMatchedDrugs([])}
          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
        >
          <MagnifyingGlassIcon className="w-6 h-6 text-purple-600" />
          <span className="font-semibold">Search Manually</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera View */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          >
            <div className="relative max-w-2xl w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600"
                >
                  Capture
                </button>
                <button
                  onClick={() => {
                    setShowCamera(false)
                    stopCamera()
                  }}
                  className="px-6 py-3 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCR Progress */}
      {isScanning && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 font-semibold mb-2">Scanning image... {ocrProgress}%</p>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Matched Drugs from OCR */}
      {matchedDrugs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            Found {matchedDrugs.length} matching drugs:
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {matchedDrugs.map((drug) => (
              <DrugCard
                key={drug.id}
                drug={drug}
                isSelected={selectedDrug?.id === drug.id}
                onSelect={() => onSelect(drug)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Search */}
      {matchedDrugs.length === 0 && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search drug name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
            {filteredDrugs.map((drug) => (
              <DrugCard
                key={drug.id}
                drug={drug}
                isSelected={selectedDrug?.id === drug.id}
                onSelect={() => onSelect(drug)}
              />
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}

// Drug Card Component
const DrugCard = ({ drug, isSelected, onSelect }) => {
  const isRestricted = drug.regulatory_status === 'banned' || drug.regulatory_status === 'high_risk'
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-green-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-bold text-gray-800">{drug.salt_name}</h4>
          <p className="text-sm text-gray-600 capitalize">{drug.category}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Withdrawal: {drug.withdrawal_period_days} days
            </span>
            {isRestricted && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {drug.regulatory_status}
              </span>
            )}
          </div>
        </div>
        {isSelected && (
          <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
        )}
      </div>
    </motion.div>
  )
}

export default DrugSelector
