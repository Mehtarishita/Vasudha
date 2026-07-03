import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { motion } from 'framer-motion'
import { ShieldExclamationIcon, LockClosedIcon } from '@heroicons/react/24/outline'

const ProtectedRouteWithKYC = ({ children, requireKYC = true }) => {
  const { isAuthenticated, kycCompleted, kycStatus, profile, isLoading } = useAuthStore()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // First check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  // If KYC is required and not completed, show blocking message
  if (requireKYC && !kycCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center"
        >
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
            <LockClosedIcon className="h-10 w-10 text-orange-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            KYC Verification Required
          </h2>
          
          <p className="text-gray-600 mb-6">
            To access this feature, you need to complete your KYC verification. 
            This ensures security and compliance for all users.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <ShieldExclamationIcon className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-left text-sm">
                <p className="font-medium text-orange-900 mb-2">Current Status: {kycStatus === 'submitted' ? 'Under Review' : 'Not Verified'}</p>
                <ul className="list-disc list-inside space-y-1 text-orange-700">
                  {kycStatus === 'pending' && (
                    <>
                      <li>Complete KYC form with your details</li>
                      <li>Upload valid government ID proof</li>
                      <li>Submit for verification</li>
                    </>
                  )}
                  {kycStatus === 'submitted' && (
                    <>
                      <li>Your KYC is under review</li>
                      <li>Verification typically takes 24-48 hours</li>
                      <li>You'll be notified once verified</li>
                    </>
                  )}
                  {kycStatus === 'rejected' && (
                    <>
                      <li>Your previous KYC was rejected</li>
                      <li>Review your information and resubmit</li>
                      <li>Ensure all details match your ID</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="/app/profile"
              className="block w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Complete KYC Verification
            </a>
            <a
              href={`/dashboard/${profile?.user_type || 'producer'}`}
              className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  // If all checks pass, render the protected content
  return children
}

export default ProtectedRouteWithKYC
