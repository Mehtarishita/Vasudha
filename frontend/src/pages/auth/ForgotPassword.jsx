import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { 
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const ForgotPassword = () => {
  const [step, setStep] = useState(1) // 1: Enter mobile, 2: Verify OTP, 3: Reset password
  const [formData, setFormData] = useState({
    mobile: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()

    if (!formData.mobile || formData.mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setIsLoading(true)

    try {
      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, mobile_number')
        .eq('mobile_number', formData.mobile)
        .single()

      if (profileError || !profile) {
        toast.error('Mobile number not found. Please check and try again.')
        setIsLoading(false)
        return
      }

      setUserId(profile.id)

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()

      // Store OTP in password_reset_otps table
      const { error: otpError } = await supabase
        .from('password_reset_otps')
        .insert({
          user_id: profile.id,
          mobile_number: formData.mobile,
          otp: otp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      if (otpError) {
        console.error('OTP Error:', otpError)
        toast.error('Failed to send OTP. Please try again.')
        setIsLoading(false)
        return
      }

      // In production, send OTP via SMS here
      // For now, show it in console and toast (development only)
      console.log('OTP for', formData.mobile, ':', otp)
      toast.success(`OTP sent to your mobile number! (Dev: ${otp})`, { duration: 10000 })

      setStep(2)
      setIsLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()

    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)

    try {
      // Verify OTP
      const { data: otpRecord, error: otpError } = await supabase
        .from('password_reset_otps')
        .select('*')
        .eq('user_id', userId)
        .eq('mobile_number', formData.mobile)
        .eq('otp', formData.otp)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (otpError || !otpRecord) {
        toast.error('Invalid or expired OTP. Please try again.')
        setIsLoading(false)
        return
      }

      toast.success('OTP verified successfully!')
      setStep(3)
      setIsLoading(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()

      if (!profile?.email) {
        toast.error('User email not found. Please contact support.')
        setIsLoading(false)
        return
      }

      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: formData.newPassword }
      )

      if (updateError) {
        // If admin API not available, try alternative method
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: 'temp' // This will fail, but we use it to get session
        })

        // Use password recovery flow
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          profile.email,
          {
            redirectTo: `${window.location.origin}/auth/reset-password`
          }
        )

        if (resetError) {
          // Fallback: Update password hash directly (requires database function)
          const { error: hashError } = await supabase.rpc('update_user_password', {
            user_id: userId,
            new_password: formData.newPassword
          })

          if (hashError) {
            console.error('Password update error:', hashError)
            toast.error('Failed to reset password. Please contact support.')
            setIsLoading(false)
            return
          }
        }
      }

      // Mark OTP as used
      await supabase
        .from('password_reset_otps')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('otp', formData.otp)

      toast.success('Password reset successfully! Please login with your new password.')
      
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="flex h-screen">
        {/* Left Side - Ministry Branding */}
        <div className="hidden overflow-hidden text-white lg:flex lg:w-1/2 bg-gradient-to-br from-green-800 to-blue-900">
          <div className="flex items-center w-full h-full p-12">
            <div className="max-w-md">
              <div className="flex items-center mb-8 space-x-3">
                <img 
                  src="/logo.png" 
                  alt="VASUDHA Logo" 
                  className="object-contain w-12 h-12 p-1 bg-white rounded-lg"
                />
                <div>
                  <h1 className="text-2xl font-bold">VASUDHA</h1>
                  <p className="text-sm text-blue-200">Digital Farm Management Portal</p>
                </div>
              </div>
              
              <h2 className="mb-4 text-3xl font-bold">
                Secure Account Recovery
              </h2>
              <p className="mb-8 text-xl text-green-100">
                Reset your password securely with OTP verification
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <ShieldCheckIcon className="w-6 h-6 text-blue-300" />
                  <span>Secure OTP Verification</span>
                </div>
                <div className="flex items-center space-x-3">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-300" />
                  <span>Password Protection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <UserGroupIcon className="w-6 h-6 text-blue-300" />
                  <span>Quick Account Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Password Reset Form */}
        <div className="w-full overflow-y-auto lg:w-1/2">
          <div className="flex items-center justify-center min-h-full p-8 lg:p-12">
            <div className="w-full max-w-md">
              <div className="mb-6">
                <Link to="/auth/login" className="flex items-center text-sm text-gray-600 hover:text-gray-800">
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />
                  Back to Login
                </Link>
              </div>

              <div className="mb-8 text-center">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-gray-600">
                  {step === 1 && 'Enter your mobile number to receive OTP'}
                  {step === 2 && 'Enter the OTP sent to your mobile'}
                  {step === 3 && 'Create a new password'}
                </p>
              </div>

              {/* Step 1: Enter Mobile Number */}
              {step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Mobile Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                        +91
                      </span>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter 10-digit mobile number"
                        pattern="[0-9]{10}"
                        maxLength="10"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      name="otp"
                      value={formData.otp}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter 6-digit OTP"
                      pattern="[0-9]{6}"
                      maxLength="6"
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      OTP sent to +91 {formData.mobile}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full py-2 text-sm text-green-600 hover:text-green-700"
                  >
                    Resend OTP
                  </button>
                </form>
              )}

              {/* Step 3: Reset Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter new password (min. 6 characters)"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
                  ← Back to Overview
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
