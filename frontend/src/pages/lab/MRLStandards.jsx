import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import drugDatabase from '../../data/drug_database.json'

const MRLStandards = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredDrugs = drugDatabase.filter(drug => {
    const matchesSearch = drug.salt_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || drug.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || drug.regulatory_status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = [...new Set(drugDatabase.map(d => d.category))]

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-4 sm:p-6 text-white"
      >
        <h1 className="text-xl sm:text-2xl font-bold mb-2">MRL Standards Database</h1>
        <p className="text-sm sm:text-base opacity-90">Reference library for Maximum Residue Limits (FSSAI/Codex)</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-blue-200 p-4"
        >
          <p className="text-sm text-gray-600">Total Drugs</p>
          <p className="text-3xl font-bold text-blue-600">{drugDatabase.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-green-200 p-4"
        >
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-3xl font-bold text-green-600">
            {drugDatabase.filter(d => d.regulatory_status === 'Approved').length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-red-200 p-4"
        >
          <p className="text-sm text-gray-600">Banned</p>
          <p className="text-3xl font-bold text-red-600">
            {drugDatabase.filter(d => d.regulatory_status === 'BANNED').length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-sm border border-orange-200 p-4"
        >
          <p className="text-sm text-gray-600">Restricted</p>
          <p className="text-3xl font-bold text-orange-600">
            {drugDatabase.filter(d => d.regulatory_status === 'Restricted').length}
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search drug name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Approved">Approved</option>
              <option value="BANNED">Banned</option>
              <option value="Restricted">Restricted</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Drugs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Drug Name
                </th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Category
                </th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  MRL Milk
                </th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  MRL Meat
                </th>
                <th className="px-2 md:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Withdrawal Period
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDrugs.map((drug) => (
                <tr key={drug.id} className={`hover:bg-gray-50 ${
                  drug.regulatory_status === 'BANNED' ? 'bg-red-50' : ''
                }`}>
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap max-w-[180px] md:max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate">{drug.salt_name}</div>
                    <div className="text-xs text-gray-500 truncate">{drug.description?.substring(0, 50)}...</div>
                  </td>
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {drug.category}
                    </span>
                  </td>
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      drug.regulatory_status === 'Approved' ? 'bg-green-100 text-green-800' :
                      drug.regulatory_status === 'BANNED' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {drug.regulatory_status}
                    </span>
                  </td>
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm">
                    {drug.regulatory_status === 'BANNED' ? (
                      <span className="font-bold text-red-600">BANNED</span>
                    ) : (
                      <span className="font-mono text-gray-900">{drug.mrl_milk_ppb} ppb</span>
                    )}
                  </td>
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm">
                    {drug.regulatory_status === 'BANNED' ? (
                      <span className="font-bold text-red-600">BANNED</span>
                    ) : (
                      <span className="font-mono text-gray-900">{drug.mrl_meat_ppb} ppb</span>
                    )}
                  </td>
                  <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {drug.regulatory_status === 'BANNED' ? (
                      <span className="text-red-600">N/A</span>
                    ) : (
                      <>
                        Milk: {drug.withdrawal_period_milk}d / Meat: {drug.withdrawal_period_meat}d
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default MRLStandards
