import React, { useState, useRef } from 'react'
import drugData from '../../../data/drug_database.json'
import Tesseract from 'tesseract.js'
import { CameraIcon, PhotoIcon, ExclamationTriangleIcon, CheckCircleIcon, CalendarIcon } from '@heroicons/react/24/outline'

const WithdrawalPeriod = () => {
  const [selectedDrug, setSelectedDrug] = useState('')
  const [dateGiven, setDateGiven] = useState('')
  const [productType, setProductType] = useState('milk') // 'milk' or 'meat'
  const [result, setResult] = useState(null)
  const [drugInfo, setDrugInfo] = useState(null)
  // Scan sidebar states
  const [scanMode, setScanMode] = useState('upload') // 'camera' or 'upload'
  const [scanLoading, setScanLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [scanError, setScanError] = useState('')
  const [scanResult, setScanResult] = useState('')
  const [matchedDrugs, setMatchedDrugs] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const handleDrugChange = (e) => {
    const drugName = e.target.value
    setSelectedDrug(drugName)
    const info = drugData.find(d => d.salt_name === drugName)
    setDrugInfo(info || null)
    setResult(null)
  }

  const calculate = () => {
    if (!selectedDrug || !dateGiven) {
      setResult({ error: 'Please select a drug and administration date.' })
      return
    }
    if (!drugInfo) {
      setResult({ error: 'Drug information not found.' })
      return
    }
    
    const administrationDate = new Date(dateGiven)
    const withdrawalDays = productType === 'milk' ? drugInfo.withdrawal_period_milk : drugInfo.withdrawal_period_meat
    const withdrawalEndDate = new Date(administrationDate)
    withdrawalEndDate.setDate(withdrawalEndDate.getDate() + withdrawalDays)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((withdrawalEndDate - today) / (1000 * 60 * 60 * 24))
    
    setResult({
      drugName: drugInfo.salt_name,
      productType,
      administrationDate: administrationDate.toLocaleDateString(),
      withdrawalEndDate: withdrawalEndDate.toLocaleDateString(),
      withdrawalDays,
      daysRemaining,
      isSafe: daysRemaining <= 0,
      mrlLimit: productType === 'milk' ? drugInfo.mrl_limit_milk : drugInfo.mrl_limit_meat,
      regulatoryStatus: drugInfo.regulatory_status
    })
  }

  // OCR scan logic
  const fuzzyMatch = (text, target) => {
    const textLower = text.toLowerCase()
    const targetLower = target.toLowerCase()
    if (textLower.includes(targetLower)) return 100
    // Levenshtein distance
    const distance = levenshteinDistance(textLower, targetLower)
    const maxLength = Math.max(textLower.length, targetLower.length)
    const similarity = ((maxLength - distance) / maxLength) * 100
    return similarity
  }
  const levenshteinDistance = (str1, str2) => {
    const matrix = []
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i]
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j
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
    const cleanText = text.replace(/[^a-zA-Z0-9\s\n]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim()
    const keywords = ['composition', 'contains', 'active ingredient', 'each tablet', 'each ml', 'each gram', 'formula', 'content']
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
  
  const matchWithDatabase = (text) => {
    const compositionText = extractComposition(text)
    const fullText = text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ')
    const matches = []
    
    drugData.forEach(drug => {
      const saltName = drug.salt_name.toLowerCase()
      const words = saltName.split(' ')
      let maxScore = 0
      
      if (fullText.includes(saltName)) maxScore = Math.max(maxScore, 95)
      words.forEach(word => {
        if (word.length > 3 && fullText.includes(word)) maxScore = Math.max(maxScore, 85)
      })
      const fuzzyScore = fuzzyMatch(compositionText, saltName)
      maxScore = Math.max(maxScore, fuzzyScore)
      const fullFuzzyScore = fuzzyMatch(fullText, saltName)
      maxScore = Math.max(maxScore, fullFuzzyScore)
      
      if (maxScore > 50) matches.push({ ...drug, matchScore: maxScore })
    })
    
    return matches.sort((a, b) => b.matchScore - a.matchScore)
  }
  
  const processImageWithOCR = async (imageSource) => {
    setScanLoading(true)
    setOcrProgress(0)
    setScanError('')
    setScanResult('')
    setMatchedDrugs([])
    setSelectedMatch(null)
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
      setScanResult(text)
      const matches = matchWithDatabase(text)
      setMatchedDrugs(matches)
      if (matches.length > 0) {
        setSelectedMatch(matches[0])
        setSelectedDrug(matches[0].salt_name)
        setDrugInfo(matches[0])
      } else {
        setScanError('No matching drug found. Please select manually from the dropdown.')
      }
    } catch (err) {
      setScanError('Failed to scan image. Please ensure the image is clear and try again.')
    }
    setScanLoading(false)
    setOcrProgress(0)
  }
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSelectedImage(ev.target.result)
      processImageWithOCR(ev.target.result)
    }
    reader.readAsDataURL(file)
  }
  // Camera logic
  const startCamera = async () => {
    setScanError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      setScanError('Unable to access camera. Please check permissions.')
    }
  }
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/png')
    setSelectedImage(imageData)
    stopCamera()
    processImageWithOCR(imageData)
  }

  return (
    <div className="flex gap-6">
      {/* Main Calculator */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Period Calculator</h1>
        <p className="text-gray-600 mb-6">Calculate when the withdrawal period ends after drug administration to ensure safe milk/meat production.</p>
        
        <div className="space-y-5 max-w-2xl">
          {/* Drug Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Drug *</label>
            <select
              value={selectedDrug}
              onChange={handleDrugChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Choose a drug from database</option>
              {drugData.map(drug => (
                <option key={drug.id} value={drug.salt_name}>
                  {drug.salt_name} ({drug.category}) - {drug.withdrawal_period_days} days
                </option>
              ))}
            </select>
          </div>

          {/* Date Given */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Administration Date *</label>
            <input
              type="date"
              value={dateGiven}
              onChange={e => setDateGiven(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Type *</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="milk"
                  checked={productType === 'milk'}
                  onChange={(e) => setProductType(e.target.value)}
                  className="mr-2"
                />
                <span>Milk</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="meat"
                  checked={productType === 'meat'}
                  onChange={(e) => setProductType(e.target.value)}
                  className="mr-2"
                />
                <span>Meat</span>
              </label>
            </div>
          </div>

          {/* Drug Info Display */}
          {drugInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{drugInfo.salt_name}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="ml-2 text-gray-900">{drugInfo.category}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    drugInfo.regulatory_status === 'Approved' ? 'bg-green-100 text-green-800' :
                    drugInfo.regulatory_status === 'Restricted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>{drugInfo.regulatory_status}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Milk MRL:</span>
                  <span className="ml-2 text-gray-900">{drugInfo.mrl_limit_milk}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Meat MRL:</span>
                  <span className="ml-2 text-gray-900">{drugInfo.mrl_limit_meat}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Withdrawal Periods:</span>
                  <div className="ml-2 text-gray-900 mt-1">
                    Milk: {drugInfo.withdrawal_period_milk} days | Meat: {drugInfo.withdrawal_period_meat} days
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="ml-2 text-gray-900 mt-1">{drugInfo.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={calculate}
            disabled={!selectedDrug || !dateGiven}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CalendarIcon className="h-5 w-5" />
            Calculate Withdrawal Period
          </button>

          {/* Result Display */}
          {result && (
            <div className={`p-5 rounded-lg border-2 ${
              result.error ? 'bg-red-50 border-red-300' :
              result.isSafe ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
            }`}>
              {result.error ? (
                <div className="flex items-center gap-2 text-red-800">
                  <ExclamationTriangleIcon className="h-6 w-6" />
                  <span className="font-medium">{result.error}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {result.isSafe ? (
                      <CheckCircleIcon className="h-7 w-7 text-green-600" />
                    ) : (
                      <ExclamationTriangleIcon className="h-7 w-7 text-yellow-600" />
                    )}
                    <h3 className={`text-xl font-bold ${
                      result.isSafe ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {result.isSafe ? `Safe for ${result.productType.toUpperCase()} Production` : `Withdrawal Period Active`}
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Drug Administered:</span>
                      <span className="text-gray-900">{result.drugName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Administration Date:</span>
                      <span className="text-gray-900">{result.administrationDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Product Type:</span>
                      <span className="text-gray-900 uppercase">{result.productType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Withdrawal Period:</span>
                      <span className="text-gray-900">{result.withdrawalDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Safe After Date:</span>
                      <span className="text-gray-900 font-semibold">{result.withdrawalEndDate}</span>
                    </div>
                    {!result.isSafe && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Days Remaining:</span>
                        <span className="text-gray-900 font-semibold">{result.daysRemaining} days</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">MRL Limit:</span>
                      <span className="text-gray-900">{result.mrlLimit}</span>
                    </div>
                  </div>
                  {!result.isSafe && (
                    <div className="mt-4 p-3 bg-yellow-100 rounded-lg text-yellow-900 text-sm">
                      <strong>⚠️ Warning:</strong> This animal's {result.productType} is NOT safe for consumption until {result.withdrawalEndDate}.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Side Scan Section */}
      <div className="w-96 min-w-[384px] bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl shadow-lg p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <CameraIcon className="h-6 w-6 text-green-600" />
          <h2 className="text-lg font-bold text-gray-900">Quick Drug Scanner (OCR)</h2>
        </div>
        <p className="text-sm text-gray-600">Upload or capture a photo of the drug label to automatically detect the medicine.</p>
        
        <div className="flex p-1 mb-2 bg-gray-100 rounded-lg">
          <button
            onClick={() => { setScanMode('camera'); setSelectedImage(null); setScanResult(''); setMatchedDrugs([]); setScanError(''); setOcrProgress(0); }}
            className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              scanMode === 'camera' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <CameraIcon className="h-4 w-4" />
            Camera
          </button>
          <button
            onClick={() => { setScanMode('upload'); stopCamera(); setSelectedImage(null); setScanResult(''); setMatchedDrugs([]); setScanError(''); setOcrProgress(0); }}
            className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              scanMode === 'upload' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <PhotoIcon className="h-4 w-4" />
            Upload
          </button>
        </div>
        
        {scanMode === 'camera' ? (
          <>
            <div className="relative overflow-hidden bg-gray-900 rounded-xl aspect-video">
              <video ref={videoRef} className="object-cover w-full h-full" playsInline muted />
              {!videoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center text-white p-4">
                    <CameraIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <span className="block mb-2 font-medium">Camera Ready</span>
                    <span className="text-xs text-gray-300">Point camera at drug label for best results</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!videoRef.current?.srcObject ? (
                <button onClick={startCamera} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
                  Start Camera
                </button>
              ) : (
                <>
                  <button onClick={captureImage} disabled={scanLoading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:bg-gray-400">
                    Capture & Scan
                  </button>
                  <button onClick={stopCamera} className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors">
                    Cancel
                  </button>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </>
        ) : (
          <>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <PhotoIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">Click to upload image</p>
              <p className="text-xs text-gray-500">Supports JPG, PNG</p>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            {selectedImage && (
              <div className="relative">
                <img src={selectedImage} alt="Selected" className="w-full rounded-lg border-2 border-gray-200" />
                <button 
                  onClick={() => { setSelectedImage(null); setScanResult(''); setMatchedDrugs([]); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
        
        {scanLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Scanning image...</span>
              <span className="text-sm font-bold text-blue-700">{ocrProgress}%</span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
            </div>
          </div>
        )}
        
        {scanError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-800">{scanError}</span>
          </div>
        )}
        
        {matchedDrugs.length > 0 && !scanLoading && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              Detected Medicines (Select one):
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {matchedDrugs.map(drug => (
                <div
                  key={drug.id}
                  onClick={() => {
                    setSelectedMatch(drug)
                    setSelectedDrug(drug.salt_name)
                    setDrugInfo(drug)
                  }}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedMatch?.id === drug.id 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{drug.salt_name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {drug.category} • Withdrawal: {drug.withdrawal_period_days} days
                      </div>
                      {selectedMatch?.id === drug.id && (
                        <div className="text-xs text-green-700 mt-1 font-medium">✓ Selected</div>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex-shrink-0">
                      {Math.round(drug.matchScore)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WithdrawalPeriod
