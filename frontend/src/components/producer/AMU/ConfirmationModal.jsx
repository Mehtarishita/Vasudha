/**
 * Confirmation Modal Component
 * Shows all treatment details for final confirmation
 */

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

const ConfirmationModal = ({ treatmentData, selectedAnimal, selectedDrug, onConfirm, onCancel }) => {
  const withdrawalEndDate = new Date(
    new Date(treatmentData.administration_date).getTime() +
    (selectedDrug?.withdrawal_period_days || 0) * 24 * 60 * 60 * 1000
  )

  return (
    <motion.div
      key="confirmation"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Confirm Treatment / पुष्टि करें
      </h2>

      {/* Animal Details */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
        <h3 className="font-bold text-gray-800 mb-2">Animal Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-semibold">{selectedAnimal?.name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600">Tag ID:</span>
            <span className="ml-2 font-semibold">{selectedAnimal?.tag_id}</span>
          </div>
          <div>
            <span className="text-gray-600">Species:</span>
            <span className="ml-2 font-semibold capitalize">{selectedAnimal?.species}</span>
          </div>
          <div>
            <span className="text-gray-600">Gender:</span>
            <span className="ml-2 font-semibold capitalize">{selectedAnimal?.gender}</span>
          </div>
        </div>
      </div>

      {/* Drug Details */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
        <h3 className="font-bold text-gray-800 mb-2">Drug Details</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600">Drug Name:</span>
            <span className="ml-2 font-semibold">{selectedDrug?.salt_name}</span>
          </div>
          <div>
            <span className="text-gray-600">Category:</span>
            <span className="ml-2 font-semibold capitalize">{selectedDrug?.category}</span>
          </div>
          <div>
            <span className="text-gray-600">Regulatory Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
              selectedDrug?.regulatory_status === 'banned' || selectedDrug?.regulatory_status === 'high_risk'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {selectedDrug?.regulatory_status || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Treatment Details */}
      <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
        <h3 className="font-bold text-gray-800 mb-2">Treatment Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Dosage:</span>
            <span className="ml-2 font-semibold">{treatmentData.dosage}</span>
          </div>
          <div>
            <span className="text-gray-600">Route:</span>
            <span className="ml-2 font-semibold capitalize">{treatmentData.administration_route}</span>
          </div>
          <div>
            <span className="text-gray-600">Date:</span>
            <span className="ml-2 font-semibold">
              {new Date(treatmentData.administration_date).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Purpose:</span>
            <span className="ml-2 font-semibold capitalize">{treatmentData.purpose}</span>
          </div>
          {treatmentData.veterinarian_name && (
            <div>
              <span className="text-gray-600">Veterinarian:</span>
              <span className="ml-2 font-semibold">{treatmentData.veterinarian_name}</span>
            </div>
          )}
          {treatmentData.batch_number && (
            <div>
              <span className="text-gray-600">Batch:</span>
              <span className="ml-2 font-semibold">{treatmentData.batch_number}</span>
            </div>
          )}
        </div>
        {treatmentData.notes && (
          <div className="mt-3">
            <span className="text-gray-600">Notes:</span>
            <p className="mt-1 text-sm">{treatmentData.notes}</p>
          </div>
        )}
      </div>

      {/* Withdrawal Warning */}
      {selectedDrug && selectedDrug.withdrawal_period_days > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <XMarkIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-red-800">Withdrawal Period Active</h4>
              <p className="text-sm text-red-700 mt-1">
                <strong>Duration:</strong> {selectedDrug.withdrawal_period_days} days
              </p>
              <p className="text-sm text-red-700">
                <strong>Safe to sell milk after:</strong> {withdrawalEndDate.toLocaleDateString()}
              </p>
              <p className="text-sm text-red-600 mt-2 font-semibold">
                ⚠️ Do not sell milk during withdrawal period!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
        >
          Cancel / रद्द करें
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="w-5 h-5" />
          Confirm / पुष्टि करें
        </button>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        बोलें: "Confirm karo" या "Cancel karo"
      </p>
    </motion.div>
  )
}

export default ConfirmationModal
