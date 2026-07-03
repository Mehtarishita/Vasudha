import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  BeakerIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

const UserRegistry = () => {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)

  const [stakeholders, setStakeholders] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [stats, setStats] = useState({
    totalStakeholders: 0,
    verified: 0,
    pending: 0,
    rejected: 0
  })

  // Map UI role filters -> profiles.user_type values
  const roleToUserType = {
    veterinarian: 'veterinarian',
    producer: 'farmer',
    retailer: 'retailer',
    lab: 'lab'
  }

  const getRoleIcon = (roleLabel) => {
    const role = (roleLabel || '').toLowerCase()
    switch (role) {
      case 'veterinarian':
        return UserIcon
      case 'producer':
        return BuildingOfficeIcon
      case 'lab':
        return BeakerIcon
      default:
        return UserGroupIcon
    }
  }

  // Fetch regulator jurisdiction
  useEffect(() => {
    const fetchRegulatorType = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('regulator_verifications')
          .select('regulator_type, jurisdiction_area, state, district, block_tehsil')
          .eq('user_id', user.id)
          .eq('status', 'verified')
          .single()

        if (!error && data) {
          setRegulatorType(data.regulator_type)
          setJurisdiction(data)
        }
      } catch (error) {
        console.error('Error fetching regulator type:', error)
      }
    }

    fetchRegulatorType()
  }, [user])

  // ---------- SUMMARY STATS (filtered by jurisdiction) ----------
  useEffect(() => {
    const fetchStats = async () => {
      if (!regulatorType) return
      
      try {
        // Base query on the view
        const base = () => {
          let query = supabase.from('stakeholder_registry')
          
          // Apply jurisdiction filters
          if (regulatorType === 'state' && jurisdiction?.state) {
            query = query.eq('state', jurisdiction.state)
          } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
            query = query.eq('state', jurisdiction.state).eq('city', jurisdiction.district)
          }
          
          return query
        }

        const [allRes, verifiedRes, pendingRes, rejectedRes] = await Promise.all([
          base().select('*', { count: 'exact', head: true }),
          base().select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
          base().select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
          base().select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected')
        ])

        setStats({
          totalStakeholders: allRes.count || 0,
          verified: verifiedRes.count || 0,
          pending: pendingRes.count || 0,
          rejected: rejectedRes.count || 0
        })
      } catch (err) {
        console.error('Error loading registry stats:', err)
        toast.error('Failed to load registry summary')
      }
    }

    fetchStats()
  }, [regulatorType, jurisdiction])

  // ---------- PAGINATED LIST ----------
  useEffect(() => {
    const fetchStakeholders = async () => {
      if (!regulatorType) return
      
      setLoading(true)
      try {
        let query = supabase
          .from('stakeholder_registry')
          .select('*', { count: 'exact' })
        
        // Apply jurisdiction filters first
        if (regulatorType === 'state' && jurisdiction?.state) {
          query = query.eq('state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          query = query.eq('state', jurisdiction.state).eq('city', jurisdiction.district)
        }

        // Role filter (server side using user_type)
        if (filterRole !== 'all') {
          const userType = roleToUserType[filterRole]
          if (userType) {
            query = query.eq('user_type', userType)
          }
        }

        // KYC / verification status from kyc_details.verification_status
        if (filterStatus !== 'all') {
          query = query.eq('verification_status', filterStatus)
        }

        // Search across name, unique_id, mobile, state, city
        if (searchQuery.trim()) {
          const q = searchQuery.trim()
          query = query.or(
            `name.ilike.%${q}%,unique_id.ilike.%${q}%,mobile_number.ilike.%${q}%,state.ilike.%${q}%,city.ilike.%${q}%`
          )
        }

        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error, count } = await query
          .order('registration_date', { ascending: false })
          .range(from, to)

        if (error) throw error

        setStakeholders(data || [])
        setTotalCount(count || 0)
      } catch (err) {
        console.error('Error loading stakeholders:', err)
        toast.error('Failed to load registry data')
      } finally {
        setLoading(false)
      }
    }

    fetchStakeholders()
  }, [searchQuery, filterRole, filterStatus, page, regulatorType, jurisdiction])

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterRole, filterStatus])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Registry</h1>
        <p className="text-gray-600">
          Government regulator view – all registered veterinarians, producers, retailers and labs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Total Stakeholders</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalStakeholders}
              </div>
            </div>
            <UserGroupIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">KYC Verified</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.verified}
              </div>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Pending Review</div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Rejected</div>
              <div className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </div>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, ID, phone, state, city..."
                className="w-full py-2 pl-10 pr-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="veterinarian">Veterinarian</option>
              <option value="producer">Producer</option>
              <option value="retailer">Retailer</option>
              <option value="lab">Laboratory</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Filter by KYC Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stakeholder List */}
      <div className="overflow-hidden bg-white shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  User ID
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  License No.
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  KYC Status
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  Registration
                </th>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stakeholders.map((s) => {
                const RoleIcon = getRoleIcon(s.role_label)
                const license =
                  s.role_label === 'Veterinarian'
                    ? s.vet_license
                    : s.role_label === 'Retailer'
                    ? s.retailer_license
                    : '-'

                const locationParts = [
                  s.city,
                  s.state,
                  s.pincode ? `PIN ${s.pincode}` : null
                ].filter(Boolean)
                const locationText = locationParts.join(', ')

                const kyc = s.verification_status || 'pending'

                return (
                  <tr key={s.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {s.unique_id || s.user_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full">
                          <RoleIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {s.name || '—'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.mobile_number || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                        {s.role_label || s.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {license || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {locationText || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          kyc === 'verified'
                            ? 'bg-green-100 text-green-700'
                            : kyc === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {kyc.charAt(0).toUpperCase() + kyc.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {s.registration_date
                        ? new Date(s.registration_date).toLocaleDateString(
                            'en-IN'
                          )
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <button
                        type="button"
                        className="font-medium text-blue-600 hover:text-blue-900"
                        onClick={() => {
                          // later you can route to a detailed view
                          console.log('View profile of', s.user_id)
                        }}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {!loading && stakeholders.length === 0 && (
          <div className="py-12 text-center">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No stakeholders found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
            <div className="text-xs text-gray-600">
              Showing{' '}
              <span className="font-semibold">
                {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}
              </span>{' '}
              to{' '}
              <span className="font-semibold">
                {Math.min(page * PAGE_SIZE, totalCount)}
              </span>{' '}
              of <span className="font-semibold">{totalCount}</span> stakeholders
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs border rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="px-6 py-3 text-xs text-gray-500">
            Loading registry from Supabase...
          </div>
        )}
      </div>
    </div>
  )
}

export default UserRegistry
