/**
 * Animal Selector Component
 * Visual grid of animals for selection
 */

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

const AnimalSelector = ({ livestock, onSelect, selectedAnimal }) => {
  return (
    <motion.div
      key="animal-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        पशु चुनें / Select Animal
      </h2>
      <p className="text-gray-600 mb-6">
        किस पशु का इलाज दर्ज करना है? नीचे से चुनें या टैग नंबर बोलें।
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {livestock.map((animal) => (
          <motion.div
            key={animal.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(animal)}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedAnimal?.id === animal.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300 bg-white'
            }`}
          >
            {selectedAnimal?.id === animal.id && (
              <CheckCircleIcon className="absolute top-2 right-2 w-6 h-6 text-green-500" />
            )}
            
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                {animal.species === 'cattle' ? '🐄' : animal.species === 'buffalo' ? '🐃' : '🐐'}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">
                  {animal.name || 'Unnamed'}
                </h3>
                <p className="text-sm text-gray-600">Tag: {animal.tag_id}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {animal.species} • {animal.gender}
                </p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    animal.health_status === 'healthy' 
                      ? 'bg-green-100 text-green-800'
                      : animal.health_status === 'sick'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {animal.health_status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {livestock.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>कोई पशु नहीं मिला। पहले पशु जोड़ें।</p>
        </div>
      )}
    </motion.div>
  )
}

export default AnimalSelector
