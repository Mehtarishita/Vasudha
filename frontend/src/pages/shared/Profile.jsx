import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import KYCVerification from '../../components/common/KYCVerification'
import QRCodeDisplay from '../../components/common/QRCodeDisplay'

const Profile = () => {
  const { user, profile, kycCompleted, kycStatus, kycData } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [showQRCode, setShowQRCode] = useState(false)

  const getKYCStatusBadge = () => {
    // Check kycStatus from store (which comes from kyc_details.verification_status)
    if (kycStatus === 'verified' || kycCompleted) {
      return (
        <div className="flex items-center px-3 py-1 space-x-2 text-sm text-green-800 bg-green-100 rounded-full">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Verified</span>
        </div>
      )
    } else if (kycStatus === 'submitted') {
      return (
        <div className="flex items-center px-3 py-1 space-x-2 text-sm text-yellow-800 bg-yellow-100 rounded-full">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Pending</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center px-3 py-1 space-x-2 text-sm text-red-800 bg-red-100 rounded-full">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Not Verified</span>
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">User Profile</h1>
          <p className="text-sm text-gray-600 sm:text-base">Manage your account settings and identity verification</p>
        </div>
      </div>

      {/* KYC Alert Banner */}
      {!kycCompleted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border border-orange-200 rounded-lg bg-orange-50"
        >
          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="h-6 w-6 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-orange-900">Complete KYC Verification</h3>
              <p className="mt-1 text-sm text-orange-700">
                Your account has limited access. Complete KYC verification to unlock all features and ensure compliance.
              </p>
              <button
                onClick={() => setActiveTab('kyc')}
                className="mt-3 text-sm font-medium text-orange-900 underline hover:text-orange-800"
              >
                Verify Now →
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex px-4 space-x-4 overflow-x-auto sm:space-x-8 sm:px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-2 whitespace-nowrap ${activeTab === 'kyc'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <span>KYC Verification</span>
              {!kycCompleted && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Required
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Profile Header */}
              <div className="flex flex-col gap-4 pb-6 border-b sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex items-center justify-center flex-shrink-0 w-16 h-16 text-xl font-bold text-white rounded-full sm:h-20 sm:w-20 bg-gradient-to-br from-blue-500 to-blue-600 sm:text-2xl">
                    {profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate sm:text-xl">{profile?.name || 'User'}</h2>
                    <p className="text-xs text-gray-500 capitalize sm:text-sm">{profile?.user_type || user?.role || 'User'}</p>
                    <div className="mt-2">
                      {getKYCStatusBadge()}
                    </div>
                  </div>
                </div>
                <button className="flex items-center justify-center w-full px-4 py-2 space-x-2 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 sm:w-auto">
                  <PencilIcon className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Edit Profile</span>
                </button>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center mb-2 space-x-2 text-sm font-medium text-gray-500">
                      <EnvelopeIcon className="w-4 h-4" />
                      <span>Email Address</span>
                    </label>
                    <p className="text-gray-900">{user?.email || 'Not provided'}</p>
                  </div>

                  <div>
                    <label className="flex items-center mb-2 space-x-2 text-sm font-medium text-gray-500">
                      <PhoneIcon className="w-4 h-4" />
                      <span>Phone Number</span>
                    </label>
                    <p className="text-gray-900">{profile?.mobile_number || user?.phone || 'Not provided'}</p>
                  </div>

                  <div>
                    <label className="flex items-center mb-2 space-x-2 text-sm font-medium text-gray-500">
                      <MapPinIcon className="w-4 h-4" />
                      <span>Address</span>
                    </label>
                    <p className="text-gray-900">{profile?.address || kycData?.complete_address || 'Not provided'}</p>
                  </div>

                  <div>
                    <label className="flex items-center mb-2 space-x-2 text-sm font-medium text-gray-500">
                      <MapPinIcon className="w-4 h-4" />
                      <span>Pincode</span>
                    </label>
                    <p className="text-gray-900">{profile?.pincode || kycData?.pincode || 'Not provided'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {profile?.user_type === 'producer' && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500">User Type</label>
                      <p className="text-gray-900 capitalize">{profile?.user_type}</p>
                    </div>
                  )}

                  {profile?.user_type === 'veterinarian' && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500">User Type</label>
                      <p className="text-gray-900 capitalize">{profile?.user_type}</p>
                    </div>
                  )}

                  {profile?.user_type === 'lab' && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500">User Type</label>
                      <p className="text-gray-900 capitalize">{profile?.user_type}</p>
                    </div>
                  )}

                  {profile?.user_type === 'collector' && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500">User Type</label>
                      <p className="text-gray-900 capitalize">{profile?.user_type}</p>
                    </div>
                  )}

                  {profile?.user_type === 'regulator' && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-500">User Type</label>
                      <p className="text-gray-900 capitalize">{profile?.user_type}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Status */}
              <div className="pt-6 border-t">
                <h3 className="mb-4 text-base font-medium text-gray-900 sm:text-lg">Account Status</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 rounded-lg bg-gray-50">
                    <div className="mb-1 text-sm font-medium text-gray-500">Account Status</div>
                    <div className="text-lg font-semibold text-green-600">Active</div>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50">
                    <div className="mb-1 text-sm font-medium text-gray-500">KYC Status</div>
                    <div className="text-lg font-semibold">
                      {kycCompleted ? (
                        <span className="text-green-600">Verified ✓</span>
                      ) : (
                        <span className="text-orange-600">Pending</span>
                      )}
                    </div>
                  </div>

                  {kycCompleted && profile?.unique_id && (
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="mb-1 text-sm font-medium text-gray-500">Unique ID</div>
                      <div className="text-lg font-semibold text-blue-600">{profile.unique_id}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Section - Only for Verified Users */}
              {kycCompleted && profile?.unique_id && (
                <div className="pt-6 border-t">
                  <h3 className="mb-4 text-base font-medium text-gray-900 sm:text-lg">Your QR Code</h3>
                  <div className="p-4 border-2 border-green-200 rounded-lg bg-gradient-to-br from-green-50 to-blue-50 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3 space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <QrCodeIcon className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Digital Identity Card</h4>
                            <p className="text-sm text-gray-600">Verified User - ID: {profile.unique_id}</p>
                          </div>
                        </div>
                        <p className="mb-4 text-sm text-gray-600">
                          Your personal QR code contains your verified identity information. Use it for quick verification at collection centers, labs, and regulatory checkpoints.
                        </p>
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg sm:w-auto bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 sm:text-base"
                        >
                          <QrCodeIcon className="w-5 h-5 mr-2" />
                          View QR Code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'kyc' && (
            <KYCVerification />
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && profile?.unique_id && (
          <QRCodeDisplay
            profile={profile}
            onClose={() => setShowQRCode(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Profile
