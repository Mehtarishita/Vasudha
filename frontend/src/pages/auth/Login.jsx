import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authHelpers } from '../../config/supabase'
import { 
  EyeIcon, 
  EyeSlashIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const Login = () => {
  const [formData, setFormData] = useState({
    mobile: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const setUser = useAuthStore(state => state.setUser)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.mobile || formData.mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    if (!formData.password) {
      toast.error('Please enter your password')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await authHelpers.signIn(
        formData.mobile,
        formData.password
      )

      if (error) {
        console.error('Login error:', error)
        toast.error(error.message || 'Invalid mobile number or password')
        setIsLoading(false)
        return
      }

      if (!data.session || !data.user) {
        toast.error('Login failed. Please try again.')
        setIsLoading(false)
        return
      }

      console.log('User logged in:', data.user)

      // Set user in auth store
      await setUser(data.session)

      toast.success('Login successful!')
      
      // Get user type from session metadata
      const userType = data.user.user_metadata?.user_type || 'producer'
      
      // Navigate to appropriate dashboard
      const dashboardRoutes = {
        producer: '/dashboard/producer',
        veterinarian: '/dashboard/veterinarian',
        lab: '/dashboard/lab',
        collector: '/dashboard/collector',
        regulator: '/dashboard/regulator',
        retailer: '/dashboard/retailer',
        admin: '/dashboard/admin'
      }

      setTimeout(() => {
        navigate(dashboardRoutes[userType] || '/dashboard/producer', { replace: true })
      }, 500)

    } catch (error) {
      console.error('Login error:', error)
      toast.error('An unexpected error occurred. Please try again.')
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
                Ministry of Fisheries, Animal Husbandry & Dairying
              </h2>
              <p className="mb-8 text-xl text-green-100">
                Government of India Initiative for Livestock Safety & Compliance
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-300" />
                  <span>MRL & AMU Monitoring</span>
                </div>
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="w-6 h-6 text-blue-300" />
                  <span>Real-time Compliance Tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <UserGroupIcon className="w-6 h-6 text-blue-300" />
                  <span>Multi-stakeholder Platform</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full overflow-y-auto lg:w-1/2">
          <div className="flex items-center justify-center min-h-full p-8 lg:p-12">
            <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Welcome Back</h3>
              <p className="text-gray-600">Sign in to your VASUDHA account</p>
            </div>

            {/* SSO Options */}
            <div className="mb-6 space-y-3">
              <p className="mb-3 text-sm font-medium text-center text-gray-700">Sign in with</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#FF9933"/>
                    <circle cx="12" cy="12" r="6" fill="#FFFFFF"/>
                    <circle cx="12" cy="12" r="2" fill="#138808"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">DigiLocker</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img src="/logo.png" alt="Bharat Pashudhan" className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Bharat Pashudhan</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 500 500" fill="none">
                    {/* Golden arc at top */}
                    <path d="M 100 150 Q 250 50, 400 150" fill="none" stroke="#D4A843" strokeWidth="50" strokeLinecap="round"/>
                    {/* Golden circle in center */}
                    <circle cx="250" cy="170" r="30" fill="#D4A843"/>
                    {/* Green base circle */}
                    <circle cx="250" cy="300" r="180" fill="#2D9F4E"/>
                    {/* White leaf shapes */}
                    <ellipse cx="180" cy="300" rx="50" ry="100" fill="white" transform="rotate(-20 180 300)"/>
                    <ellipse cx="320" cy="300" rx="50" ry="100" fill="white" transform="rotate(20 320 300)"/>
                    {/* Green leaf veins */}
                    <path d="M 180 250 L 180 350" stroke="#2D9F4E" strokeWidth="8"/>
                    <path d="M 320 250 L 320 350" stroke="#2D9F4E" strokeWidth="8"/>
                    {/* Center stem */}
                    <path d="M 250 200 L 250 380" stroke="#2D9F4E" strokeWidth="12"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">AgriStack</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Google</span>
                </button>
              </div>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-white">Or continue with</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link 
                    to="/auth/forgot-password" 
                    className="text-sm text-green-600 hover:text-green-500"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/auth/register" className="text-green-600 hover:text-green-500">
                Need an account? Register
              </Link>
            </div>

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

export default Login