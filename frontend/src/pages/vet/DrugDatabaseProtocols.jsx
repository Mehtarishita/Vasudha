import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  FunnelIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import drugDatabase from '../../data/drug_database.json'

const DrugDatabaseProtocols = () => {
  const [activeTab, setActiveTab] = useState('drugs') // 'drugs', 'protocols'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDrug, setSelectedDrug] = useState(null)

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(drugDatabase.map(drug => drug.category))
    return ['all', ...Array.from(cats)]
  }, [])

  // Filter drugs
  const filteredDrugs = useMemo(() => {
    let drugs = drugDatabase

    if (selectedCategory !== 'all') {
      drugs = drugs.filter(drug => drug.category === selectedCategory)
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      drugs = drugs.filter(drug =>
        drug.salt_name.toLowerCase().includes(searchLower) ||
        drug.category.toLowerCase().includes(searchLower)
      )
    }

    return drugs
  }, [searchTerm, selectedCategory])

  // Government treatment protocols
  const governmentProtocols = [
    {
      id: 'STG001',
      title: 'Mastitis Management Protocol',
      issuedBy: 'ICAR - National Dairy Research Institute',
      version: '2.1',
      lastUpdated: '2024-08-15',
      content: {
        diagnosis: [
          'Clinical examination of udder',
          'California Mastitis Test (CMT)',
          'Somatic Cell Count (SCC) analysis',
          'Bacteriological culture'
        ],
        treatment: [
          'Segregate affected animal immediately',
          'Strip out infected quarter completely',
          'Administer intramammary antibiotic (Amoxicillin/Cloxacillin)',
          'Systemic antibiotic therapy for severe cases',
          'Anti-inflammatory drugs (NSAIDs) if required'
        ],
        withdrawalPeriods: {
          milk: '72-96 hours',
          meat: '14 days'
        },
        prevention: [
          'Maintain clean housing and bedding',
          'Pre and post-milking teat dipping',
          'Proper milking hygiene',
          'Regular equipment sanitization'
        ]
      }
    },
    {
      id: 'STG002',
      title: 'Foot and Mouth Disease (FMD) Control',
      issuedBy: 'Department of Animal Husbandry & Dairying',
      version: '3.0',
      lastUpdated: '2024-09-20',
      content: {
        diagnosis: [
          'Fever (104-106°F)',
          'Vesicular lesions in mouth, feet, teats',
          'Excessive salivation',
          'Lameness',
          'Laboratory confirmation via PCR/ELISA'
        ],
        treatment: [
          'Immediate quarantine of affected animals',
          'Symptomatic treatment (no specific cure)',
          'Antiseptic mouth wash (Potassium permanganate)',
          'Topical antibiotics for secondary infections',
          'Nutritional support with soft feed'
        ],
        prevention: [
          'Vaccination (FMD trivalent vaccine)',
          'Biosecurity measures',
          'Movement restrictions',
          'Disinfection protocols'
        ],
        reportingRequired: 'Immediate notification to District Veterinary Officer'
      }
    },
    {
      id: 'STG003',
      title: 'Respiratory Disease Management',
      issuedBy: 'National Research Centre on Cattle',
      version: '1.5',
      lastUpdated: '2024-07-10',
      content: {
        diagnosis: [
          'Coughing and nasal discharge',
          'Rapid/labored breathing',
          'Fever (>103°F)',
          'Reduced feed intake',
          'Lung auscultation for abnormal sounds'
        ],
        treatment: [
          'Broad-spectrum antibiotics (Oxytetracycline/Tylosin)',
          'Anti-inflammatory drugs (Meloxicam)',
          'Bronchodilators if needed',
          'Vitamin supplementation',
          'Improve ventilation and reduce stress'
        ],
        withdrawalPeriods: {
          milk: '96 hours',
          meat: '21 days'
        },
        prevention: [
          'Adequate ventilation in housing',
          'Avoid overcrowding',
          'Regular vaccination',
          'Minimize stress during transport'
        ]
      }
    },
    {
      id: 'STG004',
      title: 'Antimicrobial Stewardship Guidelines',
      issuedBy: 'Ministry of Agriculture - AMR Division',
      version: '2.0',
      lastUpdated: '2024-10-01',
      content: {
        principles: [
          'Use antibiotics only when clinically indicated',
          'Prefer narrow-spectrum over broad-spectrum',
          'Complete full course of treatment',
          'Strictly observe withdrawal periods',
          'Maintain treatment records'
        ],
        prohibitedPractices: [
          'Use of antibiotics for growth promotion',
          'Prophylactic mass medication without diagnosis',
          'Use of critically important antibiotics (CIAs) as first-line',
          'Failure to maintain treatment records'
        ],
        recordKeeping: [
          'Animal identification',
          'Diagnosis and clinical signs',
          'Drug name, dosage, route, duration',
          'Withdrawal period calculation',
          'Treatment outcome'
        ],
        compliance: 'Mandatory for all registered veterinarians under Veterinary Council of India'
      }
    }
  ]

  const getCategoryColor = (category) => {
    const colors = {
      'Antibiotic': 'bg-blue-100 text-blue-700',
      'Anti-inflammatory': 'bg-orange-100 text-orange-700',
      'Antiparasitic': 'bg-green-100 text-green-700',
      'Vaccine': 'bg-purple-100 text-purple-700',
      'Vitamin': 'bg-yellow-100 text-yellow-700',
      'Hormone': 'bg-pink-100 text-pink-700',
      'NSAID': 'bg-red-100 text-red-700',
      'Coccidiostat': 'bg-teal-100 text-teal-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2 space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BookOpenIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Drug Database & Protocols
            </h1>
          </div>
          <p className="text-gray-600">
            Searchable approved drug list and government treatment guidelines
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('drugs')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'drugs'
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            <span>Approved Drugs ({drugDatabase.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('protocols')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'protocols'
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Treatment Protocols</span>
          </button>
        </div>

        {/* Drug Database Tab */}
        {activeTab === 'drugs' && (
          <>
            {/* Search and Filter */}
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-4 top-1/2" />
                <input
                  type="text"
                  placeholder="Search by drug name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="relative">
                <FunnelIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-4 top-1/2" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 bg-white border border-gray-300 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-5">
              <div className="p-4 bg-white shadow-lg rounded-xl">
                <p className="text-sm text-gray-600">Total Drugs</p>
                <p className="text-2xl font-bold text-indigo-600">{drugDatabase.length}</p>
              </div>
              <div className="p-4 bg-white shadow-lg rounded-xl">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {drugDatabase.filter(d => d.regulatory_status === 'Approved').length}
                </p>
              </div>
              <div className="p-4 bg-white shadow-lg rounded-xl">
                <p className="text-sm text-gray-600">Banned</p>
                <p className="text-2xl font-bold text-red-600">
                  {drugDatabase.filter(d => d.regulatory_status === 'BANNED').length}
                </p>
              </div>
              <div className="p-4 bg-white shadow-lg rounded-xl">
                <p className="text-sm text-gray-600">Restricted</p>
                <p className="text-2xl font-bold text-orange-600">
                  {drugDatabase.filter(d => d.regulatory_status === 'Restricted').length}
                </p>
              </div>
              <div className="p-4 bg-white shadow-lg rounded-xl">
                <p className="text-sm text-gray-600">Antibiotics</p>
                <p className="text-2xl font-bold text-blue-600">
                  {drugDatabase.filter(d => d.category === 'Antibiotic').length}
                </p>
              </div>
            </div>

            {/* Drug List */}
            <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Drug Name
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Withdrawal Period
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        MRL Limits
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDrugs.map((drug) => (
                      <tr key={drug.id} className={`hover:bg-gray-50 ${drug.regulatory_status === 'BANNED' ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{drug.salt_name}</div>
                          {drug.regulatory_status === 'BANNED' && (
                            <span className="text-xs font-bold text-red-600">⚠️ BANNED</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(drug.category)}`}>
                            {drug.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {drug.regulatory_status === 'Approved' && (
                            <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">✓ Approved</span>
                          )}
                          {drug.regulatory_status === 'BANNED' && (
                            <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">✗ BANNED</span>
                          )}
                          {drug.regulatory_status === 'Restricted' && (
                            <span className="px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">⚠ Restricted</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-blue-600">🥛 Milk:</span>
                              <span className="font-semibold text-gray-900">{drug.withdrawal_period_milk} days</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-orange-600">🥩 Meat:</span>
                              <span className="font-semibold text-gray-900">{drug.withdrawal_period_meat} days</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">Milk:</span>
                              <span className="font-semibold text-gray-900">
                                {drug.regulatory_status === 'BANNED' ? drug.mrl_limit_milk : `${drug.mrl_milk_ppb} ppb`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">Meat:</span>
                              <span className="font-semibold text-gray-900">
                                {drug.regulatory_status === 'BANNED' ? drug.mrl_limit_meat : `${drug.mrl_meat_ppb} ppb`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <button
                            onClick={() => setSelectedDrug(drug)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Treatment Protocols Tab */}
        {activeTab === 'protocols' && (
          <div className="space-y-6">
            {governmentProtocols.map((protocol) => (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white shadow-lg rounded-2xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{protocol.title}</h3>
                    <p className="text-sm text-gray-600">Issued by: {protocol.issuedBy}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                      <ShieldCheckIcon className="inline w-4 h-4 mr-1" />
                      Official
                    </span>
                    <p className="mt-1 text-xs text-gray-500">v{protocol.version}</p>
                    <p className="text-xs text-gray-500">
                      Updated: {new Date(protocol.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Diagnosis Section */}
                  {protocol.content.diagnosis && (
                    <div className="p-4 rounded-lg bg-blue-50">
                      <h4 className="mb-2 font-semibold text-blue-900">🔍 Diagnosis</h4>
                      <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                        {protocol.content.diagnosis.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Treatment Section */}
                  {protocol.content.treatment && (
                    <div className="p-4 rounded-lg bg-green-50">
                      <h4 className="mb-2 font-semibold text-green-900">💊 Treatment Protocol</h4>
                      <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                        {protocol.content.treatment.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Withdrawal Periods */}
                  {protocol.content.withdrawalPeriods && (
                    <div className="p-4 rounded-lg bg-orange-50">
                      <h4 className="mb-2 font-semibold text-orange-900">
                        <ExclamationTriangleIcon className="inline w-5 h-5 mr-1" />
                        Withdrawal Periods
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">Milk:</span>{' '}
                          <span className="text-gray-700">{protocol.content.withdrawalPeriods.milk}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Meat:</span>{' '}
                          <span className="text-gray-700">{protocol.content.withdrawalPeriods.meat}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prevention Section */}
                  {protocol.content.prevention && (
                    <div className="p-4 rounded-lg bg-purple-50">
                      <h4 className="mb-2 font-semibold text-purple-900">🛡️ Prevention Measures</h4>
                      <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                        {protocol.content.prevention.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Principles (for stewardship) */}
                  {protocol.content.principles && (
                    <div className="p-4 rounded-lg bg-indigo-50">
                      <h4 className="mb-2 font-semibold text-indigo-900">📋 Core Principles</h4>
                      <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                        {protocol.content.principles.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prohibited Practices */}
                  {protocol.content.prohibitedPractices && (
                    <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50">
                      <h4 className="mb-2 font-semibold text-red-900">
                        <ExclamationTriangleIcon className="inline w-5 h-5 mr-1" />
                        Prohibited Practices
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                        {protocol.content.prohibitedPractices.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reporting */}
                  {protocol.content.reportingRequired && (
                    <div className="p-4 rounded-lg bg-yellow-50">
                      <h4 className="mb-2 font-semibold text-yellow-900">
                        <ExclamationTriangleIcon className="inline w-5 h-5 mr-1" />
                        Mandatory Reporting
                      </h4>
                      <p className="text-sm text-gray-700">{protocol.content.reportingRequired}</p>
                    </div>
                  )}

                  {/* Compliance */}
                  {protocol.content.compliance && (
                    <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
                      <h4 className="mb-2 font-semibold text-green-900">
                        <ShieldCheckIcon className="inline w-5 h-5 mr-1" />
                        Compliance Requirement
                      </h4>
                      <p className="text-sm text-gray-700">{protocol.content.compliance}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DrugDatabaseProtocols
