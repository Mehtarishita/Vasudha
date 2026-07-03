import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const FlaggedSamples = () => {
  const { user } = useAuthStore()
  const [flaggedSamples, setFlaggedSamples] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFlaggedSamples = async () => {
      if (!user?.id) return
      
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
          .eq('assigned_to', user.id)
          .or("status.eq.flagged,lab_status.eq.fail")
          .order('collected_at', { ascending: false })

        if (error) throw error
        setFlaggedSamples(data || [])
      } catch (err) {
        console.error('Error loading flagged samples:', err)
      } finally {
        setLoading(false)
      }
    }

    loadFlaggedSamples()
  }, [user])

  if (loading) return <p className="p-6 text-gray-600">Loading...</p>

  return (
    <div className="px-2 mx-auto space-y-6 sm:px-4 md:px-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 text-white rounded-lg bg-gradient-to-r from-red-600 to-orange-600 sm:p-6"
      >
        <h1 className="mb-2 text-xl font-bold sm:text-2xl">Flagged & Rejected Samples</h1>
        <p className="text-sm sm:text-base opacity-90">Discrepancies and MRL violations requiring attention</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white border border-red-200 rounded-lg shadow-sm"
        >
          <p className="text-sm text-gray-600">Rejected at Reception</p>
          <p className="text-3xl font-bold text-red-600">
            {flaggedSamples.filter(s => s.status === 'flagged').length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white border border-orange-200 rounded-lg shadow-sm"
        >
          <p className="text-sm text-gray-600">MRL Test Failures</p>
          <p className="text-3xl font-bold text-orange-600">
            {flaggedSamples.filter(s => s.lab_status === 'fail').length}
          </p>
        </motion.div>
      </div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {flaggedSamples.length === 0 && (
          <p className="py-10 text-center text-gray-500">No flagged samples</p>
        )}

        {flaggedSamples.map((sample) => {
          const farmName = sample.farms?.name || 'Unknown Farm'
          const rejection = sample.status === 'flagged'
          const fail = sample.lab_status === 'fail'

          return (
            <div
              key={sample.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                rejection ? 'border-red-300' : 'border-orange-300'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  {rejection ? (
                    <XCircleIcon className="w-6 h-6 mt-1 mr-3 text-red-600" />
                  ) : (
                    <ExclamationTriangleIcon className="w-6 h-6 mt-1 mr-3 text-orange-600" />
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {sample.lab_internal_id || sample.sample_code}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">
                        {sample.batch_id}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      {farmName} • {sample.sample_type || 'Milk'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    rejection
                      ? 'bg-red-100 text-red-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {rejection ? 'REJECTED' : 'MRL FAILURE'}
                </span>
              </div>

              {/* Failure / Rejection Reasons */}
              <div
                className={`p-4 rounded-lg ${
                  rejection ? 'bg-red-50' : 'bg-orange-50'
                }`}
              >
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {rejection ? 'Rejection Reason:' : 'Failure Details:'}
                </p>

                <p className="text-sm text-gray-700">
                  {sample.mrl_violation ||
                    sample.rejection_reason ||
                    sample.failureReason ||
                    'No details provided'}
                </p>
              </div>

              {/* Reception inspection fields */}
              {rejection && (
                <div className="grid grid-cols-1 gap-4 mt-4 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-gray-600">Seal Intact:</span>
                    <span
                      className={`ml-2 font-medium ${
                        sample.seal_intact ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {sample.seal_intact ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-600">Temperature OK:</span>
                    <span
                      className={`ml-2 font-medium ${
                        sample.temperature_ok ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {sample.temperature_ok ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-600">Chain of Custody:</span>
                    <span
                      className={`ml-2 font-medium ${
                        sample.chain_of_custody === 'verified'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {sample.chain_of_custody || 'unknown'}
                    </span>
                  </div>
                </div>
              )}

              {/* Test Results (MRL Failures) */}
              {fail && sample.test_results?.drugs && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Drugs Detected Above MRL:
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {sample.test_results.drugs.map((drug, idx) => {
                      if (
                        drug.detected_value > drug.required_mrl_value ||
                        drug.risk_level !== 'safe'
                      ) {
                        return (
                          <div
                            key={idx}
                            className="p-2 text-xs border border-red-200 rounded bg-red-50"
                          >
                            <span className="font-medium text-red-800">
                              {drug.salt_name}
                            </span>
                            <br />
                            <span className="text-gray-700">
                              {drug.detected_value} ppb (limit{' '}
                              {drug.required_mrl_value})
                            </span>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  View Details
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                  Send Alert to Regulator
                </button>
              </div>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

export default FlaggedSamples
