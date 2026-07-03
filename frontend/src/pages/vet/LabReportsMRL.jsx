import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BeakerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import vetHelpers from '../../services/vetHelpers'
import toast from 'react-hot-toast'

const LabReportsMRL = () => {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('reports') // 'reports', 'resistance', 'failures'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [labReports, setLabReports] = useState([])
  const [resistanceData, setResistanceData] = useState([])
  const [loading, setLoading] = useState(true)

  // Load lab reports from Supabase
  useEffect(() => {
    const loadLabReports = async () => {
      if (!user?.id) return
      
      try {
        setLoading(true)
        const { data, error } = await vetHelpers.getLabReports(user.id)
        
        if (error) throw error
        
        // Transform data to match expected format
        const transformedReports = (data || []).map(sample => ({
          id: sample.id,
          sampleId: sample.sample_code,
          farmName: sample.farm?.name || 'Unknown Farm',
          farmLocation: sample.farm?.location || 'Unknown',
          animalTag: 'N/A', // Samples are from batches, not individual animals
          sampleType: sample.sample_type || 'milk',
          collectionDate: sample.collected_at,
          resultDate: sample.test_completed_at || 'Pending',
          status: sample.status === 'tested' ? 'completed' : sample.status === 'in-transit' ? 'in-progress' : 'pending',
          mrlStatus: sample.lab_status || 'pending',
          testResults: sample.test_results || {},
          overallResult: sample.lab_status === 'pass' 
            ? 'Negative for antimicrobial residues' 
            : sample.lab_status === 'fail'
            ? 'MRL EXCEEDED - Immediate action required'
            : 'Test in progress',
          labName: sample.analyst_name || 'Laboratory',
          alertSent: sample.lab_status === 'fail',
          mrlViolation: sample.mrl_violation,
          highRiskDrugs: sample.high_risk_drugs || [],
          batchId: sample.batch?.batch_id || 'N/A',
          collectorName: sample.batch?.collector?.name || 'Unknown'
        }))
        
        setLabReports(transformedReports)
        
        // Calculate resistance data from test results
        calculateResistanceProfile(transformedReports)
      } catch (error) {
        console.error('Error loading lab reports:', error)
        toast.error('Failed to load lab reports')
      } finally {
        setLoading(false)
      }
    }
    
    loadLabReports()
  }, [user])

  // Calculate resistance profile from test results
  const calculateResistanceProfile = (reports) => {
    const completedReports = reports.filter(r => r.status === 'completed' && r.testResults)
    
    if (completedReports.length === 0) {
      setResistanceData([])
      return
    }

    // Group by location/region
    const regionMap = {}
    
    completedReports.forEach(report => {
      const region = report.farmLocation || 'Unknown Region'
      
      if (!regionMap[region]) {
        regionMap[region] = {
          totalSamples: 0,
          failedDrugs: {}
        }
      }
      
      regionMap[region].totalSamples++
      
      // Count failed drugs
      Object.entries(report.testResults).forEach(([drug, data]) => {
        if (data.status === 'fail') {
          if (!regionMap[region].failedDrugs[drug]) {
            regionMap[region].failedDrugs[drug] = 0
          }
          regionMap[region].failedDrugs[drug]++
        }
      })
    })

    // Transform to resistance data format
    const resistanceProfiles = Object.entries(regionMap).map(([region, data]) => {
      const resistance = {}
      
      Object.entries(data.failedDrugs).forEach(([drug, count]) => {
        resistance[drug] = Math.round((count / data.totalSamples) * 100)
      })
      
      return {
        region: region,
        totalSamples: data.totalSamples,
        commonPathogens: [
          {
            name: 'Antimicrobial Residues Detected',
            resistance: resistance
          }
        ]
      }
    })

    setResistanceData(resistanceProfiles)
  }

  // MRL Failure alerts
  const mrlFailures = labReports.filter(r => r.mrlStatus === 'fail')

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return labReports
    
    const searchLower = searchTerm.toLowerCase()
    return labReports.filter(report =>
      report.sampleId.toLowerCase().includes(searchLower) ||
      report.farmName.toLowerCase().includes(searchLower) ||
      report.animalTag.toLowerCase().includes(searchLower)
    )
  }, [searchTerm, labReports])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">✅ Completed</span>
      case 'in-progress':
        return <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">⏳ In Progress</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">📋 Pending</span>
      default:
        return null
    }
  }

  const getMRLStatusBadge = (status) => {
    switch (status) {
      case 'pass':
        return <span className="px-3 py-1 text-sm font-bold text-green-700 bg-green-100 rounded-full">✓ MRL PASS</span>
      case 'fail':
        return <span className="px-3 py-1 text-sm font-bold text-red-700 bg-red-100 rounded-full">✗ MRL FAIL</span>
      case 'pending':
        return <span className="px-3 py-1 text-sm font-bold text-gray-700 bg-gray-100 rounded-full">⏳ Pending</span>
      default:
        return null
    }
  }

  const renderReportCard = (report) => (
    <motion.div
      key={report.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${
        report.mrlStatus === 'fail' ? 'ring-2 ring-red-500' : ''
      }`}
      onClick={() => setSelectedReport(report)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{report.farmName}</h3>
          <p className="text-sm text-gray-600">
            Sample: {report.sampleId}
          </p>
          {report.batchId !== 'N/A' && (
            <p className="text-xs text-gray-500">Batch: {report.batchId}</p>
          )}
        </div>
        <div className="text-right">
          {getStatusBadge(report.status)}
          <p className="mt-1 text-xs text-gray-500">Collector: {report.collectorName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-blue-50">
          <p className="text-xs text-blue-600">Sample Type</p>
          <p className="font-semibold text-gray-900 capitalize">{report.sampleType}</p>
        </div>
        <div className="p-3 rounded-lg bg-purple-50">
          <p className="text-xs text-purple-600">Lab Analyst</p>
          <p className="text-sm font-semibold text-gray-900">{report.labName}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50">
          <p className="text-xs text-green-600">Collection Date</p>
          <p className="font-semibold text-gray-900">
            {new Date(report.collectionDate).toLocaleDateString()}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50">
          <p className="text-xs text-orange-600">Result Date</p>
          <p className="font-semibold text-gray-900">
            {report.resultDate === 'Pending' ? 'Pending' : new Date(report.resultDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {report.status === 'completed' && (
        <>
          <div className="flex items-center justify-center p-4 mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
            {getMRLStatusBadge(report.mrlStatus)}
          </div>

          {report.testResults && Object.keys(report.testResults).length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-gray-700">Test Results:</p>
              {Object.entries(report.testResults).map(([drug, data]) => (
                <div key={drug} className="flex items-center justify-between p-2 rounded bg-gray-50">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {drug.replace(/([A-Z_])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {data.value || 'N/A'} {data.limit ? `/ ${data.limit}` : ''}
                    </span>
                    {data.status === 'pass' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.highRiskDrugs && report.highRiskDrugs.length > 0 && (
            <div className="p-3 mb-4 rounded-lg bg-yellow-50">
              <p className="mb-1 text-xs font-semibold text-yellow-800">High Risk Drugs Detected:</p>
              <p className="text-sm text-yellow-700">{report.highRiskDrugs.join(', ')}</p>
            </div>
          )}

          <div className={`p-3 rounded-lg ${
            report.mrlStatus === 'fail' ? 'bg-red-50' : 'bg-green-50'
          }`}>
            <p className="text-sm font-semibold text-gray-900">
              {report.overallResult}
            </p>
            {report.mrlViolation && (
              <p className="mt-1 text-xs text-red-600">Violation: {report.mrlViolation}</p>
            )}
            {report.alertSent && (
              <p className="mt-1 text-xs text-red-600">⚠️ Alert sent to producer</p>
            )}
          </div>
        </>
      )}
    </motion.div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-b-2 border-purple-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2 space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BeakerIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Lab Reports & MRL Monitoring
            </h1>
          </div>
          <p className="text-gray-600">
            View test results and monitor Maximum Residue Limits (MRL) compliance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-3xl font-bold text-blue-600">{labReports.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MRL Pass</p>
                <p className="text-3xl font-bold text-green-600">
                  {labReports.filter(r => r.mrlStatus === 'pass').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MRL Failures</p>
                <p className="text-3xl font-bold text-red-600">{mrlFailures.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Results</p>
                <p className="text-3xl font-bold text-gray-600">
                  {labReports.filter(r => r.status === 'in-progress').length}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <BeakerIcon className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Lab Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('resistance')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'resistance'
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            <span>Resistance Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('failures')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'failures'
                ? 'bg-red-100 text-red-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldExclamationIcon className="w-5 h-5" />
            <span>MRL Failures ({mrlFailures.length})</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'reports' && (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-4 top-1/2" />
                <input
                  type="text"
                  placeholder="Search by sample ID, farm name, or animal tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Reports */}
            {filteredReports.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {filteredReports.map(renderReportCard)}
              </div>
            ) : (
              <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                <BeakerIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No Lab Reports Found
                </h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Lab reports will appear here once samples are tested.'}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'resistance' && (
          <div className="space-y-6">
            {resistanceData.length > 0 ? (
              resistanceData.map((region) => (
                <motion.div
                  key={region.region}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-white shadow-lg rounded-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      📍 {region.region}
                    </h3>
                    <span className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
                      {region.totalSamples} sample{region.totalSamples !== 1 ? 's' : ''} tested
                    </span>
                  </div>

                  {region.commonPathogens.map((pathogen) => (
                    <div key={pathogen.name} className="mb-6">
                      <h4 className="mb-3 text-lg font-semibold text-gray-800">
                        {pathogen.name}
                      </h4>

                      {Object.keys(pathogen.resistance).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(pathogen.resistance).map(([drug, percentage]) => (
                            <div key={drug}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {drug.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className={`text-sm font-bold ${
                                  percentage > 50 ? 'text-red-600' : 
                                  percentage > 30 ? 'text-orange-600' : 
                                  'text-green-600'
                                }`}>
                                  {percentage}% detection rate
                                </span>
                              </div>
                              <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    percentage > 50 ? 'bg-red-500' : 
                                    percentage > 30 ? 'bg-orange-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No residue violations detected in this region.</p>
                      )}
                    </div>
                  ))}
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No Resistance Data Available
                </h3>
                <p className="text-gray-600">
                  Resistance profiles will appear here once lab reports are completed.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'failures' && (
          <div className="space-y-4">
            {mrlFailures.length > 0 ? (
              mrlFailures.map(renderReportCard)
            ) : (
              <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No MRL Failures
                </h3>
                <p className="text-gray-600">
                  All farms under your care are maintaining MRL compliance!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LabReportsMRL
