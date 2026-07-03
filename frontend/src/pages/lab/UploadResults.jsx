import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
  BeakerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import drugDatabase from '../../data/drug_database.json'

const UploadResults = () => {
  const [pendingSamples, setPendingSamples] = useState([])
  const [selectedSample, setSelectedSample] = useState(null)
  const [selectedDrugs, setSelectedDrugs] = useState([])
  const [drugEntries, setDrugEntries] = useState({})
  const [instructions, setInstructions] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const commonDrugs = drugDatabase
    .filter(
      (d) =>
        d.regulatory_status === 'Approved' &&
        ['Antibiotic', 'Antiparasitic'].includes(d.category)
    )
    .slice(0, 10)

  const sampleTypeForMRL = (sample) =>
    (sample?.sample_type || 'milk').toLowerCase() === 'milk' ? 'milk' : 'meat'

  // Load pending / in-transit samples from Supabase
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const { data, error } = await supabase
          .from('samples')
          .select(
            `
            *,
            farms (
              name,
              farm_id
            )
          `
          )
          .in('status', ['pending', 'in-transit'])
          .order('collected_at', { ascending: false })

        if (error) throw error
        setPendingSamples(data || [])
      } catch (err) {
        console.error('Error loading samples:', err)
        toast.error('Failed to load samples')
      }
    }

    loadSamples()
  }, [])

  const resetForm = () => {
    setSelectedDrugs([])
    setDrugEntries({})
    setInstructions('')
    setProofFile(null)
  }

  const handleSampleSelect = (sample) => {
    setSelectedSample(sample)
    resetForm()
  }

  const handleAddDrug = (drugId) => {
    if (!drugId) return
    if (selectedDrugs.includes(drugId)) return

    const drug = drugDatabase.find((d) => d.id === parseInt(drugId))
    if (!drug || !selectedSample) return

    const type = sampleTypeForMRL(selectedSample)
    const requiredValue =
      type === 'milk' ? drug.mrl_milk_ppb : drug.mrl_meat_ppb

    setSelectedDrugs((prev) => [...prev, drugId])
    setDrugEntries((prev) => ({
      ...prev,
      [drugId]: {
        detectedValue: '',
        requiredValue,
        riskLevel: 'safe'
      }
    }))
  }

  const handleDetectedChange = (drugId, value) => {
    setDrugEntries((prev) => {
      const entry = prev[drugId] || {}
      const num = parseFloat(value)
      let riskLevel = entry.riskLevel || 'safe'
      if (!isNaN(num) && entry.requiredValue != null) {
        if (num > entry.requiredValue) {
          // Auto-mark as high if above limit, user can still change
          riskLevel = 'high'
        } else if (riskLevel === 'high') {
          // If user typed lower value again, reset to safe by default
          riskLevel = 'safe'
        }
      }
      return {
        ...prev,
        [drugId]: {
          ...entry,
          detectedValue: value,
          riskLevel
        }
      }
    })
  }

  const handleRiskChange = (drugId, value) => {
    setDrugEntries((prev) => ({
      ...prev,
      [drugId]: {
        ...prev[drugId],
        riskLevel: value
      }
    }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProofFile(file)
      toast.success('Test report PDF selected')
    }
  }

  // Upload PDF file to Supabase storage (bucket: lab-reports)
  const uploadPDF = async () => {
    if (!proofFile || !selectedSample) return null

    const filename = `${selectedSample.id}_${Date.now()}.pdf`

    const { data, error } = await supabase.storage
      .from('lab-reports')
      .upload(filename, proofFile)

    if (error) {
      console.error('Error uploading PDF:', error)
      toast.error('Failed to upload PDF')
      return null
    }

    const { data: urlData } = supabase.storage
      .from('lab-reports')
      .getPublicUrl(filename)

    return urlData?.publicUrl || null
  }

  const handleSubmit = async () => {
    if (!selectedSample) {
      toast.error('Please select a sample first')
      return
    }
    if (selectedDrugs.length === 0) {
      toast.error('Please add at least one drug entry')
      return
    }
    const hasEmptyDetected = selectedDrugs.some(
      (id) => !drugEntries[id] || !drugEntries[id].detectedValue
    )
    if (hasEmptyDetected) {
      toast.error('Please enter detected MRL value for all drugs')
      return
    }
    if (!proofFile) {
      toast.error('Please upload the test report PDF')
      return
    }

    try {
      setSubmitting(true)

      // 1) Build structured test result data
      const type = sampleTypeForMRL(selectedSample)

      const drugsArray = selectedDrugs.map((drugId) => {
        const entry = drugEntries[drugId]
        const drug = drugDatabase.find((d) => d.id === parseInt(drugId))
        return {
          drug_id: parseInt(drugId),
          salt_name: drug?.salt_name || '',
          category: drug?.category || '',
          detected_value: parseFloat(entry.detectedValue),
          required_mrl_value: entry.requiredValue,
          risk_level: entry.riskLevel
        }
      })

      // 2) Determine which are "higher quantity" / risky
      const violationDrugs = drugsArray.filter((d) => {
        const exceeded =
          !isNaN(d.detected_value) &&
          d.required_mrl_value != null &&
          d.detected_value > d.required_mrl_value
        const riskyLevel = d.risk_level && d.risk_level !== 'safe'
        return exceeded || riskyLevel
      })

      const overallStatus = violationDrugs.length === 0 ? 'pass' : 'fail'

      const violationMsg =
        violationDrugs.length > 0
          ? violationDrugs
              .map(
                (d) =>
                  `${d.salt_name}: ${d.detected_value} ppb (Limit ${d.required_mrl_value} ppb, risk: ${d.risk_level})`
              )
              .join('; ')
          : null

      const testResultsPayload = {
        sample_type: type,
        drugs: drugsArray,
        overall_status: overallStatus
      }

      // 3) Upload PDF
      const reportUrl = await uploadPDF()

      // 4) Update SAMPLE row
      const certificateId = `CERT-${Date.now()}`
      const { error: sampleErr } = await supabase
        .from('samples')
        .update({
          test_results: testResultsPayload,
          lab_status: overallStatus,
          mrl_violation: violationMsg,
          high_risk_drugs: violationDrugs,
          instructions,
          certificate_id: certificateId,
          test_completed_at: new Date().toISOString(),
          status: 'tested',
          report_url: reportUrl
        })
        .eq('id', selectedSample.id)

      if (sampleErr) {
        console.error('Error updating sample:', sampleErr)
        toast.error('Failed to save test report')
        setSubmitting(false)
        return
      }

      // 5) Update BATCH summary (compliance + flag)
      const complianceScore = overallStatus === 'pass' ? 100 : 0
      const batchActionNotes =
        overallStatus === 'pass'
          ? 'Batch cleared as MRL-compliant'
          : 'Batch flagged: follow instructions and hold/segregate this batch'

      const { error: batchErr } = await supabase
        .from('batches')
        .update({
          batch_mrl_status: overallStatus,
          compliance_score: complianceScore,
          flagged: overallStatus === 'fail',
          batch_action_notes: instructions || batchActionNotes
        })
        .eq('batch_id', selectedSample.batch_id)

      if (batchErr) {
        console.error('Error updating batch:', batchErr)
        toast.error('Report saved, but failed to update batch status')
      }

      // 6) Show summary toast
      toast.custom(
        (t) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`max-w-md p-6 bg-white border-2 ${
              overallStatus === 'pass' ? 'border-green-500' : 'border-red-500'
            } shadow-2xl rounded-xl`}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`p-3 ${
                  overallStatus === 'pass' ? 'bg-green-100' : 'bg-red-100'
                } rounded-full`}
              >
                {overallStatus === 'pass' ? (
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircleIcon className="w-8 h-8 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {overallStatus === 'pass'
                    ? 'Report Submitted - PASS'
                    : 'Report Submitted - FAIL'}
                </h3>
                <p className="mb-2 text-sm text-gray-600">
                  Sample{' '}
                  <span className="font-mono">
                    {selectedSample.sample_code}
                  </span>{' '}
                  for batch{' '}
                  <span className="font-mono">
                    {selectedSample.batch_id}
                  </span>{' '}
                  has been recorded.
                </p>
                <p className="mb-2 text-xs text-gray-500">
                  Certificate ID:{' '}
                  <span className="font-mono">{certificateId}</span>
                </p>

                {violationDrugs.length > 0 && (
                  <div className="p-3 mb-3 bg-red-50 rounded-lg">
                    <p className="text-xs font-semibold text-red-900">
                      Drugs detected above safe MRL or marked risky:
                    </p>
                    {violationDrugs.map((d, idx) => (
                      <p key={idx} className="text-xs text-red-700 mt-1">
                        - {d.salt_name}: {d.detected_value} ppb (Limit{' '}
                        {d.required_mrl_value} ppb, risk:{' '}
                        {d.risk_level.toUpperCase()})
                      </p>
                    ))}
                  </div>
                )}

                {instructions && (
                  <div className="p-3 mb-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-800">
                      Instructions to follow:
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      {instructions}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => toast.dismiss(t.id)}
                  className={`w-full px-4 py-2 text-sm font-medium text-white rounded-lg ${
                    overallStatus === 'pass'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        ),
        { duration: 7000 }
      )

      // 7) Reset state and remove sample from pending list
      setPendingSamples((prev) =>
        prev.filter((s) => s.id !== selectedSample.id)
      )
      setSelectedSample(null)
      resetForm()
      setSubmitting(false)
    } catch (err) {
      console.error('Error submitting report:', err)
      toast.error('Unexpected error submitting report')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-4 sm:p-6 text-white"
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Upload MRL Test Results</h1>
        <p className="text-sm sm:text-base opacity-90">
          Record MRL values, risky drugs, instructions, and upload lab report
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Sample Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center mb-4">
            <BeakerIcon className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Select Sample
            </h2>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingSamples.length > 0 ? (
              pendingSamples.map((sample) => {
                const labId =
                  sample.lab_internal_id || sample.sample_code || '—'
                const farmName =
                  sample.farms?.name ||
                  sample.farms?.farm_id ||
                  'Unknown farm'

                return (
                  <div
                    key={sample.id}
                    onClick={() => handleSampleSelect(sample)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSample?.id === sample.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900 text-sm font-mono">
                        {labId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{farmName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(sample.sample_type || 'milk')
                        .charAt(0)
                        .toUpperCase() +
                        (sample.sample_type || 'milk').slice(1)}{' '}
                      • {sample.batch_id}
                    </p>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No pending samples available
              </p>
            )}
          </div>
        </motion.div>

        {/* Test Results Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          {selectedSample ? (
            <>
              {/* Sample header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedSample.lab_internal_id ||
                      selectedSample.sample_code}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedSample.farms?.name || 'Unknown farm'} •{' '}
                    {(selectedSample.sample_type || 'milk')
                      .charAt(0)
                      .toUpperCase() +
                      (selectedSample.sample_type || 'milk').slice(1)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Batch ID</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {selectedSample.batch_id}
                  </p>
                </div>
              </div>

              {/* Drug MRL Table */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">
                    MRL Values & Risk
                  </h3>
                  <select
                    onChange={(e) => handleAddDrug(e.target.value)}
                    value=""
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Add drug...</option>
                    {commonDrugs
                      .filter(
                        (d) => !selectedDrugs.includes(d.id.toString())
                      )
                      .map((drug) => (
                        <option key={drug.id} value={drug.id}>
                          {drug.salt_name} ({drug.category})
                        </option>
                      ))}
                  </select>
                </div>

                {selectedDrugs.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Drug
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            MRL Detected (ppb)
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Required MRL (ppb)
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Risk
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDrugs.map((drugId) => {
                          const drug = drugDatabase.find(
                            (d) => d.id === parseInt(drugId)
                          )
                          const entry = drugEntries[drugId] || {}
                          const exceeded =
                            entry.detectedValue &&
                            entry.requiredValue != null &&
                            parseFloat(entry.detectedValue) >
                              entry.requiredValue

                          return (
                            <tr key={drugId} className="border-t">
                              <td className="px-4 py-2 text-gray-800">
                                {drug?.salt_name || 'Unknown'}{' '}
                                <span className="block text-[11px] text-gray-500">
                                  {drug?.category}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={entry.detectedValue || ''}
                                  onChange={(e) =>
                                    handleDetectedChange(
                                      drugId,
                                      e.target.value
                                    )
                                  }
                                  className={`w-full px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                    exceeded
                                      ? 'border-red-300 bg-red-50'
                                      : 'border-gray-300'
                                  }`}
                                  placeholder="Detected"
                                />
                              </td>
                              <td className="px-4 py-2 text-gray-800">
                                {entry.requiredValue != null
                                  ? entry.requiredValue
                                  : '—'}
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={entry.riskLevel || 'safe'}
                                  onChange={(e) =>
                                    handleRiskChange(drugId, e.target.value)
                                  }
                                  className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                  <option value="safe">Safe (No)</option>
                                  <option value="moderate">
                                    Moderate
                                  </option>
                                  <option value="high">
                                    High / Risky (Yes)
                                  </option>
                                </select>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">
                    Add drugs to record detected and required MRL values.
                  </p>
                )}
              </div>

              {/* Instructions to follow */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions to Follow (Actions for Batch / Collector /
                  Producer)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  placeholder="Example: Hold this batch for further investigation; inform collector and producer; segregate milk from farms X/Y if possible..."
                />
              </div>

              {/* Upload PDF */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Test Report PDF
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {proofFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentArrowUpIcon className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {proofFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(proofFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setProofFile(null)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="text-center">
                        <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload PDF report
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Final lab report / chromatogram output
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={
                  selectedDrugs.length === 0 || !proofFile || submitting
                }
                className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <BeakerIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a sample from the left to start entering report.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default UploadResults
