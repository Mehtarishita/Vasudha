import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    BellAlertIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ClockIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const RetailerAlerts = () => {
    const { user } = useAuthStore()
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (user?.id) {
            loadAlerts()
        }
    }, [user])

    const loadAlerts = async () => {
        try {
            setLoading(true)
            const generatedAlerts = []

            // Fetch stock data for low stock and expiry alerts
            const { data: stockData, error: stockError } = await supabase
                .from('retailer_stock')
                .select('*')
                .eq('user_id', user.id)

            if (stockError) throw stockError

            // Generate low stock alerts
            if (stockData) {
                stockData.forEach(item => {
                    if (item.quantity_available <= 10 && item.quantity_available > 0) {
                        generatedAlerts.push({
                            id: `stock-low-${item.id}`,
                            alert_type: 'stock_low',
                            priority: item.quantity_available <= 5 ? 'high' : 'medium',
                            title: `Low Stock: ${item.drug_name}`,
                            message: `Only ${item.quantity_available} ${item.unit_type} remaining for ${item.drug_name} (Batch: ${item.batch_number})`,
                            created_at: new Date().toISOString(),
                            metadata: {
                                stock_id: item.id,
                                drug_name: item.drug_name,
                                quantity: item.quantity_available
                            }
                        })
                    }

                    // Generate expiry alerts (within 30 days)
                    if (item.expiry_date) {
                        const expiryDate = new Date(item.expiry_date)
                        const today = new Date()
                        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))

                        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                            generatedAlerts.push({
                                id: `expiry-${item.id}`,
                                alert_type: 'expiry_soon',
                                priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
                                title: `Expiring Soon: ${item.drug_name}`,
                                message: `${item.drug_name} (Batch: ${item.batch_number}) will expire in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}`,
                                created_at: new Date().toISOString(),
                                metadata: {
                                    stock_id: item.id,
                                    drug_name: item.drug_name,
                                    expiry_date: item.expiry_date,
                                    days_remaining: daysUntilExpiry
                                }
                            })
                        } else if (daysUntilExpiry <= 0) {
                            generatedAlerts.push({
                                id: `expired-${item.id}`,
                                alert_type: 'expiry_soon',
                                priority: 'high',
                                title: `EXPIRED: ${item.drug_name}`,
                                message: `${item.drug_name} (Batch: ${item.batch_number}) has expired. Remove from stock immediately.`,
                                created_at: new Date().toISOString(),
                                metadata: {
                                    stock_id: item.id,
                                    drug_name: item.drug_name,
                                    expiry_date: item.expiry_date,
                                    days_remaining: daysUntilExpiry
                                }
                            })
                        }
                    }
                })
            }

            // Fetch recent sales for sale alerts (last 24 hours)
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)

            const { data: salesData, error: salesError } = await supabase
                .from('retailer_sales')
                .select('*')
                .eq('user_id', user.id)
                .gte('sale_date', yesterday.toISOString())
                .order('sale_date', { ascending: false })
                .limit(5)

            if (salesError) throw salesError

            if (salesData && salesData.length > 0) {
                salesData.forEach(sale => {
                    generatedAlerts.push({
                        id: `sale-${sale.id}`,
                        alert_type: 'sale_recorded',
                        priority: 'low',
                        title: `Sale Recorded: ${sale.drug_name}`,
                        message: `Sold ${sale.quantity_sold} ${sale.unit_type} of ${sale.drug_name} to ${sale.buyer_name}`,
                        created_at: sale.sale_date,
                        metadata: {
                            sale_id: sale.id,
                            drug_name: sale.drug_name,
                            quantity: sale.quantity_sold,
                            buyer: sale.buyer_name
                        }
                    })
                })
            }

            // Sort alerts by priority and date
            generatedAlerts.sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 }
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                }
                return new Date(b.created_at) - new Date(a.created_at)
            })

            setAlerts(generatedAlerts)
        } catch (error) {
            console.error('Error loading alerts:', error)
            toast.error('Failed to load alerts')
        } finally {
            setLoading(false)
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getAlertIcon = (type) => {
        switch (type) {
            case 'stock_low':
                return <ExclamationTriangleIcon className="w-5 h-5" />
            case 'expiry_soon':
                return <ClockIcon className="w-5 h-5" />
            case 'sale_recorded':
                return <CheckCircleIcon className="w-5 h-5" />
            default:
                return <BellAlertIcon className="w-5 h-5" />
        }
    }

    const getAlertTypeLabel = (type) => {
        const labels = {
            stock_low: 'Low Stock',
            expiry_soon: 'Expiry Warning',
            sale_recorded: 'Sale Update'
        }
        return labels[type] || type
    }

    const filteredAlerts = alerts.filter(alert => {
        const matchesType = filterType === 'all' || alert.alert_type === filterType
        const matchesSearch = !searchQuery ||
            alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            alert.message.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesType && matchesSearch
    })

    const highPriorityCount = alerts.filter(a => a.priority === 'high').length

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="p-3 space-y-4 sm:p-4 md:p-6 sm:space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
            >
                <div>
                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Alerts & Notifications</h1>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Stay updated with important notifications
                        {highPriorityCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium text-white bg-red-600 rounded-full">
                                {highPriorityCount} urgent
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={loadAlerts}
                    className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm text-green-600 transition-colors rounded-lg sm:px-4 bg-green-50 hover:bg-green-100 sm:w-auto"
                >
                    <BellAlertIcon className="w-4 h-4" />
                    Refresh Alerts
                </button>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3 sm:flex-row sm:gap-4"
            >
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search alerts..."
                        className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <FunnelIcon className="w-5 h-5 text-gray-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="all">All Types</option>
                        <option value="stock_low">Low Stock</option>
                        <option value="expiry_soon">Expiry Warning</option>
                        <option value="sale_recorded">Sale Updates</option>
                    </select>
                </div>
            </motion.div>

            {/* Alerts List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                {filteredAlerts.length === 0 ? (
                    <div className="py-12 text-center bg-white border border-gray-200 rounded-lg">
                        <BellAlertIcon className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                            {searchQuery || filterType !== 'all'
                                ? 'No alerts match your filters'
                                : 'No alerts at this time'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            Alerts are generated from your stock and sales data
                        </p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 transition-all bg-white border-l-4 border-green-500 rounded-lg shadow-sm"
                        >
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className={`flex-shrink-0 p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                                    {getAlertIcon(alert.alert_type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col justify-between gap-2 mb-2 sm:flex-row sm:items-start">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                                                {alert.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(alert.priority)}`}>
                                                    {alert.priority.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {getAlertTypeLabel(alert.alert_type)}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(alert.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-700">{alert.message}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>

            {/* Info Footer */}
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-2">
                    <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium">About Alerts</p>
                        <p className="mt-1 text-xs">
                            Alerts are automatically generated based on your stock levels, expiry dates, and recent sales activity.
                            High priority alerts require immediate attention.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RetailerAlerts
