/**
 * Treatment Form Component
 * Collects remaining treatment details with voice + visual input
 */

import React from 'react'
import { motion } from 'framer-motion'

const TreatmentForm = ({ treatmentData, setTreatmentData, onNext, selectedAnimal, selectedDrug }) => {
  const handleChange = (field, value) => {
    setTreatmentData(prev => ({ ...prev, [field]: value }))
  }

  const isFormValid = () => {
    return treatmentData.dosage && treatmentData.administration_route
  }

  return (
    <motion.div
      key="treatment-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Treatment Details / इलाज की जानकारी
      </h2>

      {/* Summary */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Animal:</strong> {selectedAnimal?.name || selectedAnimal?.tag_id}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Drug:</strong> {selectedDrug?.salt_name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dosage */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Dosage / खुराक *
          </label>
          <input
            type="text"
            value={treatmentData.dosage}
            onChange={(e) => handleChange('dosage', e.target.value)}
            placeholder="e.g., 10 ml, 2 tablets"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            बोलें: "10 मिली लीटर" या "2 गोली"
          </p>
        </div>

        {/* Administration Route */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Route / तरीका *
          </label>
          <select
            value={treatmentData.administration_route}
            onChange={(e) => handleChange('administration_route', e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          >
            <option value="oral">Oral (मुंह से)</option>
            <option value="injection">Injection (इंजेक्शन)</option>
            <option value="topical">Topical (लगाने वाला)</option>
            <option value="intramammary">Intramammary (थन में)</option>
            <option value="pour_on">Pour On (डालने वाला)</option>
          </select>
        </div>

        {/* Administration Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date / तारीख
          </label>
          <input
            type="date"
            value={treatmentData.administration_date}
            onChange={(e) => handleChange('administration_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Purpose / उद्देश्य
          </label>
          <select
            value={treatmentData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          >
            <option value="therapeutic">Therapeutic (इलाज)</option>
            <option value="preventive">Preventive (रोकथाम)</option>
            <option value="growth_promotion">Growth Promotion (वृद्धि)</option>
          </select>
        </div>

        {/* Veterinarian Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Veterinarian / डॉक्टर का नाम
          </label>
          <input
            type="text"
            value={treatmentData.veterinarian_name}
            onChange={(e) => handleChange('veterinarian_name', e.target.value)}
            placeholder="Dr. Name"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Batch Number */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Batch Number / बैच नंबर
          </label>
          <input
            type="text"
            value={treatmentData.batch_number}
            onChange={(e) => handleChange('batch_number', e.target.value)}
            placeholder="Optional"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes / टिप्पणी
          </label>
          <textarea
            value={treatmentData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional information..."
            rows="3"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Withdrawal Period Warning */}
      {selectedDrug && selectedDrug.withdrawal_period_days > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-yellow-800 font-semibold">
            ⚠️ Withdrawal Period: {selectedDrug.withdrawal_period_days} days
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Safe to sell milk after:{' '}
            {new Date(
              new Date(treatmentData.administration_date).getTime() +
              selectedDrug.withdrawal_period_days * 24 * 60 * 60 * 1000
            ).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={onNext}
          disabled={!isFormValid()}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            isFormValid()
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next / आगे बढ़ें
        </button>
      </div>
    </motion.div>
  )
}

export default TreatmentForm
