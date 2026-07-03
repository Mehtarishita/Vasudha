import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  QrCodeIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  BoltIcon,
  UserGroupIcon,
  TruckIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import StatCard from '../../components/common/StatCard'
import QuickActions from '../../components/common/QuickActions'
import { supabase } from '../../config/supabase'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

const RetailerDashboard = () => {
  const { profile, user } = useAuthStore()
  const [stockData, setStockData] = useState([])
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)

  // Load data from Supabase
  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load stock data
      const { data: stock, error: stockError } = await supabase
        .from('retailer_stock')
        .select('*')
        .eq('user_id', user.id)

      if (stockError) throw stockError

      // Load sales data with buyer profile information
      const { data: sales, error: salesError } = await supabase
        .from('retailer_sales')
        .select('*')
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false })

      if (salesError) throw salesError

      // Get buyer names from profiles if buyer_id exists
      if (sales && sales.length > 0) {
        const buyerIds = [...new Set(sales.map(s => s.buyer_id).filter(Boolean))]
        if (buyerIds.length > 0) {
          const { data: buyerProfiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', buyerIds)
          
          // Merge buyer names into sales data
          sales.forEach(sale => {
            if (sale.buyer_id) {
              const buyer = buyerProfiles?.find(p => p.id === sale.buyer_id)
              if (buyer) {
                sale.buyer_name = buyer.name
              }
            }
          })
        }
      }

      setStockData(stock || [])
      setSalesData(sales || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const totalUnitsSoldToday = salesData
    .filter(s => s.sale_date?.startsWith(today))
    .reduce((sum, s) => sum + (s.quantity_sold || 0), 0)
  const totalSalesToday = salesData.filter(s => s.sale_date?.startsWith(today)).length
  const lowStockItems = stockData.filter(item => (item.quantity_available || 0) < 20).length
  const totalUnitsAvailable = stockData.reduce((sum, item) => sum + (item.quantity_available || 0), 0)
  const salesWithPrescription = salesData.filter(s => s.prescription_required).length
  const complianceScore = salesData.length > 0 
    ? Math.round((salesWithPrescription / salesData.length) * 100) 
    : 100

  // Calculate category sales
  const getCategorySales = (categoryKeyword) => {
    return salesData
      .filter(s => s.category?.toLowerCase().includes(categoryKeyword.toLowerCase()))
      .reduce((sum, s) => sum + (s.quantity_sold || 0), 0)
  }

  const antibioticSales = getCategorySales('antibiotic')
  const antiparasiticSales = getCategorySales('antiparasitic')
  const nsaidSales = getCategorySales('nsaid')

  const quickActions = [
    {
      title: 'Record Sales',
      description: 'Log drug sales (Stock Out)',
      icon: ShoppingCartIcon,
      color: 'bg-gradient-to-r from-green-500 to-blue-500',
      href: '/retailer/record-sales'
    },
    {
      title: 'Stock Register',
      description: 'Manage inventory (Stock In)',
      icon: CubeIcon,
      color: 'bg-blue-500',
      href: '/retailer/stock-register'
    },
    {
      title: 'Sales History',
      description: 'View sales ledger',
      icon: ClipboardDocumentListIcon,
      color: 'bg-purple-500',
      href: '/retailer/sales-history'
    },
    {
      title: 'Shop Profile',
      description: 'Location & license details',
      icon: BuildingStorefrontIcon,
      color: 'bg-orange-500',
      href: '/retailer/shop-profile'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'sale',
      message: 'Dispensed Amoxicillin to Farmer Rajesh Kumar',
      time: '5 minutes ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'prescription',
      message: 'New e-prescription from Dr. Sharma',
      time: '15 minutes ago',
      status: 'pending'
    },
    {
      id: 3,
      type: 'inventory',
      message: 'Stock updated: Oxytetracycline (+50 units)',
      time: '1 hour ago',
      status: 'success'
    },
    {
      id: 4,
      type: 'alert',
      message: 'Expiry alert: 3 medicines expiring in 7 days',
      time: '2 hours ago',
      status: 'warning'
    }
  ]

  const alerts = [
    {
      id: 1,
      type: 'warning',
      title: 'Low Stock Alert',
      message: '5 critical medicines running low',
      time: '10 minutes ago'
    },
    {
      id: 2,
      type: 'error',
      title: 'Batch Recall',
      message: 'Recall issued for Batch #AMX-2024-456',
      time: '1 hour ago'
    },
    {
      id: 3,
      type: 'info',
      title: 'Pending Prescriptions',
      message: '8 prescriptions awaiting pickup',
      time: '2 hours ago'
    }
  ]

  const topSellingDrugs = [
    { name: 'Amoxicillin', sales: 45, revenue: 6750 },
    { name: 'Oxytetracycline', sales: 38, revenue: 5700 },
    { name: 'Ivermectin', sales: 32, revenue: 9600 },
    { name: 'Ceftiofur', sales: 28, revenue: 11200 },
    { name: 'Tylosin', sales: 22, revenue: 4400 }
  ]

  const complianceMetrics = [
    { label: 'Digital Sales', value: '100%', status: 'good' },
    { label: 'Prescription Verification', value: '98%', status: 'good' },
    { label: 'Batch Tracking', value: '100%', status: 'good' },
    { label: 'Govt Report Filing', value: 'Up to date', status: 'good' }
  ]

  const pendingPrescriptions = [
    { id: 'P-001', farmer: 'Rajesh Kumar', vet: 'Dr. Sharma', items: 3, value: 850, time: '30 min ago' },
    { id: 'P-002', farmer: 'Sunita Devi', vet: 'Dr. Patel', items: 2, value: 620, time: '1 hour ago' },
    { id: 'P-003', farmer: 'Mahesh Singh', vet: 'Dr. Sharma', items: 4, value: 1240, time: '2 hours ago' }
  ]

  return (
    <div className="space-y-6">
      {/* Header with Vasudha Trust Score */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 text-white rounded-lg bg-gradient-to-r from-green-600 to-blue-600"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2 text-2xl font-bold">{getGreeting()}, {profile?.name || user?.name || 'Retailer'}!</h1>
            <p className="opacity-90">Your pharmaceutical retail command center</p>
          </div>
          
          {/* Vasudha Trust Score Badge */}
          <div className="p-4 text-center bg-white/20 backdrop-blur-sm rounded-xl">
            <div className="flex items-center justify-center mb-2">
              <ShieldCheckIcon className="w-8 h-8 mr-2" />
              <div className="text-3xl font-bold">{complianceScore}</div>
            </div>
            <div className="text-sm font-medium">Vasudha Trust Score</div>
            <div className="mt-1 text-xs opacity-90">Excellent Compliance</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-3 rounded-lg bg-white/20">
            <div className="text-lg font-semibold">{totalUnitsSoldToday}</div>
            <div className="text-sm opacity-90">Units Sold Today</div>
          </div>
          <div className="p-3 rounded-lg bg-white/20">
            <div className="text-lg font-semibold">{totalSalesToday}</div>
            <div className="text-sm opacity-90">Sales Transactions</div>
          </div>
          <div className="p-3 rounded-lg bg-white/20">
            <div className="text-lg font-semibold">{totalUnitsAvailable}</div>
            <div className="text-sm opacity-90">Total Stock Units</div>
          </div>
          <div className="p-3 rounded-lg bg-white/20">
            <div className="text-lg font-semibold text-yellow-300">{lowStockItems}</div>
            <div className="text-sm opacity-90">Low Stock Alerts</div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales Records"
          value={salesData.length}
          change="All time transactions"
          changeType="neutral"
          icon={ShoppingCartIcon}
          color="green"
        />
        <StatCard
          title="Stock Items"
          value={stockData.length}
          change="Unique drugs in inventory"
          changeType="neutral"
          icon={CubeIcon}
          color="blue"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems}
          change="Requires reordering"
          changeType="warning"
          icon={ExclamationTriangleIcon}
          color="orange"
        />
        <StatCard
          title="Compliance Score"
          value={`${complianceScore}%`}
          change="Prescription tracking"
          changeType="positive"
          icon={ShieldCheckIcon}
          color="purple"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuickActions actions={quickActions} />
          
          {/* Top Selling Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
              <CubeIcon className="w-5 h-5 mr-2 text-blue-500" />
              Drug Category Sales (This Month)
            </h3>
            
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading data...</div>
            ) : salesData.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No sales data available</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Antibiotics</p>
                    <p className="text-xs text-gray-600">Class A & B</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">{antibioticSales}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Antiparasitics</p>
                    <p className="text-xs text-gray-600">Dewormers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{antiparasiticSales}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">NSAIDs</p>
                    <p className="text-xs text-gray-600">Pain Relief</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{nsaidSales}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent Sales */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View All →
              </button>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading sales...</div>
              ) : salesData.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">No sales recorded yet</div>
              ) : (
                salesData.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sale.drug_name}</p>
                      <p className="text-xs text-gray-600">{sale.buyer_name} • {new Date(sale.sale_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{sale.quantity_sold} {sale.unit_type}</p>
                      {sale.prescription_required && (
                        <span className="text-xs text-green-600">Rx</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Low Stock Alerts */}
          {!loading && lowStockItems > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-white border-2 border-orange-200 rounded-lg shadow-sm"
            >
              <div className="flex items-center mb-4 space-x-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Stock Alerts</h3>
              </div>
              
              <div className="space-y-2">
                {stockData
                  .filter(item => (item.quantity_available || 0) < 20)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-orange-50">
                      <p className="text-sm font-semibold text-gray-900">{item.drug_name}</p>
                      <p className="text-xs text-orange-600">Only {item.quantity_available} units left</p>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Location Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 border-2 border-green-200 rounded-lg shadow-sm bg-gradient-to-br from-green-50 to-blue-50"
          >
            <div className="flex items-center mb-4 space-x-2">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Shop Status</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">GPS Verification</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-green-600">Verified</span>
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">Total Stock Items</span>
                <span className="text-sm font-medium">{stockData.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">License Status</span>
                <span className="text-sm font-semibold text-green-600">Valid</span>
              </div>
            </div>
          </motion.div>

          {/* Compliance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex items-center mb-4 space-x-2">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Compliance</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Prescription Tracking</span>
                <span className="text-sm font-semibold text-green-600">{complianceScore}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Batch Tracking</span>
                <span className="text-sm font-semibold text-green-600">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Reports</span>
                <span className="text-sm font-semibold text-green-600">Up to date</span>
              </div>
            </div>
            
            <div className="p-3 mt-4 rounded-lg bg-green-50">
              <p className="text-xs text-green-800">
                <strong>Excellent!</strong> All compliance requirements met for this month.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default RetailerDashboard
