import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    ChartBarIcon,
    UserGroupIcon,
    HomeIcon,
    BeakerIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CalendarIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const Analytics = () => {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('30') // days

    // Analytics data
    const [stats, setStats] = useState({
        totalLivestock: 0,
        totalFarms: 0,
        healthyLivestock: 0,
        underTreatment: 0,
        totalTreatments: 0,
        activeTreatments: 0,
        complianceScore: 0
    })

    const [livestockBySpecies, setLivestockBySpecies] = useState([])
    const [treatmentsByMonth, setTreatmentsByMonth] = useState([])
    const [topDrugsUsed, setTopDrugsUsed] = useState([])
    const [withdrawalStatus, setWithdrawalStatus] = useState({
        safe: 0,
        warning: 0,
        critical: 0
    })

    useEffect(() => {
        if (user?.id) {
            loadAnalytics()
        }
    }, [user?.id, timeRange])

    const loadAnalytics = async () => {
        try {
            setLoading(true)

            // Calculate date range
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - parseInt(timeRange))

            // Load all analytics data
            await Promise.all([
                loadBasicStats(),
                loadLivestockBySpecies(),
                loadTreatmentTrends(startDate, endDate),
                loadTopDrugs(startDate, endDate),
                loadWithdrawalStatus()
            ])
        } catch (error) {
            console.error('Error loading analytics:', error)
            toast.error('Failed to load analytics data')
        } finally {
            setLoading(false)
        }
    }

    const loadBasicStats = async () => {
        try {
            // Get livestock count
            const { data: livestock, error: livestockError } = await supabase
                .from('livestock')
                .select('id, health_status')
                .eq('farmer_id', user.id)

            if (livestockError) throw livestockError

            const totalLivestock = livestock?.length || 0
            const healthyLivestock = livestock?.filter(l => l.health_status === 'Healthy').length || 0

            // Get farms count
            const { data: farms, error: farmsError } = await supabase
                .from('farms')
                .select('id')
                .eq('farmer_id', user.id)

            if (farmsError) throw farmsError

            // Get treatments count
            const { data: treatments, error: treatmentsError } = await supabase
                .from('treatments')
                .select('id, withdrawal_end_date')
                .eq('farmer_id', user.id)

            if (treatmentsError) throw treatmentsError

            const totalTreatments = treatments?.length || 0
            const activeTreatments = treatments?.filter(t =>
                new Date(t.withdrawal_end_date) >= new Date()
            ).length || 0

            const underTreatment = activeTreatments

            // Calculate compliance score
            const complianceScore = totalLivestock > 0
                ? Math.round((healthyLivestock / totalLivestock) * 100)
                : 100

            setStats({
                totalLivestock,
                totalFarms: farms?.length || 0,
                healthyLivestock,
                underTreatment,
                totalTreatments,
                activeTreatments,
                complianceScore
            })
        } catch (error) {
            console.error('Error loading basic stats:', error)
        }
    }

    const loadLivestockBySpecies = async () => {
        try {
            const { data, error } = await supabase
                .from('livestock')
                .select('species')
                .eq('farmer_id', user.id)

            if (error) throw error

            // Count by species
            const speciesCount = {}
            data?.forEach(item => {
                const species = item.species || 'Unknown'
                speciesCount[species] = (speciesCount[species] || 0) + 1
            })

            const speciesData = Object.entries(speciesCount).map(([species, count]) => ({
                species,
                count,
                percentage: stats.totalLivestock > 0 ? ((count / stats.totalLivestock) * 100).toFixed(1) : 0
            }))

            setLivestockBySpecies(speciesData.sort((a, b) => b.count - a.count))
        } catch (error) {
            console.error('Error loading livestock by species:', error)
        }
    }

    const loadTreatmentTrends = async (startDate, endDate) => {
        try {
            const { data, error } = await supabase
                .from('treatments')
                .select('administration_date')
                .eq('farmer_id', user.id)
                .gte('administration_date', startDate.toISOString())
                .lte('administration_date', endDate.toISOString())

            if (error) throw error

            // Group by month
            const monthlyData = {}
            data?.forEach(treatment => {
                const date = new Date(treatment.administration_date)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
            })

            const trends = Object.entries(monthlyData).map(([month, count]) => ({
                month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                count
            }))

            setTreatmentsByMonth(trends.sort((a, b) => a.month.localeCompare(b.month)))
        } catch (error) {
            console.error('Error loading treatment trends:', error)
        }
    }

    const loadTopDrugs = async (startDate, endDate) => {
        try {
            const { data, error } = await supabase
                .from('treatments')
                .select('drug_name, category')
                .eq('farmer_id', user.id)
                .gte('administration_date', startDate.toISOString())
                .lte('administration_date', endDate.toISOString())

            if (error) throw error

            // Count drug usage
            const drugCount = {}
            data?.forEach(treatment => {
                const drug = treatment.drug_name || 'Unknown'
                if (!drugCount[drug]) {
                    drugCount[drug] = {
                        name: drug,
                        category: treatment.category || 'Other',
                        count: 0
                    }
                }
                drugCount[drug].count++
            })

            const topDrugs = Object.values(drugCount)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)

            setTopDrugsUsed(topDrugs)
        } catch (error) {
            console.error('Error loading top drugs:', error)
        }
    }

    const loadWithdrawalStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('treatments')
                .select('withdrawal_end_date')
                .eq('farmer_id', user.id)
                .gte('withdrawal_end_date', new Date().toISOString().split('T')[0])

            if (error) throw error

            let safe = 0, warning = 0, critical = 0

            data?.forEach(treatment => {
                const endDate = new Date(treatment.withdrawal_end_date)
                const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))

                if (daysRemaining <= 1) critical++
                else if (daysRemaining <= 3) warning++
                else safe++
            })

            setWithdrawalStatus({ safe, warning, critical })
        } catch (error) {
            console.error('Error loading withdrawal status:', error)
        }
    }

    const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue' }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${color}-50`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                {trend && (
                    <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend === 'up' ? <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </motion.div>
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Farm Analytics</h1>
                    <p className="text-gray-600">Comprehensive insights into your livestock and AMU data</p>
                </div>

                {/* Time Range Selector */}
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Livestock"
                    value={stats.totalLivestock}
                    icon={UserGroupIcon}
                    color="blue"
                />
                <StatCard
                    title="Total Farms"
                    value={stats.totalFarms}
                    icon={HomeIcon}
                    color="green"
                />
                <StatCard
                    title="Healthy Animals"
                    value={stats.healthyLivestock}
                    icon={CheckCircleIcon}
                    color="emerald"
                />
                <StatCard
                    title="Under Treatment"
                    value={stats.underTreatment}
                    icon={BeakerIcon}
                    color="orange"
                />
            </div>

            {/* Compliance Score */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Farm Compliance Score</h3>
                        <p className="text-gray-600 text-sm">Based on livestock health and treatment adherence</p>
                    </div>
                    <div className="text-center">
                        <div className="text-5xl font-bold text-green-600">{stats.complianceScore}%</div>
                        <p className="text-sm text-gray-600 mt-1">Compliance Rate</p>
                    </div>
                </div>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Livestock by Species */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <UserGroupIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Livestock by Species
                    </h3>
                    <div className="space-y-3">
                        {livestockBySpecies.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No livestock data available</p>
                        ) : (
                            livestockBySpecies.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">{item.species}</span>
                                            <span className="text-sm text-gray-600">{item.count} ({item.percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${item.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Withdrawal Status */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ClockIcon className="w-5 h-5 mr-2 text-orange-600" />
                        Withdrawal Period Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center">
                                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
                                <span className="font-medium text-gray-700">Safe (4+ days)</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">{withdrawalStatus.safe}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                            <div className="flex items-center">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3" />
                                <span className="font-medium text-gray-700">Warning (2-3 days)</span>
                            </div>
                            <span className="text-2xl font-bold text-yellow-600">{withdrawalStatus.warning}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                            <div className="flex items-center">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-3" />
                                <span className="font-medium text-gray-700">Critical (≤1 day)</span>
                            </div>
                            <span className="text-2xl font-bold text-red-600">{withdrawalStatus.critical}</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* AMU Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Treatment Trends */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2 text-purple-600" />
                        Treatment Trends
                    </h3>
                    {treatmentsByMonth.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No treatment data for selected period</p>
                    ) : (
                        <div className="space-y-3">
                            {treatmentsByMonth.map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{item.month}</span>
                                    <div className="flex items-center flex-1 ml-4">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${(item.count / Math.max(...treatmentsByMonth.map(t => t.count))) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 w-8 text-right">{item.count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Top Drugs Used */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <BeakerIcon className="w-5 h-5 mr-2 text-indigo-600" />
                        Top Drugs Used
                    </h3>
                    {topDrugsUsed.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No drug usage data for selected period</p>
                    ) : (
                        <div className="space-y-3">
                            {topDrugsUsed.map((drug, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">{drug.name}</span>
                                        <span className="text-lg font-bold text-indigo-600">{drug.count}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Category: {drug.category}</span>
                                        <span className="text-gray-500">uses</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Summary Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AMU Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Treatments</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.totalTreatments}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Active Treatments</p>
                        <p className="text-3xl font-bold text-orange-600">{stats.activeTreatments}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Completed Treatments</p>
                        <p className="text-3xl font-bold text-green-600">{stats.totalTreatments - stats.activeTreatments}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default Analytics
