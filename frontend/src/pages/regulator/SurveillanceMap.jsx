import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const geoUrl = '/india.topo.json' // district-wise topo/json in public/

// Red heat map scale for AMU volume
const getAMUHeatColor = (value) => {
  if (!value || value <= 0) return '#fee2e2' // red-100 (very light)

  // Red gradient scale based on AMU volume (in mg)
  if (value > 5000) return '#7f1d1d'  // red-900 (darkest)
  if (value > 2000) return '#991b1b'  // red-800
  if (value > 1000) return '#b91c1c'  // red-700
  if (value > 500)  return '#dc2626'  // red-600
  if (value > 200)  return '#ef4444'  // red-500
  if (value > 100)  return '#f87171'  // red-400
  if (value > 50)   return '#fca5a5'  // red-300
  return '#fecaca'  // red-200
}

const SurveillanceMap = () => {
  const { user } = useAuthStore()
  const [coverage, setCoverage] = useState([])
  const [loading, setLoading] = useState(false)
  const [regulatorType, setRegulatorType] = useState(null)
  const [jurisdiction, setJurisdiction] = useState(null)

  // zoom / pan state
  const [zoom, setZoom] = useState(1.2)
  const [center, setCenter] = useState([80, 22]) // approx India centre

  // hover info: { state, district }
  const [hoverLocation, setHoverLocation] = useState(null)

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

  // load AMU data aggregated by region
  useEffect(() => {
    const loadData = async () => {
      if (!regulatorType) return
      
      setLoading(true)
      try {
        // Fetch AMU records from amu_records table
        let amuQuery = supabase.from('amu_records').select('id, dosage, farmer_id, administration_date, drug_name')
        let producersQuery = supabase.from('profiles').select('id, state, district').eq('user_type', 'producer').eq('kyc_status', 'verified')
        
        // Apply jurisdiction filters
        if (regulatorType === 'state' && jurisdiction?.state) {
          producersQuery = producersQuery.eq('state', jurisdiction.state)
        } else if ((regulatorType === 'district' || regulatorType === 'block') && jurisdiction?.state && jurisdiction?.district) {
          producersQuery = producersQuery.eq('state', jurisdiction.state).eq('district', jurisdiction.district)
        }
        
        const [amuRes, producersRes] = await Promise.all([
          amuQuery,
          producersQuery
        ])

        if (amuRes.error) console.error('AMU error:', amuRes.error)
        if (producersRes.error) console.error('Producers error:', producersRes.error)
        
        console.log('=== AMU Surveillance Debug ===')
        console.log('AMU records fetched:', amuRes.data?.length)
        console.log('Producers fetched:', producersRes.data?.length)
        console.log('Sample AMU records:', amuRes.data?.slice(0, 5))
        console.log('Sample dosage values:', amuRes.data?.slice(0, 10).map(r => r.dosage))
        console.log('Unique farmers:', new Set(amuRes.data?.map(r => r.farmer_id)).size)
        console.log('Unique livestock:', new Set(amuRes.data?.map(r => r.livestock_id)).size)
        
        // Create a map of farmer_id to location
        const farmerLocationMap = {}
        producersRes.data?.forEach(producer => {
          farmerLocationMap[producer.id] = {
            state: producer.state || 'Unknown',
            district: producer.district || 'Unknown'
          }
        })
        
        // Aggregate AMU data by state and district
        const aggregated = {}
        
        amuRes.data?.forEach(record => {
          const location = farmerLocationMap[record.farmer_id]
          if (!location) return // Skip if farmer not found
          
          const state = location.state
          const district = location.district
          const locationKey = `${state}|${district}`
          
          if (!aggregated[locationKey]) {
            aggregated[locationKey] = {
              state,
              city: district,
              amu_volume: 0,
              amu_records_count: 0,
              total_livestock: 0
            }
          }
          
          // Parse dosage to extract numeric value
          if (record.dosage) {
            const match = record.dosage.match(/(\d+\.?\d*)/)
            const volume = match ? parseFloat(match[1]) : 0
            aggregated[locationKey].amu_volume += volume
          }
          
          aggregated[locationKey].amu_records_count += 1
        })

        console.log('Aggregated AMU data:', Object.values(aggregated))
        setCoverage(Object.values(aggregated))
      } catch (err) {
        console.error('Error loading AMU data:', err)
        toast.error('Failed to load AMU surveillance data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [regulatorType, jurisdiction])

  // aggregate by state
  const byState = useMemo(() => {
    const map = {}
    coverage.forEach((row) => {
      const state = row.state || 'Unknown'
      if (!map[state]) {
        map[state] = {
          state,
          amu_volume: 0,
          amu_records_count: 0
        }
      }
      map[state].amu_volume += row.amu_volume || 0
      map[state].amu_records_count += row.amu_records_count || 0
    })
    return Object.values(map)
  }, [coverage])

  const nationalTotals = useMemo(
    () =>
      byState.reduce(
        (acc, s) => {
          acc.amu_volume += s.amu_volume
          acc.amu_records_count += s.amu_records_count
          return acc
        },
        {
          amu_volume: 0,
          amu_records_count: 0
        }
      ),
    [byState]
  )

  const getStateAMUVolume = (stName) => {
    const row = byState.find(
      (s) =>
        s.state &&
        s.state.toLowerCase().trim() === String(stName || '').toLowerCase().trim()
    )
    return row ? row.amu_volume || 0 : 0
  }

  const topStatesAMU = useMemo(() => 
    [...byState]
      .sort((a, b) => (b.amu_volume || 0) - (a.amu_volume || 0))
      .slice(0, 5)
      .filter((s) => (s.amu_volume || 0) > 0),
    [byState]
  )

  const hoveredStateStats = useMemo(() => {
    if (!hoverLocation?.state) return null
    const row = byState.find(
      (s) =>
        s.state &&
        s.state.toLowerCase().trim() === hoverLocation.state.toLowerCase().trim()
    )
    return row || null
  }, [hoverLocation, byState])

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 8))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.8))
  const handleReset = () => {
    setZoom(1.2)
    setCenter([80, 22])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            AMU & AMR Surveillance Heatmap
          </h1>
          <p className="text-gray-600">
            Regional antimicrobial usage monitoring {regulatorType === 'central' ? 'across India' : `in ${jurisdiction?.state}${jurisdiction?.district ? `, ${jurisdiction.district}` : ''}`}.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg bg-red-50">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          <div className="text-sm">
            <div className="font-semibold text-red-900">AMU Monitoring</div>
            <div className="text-xs text-red-700">Antimicrobial Resistance</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border border-red-200 rounded-lg shadow-sm bg-gradient-to-br from-red-50 to-orange-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-red-600">Total AMU Volume</div>
              <div className="mt-1 text-3xl font-bold text-red-900">
                {nationalTotals.amu_volume.toFixed(1)} <span className="text-lg">mg</span>
              </div>
              <div className="mt-1 text-xs text-red-700">
                {regulatorType === 'central' ? 'Nationwide' : `${jurisdiction?.state}${jurisdiction?.district ? `, ${jurisdiction.district}` : ''}`}
              </div>
            </div>
            <BeakerIcon className="w-12 h-12 text-red-400" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 border border-orange-200 rounded-lg shadow-sm bg-gradient-to-br from-orange-50 to-red-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-orange-600">AMU Records</div>
              <div className="mt-1 text-3xl font-bold text-orange-900">
                {nationalTotals.amu_records_count}
              </div>
              <div className="mt-1 text-xs text-orange-700">
                Total administrations recorded
              </div>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-orange-400" />
          </div>
        </motion.div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-red-600 rounded-full border-t-transparent animate-spin"></div>
          Loading AMU surveillance data…
        </div>
      )}

      {/* AMU Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white border border-red-100 shadow-lg rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <MapIcon className="w-6 h-6 text-red-600" />
              AMU Volume Heatmap – {regulatorType === 'central' ? 'National View' : `${jurisdiction?.state}${jurisdiction?.district ? ` - ${jurisdiction.district}` : ''}`}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Darker red indicates higher antimicrobial usage (mg). Hover over regions for details.
            </p>
          </div>
          {/* Color legend */}
          <div className="flex flex-col gap-1">
            <div className="mb-1 text-xs font-medium text-gray-600">AMU Volume Scale</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Low</span>
              <div className="flex">
                <div className="w-6 h-4 bg-red-200"></div>
                <div className="w-6 h-4 bg-red-300"></div>
                <div className="w-6 h-4 bg-red-400"></div>
                <div className="w-6 h-4 bg-red-500"></div>
                <div className="w-6 h-4 bg-red-600"></div>
                <div className="w-6 h-4 bg-red-700"></div>
                <div className="w-6 h-4 bg-red-800"></div>
                <div className="w-6 h-4 bg-red-900"></div>
              </div>
              <span className="text-xs text-gray-500">High</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map with zoom controls */}
          <div className="relative lg:col-span-2">
            <div className="bg-red-50 rounded-lg border-2 border-red-200 h-[480px] flex items-center justify-center overflow-hidden">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  center: [80, 22],
                  scale: 900
                }}
                width={600}
                height={480}
                style={{ width: '100%', height: '100%' }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={center}
                  onMoveEnd={(position) => {
                    if (position.zoom) setZoom(position.zoom)
                    if (position.coordinates) setCenter(position.coordinates)
                  }}
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const props = geo.properties || {}

                        // Try multiple property names for state & district
                        const stName =
                          props.ST_NM ||
                          props.st_nm ||
                          props.STATE ||
                          props.state_name ||
                          props.NAME_1 ||
                          props.name

                        const districtName =
                          props.DISTRICT ||
                          props.district ||
                          props.DIST_NAME ||
                          props.NAME_2 ||
                          ''

                        const amuVolume = getStateAMUVolume(stName)
                        const fill = getAMUHeatColor(amuVolume)

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={() =>
                              setHoverLocation({
                                state: stName,
                                district: districtName
                              })
                            }
                            onMouseLeave={() => setHoverLocation(null)}
                            style={{
                              default: {
                                fill,
                                stroke: '#ffffff',
                                strokeWidth: 0.7,
                                outline: 'none'
                              },
                              hover: {
                                fill,
                                stroke: '#7f1d1d',
                                strokeWidth: 1.5,
                                outline: 'none'
                              },
                              pressed: {
                                fill,
                                stroke: '#7f1d1d',
                                strokeWidth: 1.5,
                                outline: 'none'
                              }
                            }}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {/* Zoom controls */}
            <div className="absolute flex flex-col overflow-hidden bg-white border-2 border-red-300 rounded-lg shadow-lg top-4 right-4">
              <button
                type="button"
                onClick={handleZoomIn}
                className="px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="px-3 py-2 text-sm font-bold text-red-700 border-t border-b border-red-200 hover:bg-red-50"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1 text-[11px] text-red-700 hover:bg-red-50"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Sidebar: top states + hover info */}
          <div className="space-y-4">
            {/* Top states by AMU */}
            <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
              <div className="mb-3 text-sm font-bold text-red-900">
                Top States by AMU Volume
              </div>
              <div className="space-y-2">
                {topStatesAMU.map((s, idx) => {
                  const totalNation = nationalTotals.amu_volume || 1
                  const v = s.amu_volume || 0
                  const pct = totalNation ? Math.round((v / totalNation) * 100) : 0
                  return (
                    <div key={s.state} className="p-2 bg-white border border-red-200 rounded">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">
                          {idx + 1}. {s.state}
                        </span>
                        <span className="font-bold text-red-700">{v.toFixed(1)} mg</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-red-100 rounded-full">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-red-500 to-red-700"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-red-600">{pct}%</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {s.amu_records_count} records
                      </div>
                    </div>
                  )
                })}

                {topStatesAMU.length === 0 && (
                  <div className="p-3 text-sm text-center text-red-400 bg-white border border-red-100 rounded">
                    No AMU data available yet
                  </div>
                )}
              </div>
            </div>

            {/* Hover details */}
            <div className="p-4 bg-white border-2 border-red-200 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-red-900">
                  {hoverLocation
                    ? `${hoverLocation.state || 'Unknown Region'}`
                    : 'Hover over map'}
                </div>
                {hoverLocation && hoveredStateStats && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                )}
              </div>

              {hoverLocation && hoveredStateStats ? (
                <div className="space-y-3">
                  {/* AMU Volume - highlighted */}
                  <div className="p-3 border border-red-300 rounded-lg bg-gradient-to-r from-red-100 to-orange-100">
                    <div className="mb-1 text-xs font-medium text-red-700">
                      Total AMU Volume
                    </div>
                    <div className="text-2xl font-bold text-red-900">
                      {hoveredStateStats.amu_volume?.toFixed(1) || 0} <span className="text-sm">mg</span>
                    </div>
                  </div>
                  
                  {/* AMU Records */}
                  <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="mb-1 text-xs font-medium text-orange-700">
                      AMU Records
                    </div>
                    <div className="text-xl font-bold text-orange-900">
                      {hoveredStateStats.amu_records_count || 0}
                    </div>
                    <div className="mt-1 text-xs text-orange-600">
                      administrations recorded
                    </div>
                  </div>

                  {/* Risk indicator */}
                  <div className="pt-2 border-t border-red-200">
                    <div className="mb-1 text-xs font-medium text-gray-600">Risk Level</div>
                    <div className="flex items-center gap-2">
                      {(hoveredStateStats.amu_volume || 0) > 2000 ? (
                        <>
                          <div className="flex-1 h-2 bg-red-700 rounded-full"></div>
                          <span className="text-xs font-bold text-red-700">HIGH</span>
                        </>
                      ) : (hoveredStateStats.amu_volume || 0) > 500 ? (
                        <>
                          <div className="flex-1 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-xs font-bold text-orange-600">MEDIUM</span>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-bold text-green-600">LOW</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-sm text-center text-gray-400">
                  Hover over a state on the map to see detailed AMU statistics and risk assessment
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SurveillanceMap
