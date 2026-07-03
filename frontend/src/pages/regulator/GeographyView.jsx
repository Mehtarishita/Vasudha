import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MapPinIcon,
  MapIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BeakerIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import statesDistrictsData from '../../data/states-and-districts.json'

// Generate dummy statistics for each state
const generateStateData = (state) => {
  // Use state name for consistent random values
  const hash = state.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const random = (seed) => ((seed * 9301 + 49297) % 233280) / 233280
  
  const baseRandom = random(hash)
  return {
    farms: Math.floor(20 + baseRandom * 35),
    livestock: Math.floor(500 + baseRandom * 1200),
    vets: Math.floor(10 + baseRandom * 30),
    labs: Math.floor(1 + baseRandom * 4),
    compliance: Math.floor(85 + random(hash + 100) * 13),
    violations: Math.floor(random(hash + 200) * 8)
  }
}

// Create stateDistrictData from imported JSON
const stateDistrictData = {}
statesDistrictsData.states.forEach(item => {
  const stateName = item.state.replace(' (UT)', '').replace(' (NCT)', '')
  stateDistrictData[stateName] = {
    ...generateStateData(stateName),
    districts: item.districts
  }
})

// District-level dummy data
const getDistrictData = (state, district) => {
  const baseData = stateDistrictData[state]
  const districtCount = baseData.districts.length
  const farmShare = Math.floor(baseData.farms / districtCount)
  const livestockShare = Math.floor(baseData.livestock / districtCount)
  
  return {
    farms: farmShare + Math.floor(Math.random() * 5),
    livestock: livestockShare + Math.floor(Math.random() * 50),
    vets: Math.floor(baseData.vets / districtCount) + Math.floor(Math.random() * 3),
    labs: Math.random() > 0.7 ? 1 : 0,
    compliance: baseData.compliance + Math.floor(Math.random() * 6) - 3,
    violations: Math.floor(Math.random() * 3),
    recentTests: Math.floor(Math.random() * 50) + 10,
    pendingInspections: Math.floor(Math.random() * 10)
  }
}

// SVG Map Component (Simplified India Map)
const IndiaMap = ({ selectedState, onStateSelect }) => {
  // State coordinates for markers - expanded to cover more states
  const stateCoordinates = {
    'Maharashtra': { x: 250, y: 280 },
    'Gujarat': { x: 180, y: 240 },
    'Rajasthan': { x: 200, y: 180 },
    'Karnataka': { x: 250, y: 350 },
    'Tamil Nadu': { x: 280, y: 400 },
    'Andhra Pradesh': { x: 290, y: 320 },
    'Telangana': { x: 280, y: 300 },
    'West Bengal': { x: 380, y: 260 },
    'Uttar Pradesh': { x: 280, y: 200 },
    'Madhya Pradesh': { x: 250, y: 240 },
    'Punjab': { x: 220, y: 140 },
    'Haryana': { x: 240, y: 160 },
    'Kerala': { x: 250, y: 420 },
    'Delhi': { x: 260, y: 170 },
    'Bihar': { x: 350, y: 230 },
    'Jharkhand': { x: 360, y: 250 },
    'Odisha': { x: 330, y: 300 },
    'Chhattisgarh': { x: 300, y: 280 },
    'Assam': { x: 420, y: 230 },
    'Goa': { x: 230, y: 330 },
    'Himachal Pradesh': { x: 240, y: 130 },
    'Uttarakhand': { x: 270, y: 160 },
    'Jammu and Kashmir': { x: 220, y: 100 }
  }

  return (
    <svg viewBox="0 0 500 500" className="w-full h-full">
      {/* Simplified India outline */}
      <path
        d="M 200 100 L 250 120 L 280 100 L 320 140 L 350 130 L 380 160 L 400 200 L 390 240 L 410 270 L 400 310 L 380 340 L 360 380 L 340 420 L 310 440 L 280 450 L 260 430 L 240 400 L 220 380 L 200 350 L 180 320 L 160 280 L 150 240 L 140 200 L 160 160 L 180 130 Z"
        fill="#e0f2fe"
        stroke="#0284c7"
        strokeWidth="2"
      />
      
      {/* State markers */}
      {Object.entries(stateCoordinates).map(([state, coords]) => {
        const isSelected = selectedState === state
        const stateData = stateDistrictData[state]
        if (!stateData) return null
        
        const complianceColor = 
          stateData.compliance >= 92 ? '#10b981' : 
          stateData.compliance >= 88 ? '#f59e0b' : '#ef4444'
        
        return (
          <g key={state}>
            <circle
              cx={coords.x}
              cy={coords.y}
              r={isSelected ? 12 : 8}
              fill={complianceColor}
              stroke={isSelected ? '#1e40af' : '#fff'}
              strokeWidth={isSelected ? 3 : 2}
              className="transition-all duration-300 cursor-pointer hover:opacity-80"
              onClick={() => onStateSelect(state)}
              style={{ filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none' }}
            />
            {isSelected && (
              <text
                x={coords.x}
                y={coords.y - 20}
                textAnchor="middle"
                className="text-xs font-semibold fill-blue-900"
              >
                {state}
              </text>
            )}
          </g>
        )
      })}
      
      {/* Legend */}
      <g transform="translate(20, 420)">
        <text x="0" y="0" className="text-xs font-semibold fill-gray-700">Compliance Rate:</text>
        <circle cx="5" cy="15" r="5" fill="#10b981" />
        <text x="15" y="19" className="text-xs fill-gray-600">≥92% (Good)</text>
        <circle cx="5" cy="30" r="5" fill="#f59e0b" />
        <text x="15" y="34" className="text-xs fill-gray-600">88-92% (Fair)</text>
        <circle cx="5" cy="45" r="5" fill="#ef4444" />
        <text x="15" y="49" className="text-xs fill-gray-600">&lt;88% (Poor)</text>
      </g>
    </svg>
  )
}

const GeographyView = () => {
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [districtData, setDistrictData] = useState(null)
  const [stateData, setStateData] = useState(null)

  useEffect(() => {
    if (selectedState) {
      setStateData(stateDistrictData[selectedState])
      setSelectedDistrict('') // Reset district when state changes
      setDistrictData(null)
    }
  }, [selectedState])

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      setDistrictData(getDistrictData(selectedState, selectedDistrict))
    }
  }, [selectedState, selectedDistrict])

  const handleStateChange = (state) => {
    setSelectedState(state)
  }

  const getComplianceColor = (compliance) => {
    if (compliance >= 92) return 'bg-green-500'
    if (compliance >= 88) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getComplianceText = (compliance) => {
    if (compliance >= 92) return 'Excellent'
    if (compliance >= 88) return 'Good'
    return 'Needs Attention'
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <MapPinIcon className="w-8 h-8 text-blue-600" />
            Geographic View
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor livestock management compliance across states and districts
          </p>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Side - Selection Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* State Selection Card */}
            <div className="p-6 bg-white shadow-md rounded-xl">
              <label className="block mb-3 text-sm font-semibold text-gray-700">
                Select State
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 text-lg transition-all duration-200 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Choose a State --</option>
                {Object.keys(stateDistrictData).sort().map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection Card */}
            {selectedState && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white shadow-md rounded-xl"
              >
                <label className="block mb-3 text-sm font-semibold text-gray-700">
                  Select District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-4 py-3 text-lg transition-all duration-200 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Choose a District --</option>
                  {stateData?.districts.sort().map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            {/* State-Level Statistics */}
            {selectedState && stateData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl"
              >
                <h3 className="flex items-center gap-2 mb-4 text-xl font-bold">
                  <BuildingOfficeIcon className="w-6 h-6" />
                  {selectedState} Overview
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                    <div className="text-3xl font-bold">{stateData.farms}</div>
                    <div className="text-sm text-blue-100">Registered Farms</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                    <div className="text-3xl font-bold">{stateData.livestock}</div>
                    <div className="text-sm text-blue-100">Total Livestock</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                    <div className="text-3xl font-bold">{stateData.vets}</div>
                    <div className="text-sm text-blue-100">Veterinarians</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                    <div className="text-3xl font-bold">{stateData.labs}</div>
                    <div className="text-sm text-blue-100">Testing Labs</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Compliance Rate</span>
                    <span className="text-2xl font-bold">{stateData.compliance}%</span>
                  </div>
                  <div className="w-full h-3 overflow-hidden rounded-full bg-white/20">
                    <div
                      className={`h-full ${getComplianceColor(stateData.compliance)} transition-all duration-500`}
                      style={{ width: `${stateData.compliance}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-blue-100">
                    Status: {getComplianceText(stateData.compliance)}
                  </div>
                </div>

                {stateData.violations > 0 && (
                  <div className="flex items-center gap-2 p-3 mt-4 rounded-lg bg-red-500/20 backdrop-blur-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-300" />
                    <span className="text-sm">
                      {stateData.violations} active violations reported
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* District-Level Statistics */}
            {selectedDistrict && districtData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white shadow-lg rounded-xl"
              >
                <h3 className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-900">
                  <MapPinIcon className="w-6 h-6 text-green-600" />
                  {selectedDistrict} District Details
                </h3>
                
                <div className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-purple-200 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-900">Farms</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900">{districtData.farms}</div>
                    </div>
                    
                    <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-br from-green-50 to-green-100">
                      <div className="flex items-center gap-2 mb-2">
                        <UserGroupIcon className="w-5 h-5 text-green-600" />
                        <span className="text-xs font-semibold text-green-900">Livestock</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{districtData.livestock}</div>
                    </div>
                    
                    <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <UserGroupIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-900">Vets</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">{districtData.vets}</div>
                    </div>
                    
                    <div className="p-4 border border-orange-200 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100">
                      <div className="flex items-center gap-2 mb-2">
                        <BeakerIcon className="w-5 h-5 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-900">Labs</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-900">{districtData.labs}</div>
                    </div>
                  </div>

                  {/* Compliance Info */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                        Compliance Rate
                      </span>
                      <span className="text-xl font-bold text-gray-900">{districtData.compliance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full ${getComplianceColor(districtData.compliance)} transition-all duration-500`}
                        style={{ width: `${districtData.compliance}%` }}
                      />
                    </div>
                  </div>

                  {/* Activity Metrics */}
                  <div className="pt-4 space-y-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600">
                        <BeakerIcon className="w-4 h-4 text-gray-500" />
                        Recent Tests Conducted
                      </span>
                      <span className="text-lg font-semibold text-gray-900">{districtData.recentTests}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600">
                        <ChartBarIcon className="w-4 h-4 text-gray-500" />
                        Pending Inspections
                      </span>
                      <span className="text-lg font-semibold text-gray-900">{districtData.pendingInspections}</span>
                    </div>
                    {districtData.violations > 0 && (
                      <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                        <span className="flex items-center gap-2 text-sm text-red-700">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                          Active Violations
                        </span>
                        <span className="text-lg font-bold text-red-600">{districtData.violations}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Side - Map Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-6 h-fit"
          >
            <div className="p-6 bg-white shadow-lg rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-900">
                <MapIcon className="w-6 h-6 text-blue-600" />
                India Map - Click on States
              </h3>
              
              <div className="flex items-center justify-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 aspect-square">
                <IndiaMap 
                  selectedState={selectedState} 
                  onStateSelect={handleStateChange}
                />
              </div>

              {/* Map Instructions */}
              <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                <p className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Click on any state marker on the map to view its details. 
                  States are color-coded based on their compliance rates.
                </p>
              </div>

              {/* Summary Stats */}
              {!selectedState && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-br from-green-50 to-green-100">
                    <div className="text-2xl font-bold text-green-900">
                      {Object.keys(stateDistrictData).length}
                    </div>
                    <div className="text-sm font-medium text-green-700">States Monitored</div>
                  </div>
                  <div className="p-4 border border-purple-200 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="text-2xl font-bold text-purple-900">
                      {Object.values(stateDistrictData).reduce((sum, state) => sum + state.farms, 0)}
                    </div>
                    <div className="text-sm font-medium text-purple-700">Total Farms</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default GeographyView
