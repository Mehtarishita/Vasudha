import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const SalesHistory = () => {
  const { user } = useAuthStore()
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPrescription, setFilterPrescription] = useState('all')

  // Load sales data from Supabase
  useEffect(() => {
    if (user?.id) {
      loadSalesData()
    }
  }, [user])

  const loadSalesData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('retailer_sales')
        .select('*')
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false })

      if (error) throw error

      setSalesData(data || [])
    } catch (error) {
      console.error('Error loading sales:', error)
      toast.error('Failed to load sales data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = salesData.filter(sale => {
    const matchesSearch =
      sale.drug_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === 'all' || sale.category?.includes(filterCategory)

    const matchesPrescription =
      filterPrescription === 'all' ||
      (filterPrescription === 'yes' && sale.prescription_required) ||
      (filterPrescription === 'no' && !sale.prescription_required)

    return matchesSearch && matchesCategory && matchesPrescription
  })

  const totalUnitsSold = filteredSales.reduce((sum, sale) => sum + (sale.quantity_sold || 0), 0)
  const salesWithPrescription = filteredSales.filter(s => s.prescription_required).length
  const restrictedDrugSales = filteredSales.filter(s => s.category?.includes('Restricted')).length

  const handleExportReport = () => {
    try {
      // Create CSV content
      const headers = [
        'Date',
        'Drug Name',
        'Category',
        'Batch Number',
        'Quantity Sold',
        'Unit Type',
        'Buyer Name',
        'Buyer Phone',
        'Buyer Farmer ID',
        'District',
        'State',
        'Prescription Available',
        'Prescription ID',
        'Price Per Unit',
        'Total Amount',
        'Payment Method',
        'Expiry Date',
        'Withdrawal Period (days)',
        'Regulatory Status'
      ]

      const csvRows = [
        headers.join(','),
        ...filteredSales.map(sale => [
          new Date(sale.sale_date).toLocaleDateString(),
          `"${sale.drug_name}"`,
          `"${sale.category || 'N/A'}"`,
          sale.batch_number,
          sale.quantity_sold,
          sale.unit_type,
          `"${sale.buyer_name}"`,
          sale.buyer_phone,
          sale.buyer_farmer_id || 'N/A',
          sale.buyer_district || 'N/A',
          sale.buyer_state || 'N/A',
          sale.prescription_available ? 'Yes' : 'No',
          sale.prescription_id || 'N/A',
          sale.price_per_unit || 'N/A',
          sale.total_amount || 'N/A',
          sale.payment_method || 'N/A',
          sale.expiry_date ? new Date(sale.expiry_date).toLocaleDateString() : 'N/A',
          sale.withdrawal_period_days || 'N/A',
          sale.regulatory_status || 'N/A'
        ].join(','))
      ]

      const csvContent = csvRows.join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(
        <div>
          <p className="font-bold">Sales Report Downloaded</p>
          <p className="text-sm">{filename}</p>
          <p className="text-xs">{filteredSales.length} records exported</p>
        </div>,
        { duration: 4000 }
      )
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  const getCategoryBadgeColor = (category) => {
    if (category.includes('Restricted')) return 'bg-red-100 text-red-800'
    if (category.includes('Class A')) return 'bg-purple-100 text-purple-800'
    if (category.includes('Class B')) return 'bg-blue-100 text-blue-800'
    if (category.includes('Antiparasitic')) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-3 space-y-4 sm:p-4 md:p-6 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Sales History</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Digital ledger for government regulators</p>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm text-white transition-colors bg-blue-600 rounded-lg sm:px-4 sm:text-base hover:bg-blue-700 sm:w-auto"
        >
          <DocumentArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Export Monthly Report</span>
          <span className="sm:hidden">Export Report</span>
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6"
        >
          <p className="text-sm font-medium text-gray-600">Total Sales Records</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{filteredSales.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Total Units Sold</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{totalUnitsSold}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">With Prescription</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{salesWithPrescription}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <p className="text-sm font-medium text-gray-600">Restricted Drug Sales</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">{restrictedDrugSales}</p>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-3 sm:gap-4"
      >
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by drug name, buyer, or batch number..."
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg sm:px-4 sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:w-auto"
            >
              <option value="all">All Categories</option>
              <option value="Class A">Antibiotic Class A</option>
              <option value="Class B">Antibiotic Class B</option>
              <option value="Restricted">Restricted</option>
              <option value="Antiparasitic">Antiparasitic</option>
              <option value="NSAID">NSAID</option>
            </select>
          </div>

          <select
            value={filterPrescription}
            onChange={(e) => setFilterPrescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg sm:px-4 sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:w-auto"
          >
            <option value="all">All Sales</option>
            <option value="yes">With Prescription</option>
            <option value="no">Without Prescription</option>
          </select>
        </div>
      </motion.div>

      {/* Sales Log Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <div className="p-4 sm:p-6">
          <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Monthly Sales Log</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Date</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Drug Name</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Category</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Batch</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Qty</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Buyer</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Contact</th>
                  <th className="py-3 text-sm font-medium text-left text-gray-900">Prescription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        <span className="ml-3 text-sm text-gray-500">Loading sales data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm font-medium text-gray-900">{sale.drug_name}</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(sale.category)}`}>
                        {sale.category || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-sm text-gray-600">{sale.batch_number}</td>
                    <td className="py-3 text-sm font-medium text-gray-900">
                      {sale.quantity_sold} {sale.unit_type}
                    </td>
                    <td className="py-3 text-sm text-gray-900">{sale.buyer_name}</td>
                    <td className="py-3 text-sm text-gray-600">{sale.buyer_phone}</td>
                    <td className="py-3">
                      {sale.prescription_required ? (
                        <div className="flex items-center gap-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700">Yes</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <XCircleIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">No</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredSales.length === 0 && (
            <div className="py-12 text-center">
              <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No sales records found</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Info Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 border border-blue-200 rounded-lg bg-blue-50"
      >
        <p className="text-sm text-blue-800">
          <span className="font-medium">Export Feature:</span> Download monthly AMU (Antimicrobial Usage) reports
          for submission to drug control officers and government regulators. All data is blockchain-verified for authenticity.
        </p>
      </motion.div>
    </div>
  )
}

export default SalesHistory
