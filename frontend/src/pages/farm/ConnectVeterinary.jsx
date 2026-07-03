import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserGroupIcon,
  PhoneIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  VideoCameraIcon,
  CalendarIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useFarmStore } from '../../store/farmStore'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const ConnectVeterinary = () => {
  const { animals } = useFarmStore()
  const { user } = useAuthStore()
  
  // States
  const [activeTab, setActiveTab] = useState('nearby') // 'nearby' or 'requests'
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [selectedVet, setSelectedVet] = useState(null)
  const [selectedImages, setSelectedImages] = useState([])
  const [treatmentRequests, setTreatmentRequests] = useState([])
  const [nearbyVets, setNearbyVets] = useState([])
  const [loading, setLoading] = useState(false)
  const [userDistrict, setUserDistrict] = useState('')
  const [userState, setUserState] = useState('')
  const [userPincode, setUserPincode] = useState('')
  const [availableAnimals, setAvailableAnimals] = useState([])
  const [medicationTracking, setMedicationTracking] = useState({})
  
  // Form state
  const [formData, setFormData] = useState({
    animalId: '',
    animalTag: '',
    disease: '',
    symptoms: '',
    duration: '',
    severity: 'moderate',
    temperature: '',
    appetite: 'normal',
    behavior: 'normal',
    additionalNotes: '',
    urgency: 'normal',
    preferredVet: ''
  })

  // Fetch user location from profiles
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('district, state, pincode')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setUserDistrict(data.district || '')
          setUserState(data.state || '')
          setUserPincode(data.pincode || '')
        }
      } catch (error) {
        console.error('Error fetching user location:', error)
      }
    }

    fetchUserLocation()
  }, [user])

  // Fetch nearby veterinarians
  useEffect(() => {
    const fetchNearbyVets = async () => {
      if (!userDistrict) return

      setLoading(true)
      try {
        console.log('Searching for vets in district:', userDistrict, 'State:', userState)
        
        // Get all verified veterinarian profiles with same district
        const { data: vetProfilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_type', 'veterinarian')
          .eq('district', userDistrict)
          .eq('kyc_status', 'verified')

        console.log('Vet profiles found in district:', vetProfilesData?.length || 0, vetProfilesData)

        if (profilesError) {
          console.error('Error fetching vet profiles:', profilesError)
          throw profilesError
        }

        if (!vetProfilesData || vetProfilesData.length === 0) {
          console.log('No verified veterinarians found in your district')
          setNearbyVets([])
          return
        }

        // Transform the data
        const transformedVets = vetProfilesData.map(profile => ({
          id: profile.id,
          user_id: profile.id,
          name: profile.name,
          mobile_number: profile.mobile_number,
          email: profile.email || '',
          qualification: 'Veterinary Doctor',
          specialization: 'General Practice',
          experience_years: 5,
          clinic_name: '',
          clinic_address: profile.address || '',
          city: '',
          district: profile.district || '',
          state: profile.state || '',
          pincode: profile.pincode || '',
          availability_status: 'available',
          rating: 0,
          total_reviews: 0,
          is_active: true,
          verification_status: profile.kyc_status || 'verified'
        }))

        console.log('Transformed Vets:', transformedVets.length)
        setNearbyVets(transformedVets)
      } catch (error) {
        console.error('Error fetching veterinarians:', error)
        toast.error('Failed to load veterinarians')
      } finally {
        setLoading(false)
      }
    }

    fetchNearbyVets()
  }, [userDistrict, userState])

  // Fetch treatment requests
  useEffect(() => {
    const fetchTreatmentRequests = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('treatment_requests')
          .select('*')
          .eq('farmer_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setTreatmentRequests(data || [])
      } catch (error) {
        console.error('Error fetching requests:', error)
      }
    }

    fetchTreatmentRequests()
  }, [user])

  // Fetch animals from Supabase
  useEffect(() => {
    const fetchAnimals = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('livestock')
          .select('*')
          .eq('farmer_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching animals:', error)
          throw error
        }

        // Update farmStore with fetched animals
        if (data && data.length > 0) {
          // Transform data to match expected format
          const transformedAnimals = data.map(animal => ({
            id: animal.id,
            name: animal.name || `${animal.species} ${animal.tag_id}`,
            tag: animal.tag_id,
            species: animal.species,
            breed: animal.breed,
            age: animal.date_of_birth ? `${Math.floor((new Date() - new Date(animal.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))} years` : 'Unknown',
            gender: animal.gender,
            weight: animal.weight,
            health_status: animal.health_status
          }))
          setAvailableAnimals(transformedAnimals)
        } else {
          setAvailableAnimals([])
        }
      } catch (error) {
        console.error('Error fetching animals:', error)
        setAvailableAnimals([])
      }
    }

    fetchAnimals()
  }, [user])

  // Check medication schedules and send alerts
  useEffect(() => {
    const checkMedicationAlerts = () => {
      treatmentRequests.forEach(request => {
        if (request.status === 'prescription_given' && request.prescription_details) {
          try {
            const details = typeof request.prescription_details === 'string'
              ? JSON.parse(request.prescription_details)
              : request.prescription_details

            if (details.frequency && details.duration) {
              const schedule = calculateDosageSchedule(details)
              const nextDose = getNextDoseAlert(schedule, request.id)
              
              if (nextDose && nextDose.alertNow) {
                toast(
                  `🔔 Medication Alert: Time to administer ${details.drug} to ${request.animal_name}`,
                  {
                    icon: '💊',
                    duration: 6000,
                    position: 'top-right'
                  }
                )
              }
            }
          } catch (e) {
            console.error('Error parsing prescription for alerts:', e)
          }
        }
      })
    }

    // Check alerts immediately and then every 30 minutes
    checkMedicationAlerts()
    const interval = setInterval(checkMedicationAlerts, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [treatmentRequests])

  // Calculate dosage schedule based on frequency and duration
  const calculateDosageSchedule = (prescriptionDetails) => {
    const { frequency, duration, prescribed_at } = prescriptionDetails
    const startDate = new Date(prescribed_at)
    const endDate = new Date(startDate)
    
    // Parse duration properly (handle "7 days", "7", etc.)
    const durationMatch = String(duration || '0').match(/\d+/)
    const durationDays = durationMatch ? parseInt(durationMatch[0]) : 0
    endDate.setDate(endDate.getDate() + durationDays)

    let timesPerDay = 1
    let intervalHours = 24

    // Parse frequency
    if (frequency.toLowerCase().includes('once')) {
      timesPerDay = 1
      intervalHours = 24
    } else if (frequency.toLowerCase().includes('twice') || frequency.toLowerCase().includes('2')) {
      timesPerDay = 2
      intervalHours = 12
    } else if (frequency.toLowerCase().includes('thrice') || frequency.toLowerCase().includes('3')) {
      timesPerDay = 3
      intervalHours = 8
    } else if (frequency.toLowerCase().includes('four') || frequency.toLowerCase().includes('4')) {
      timesPerDay = 4
      intervalHours = 6
    }

    const schedule = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      for (let i = 0; i < timesPerDay; i++) {
        const doseTime = new Date(currentDate)
        doseTime.setHours(8 + (i * intervalHours), 0, 0, 0) // Start from 8 AM
        
        if (doseTime >= startDate && doseTime <= endDate) {
          schedule.push({
            date: doseTime,
            administered: false,
            doseNumber: schedule.length + 1
          })
        }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return schedule
  }

  // Get next dose alert information
  const getNextDoseAlert = (schedule, requestId) => {
    const now = new Date()
    const tracking = medicationTracking[requestId] || {}
    
    const nextDose = schedule.find((dose, index) => {
      const isNotAdministered = !tracking[index]
      const timeWindow = 30 * 60 * 1000 // 30 minutes
      const timeDiff = dose.date - now
      return isNotAdministered && timeDiff > -timeWindow && timeDiff < timeWindow
    })

    if (nextDose) {
      return {
        ...nextDose,
        alertNow: true
      }
    }

    return null
  }

  // Mark dose as administered
  const markDoseAdministered = (requestId, doseIndex) => {
    setMedicationTracking(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [doseIndex]: {
          administered: true,
          timestamp: new Date().toISOString()
        }
      }
    }))
    toast.success('✅ Dose marked as administered')
  }

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Auto-fill animal details when animal is selected
    if (name === 'animalId') {
      const animal = availableAnimals.find(a => a.id === value)
      if (animal) {
        setFormData(prev => ({
          ...prev,
          animalTag: animal.tag
        }))
      }
    }
  }

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const imageUrls = files.map(file => URL.createObjectURL(file))
    setSelectedImages(prev => [...prev, ...imageUrls])
  }

  // Remove image
  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Submit treatment request
  const handleSubmitRequest = async () => {
    if (!formData.animalId || !formData.disease || !formData.symptoms) {
      toast.error('Please fill all required fields')
      return
    }

    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      setLoading(true)

      const animal = availableAnimals.find(a => a.id === formData.animalId)
      
      // Get farmer details from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, mobile_number')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const requestPayload = {
        farmer_id: user.id,
        farmer_name: profileData.name,
        farmer_phone: profileData.mobile_number,
        farmer_district: userDistrict,
        farmer_state: userState,
        livestock_id: formData.animalId,
        animal_name: animal?.name || '',
        animal_tag: formData.animalTag,
        animal_species: animal?.species || '',
        animal_breed: animal?.breed || '',
        animal_age: animal?.age || '',
        disease: formData.disease,
        symptoms: formData.symptoms,
        disease_duration: formData.duration,
        severity: formData.severity,
        urgency: formData.urgency,
        farmer_notes: `Temperature: ${formData.temperature || 'N/A'}, Appetite: ${formData.appetite}, Behavior: ${formData.behavior}. ${formData.additionalNotes}`.trim(),
        preferred_veterinarian_id: selectedVet?.user_id || null,
        images: selectedImages.length > 0 ? selectedImages : null,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('treatment_requests')
        .insert([requestPayload])
        .select()
        .single()

      if (error) throw error

      toast.success('Treatment request submitted successfully!')
      
      // Refresh requests list
      setTreatmentRequests(prev => [data, ...prev])
      
      // Reset form
      setFormData({
        animalId: '',
        animalTag: '',
        disease: '',
        symptoms: '',
        duration: '',
        severity: 'moderate',
        temperature: '',
        appetite: 'normal',
        behavior: 'normal',
        additionalNotes: '',
        urgency: 'normal',
        preferredVet: ''
      })
      setSelectedImages([])
      setShowRequestForm(false)
      setSelectedVet(null)
      setActiveTab('requests')
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error('Failed to submit request: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': {
        color: 'bg-gray-100 text-gray-700',
        icon: ClockIcon,
        label: 'Pending'
      },
      'assigned': {
        color: 'bg-blue-100 text-blue-700',
        icon: UserGroupIcon,
        label: 'Assigned'
      },
      'consulted': {
        color: 'bg-yellow-100 text-yellow-700',
        icon: ChatBubbleLeftRightIcon,
        label: 'Consulted'
      },
      'prescription_given': {
        color: 'bg-purple-100 text-purple-700',
        icon: DocumentTextIcon,
        label: 'Prescription Given'
      },
      'treatment_recorded': {
        color: 'bg-green-100 text-green-700',
        icon: CheckCircleIcon,
        label: 'Treatment Recorded'
      },
      'completed': {
        color: 'bg-green-100 text-green-700',
        icon: CheckCircleIcon,
        label: 'Completed'
      },
      'cancelled': {
        color: 'bg-red-100 text-red-700',
        icon: XMarkIcon,
        label: 'Cancelled'
      }
    }
    
    const config = statusConfig[status] || statusConfig['pending']
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {config.label}
      </span>
    )
  }

  // Handle prescription acceptance
  const handleAcceptPrescription = async (requestId, prescriptionDetails) => {
    try {
      const parsedDetails = typeof prescriptionDetails === 'string' 
        ? JSON.parse(prescriptionDetails) 
        : prescriptionDetails

      // Check if vet already logged AMU
      if (parsedDetails.amu_logged_by_vet) {
        // Just update status to completed
        const { error } = await supabase
          .from('treatment_requests')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', requestId)

        if (error) throw error

        toast.success('✅ Treatment acknowledged!')
      } else {
        // Update status to treatment_recorded (farmer needs to log AMU)
        const { error } = await supabase
          .from('treatment_requests')
          .update({ 
            status: 'treatment_recorded'
          })
          .eq('id', requestId)

        if (error) throw error

        toast.success('✅ Prescription acknowledged! Please record AMU treatment.')
      }
      
      // Reload requests
      const fetchTreatmentRequests = async () => {
        try {
          const { data, error } = await supabase
            .from('treatment_requests')
            .select('*')
            .eq('farmer_id', user.id)
            .order('created_at', { ascending: false })

          if (error) throw error
          setTreatmentRequests(data || [])
        } catch (error) {
          console.error('Error fetching requests:', error)
        }
      }
      
      fetchTreatmentRequests()
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error('Failed to update request status')
    }
  }

  // Handle redirect to AMU logging page
  const handleRecordAMU = (request) => {
    // Store prescription details in localStorage for AMU page
    const prescriptionDetails = typeof request.prescription_details === 'string'
      ? JSON.parse(request.prescription_details)
      : request.prescription_details

    localStorage.setItem('pendingAMURecord', JSON.stringify({
      requestId: request.id,
      livestockId: request.livestock_id,
      animalName: request.animal_name,
      animalTag: request.animal_tag,
      prescription: prescriptionDetails
    }))

    // Navigate to AMU logging page
    window.location.href = '/app/administration'
    toast.info('Redirecting to AMU Administration...')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2 space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  Connect with Veterinarian
                </h1>
              </div>
              <p className="text-gray-600">
                Find nearby veterinarians and request consultation for your livestock
              </p>
            </div>
            
            <button
              onClick={() => setShowRequestForm(true)}
              className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              <span className="hidden sm:inline">New Request</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-6 bg-white rounded-lg shadow-sm">
          <button
            onClick={() => setActiveTab('nearby')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'nearby'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPinIcon className="w-5 h-5" />
            <span>Nearby Veterinarians</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>My Requests</span>
            {treatmentRequests.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {treatmentRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'nearby' ? (
            <motion.div
              key="nearby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2"
            >
              {loading ? (
                <div className="flex items-center justify-center py-12 col-span-full">
                  <div className="w-12 h-12 border-b-2 border-green-600 rounded-full animate-spin"></div>
                </div>
              ) : nearbyVets.length === 0 ? (
                <div className="py-12 text-center bg-white shadow-lg col-span-full rounded-2xl">
                  <MapPinIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No Veterinarians Found</h3>
                  <p className="text-gray-600">
                    No verified veterinarians found in {userDistrict}, {userState}
                  </p>
                </div>
              ) : (
                nearbyVets.map((vet) => (
                  <div
                    key={vet.id}
                    className="p-6 transition-shadow bg-white shadow-lg rounded-2xl hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-16 h-16 text-2xl font-bold text-white bg-gradient-to-br from-green-500 to-blue-500 rounded-xl">
                          {vet.name.split(' ')[1]?.[0] || vet.name[0]}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{vet.name}</h3>
                          <p className="text-sm text-gray-600">{vet.qualification}</p>
                          <div className="flex items-center mt-1 space-x-2">
                            <div className="flex items-center">
                              <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="ml-1 text-sm font-medium text-gray-700">
                                {vet.rating || 0}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">({vet.total_reviews || 0} reviews)</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          vet.availability_status === 'available'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {vet.availability_status === 'available' ? 'Available' : 'Busy'}
                      </span>
                    </div>

                    <div className="mb-4 space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <BeakerIcon className="w-4 h-4 text-blue-500" />
                        <span>{vet.specialization}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <ClockIcon className="w-4 h-4 text-green-500" />
                        <span>{vet.experience_years} years experience</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 text-red-500" />
                        <span>{vet.district}, {vet.state}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <a
                          href={`tel:${vet.mobile_number}`}
                          className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          <PhoneIcon className="w-4 h-4" />
                          <span>Call</span>
                        </a>
                        <button
                          onClick={() => {
                            setSelectedVet(vet)
                            setShowRequestForm(true)
                            setFormData(prev => ({ ...prev, preferredVet: vet.user_id }))
                          }}
                          className="flex items-center px-4 py-2 space-x-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                          <span>Request</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {treatmentRequests.length === 0 ? (
                <div className="p-12 text-center bg-white shadow-lg rounded-2xl">
                  <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No Requests Yet</h3>
                  <p className="mb-4 text-gray-600">
                    Submit a treatment request to get started
                  </p>
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="px-6 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    Create Request
                  </button>
                </div>
              ) : (
                treatmentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-6 bg-white shadow-lg rounded-2xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center mb-2 space-x-3">
                          <h3 className="text-lg font-bold text-gray-900">
                            {request.animal_name}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Disease: <span className="font-medium">{request.disease}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Veterinarian: <span className="font-medium">{request.veterinarian_name || 'Pending Assignment'}</span>
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        ID: {request.request_id}
                      </span>
                    </div>
                    
                    {/* Progress Timeline */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        {['pending', 'assigned', 'consulted', 'prescription given'].map(
                          (stage, index) => {
                            const stages = ['pending', 'assigned', 'consulted', 'prescription_given']
                            const currentIndex = stages.indexOf(request.status)
                            const isCompleted = index <= currentIndex
                            const isCurrent = index === currentIndex

                            return (
                              <React.Fragment key={stage}>
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      isCompleted
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                    } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircleIcon className="w-5 h-5" />
                                    ) : (
                                      <span className="text-xs">{index + 1}</span>
                                    )}
                                  </div>
                                  <span className="mt-1 text-xs text-gray-600 text-center max-w-[60px]">
                                    {stage.split('-').join(' ')}
                                  </span>
                                </div>
                                {index < 3 && (
                                  <div
                                    className={`flex-1 h-1 mx-2 ${
                                      index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                                    }`}
                                  />
                                )}
                              </React.Fragment>
                            )
                          }
                        )}
                      </div>
                    </div>

                    {/* Prescription Details */}
                    {request.status === 'prescription_given' && request.prescription_details && (
                      <div className="p-5 mb-4 border-2 border-green-300 shadow-md bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-green-500 rounded-lg">
                              <DocumentTextIcon className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="text-lg font-bold text-green-900">💊 Prescription Ready</h4>
                          </div>
                          <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-200 rounded-full">
                            New
                          </span>
                        </div>
                        {(() => {
                          try {
                            const details = JSON.parse(request.prescription_details)
                            return (
                              <div className="space-y-4">
                                {/* Main Drug Info */}
                                <div className="p-4 bg-white border border-green-200 rounded-lg shadow-sm">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Drug Prescribed</p>
                                      <p className="text-xl font-bold text-gray-900">{details.drug}</p>
                                      <span className="inline-block px-2 py-1 mt-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                        {details.category}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Diagnosis</p>
                                      <p className="font-semibold text-gray-900">{details.diagnosis}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Dosage Info Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <p className="mb-1 text-xs font-medium text-gray-500">💉 Dosage</p>
                                    <p className="text-lg font-bold text-gray-900">{details.dosage}</p>
                                  </div>
                                  <div className="p-3 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <p className="mb-1 text-xs font-medium text-gray-500">⏰ Frequency</p>
                                    <p className="text-lg font-bold text-gray-900 capitalize">{details.frequency}</p>
                                  </div>
                                  <div className="p-3 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <p className="mb-1 text-xs font-medium text-gray-500">📅 Duration</p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {details.duration ? `${details.duration} days` : 'As needed'}
                                    </p>
                                  </div>
                                </div>

                                {/* Medication Schedule Tracker */}
                                {details.frequency && details.duration && (() => {
                                  const schedule = calculateDosageSchedule(details)
                                  const tracking = medicationTracking[request.id] || {}
                                  const now = new Date()
                                  
                                  // Calculate progress
                                  const totalDoses = schedule.length
                                  const administeredCount = Object.keys(tracking).filter(key => tracking[key].administered).length
                                  const progressPercent = (administeredCount / totalDoses) * 100

                                  // Get upcoming doses (next 3)
                                  const upcomingDoses = schedule
                                    .map((dose, index) => ({ ...dose, index }))
                                    .filter(dose => !tracking[dose.index] && dose.date >= now)
                                    .slice(0, 3)

                                  return (
                                    <div className="p-4 border-2 border-blue-300 rounded-lg shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="p-2 bg-blue-500 rounded-lg">
                                            <BellAlertIcon className="w-5 h-5 text-white" />
                                          </div>
                                          <div>
                                            <h5 className="text-base font-bold text-blue-900">📅 Medication Schedule</h5>
                                            <p className="text-xs text-blue-700">{details.frequency} for {details.duration} days</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-blue-900">{administeredCount}/{totalDoses}</p>
                                          <p className="text-xs text-blue-600">doses given</p>
                                        </div>
                                      </div>

                                      {/* Progress Bar */}
                                      <div className="mb-4">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-medium text-blue-700">Treatment Progress</span>
                                          <span className="text-xs font-bold text-blue-900">{Math.round(progressPercent)}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-blue-200 rounded-full">
                                          <div
                                            className="h-3 transition-all duration-500 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                            style={{ width: `${progressPercent}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Upcoming Doses */}
                                      {upcomingDoses.length > 0 && (
                                        <div className="space-y-2">
                                          <h6 className="text-sm font-semibold text-blue-800">⏰ Upcoming Doses:</h6>
                                          {upcomingDoses.map((dose) => {
                                            const timeUntil = dose.date - now
                                            const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60))
                                            const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))
                                            const isUpcoming = timeUntil < 60 * 60 * 1000 // Within 1 hour

                                            return (
                                              <div
                                                key={dose.index}
                                                className={`flex items-center justify-between p-3 rounded-lg ${
                                                  isUpcoming
                                                    ? 'bg-yellow-100 border-2 border-yellow-400'
                                                    : 'bg-white border border-blue-200'
                                                }`}
                                              >
                                                <div className="flex items-center space-x-3">
                                                  {isUpcoming && (
                                                    <BellAlertIcon className="w-5 h-5 text-yellow-600 animate-pulse" />
                                                  )}
                                                  <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                      {dose.date.toLocaleString('en-IN', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                      })}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                      {isUpcoming ? (
                                                        <span className="font-semibold text-yellow-700">
                                                          ⚠️ Due in {hoursUntil > 0 ? `${hoursUntil}h ` : ''}{minutesUntil}m
                                                        </span>
                                                      ) : (
                                                        `In ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minutesUntil}m`
                                                      )}
                                                    </p>
                                                  </div>
                                                </div>
                                                <button
                                                  onClick={() => markDoseAdministered(request.id, dose.index)}
                                                  className="px-3 py-1 text-xs font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
                                                >
                                                  ✓ Mark Done
                                                </button>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}

                                      {/* All doses completed */}
                                      {administeredCount === totalDoses && (
                                        <div className="flex items-center p-3 space-x-2 bg-green-100 border border-green-300 rounded-lg">
                                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                          <p className="text-sm font-semibold text-green-800">
                                            🎉 Treatment course completed!
                                          </p>
                                        </div>
                                      )}

                                      {/* Notification Alert */}
                                      <div className="flex items-start p-3 mt-3 space-x-2 border border-blue-300 rounded-lg bg-blue-50">
                                        <BellAlertIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-900">
                                          <span className="font-semibold">📱 Smart Reminders:</span> You will receive automatic notifications 30 minutes before each scheduled dose time to ensure timely medication.
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })()}
                                
                                {/* Withdrawal Warning */}
                                <div className="p-4 border-2 border-orange-400 rounded-lg shadow-md bg-gradient-to-r from-orange-50 to-red-50">
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 p-2 bg-orange-500 rounded-lg">
                                      <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="mb-1 text-sm font-bold text-orange-900">⚠️ IMPORTANT: Withdrawal Period</p>
                                      <p className="mb-2 text-lg font-extrabold text-orange-900">
                                        Safe Date: {new Date(details.withdrawal_end).toLocaleDateString('en-IN', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </p>
                                      <p className="text-sm font-medium text-orange-800">
                                        🚫 Do NOT consume milk or meat from this animal until the safe date
                                      </p>
                                      <p className="mt-1 text-xs text-orange-700">
                                        Days remaining: {Math.ceil((new Date(details.withdrawal_end) - new Date()) / (1000 * 60 * 60 * 24))} days
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Instructions */}
                                {details.instructions && details.instructions.trim() && (
                                  <div className="p-4 bg-white border border-blue-200 rounded-lg shadow-sm">
                                    <p className="mb-2 text-xs font-medium tracking-wide text-blue-600 uppercase">📋 Special Instructions</p>
                                    <p className="text-sm leading-relaxed text-gray-900">{details.instructions}</p>
                                  </div>
                                )}

                                {/* Veterinarian Info */}
                                <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-medium text-blue-600">Prescribed By</p>
                                      <p className="text-sm font-bold text-blue-900">{request.veterinarian_name || details.prescribed_by || 'Unknown'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-blue-600">Date & Time</p>
                                      <p className="text-sm font-semibold text-blue-900">
                                        {new Date(details.prescribed_at).toLocaleString('en-IN', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          } catch (e) {
                            console.error('Error parsing prescription:', e)
                            return (
                              <div className="p-3 text-sm text-gray-700 bg-white rounded">
                                <p className="mb-2 font-semibold">Prescription Details:</p>
                                <pre className="text-xs whitespace-pre-wrap">{request.prescription_details}</pre>
                              </div>
                            )
                          }
                        })()}
                        
                        {/* Action Buttons - Check if AMU logged by vet */}
                        {(() => {
                          try {
                            const details = typeof request.prescription_details === 'string'
                              ? JSON.parse(request.prescription_details)
                              : request.prescription_details
                            const amuLoggedByVet = details.amu_logged_by_vet || false

                            if (amuLoggedByVet) {
                              return (
                                <button
                                  onClick={() => handleAcceptPrescription(request.id, details)}
                                  className="flex items-center justify-center w-full px-6 py-3 mt-5 space-x-2 text-white transition-all duration-200 transform bg-green-600 rounded-lg shadow-md hover:bg-green-700 hover:scale-105 hover:shadow-lg"
                                >
                                  <CheckCircleIcon className="w-5 h-5" />
                                  <span className="font-semibold">Acknowledge Prescription</span>
                                </button>
                              )
                            } else {
                              return (
                                <div className="flex gap-3 mt-5">
                                  <button
                                    onClick={() => handleRecordAMU(request)}
                                    className="flex items-center justify-center flex-1 px-6 py-3 space-x-2 text-white transition-all duration-200 transform bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 hover:scale-105 hover:shadow-lg"
                                  >
                                    <DocumentTextIcon className="w-5 h-5" />
                                    <span className="font-semibold">Record AMU Treatment</span>
                                  </button>
                                  <button
                                    onClick={() => handleAcceptPrescription(request.id, details)}
                                    className="px-6 py-3 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                                  >
                                    Later
                                  </button>
                                </div>
                              )
                            }
                          } catch (e) {
                            return (
                              <button
                                onClick={() => handleAcceptPrescription(request.id, request.prescription_details)}
                                className="flex items-center justify-center w-full px-6 py-3 mt-5 space-x-2 text-white transition-all duration-200 transform bg-green-600 rounded-lg shadow-md hover:bg-green-700 hover:scale-105 hover:shadow-lg"
                              >
                                <CheckCircleIcon className="w-5 h-5" />
                                <span className="font-semibold">Acknowledge</span>
                              </button>
                            )
                          }
                        })()}
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
                      {request.consultation_date && (
                        <span>Consulted: {new Date(request.consultation_date).toLocaleDateString()}</span>
                      )}
                      {request.prescription_date && (
                        <span>Prescribed: {new Date(request.prescription_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Form Modal */}
        <AnimatePresence>
          {showRequestForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowRequestForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-3xl bg-white shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Request Treatment</h2>
                    {selectedVet && (
                      <p className="text-sm text-gray-600">
                        Veterinarian: <span className="font-medium">{selectedVet.name}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowRequestForm(false)}
                    className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Animal Selection */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Select Animal *
                      </label>
                      <select
                        name="animalId"
                        value={formData.animalId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Choose animal...</option>
                        {availableAnimals.map((animal) => (
                          <option key={animal.id} value={animal.id}>
                            {animal.name} ({animal.tag}) - {animal.breed}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Animal Tag
                      </label>
                      <input
                        type="text"
                        value={formData.animalTag}
                        disabled
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Disease & Symptoms */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Disease/Condition *
                      </label>
                      <input
                        type="text"
                        name="disease"
                        value={formData.disease}
                        onChange={handleInputChange}
                        placeholder="e.g., Mastitis, Fever, Digestive Issue"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Duration
                      </label>
                      <input
                        type="text"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        placeholder="e.g., 2 days, 1 week"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Symptoms *
                    </label>
                    <textarea
                      name="symptoms"
                      value={formData.symptoms}
                      onChange={handleInputChange}
                      placeholder="Describe symptoms in detail..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Vital Signs */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Temperature (°F)
                      </label>
                      <input
                        type="text"
                        name="temperature"
                        value={formData.temperature}
                        onChange={handleInputChange}
                        placeholder="e.g., 101.5"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Appetite
                      </label>
                      <select
                        name="appetite"
                        value={formData.appetite}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="normal">Normal</option>
                        <option value="reduced">Reduced</option>
                        <option value="none">None</option>
                        <option value="increased">Increased</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Behavior
                      </label>
                      <select
                        name="behavior"
                        value={formData.behavior}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="normal">Normal</option>
                        <option value="lethargic">Lethargic</option>
                        <option value="aggressive">Aggressive</option>
                        <option value="restless">Restless</option>
                      </select>
                    </div>
                  </div>

                  {/* Severity & Urgency */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Severity
                      </label>
                      <select
                        name="severity"
                        value={formData.severity}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Urgency
                      </label>
                      <select
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Upload Images (Optional)
                    </label>
                    <div
                      className="p-8 text-center transition-colors border-2 border-gray-300 border-dashed cursor-pointer rounded-xl hover:border-green-400"
                      onClick={() => document.getElementById('imageUpload').click()}
                    >
                      <PhotoIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-600">
                        Click to upload images of the animal
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WebP up to 10MB each
                      </p>
                    </div>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {/* Image Preview */}
                    {selectedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {selectedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Upload ${index + 1}`}
                              className="object-cover w-full h-24 rounded-lg"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute p-1 text-white transition-opacity bg-red-500 rounded-full opacity-0 top-1 right-1 group-hover:opacity-100"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Additional Notes
                    </label>
                    <textarea
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleInputChange}
                      placeholder="Any other relevant information..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSubmitRequest}
                      disabled={loading}
                      className="flex items-center justify-center flex-1 px-6 py-3 space-x-2 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-5 h-5" />
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRequestForm(false)}
                      className="px-6 py-3 font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ConnectVeterinary
