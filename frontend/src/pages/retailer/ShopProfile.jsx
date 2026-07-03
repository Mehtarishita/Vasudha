import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  MapIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import statesData from '../../data/states-and-districts.json'

const ShopProfile = () => {
  const { user, profile: userProfile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isCapturingGPS, setIsCapturingGPS] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selectedState, setSelectedState] = useState('')
  const [availableDistricts, setAvailableDistricts] = useState([])
  const [formData, setFormData] = useState({
    shop_name: '',
    shop_type: 'pharmacy',
    owner_name: '',
    contact_phone: '',
    contact_email: '',
    alternate_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: null,
    longitude: null,
    drug_license_number: '',
    license_issue_date: '',
    license_expiry_date: '',
    gst_number: '',
    pan_number: '',
    associated_vet_id: '',
    veterinarian_name: '',
    license_document_url: '',
    gst_certificate_url: '',
    shop_photo_url: ''
  })

  useEffect(() => {
    if (user?.id) {
      loadShopProfile()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadShopProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('retailer_shops')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading shop profile:', error)
        toast.error('Failed to load shop profile: ' + error.message)
        setLoading(false)
        return
      }

      if (data) {
        setProfile(data)
        setSelectedState(data.state || '')

        // Set districts for the selected state
        if (data.state) {
          const stateObj = statesData.states.find(s => s.state === data.state)
          if (stateObj) {
            setAvailableDistricts(stateObj.districts)
          }
        }

        setFormData({
          shop_name: data.shop_name || '',
          shop_type: data.shop_type || 'pharmacy',
          owner_name: data.owner_name || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
          alternate_phone: data.alternate_phone || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          district: data.district || '',
          state: data.state || '',
          pincode: data.pincode || '',
          country: data.country || 'India',
          latitude: data.latitude,
          longitude: data.longitude,
          drug_license_number: data.drug_license_number || '',
          license_issue_date: data.license_issue_date || '',
          license_expiry_date: data.license_expiry_date || '',
          gst_number: data.gst_number || '',
          pan_number: data.pan_number || '',
          associated_vet_id: data.associated_vet_id || '',
          veterinarian_name: data.veterinarian_name || '',
          license_document_url: data.license_document_url || '',
          gst_certificate_url: data.gst_certificate_url || '',
          shop_photo_url: data.shop_photo_url || ''
        })
      } else {
        // Pre-fill with user profile data for new shop
        setFormData(prev => ({
          ...prev,
          owner_name: userProfile?.name || userProfile?.full_name || user?.user_metadata?.name || '',
          contact_phone: userProfile?.mobile_number || userProfile?.phone_number || user?.phone?.replace('+91', '') || '',
          contact_email: userProfile?.email || user?.email || ''
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name === 'state') {
      setSelectedState(value)
      const stateObj = statesData.states.find(s => s.state === value)
      if (stateObj) {
        setAvailableDistricts(stateObj.districts)
      } else {
        setAvailableDistricts([])
      }
      // Reset district when state changes
      setFormData(prev => ({
        ...prev,
        state: value,
        district: ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSaveProfile = async () => {
    try {
      // Validate required fields
      if (!formData.shop_name || !formData.owner_name || !formData.contact_phone) {
        toast.error('Please fill all required fields')
        return
      }

      if (!formData.city || !formData.district || !formData.state || !formData.pincode) {
        toast.error('Location details (City, District, State, Pincode) are required')
        return
      }

      const payload = {
        ...formData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('retailer_shops')
        .upsert(payload, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving profile:', error)
        toast.error('Failed to save shop profile')
        return
      }

      setProfile(data)
      setIsEditing(false)
      toast.success('Shop profile saved successfully!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while saving')
    }
  }

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploadingDoc(field)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${field}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('retailer-documents')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error('Failed to upload document')
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('retailer-documents')
        .getPublicUrl(fileName)

      setFormData(prev => ({
        ...prev,
        [field]: publicUrl
      }))

      toast.success('Document uploaded successfully!')
    } catch (error) {
      console.error('Error uploading:', error)
      toast.error('An error occurred during upload')
    } finally {
      setUploadingDoc(null)
    }
  }

  const handlePinLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsCapturingGPS(true)
    toast.loading('Capturing location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }))
        toast.dismiss()
        toast.success('Location captured successfully!')
        setIsCapturingGPS(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        toast.dismiss()
        toast.error('Failed to capture location. Please enable location services.')
        setIsCapturingGPS(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shop Profile</h1>
            <p className="text-gray-600 mt-1">
              Manage your shop information and documents
            </p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <PencilIcon className="h-5 w-5" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      shop_name: profile?.shop_name || '',
                      shop_type: profile?.shop_type || 'pharmacy',
                      owner_name: profile?.owner_name || '',
                      contact_phone: profile?.contact_phone || '',
                      contact_email: profile?.contact_email || '',
                      alternate_phone: profile?.alternate_phone || '',
                      address_line1: profile?.address_line1 || '',
                      address_line2: profile?.address_line2 || '',
                      city: profile?.city || '',
                      district: profile?.district || '',
                      state: profile?.state || '',
                      pincode: profile?.pincode || '',
                      country: profile?.country || 'India',
                      latitude: profile?.latitude,
                      longitude: profile?.longitude,
                      drug_license_number: profile?.drug_license_number || '',
                      license_issue_date: profile?.license_issue_date || '',
                      license_expiry_date: profile?.license_expiry_date || '',
                      gst_number: profile?.gst_number || '',
                      pan_number: profile?.pan_number || '',
                      associated_vet_id: profile?.associated_vet_id || '',
                      veterinarian_name: profile?.veterinarian_name || '',
                      license_document_url: profile?.license_document_url || '',
                      gst_certificate_url: profile?.gst_certificate_url || '',
                      shop_photo_url: profile?.shop_photo_url || ''
                    })
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckIcon className="h-5 w-5" />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Shop Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BuildingStorefrontIcon className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold">Shop Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Name <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="shop_name"
                      value={formData.shop_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Enter shop name"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.shop_name || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Type
                  </label>
                  {isEditing ? (
                    <select
                      name="shop_type"
                      value={formData.shop_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="pharmacy">Pharmacy</option>
                      <option value="veterinary_store">Veterinary Store</option>
                      <option value="feed_store">Feed Store</option>
                      <option value="animal_healthcare">Animal Healthcare</option>
                      <option value="general_store">General Store</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">
                      {profile?.shop_type?.replace('_', ' ') || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="owner_name"
                      value={formData.owner_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Enter owner name"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.owner_name || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="+91 XXXXXXXXXX"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.contact_phone || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="shop@example.com"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.contact_email || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternate Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="alternate_phone"
                      value={formData.alternate_phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="+91 XXXXXXXXXX"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.alternate_phone || 'Not set'}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Location Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPinIcon className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold">Location Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address_line1"
                      value={formData.address_line1}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Building/Street"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.address_line1 || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Area/Locality"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.address_line2 || 'Not set'}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Enter city"
                      />
                    ) : (
                      <p className="text-gray-900">{profile?.city || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select State</option>
                        {statesData.states.map((stateObj) => (
                          <option key={stateObj.state} value={stateObj.state}>
                            {stateObj.state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900 font-semibold">{profile?.state || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        disabled={!selectedState}
                      >
                        <option value="">{selectedState ? 'Select District' : 'Select State First'}</option>
                        {availableDistricts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900 font-semibold">{profile?.district || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="XXXXXX"
                        maxLength="6"
                      />
                    ) : (
                      <p className="text-gray-900">{profile?.pincode || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="pt-3 border-t">
                    <button
                      onClick={handlePinLocation}
                      disabled={isCapturingGPS}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <MapIcon className="h-5 w-5" />
                      {isCapturingGPS ? 'Capturing...' : 'Pin Current Location (GPS)'}
                    </button>
                    {formData.latitude && formData.longitude && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Location captured: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* License & Regulatory Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold">License & Regulatory Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drug License Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="drug_license_number"
                      value={formData.drug_license_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Enter drug license number"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.drug_license_number || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Issue Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="license_issue_date"
                      value={formData.license_issue_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile?.license_issue_date ? new Date(profile.license_issue_date).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Expiry Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="license_expiry_date"
                      value={formData.license_expiry_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile?.license_expiry_date ? new Date(profile.license_expiry_date).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="GSTIN"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.gst_number || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="ABCDE1234F"
                      maxLength="10"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.pan_number || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Associated Veterinarian</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Veterinarian ID
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="associated_vet_id"
                        value={formData.associated_vet_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="VET-XXXXX"
                      />
                    ) : (
                      <p className="text-gray-900">{profile?.associated_vet_id || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Veterinarian Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="veterinarian_name"
                        value={formData.veterinarian_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Dr. Name"
                      />
                    ) : (
                      <p className="text-gray-900">{profile?.veterinarian_name || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Document Uploads */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpTrayIcon className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-semibold">Upload Documents</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drug License Document
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'license_document_url')}
                      disabled={uploadingDoc === 'license_document_url'}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {formData.license_document_url && (
                      <a
                        href={formData.license_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View uploaded document
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Certificate
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'gst_certificate_url')}
                      disabled={uploadingDoc === 'gst_certificate_url'}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {formData.gst_certificate_url && (
                      <a
                        href={formData.gst_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View uploaded document
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shop Photo
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'shop_photo_url')}
                      disabled={uploadingDoc === 'shop_photo_url'}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {formData.shop_photo_url && (
                      <a
                        href={formData.shop_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View uploaded photo
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Verification Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <h3 className="text-lg font-semibold mb-3">Verification Status</h3>
              <div className={`px-4 py-2 rounded-lg text-center font-semibold ${profile?.verification_status === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : profile?.verification_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : profile?.verification_status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                {profile?.verification_status?.toUpperCase() || 'NOT SUBMITTED'}
              </div>
            </motion.div>

            {/* Location Map Placeholder */}
            {profile?.latitude && profile?.longitude && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h3 className="text-lg font-semibold mb-3">Shop Location</h3>
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Lat: {profile.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Lng: {profile.longitude.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                  >
                    View on Google Maps
                  </a>
                </div>
              </motion.div>
            )}

            {/* Quick Stats */}
            {profile && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h3 className="text-lg font-semibold mb-3">Profile Completeness</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Basic Info</span>
                    <span className={profile.shop_name && profile.owner_name ? 'text-green-600' : 'text-gray-400'}>
                      {profile.shop_name && profile.owner_name ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Location</span>
                    <span className={profile.district && profile.state ? 'text-green-600' : 'text-gray-400'}>
                      {profile.district && profile.state ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GPS Coordinates</span>
                    <span className={profile.latitude && profile.longitude ? 'text-green-600' : 'text-gray-400'}>
                      {profile.latitude && profile.longitude ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>License Details</span>
                    <span className={profile.drug_license_number ? 'text-green-600' : 'text-gray-400'}>
                      {profile.drug_license_number ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Documents</span>
                    <span className={profile.license_document_url || profile.gst_certificate_url ? 'text-green-600' : 'text-gray-400'}>
                      {profile.license_document_url || profile.gst_certificate_url ? '✓' : '○'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopProfile
