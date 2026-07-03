import React, { useState } from 'react'
import drugData from '../../../data/drug_database.json'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

const AntibioticsDetails = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategory , Filter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const categories = ['all', ...new Set(drugData.map(d => d.category))]
  const statuses = ['all', ...new Set(drugData.map(d => d.regulatory_status))]

  const filteredDrugs = drugData.filter(drug => {
    const matchesSearch = drug.salt_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drug.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || drug.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || drug.regulatory_status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusBadge = (status) => {
    const colors = {
      'Approved': 'bg-green-100 text-green-800',
      'Restricted': 'bg-yellow-100 text-yellow-800',
      'BANNED': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Drug Database</h1>
      <p className="text-gray-600 mb-6">Browse all available veterinary drugs with their details, MRL limits, and withdrawal periods.</p>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by drug name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredDrugs.length} of {drugData.length} drugs
          </span>
        </div>
      </div>

      {/* Drugs Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Drug Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Withdrawal (days)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">MRL Limits</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDrugs.map((drug, i) => (
              <tr key={drug.id} className="hover:bg-green-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{drug.salt_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{drug.category}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(drug.regulatory_status)}`}>
                    {drug.regulatory_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div>Milk: {drug.withdrawal_period_milk}d</div>
                  <div>Meat: {drug.withdrawal_period_meat}d</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div>Milk: {drug.mrl_limit_milk}</div>
                  <div>Meat: {drug.mrl_limit_meat}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                  {drug.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDrugs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No drugs found matching your filters.
        </div>
      )}
    </div>
  )
}

export default AntibioticsDetails
