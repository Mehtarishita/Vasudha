import React, { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ShieldCheckIcon,
  CubeIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  EyeIcon,
  SpeakerWaveIcon,
  AdjustmentsVerticalIcon,
  LanguageIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  BeakerIcon,
  TruckIcon,
  UserIcon,
  BuildingOfficeIcon,
  HeartIcon,
  MapIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  ArrowDownTrayIcon

} from '@heroicons/react/24/outline'

import ministry1 from '../../assets/images/ministry1.jpg'
import ministry2 from '../../assets/images/ministry2.jpg'
import ministry3 from '../../assets/images/ministry3.jpg'
import GoogleTranslate from '../../components/common/GoogleTranslate'
import toast from 'react-hot-toast'


const LandingPage = () => {
  const navigate = useNavigate()
  const [selectedLanguage, setSelectedLanguage] = useState('English') // Kept for backwards compatibility
  const [fontSize, setFontSize] = useState('normal')
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  // --- State-wise user distribution map (from kyc_details) ---
  const [stateUserData, setStateUserData] = useState([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapZoom, setMapZoom] = useState(1.1)
  const [mapCenter, setMapCenter] = useState([80, 22]) // India center approx

  // Tooltip that follows the cursor
  const [mapTooltip, setMapTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    state: null,
    data: null
  })

  const geoUrl = '/india.topo.json' // put your India topojson here (public folder)

  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      console.log('Install prompt available')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already installed')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Show install toast for mobile users on every page load/refresh
  useEffect(() => {
    // Check if user is on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    
    // Show install prompt for mobile users (even without deferredPrompt for iOS/manual install)
    if (isMobile && !isInstalled) {
      // Reset state to ensure popup shows on every refresh
      setShowInstallPrompt(false)
      
      // Dismiss any existing toasts first to prevent duplicates
      toast.dismiss()
      
      const timeoutId = setTimeout(() => {
        setShowInstallPrompt(true)
        const toastId = toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <ArrowDownTrayIcon className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1 ml-3">
                  <p className="text-sm font-medium text-white">
                    Install VASUDHA App
                  </p>
                  <p className="mt-1 text-sm text-emerald-50">
                    Add to your home screen for quick access and offline use!
                  </p>
                  <div className="flex mt-3 space-x-2">
                    <button
                      onClick={() => {
                        handleInstallClick()
                        toast.dismiss(t.id)
                      }}
                      className="bg-white text-emerald-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-50 transition-colors"
                    >
                      Install Now
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex border-l border-emerald-400">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex items-center justify-center w-full p-4 text-sm font-medium text-white border border-transparent rounded-none rounded-r-lg hover:text-emerald-100 focus:outline-none"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ), {
          position: 'bottom-center',
          id: 'install-prompt', // Add unique ID to prevent duplicates
        })
      }, 3000) // Show after 3 seconds on landing page
      
      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId)
    }
  }, []) // Runs on every component mount (page refresh)

  const handleInstallClick = async () => {
    console.log('Install clicked, prompt available:', !!deferredPrompt)
    
    if (!deferredPrompt) {
      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        toast.success('App is already installed! 🎉')
        return
      }
      
      // Show manual installation instructions
      showManualInstallInstructions()
      return
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      
      console.log('Install outcome:', outcome)
      
      if (outcome === 'accepted') {
        toast.success('Thank you for installing VASUDHA! 🎉')
      } else {
        // User dismissed the prompt, show manual instructions
        showManualInstallInstructions()
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Install error:', error)
      // Show manual instructions on error
      showManualInstallInstructions()
    }
  }

  const showManualInstallInstructions = () => {
    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isAndroid = /Android/.test(navigator.userAgent)
    
    if (isIOS) {
      toast.custom((t) => (
        <div className="w-full max-w-md p-5 text-white bg-blue-600 shadow-2xl rounded-xl">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 ml-4">
              <p className="mb-3 text-lg font-bold">📱 Install on Android/Ios</p>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                <li>Tap the <strong> Browser Menu</strong> button <span className="inline-block text-xl">➡️</span></li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right</li>
              </ol>
              <p className="mt-3 text-xs opacity-90">VASUDHA will appear on your home screen like a native app!</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="ml-2 text-white hover:text-blue-200">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ), { duration: 10000, position: 'top-center' })
    } else if (isAndroid) {
      toast.custom((t) => (
        <div className="w-full max-w-md p-5 text-white shadow-2xl bg-emerald-600 rounded-xl">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 ml-4">
              <p className="mb-3 text-lg font-bold">📱 Install on Android</p>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                <li>Tap the <strong>Menu</strong> button (⋮) in your browser</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                <li>Tap <strong>"Install"</strong> when prompted</li>
              </ol>
              <p className="mt-3 text-xs opacity-90">VASUDHA will appear on your home screen with full offline access!</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="ml-2 text-white hover:text-emerald-200">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ), { duration: 10000, position: 'top-center' })
    } else {
      // Desktop browsers
      toast.custom((t) => (
        <div className="w-full max-w-md p-5 text-white shadow-2xl bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 ml-4">
              <p className="mb-3 text-lg font-bold">💻 Install VASUDHA</p>
              <div className="space-y-2 text-sm">
                <p><strong>Chrome:</strong> Menu (⋮) → "Install VASUDHA" or "Install app"</p>
                <p><strong>Edge:</strong> Menu (⋯) → Apps → "Install VASUDHA"</p>
                <p><strong>Brave:</strong> URL bar → Install icon (⊕)</p>
              </div>
              <p className="mt-3 text-xs opacity-90">Get quick access from your desktop or taskbar!</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="ml-2 text-white hover:text-emerald-200">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ), { duration: 10000, position: 'top-center' })
    }
  }

  React.useEffect(() => {
    const loadStateUsers = async () => {
      setMapLoading(true)
      try {
        const { data, error } = await supabase
          .from('state_user_distribution')
          .select('*')

        if (error) throw error
        setStateUserData(data || [])
      } catch (err) {
        console.error('Error loading state user distribution:', err)
      } finally {
        setMapLoading(false)
      }
    }

    loadStateUsers()
  }, [])

  const findStateRow = (stateName) => {
    if (!stateName || !stateUserData?.length) return null
    const norm = String(stateName).toLowerCase().trim()

    return (
      stateUserData.find(
        (r) =>
          (r.state_name &&
            r.state_name.toLowerCase().trim() === norm) ||
          (r.state_key && r.state_key.toLowerCase().trim() === norm)
      ) || null
    )
  }

  // Green shades based on total users in that state
  const getStateFill = (stateName) => {
    const row = findStateRow(stateName)
    const total = row?.total_users || 0

    if (total <= 0) return '#e5e7eb'   // gray-200
    if (total > 5000) return '#166534' // green-800
    if (total > 1000) return '#16a34a' // green-600
    if (total > 200) return '#4ade80' // green-400
    return '#bbf7d0'                   // green-200
  }

  const totalUsersAllStates = stateUserData.reduce(
    (acc, r) => acc + (r.total_users || 0),
    0
  )

  const handleMapZoomIn = () => setMapZoom((z) => Math.min(z * 1.3, 8))
  const handleMapZoomOut = () => setMapZoom((z) => Math.max(z / 1.3, 0.8))
  const handleMapReset = () => {
    setMapZoom(1.1)
    setMapCenter([80, 22])
  }


  const handleFontSizeChange = (size) => {
    setFontSize(size)
    const root = document.documentElement
    switch (size) {
      case 'small':
        root.style.fontSize = '14px'
        break
      case 'large':
        root.style.fontSize = '18px'
        break
      default:
        root.style.fontSize = '16px'
    }
  }

  const handleHighContrast = () => {
    setIsHighContrast(!isHighContrast)
    const body = document.body
    if (!isHighContrast) {
      body.classList.add('high-contrast')
      // Add high contrast styles
      body.style.filter = 'contrast(150%) brightness(120%)'
    } else {
      body.classList.remove('high-contrast')
      // Remove high contrast styles
      body.style.filter = 'none'
    }
  }

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen)
  }

  // Handle escape key to close search modal
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSearchOpen])

  const skipToMainContent = () => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const ministryPersons = [
    {
      name: 'Shri Rajiv Ranjan Singh alias Lalan Singh',
      position: 'Hon\'ble Minister of Fisheries, Animal Husbandry and Dairying',
      image: ministry1
    },
    {
      name: 'Prof. S.P. Singh Baghel',
      position: 'Hon\'ble Minister of State',
      image: ministry2
    },
    {
      name: 'Shri George Kurian',
      position: 'Hon\'ble Minister of State',
      image: ministry3
    }
  ]

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Maximum Residue Limits (MRL) Monitoring',
      description: 'Advanced tracking and compliance monitoring for drug residues in livestock products'
    },
    {
      icon: CubeIcon,
      title: 'Antimicrobial Usage (AMU) Management',
      description: 'Comprehensive management of antimicrobial usage patterns and stewardship'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-time Analytics',
      description: 'Data-driven insights for better decision making and compliance management'
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-stakeholder Platform',
      description: 'Connecting farmers, veterinarians, labs, and regulators in one ecosystem'
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: 'Compliance Reporting',
      description: 'Automated compliance reports and audit trails for regulatory requirements'
    },
    {
      icon: GlobeAltIcon,
      title: 'National Coverage',
      description: 'Nationwide implementation supporting India\'s livestock sector digitization'
    }
  ]

  const stakeholders = [
    {
      role: 'producer',
      label: 'Farmer / Producer',
      description: 'The person who raises the livestock',
      icon: UserIcon,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      role: 'veterinarian',
      label: 'Veterinarian',
      description: 'The licensed professional who prescribes antimicrobials',
      icon: HeartIcon,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      role: 'retailer',
      label: 'Pharmaceutical Retailer',
      description: 'The store that dispenses the medicine',
      icon: BuildingOfficeIcon,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      role: 'collector',
      label: 'Collector / Processor',
      description: 'The person/entity that collects the raw product (milk, meat)',
      icon: TruckIcon,
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      role: 'lab',
      label: 'Laboratory',
      description: 'The facility that performs official MRL tests',
      icon: BeakerIcon,
      color: 'bg-pink-600 hover:bg-pink-700'
    },
    {
      role: 'regulator',
      label: 'Regulator (Government)',
      description: 'The government bodies (FSSAI, DAHD) who monitor compliance',
      icon: ShieldCheckIcon,
      color: 'bg-red-600 hover:bg-red-700'
    },
  ]

  const workflowSteps = [
    {
      step: 1,
      title: "Digital Prescription",
      from: "Veterinarian",
      to: "Farmer",
      description: "Veterinarian issues a digital e-prescription via their portal to the Farmer's app, creating the first verifiable record.",
      icon: HeartIcon,
      color: "from-green-400 to-green-600",
    },
    {
      step: 2,
      title: "Medicine Dispensing",
      from: "Farmer",
      to: "Pharmaceutical Retailer",
      description: "Farmer takes mobile app with e-prescription QR code to Retailer for medicine dispensing and verification.",
      icon: BuildingOfficeIcon,
      color: "from-teal-400 to-teal-600",
    },
    {
      step: 3,
      title: "Sale Recording",
      from: "Pharmaceutical Retailer",
      to: "Vasudha Platform",
      description: "Retailer logs the sale against e-prescription ID on blockchain, recording which drug was sold, when, and to whom.",
      icon: DocumentTextIcon,
      color: "from-blue-400 to-blue-600",
    },
    {
      step: 4,
      title: "Treatment Logging",
      from: "Farmer",
      to: "Vasudha Platform",
      description: "Farmer administers drug and logs treatment by scanning the bottle, linking it to the animal's unique ID.",
      icon: UserIcon,
      color: "from-indigo-400 to-indigo-600",
    },
    {
      step: 5,
      title: "MRL Calculation",
      from: "Vasudha Platform",
      to: "Farmer & Collector",
      description: "MRL Engine calculates withdrawal period automatically and sends RED/GREEN status alerts to ensure safety.",
      icon: ChartBarIcon,
      color: "from-amber-400 to-amber-600",
    },
    {
      step: 6,
      title: "Safe Collection",
      from: "Collector",
      to: "Vasudha Platform",
      description: "Collector scans farm QR code, receives GREEN signal after withdrawal period, and triggers Smart Contract logging.",
      icon: TruckIcon,
      color: "from-rose-400 to-rose-600",
    },
    {
      step: 7,
      title: "Lab Testing",
      from: "Laboratory",
      to: "Vasudha Platform",
      description: "Laboratory uploads official MRL test results as the final independent audit of the batch's digital record.",
      icon: BeakerIcon,
      color: "from-fuchsia-400 to-fuchsia-600",
    },
    {
      step: 8,
      title: "Regulatory Oversight",
      from: "Regulator",
      to: "Vasudha Platform",
      description: "Regulator views dashboard with real-time heatmaps showing the complete, unbroken chain from prescription to lab results.",
      icon: ShieldCheckIcon,
      color: "from-green-500 to-blue-500",
    },
  ];

  const handleQuickLogin = (role) => {
    navigate(`/auth/login?role=${role}`)
  }

  return (
    <div className={`min-h-screen ${isHighContrast ? 'bg-black text-white' : 'bg-gradient-to-br from-green-50 via-white to-blue-50'}`}>


      {/* Top Navbar */}
      <div className="py-2 text-white bg-gray-800">
        <div className="px-2 mx-auto max-w-7xl sm:px-4 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 text-xs sm:flex-row sm:text-sm">
            <div className="flex items-center">
              <div className="text-gray-300">
                <span className="text-xs sm:text-sm">भारत सरकार | Government of India</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 md:gap-4">
              {/* Skip to Main Content */}
              <button
                onClick={skipToMainContent}
                className="px-2 py-1 text-[10px] sm:text-xs font-medium transition-colors bg-red-600 rounded hover:bg-red-700 whitespace-nowrap"
              >
                SKIP TO MAIN CONTENT
              </button>

              {/* Search */}
              <button
                onClick={handleSearchToggle}
                className="p-1 transition-colors rounded hover:bg-gray-700"
                title="Search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Text Size Controls */}
              <div className="flex items-center bg-gray-700 rounded">
                <button
                  onClick={() => handleFontSizeChange('large')}
                  className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold ${fontSize === 'large' ? 'bg-yellow-600' : 'hover:bg-gray-600'} rounded-l transition-colors`}
                  title="Increase text size"
                >
                  A+
                </button>
                <button
                  onClick={() => handleFontSizeChange('normal')}
                  className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold ${fontSize === 'normal' ? 'bg-yellow-600' : 'hover:bg-gray-600'} transition-colors`}
                  title="Normal text size"
                >
                  A
                </button>
                <button
                  onClick={() => handleFontSizeChange('small')}
                  className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold ${fontSize === 'small' ? 'bg-yellow-600' : 'hover:bg-gray-600'} rounded-r transition-colors`}
                  title="Decrease text size"
                >
                  A-
                </button>
              </div>



              {/* Social Media Icons */}
              <div className="flex items-center gap-1">
                <button className="p-1 transition-colors rounded hover:bg-gray-700" title="Facebook">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button className="p-1 transition-colors rounded hover:bg-gray-700" title="Twitter">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </button>
                <button className="p-1 transition-colors rounded hover:bg-gray-700" title="YouTube">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </button>
              </div>

              {/* Google Translate Language Selector */}
              <GoogleTranslate />
            </div>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Search VASUDHA Portal</h3>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for information, services, or documentation..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
                <button className="absolute text-green-600 transform -translate-y-1/2 right-3 top-1/2 hover:text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>Popular searches: Login, Registration, MRL Guidelines, AMU Management, Contact Support</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-2 mx-auto max-w-7xl sm:px-4 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 py-3 sm:flex-row sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img
                src="/logo.png"
                alt="VASUDHA Logo"
                className="object-contain w-12 h-12 sm:w-16 sm:h-16"
              />
              <div className="pl-2 border-l border-gray-300 sm:pl-4">
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">VASUDHA</h1>
                <p className="text-xs text-gray-600 sm:text-sm">Digital Farm Management Portal</p>
                <p className="hidden text-xs text-gray-500 sm:block">Ministry of Fisheries, Animal Husbandry & Dairying</p>
                <p className="hidden text-xs text-gray-500 sm:block">Government of India</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <img
                src="/Logo_ministry.png"
                alt="Ministry Logo"
                className="object-contain h-12 sm:h-16 md:h-20 w-auto max-w-[120px] sm:max-w-[180px] md:max-w-[256px]"
              />
              <button
                onClick={() => navigate('/auth/login')}
                className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 text-sm sm:text-base text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 whitespace-nowrap"
              >
                Access Portal
              </button>
            </div>
          </div>
        </div>
      </header>



      {/* Hero Section */}
      <section className="py-20" id="main-content" tabIndex="-1">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 mb-4 space-x-2 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                <GlobeAltIcon className="w-4 h-4" />
                <span>Government of India Initiative</span>
              </div>

              <h1 className="mb-4 text-2xl font-bold text-gray-900 sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
                <span className="text-green-600">VASUDHA</span><br />
                <span className="inline-flex flex-wrap items-baseline justify-center text-green-900 gap-x-1 gap-y-1 sm:gap-x-2">
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">V</span><span className="text-base sm:text-xl md:text-2xl">irtual</span></span>
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">A</span><span className="text-base sm:text-xl md:text-2xl">nimal</span></span>
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">S</span><span className="text-base sm:text-xl md:text-2xl">ystem</span></span>
                  <span className="text-base sm:text-xl md:text-2xl">for</span>
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">U</span><span className="text-base sm:text-xl md:text-2xl">nderstanding</span></span>
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">D</span><span className="text-base sm:text-xl md:text-2xl">ata</span></span>
                  <span className="text-base sm:text-xl md:text-2xl">for</span>
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">H</span><span className="text-base sm:text-xl md:text-2xl">ealth</span></span>
                  <span><span className="mr-0.5 sm:mr-1 text-xl sm:text-2xl md:text-3xl font-extrabold">A</span><span className="text-base sm:text-xl md:text-2xl">ssurance</span></span>
                </span>

              </h1>

              <div className="mb-4 sm:mb-6">
                <p className="mb-2 text-sm font-semibold text-gray-950 sm:text-base md:text-lg">
                  Digital Farm Management Portal
                </p>
                <p className="max-w-3xl mx-auto text-base text-gray-600 sm:text-lg md:text-xl">
                  Ministry of Fisheries, Animal Husbandry & Dairying
                </p>
              </div>

              <p className="max-w-4xl px-4 mx-auto mb-6 text-sm leading-relaxed text-gray-700 sm:mb-8 sm:text-base md:text-lg">
                A comprehensive digital platform for Maximum Residue Limits (MRL) monitoring and
                Antimicrobial Usage (AMU) management in India's livestock sector, ensuring food safety
                and regulatory compliance.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 px-4 sm:flex-row sm:gap-4">
              <button
                onClick={() => navigate('/auth/login')}
                className="flex items-center justify-center px-6 py-3 space-x-2 text-base font-medium text-white transition-colors bg-green-600 rounded-lg sm:px-8 sm:py-4 sm:text-lg hover:bg-green-700"
              >
                <span>Get Started</span>
                <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <a
                href="#how-vasudha-title"
                className="px-6 py-3 text-base font-medium text-center text-gray-700 transition-colors border border-gray-300 rounded-lg sm:px-8 sm:py-4 sm:text-lg hover:bg-gray-50"
              >
                Learn More
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Introductory Video Section */}
      <section className="py-20 bg-gray-100">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
              Watch VASUDHA in Action
            </h2>
            <p className="max-w-3xl mx-auto text-lg text-gray-600 md:text-xl">
              Discover how VASUDHA is transforming livestock management across India
            </p>
          </motion.div>

          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="overflow-hidden bg-white shadow-xl rounded-2xl">
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/Fc-FPAT--QQ"
                  title="VASUDHA Platform Overview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* VASUDHA Users Map Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl px-4 mx-auto sm:px-6 lg:px-8">
          {/* Centered heading + stats */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              VASUDHA Users Across India
            </h2>
            <p className="max-w-2xl mx-auto mt-2 text-sm text-gray-600 md:text-base">
              State-wise distribution of users on the VASUDHA platform, based on KYC records.
            </p>

            <div className="flex items-center justify-center mt-4 space-x-2 text-sm">
              <span className="text-xs font-medium text-gray-500">
                Total verified / registered users
              </span>
              <span className="text-2xl font-extrabold text-green-700">
                {totalUsersAllStates}
              </span>
            </div>
            {mapLoading && (
              <p className="mt-1 text-xs text-gray-400">
                Loading map data…
              </p>
            )}
          </div>

          {/* Centralized, draggable map card */}
          <div className="relative flex justify-center items-center min-h-[320px] sm:min-h-[420px] lg:min-h-[520px]">
            <div className="relative flex flex-col items-center w-full max-w-3xl p-3 bg-white border border-gray-100 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl border-emerald-200">
              <div className="relative w-full h-[280px] sm:h-[380px] lg:h-[480px] flex items-center justify-center">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ center: [80, 22], scale: 900 }}
                  width={480}
                  height={480}
                  style={{ width: '100%', height: '100%', cursor: 'grab', background: 'rgb(246 251 248)', borderRadius: '1.5rem' }}
                >
                  <ZoomableGroup
                    zoom={mapZoom}
                    center={mapCenter}
                    onMoveEnd={(position) => {
                      if (position.zoom) setMapZoom(position.zoom)
                      if (position.coordinates) setMapCenter(position.coordinates)
                    }}
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const props = geo.properties || {}
                          const stName =
                            props.ST_NM || props.st_nm || props.STATE || props.state_name || props.NAME_1 || props.name
                          const fill = getStateFill(stName)
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onMouseEnter={(evt) => {
                                const row = findStateRow(stName)
                                setMapTooltip({
                                  visible: true,
                                  x: evt.clientX,
                                  y: evt.clientY - 12,
                                  state: stName,
                                  data: row
                                })
                              }}
                              onMouseMove={(evt) => {
                                setMapTooltip((prev) =>
                                  prev.visible
                                    ? { ...prev, x: evt.clientX, y: evt.clientY - 12 }
                                    : prev
                                )
                              }}
                              onMouseLeave={() => {
                                setMapTooltip((prev) => ({ ...prev, visible: false }))
                              }}
                              style={{
                                default: {
                                  fill,
                                  stroke: 'rgba(148,163,184,0.6)',
                                  strokeWidth: 0.4,
                                  outline: 'none',
                                  transition: 'fill 0.2s',
                                },
                                hover: {
                                  fill: '#15803d',
                                  stroke: '#111827',
                                  strokeWidth: 0.8,
                                  outline: 'none',
                                },
                                pressed: {
                                  fill: '#166534',
                                  stroke: '#111827',
                                  strokeWidth: 0.8,
                                  outline: 'none',
                                }
                              }}
                            />
                          )
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>

                {/* Tooltip following cursor (state + user types) */}
                {mapTooltip.visible && mapTooltip.state && (
                  <div
                    className="fixed z-40 px-3 py-2 text-[11px] text-gray-900 bg-white border border-gray-200 rounded shadow-lg pointer-events-none"
                    style={{ left: mapTooltip.x + 12, top: mapTooltip.y - 10 }}
                  >
                    <div className="mb-1 text-xs font-semibold">{mapTooltip.state}</div>
                    <div className="space-y-0.5">
                      <div>
                        Total users: <span className="font-semibold">{mapTooltip.data?.total_users || 0}</span>
                      </div>
                      {mapTooltip.data && (
                        <>
                          {mapTooltip.data.farmers > 0 && (<div>Farmers: <span className="font-semibold">{mapTooltip.data.farmers}</span></div>)}
                          {mapTooltip.data.veterinarians > 0 && (<div>Veterinarians: <span className="font-semibold">{mapTooltip.data.veterinarians}</span></div>)}
                          {mapTooltip.data.retailers > 0 && (<div>Retailers: <span className="font-semibold">{mapTooltip.data.retailers}</span></div>)}
                          {mapTooltip.data.collectors > 0 && (<div>Collectors: <span className="font-semibold">{mapTooltip.data.collectors}</span></div>)}
                          {mapTooltip.data.labs > 0 && (<div>Labs: <span className="font-semibold">{mapTooltip.data.labs}</span></div>)}
                          {mapTooltip.data.regulators > 0 && (<div>Regulators: <span className="font-semibold">{mapTooltip.data.regulators}</span></div>)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom controls – bottom-center */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button type="button" onClick={handleMapZoomIn} className="px-4 py-2 text-lg font-bold text-green-700 bg-green-100 rounded-full shadow hover:bg-green-200">+</button>
                <button type="button" onClick={handleMapZoomOut} className="px-4 py-2 text-lg font-bold text-blue-700 bg-blue-100 rounded-full shadow hover:bg-blue-200">−</button>
                <button type="button" onClick={handleMapReset} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-full shadow hover:bg-gray-200">Reset</button>
              </div>

              {/* Legend (green shades) */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 lg:top-6 lg:right-6 px-2 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 text-[10px] sm:text-[11px] lg:text-[12px] bg-white border border-gray-200 rounded-lg sm:rounded-xl">
                <div className="mb-1 font-semibold text-gray-800 sm:mb-2">Users per state</div>
                <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2"><span className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 rounded bg-[#bbf7d0]" /><span>1–200</span></div>
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2"><span className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 rounded bg-[#4ade80]" /><span>201–1000</span></div>
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2"><span className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 rounded bg-[#16a34a]" /><span>1001–5000</span></div>
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2"><span className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 rounded bg-[#166534]" /><span>&gt; 5000</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
              Comprehensive Livestock Management
            </h2>
            <p className="max-w-4xl mx-auto text-lg text-gray-600 md:text-lg">
              Supporting India's livestock sector with advanced digital tools for safety, compliance, and productivity
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="p-8 transition-shadow bg-gray-50 rounded-xl hover:shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <feature.icon className="w-10 h-10 mb-4 text-green-600 md:h-12 md:w-12" />
                <h3 className="mb-3 text-lg font-semibold text-gray-900 md:text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 md:text-base">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Informative Section */}
      <section className="py-16 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
              About VASUDHA Initiative
            </h2>
            <p className="max-w-5xl mx-auto text-lg leading-relaxed text-gray-600 md:text-lg">
              VASUDHA is a comprehensive digital platform developed by the Ministry of Fisheries, Animal Husbandry & Dairying,
              Government of India, to ensure food safety and regulatory compliance in India's livestock sector.
            </p>
          </motion.div>

          <div className="grid items-center grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Key Objectives</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <ShieldCheckIcon className="flex-shrink-0 w-6 h-6 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Food Safety Assurance</h4>
                    <p className="text-gray-600">Ensuring livestock products meet maximum residue limit standards</p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <ClipboardDocumentCheckIcon className="flex-shrink-0 w-6 h-6 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Regulatory Compliance</h4>
                    <p className="text-gray-600">Automated compliance monitoring and reporting system</p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <ChartBarIcon className="flex-shrink-0 w-6 h-6 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Data-Driven Insights</h4>
                    <p className="text-gray-600">Real-time analytics for better decision making</p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <GlobeAltIcon className="flex-shrink-0 w-6 h-6 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">National Implementation</h4>
                    <p className="text-gray-600">Nationwide coverage supporting digital transformation</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="p-8 bg-green-50 rounded-xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Impact Statistics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="mb-2 text-3xl font-bold text-green-600">500K+</div>
                  <div className="text-sm text-gray-600">Farmers Registered</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-3xl font-bold text-green-600">2.5M+</div>
                  <div className="text-sm text-gray-600">Animals Tracked</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-3xl font-bold text-green-600">10K+</div>
                  <div className="text-sm text-gray-600">Veterinarians</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-3xl font-bold text-green-600">1000+</div>
                  <div className="text-sm text-gray-600">Laboratories</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholders Section */}
      <section id="stakeholders" className="py-20 bg-gray-50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
              The 6 Key Stakeholders
            </h2>
            <p className="max-w-4xl mx-auto text-lg text-gray-600 md:text-lg">
              Connecting all stakeholders in the livestock ecosystem for better coordination and compliance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stakeholders.map((stakeholder, index) => (
              <motion.div
                key={stakeholder.role}
                className="p-6 transition-shadow bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <div className={`w-12 h-12 rounded-lg ${stakeholder.color} flex items-center justify-center mb-4`}>
                  <stakeholder.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-gray-900 md:text-lg">
                  {stakeholder.label}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-600 md:text-base">
                  {stakeholder.description}
                </p>
                <button
                  onClick={() => {
                    navigate(`/auth/login?role=${stakeholder.role}`)
                  }}
                  className="flex items-center space-x-1 font-medium text-green-600 hover:text-green-500"
                >
                  <span>Access Dashboard</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How VASUDHA Works Section */}
      <section id="working"
        aria-labelledby="how-vasudha-title"
        className="py-20 overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50"
      >
        <div className="px-6 mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2
              id="how-vasudha-title"
              className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl"
            >
              How VASUDHA Works
            </h2>
            <p className="max-w-3xl mx-auto mt-4 text-lg text-gray-600">
              An integrated workflow connecting stakeholders for complete traceability and compliance in livestock management.
            </p>
          </motion.div>

          {/* Flow grid */}
          <div className="relative mx-auto max-w-7xl">
            {/* decorative center line on large screens */}
            <div className="hidden lg:block absolute left-1/2 top-8 transform -translate-x-1/2 h-[calc(100%-8rem)] w-0.5 bg-gradient-to-b from-green-200 via-blue-300 to-green-200 opacity-60" aria-hidden="true" />

            {/* First Row - Steps 1-4 */}
            <div className="grid gap-8 mb-16 sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.slice(0, 4).map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Connection Arrow */}
                  {i < 3 && (
                    <div className="absolute z-0 hidden lg:block top-8 -right-4">
                      <ArrowRightIcon className="w-6 h-6 text-green-400" />
                    </div>
                  )}

                  {/* Step Card */}
                  <div className="relative p-6 transition-all duration-300 transform bg-white border-2 border-green-100 shadow-lg rounded-2xl hover:shadow-xl hover:-translate-y-2 hover:border-green-300 group">
                    {/* Step Number */}
                    <div className="absolute transform -translate-x-1/2 -top-4 left-1/2">
                      <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white transition-transform rounded-full shadow-lg bg-gradient-to-br from-green-500 to-green-700 group-hover:scale-110">
                        {s.step}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="flex items-center justify-center p-2 mx-auto mb-4 w-14 h-14 rounded-xl">
                      <div className={`w-full h-full rounded-lg flex items-center justify-center text-white bg-gradient-to-tr ${s.color}`}>
                        <s.icon className="w-7 h-7 opacity-95" />
                      </div>
                    </div>

                    <h3 className="mb-3 text-base font-semibold text-center text-gray-900">{s.title}</h3>

                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">{s.from}</span>
                      <ArrowRightIcon className="w-3 h-3 text-gray-400" />
                      <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">{s.to}</span>
                    </div>

                    <p className="text-xs leading-relaxed text-center text-gray-600">{s.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Second Row - Steps 5-8 */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.slice(4, 8).map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i + 4) * 0.1 }}
                  className="relative"
                >
                  {/* Connection Arrow */}
                  {i < 3 && (
                    <div className="absolute z-0 hidden lg:block top-8 -right-4">
                      <ArrowRightIcon className="w-6 h-6 text-blue-400" />
                    </div>
                  )}

                  {/* Step Card */}
                  <div className="relative p-6 transition-all duration-300 transform bg-white border-2 border-blue-100 shadow-lg rounded-2xl hover:shadow-xl hover:-translate-y-2 hover:border-blue-300 group">
                    {/* Step Number */}
                    <div className="absolute transform -translate-x-1/2 -top-4 left-1/2">
                      <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white transition-transform rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 group-hover:scale-110">
                        {s.step}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="flex items-center justify-center p-2 mx-auto mb-4 w-14 h-14 rounded-xl">
                      <div className={`w-full h-full rounded-lg flex items-center justify-center text-white bg-gradient-to-tr ${s.color}`}>
                        <s.icon className="w-7 h-7 opacity-95" />
                      </div>
                    </div>

                    <h3 className="mb-3 text-base font-semibold text-center text-gray-900">{s.title}</h3>

                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">{s.from}</span>
                      <ArrowRightIcon className="w-3 h-3 text-gray-400" />
                      <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">{s.to}</span>
                    </div>

                    <p className="text-xs leading-relaxed text-center text-gray-600">{s.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <ul className="hidden" role="list" aria-label="VASUDHA workflow steps">

            </ul>

            {/* Final badge / outcome */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-12 text-center"
            >
              <div className="inline-flex items-center gap-4 px-6 py-4 text-white rounded-2xl shadow-2xl bg-gradient-to-r from-green-500 via-blue-500 to-green-600 transform hover:scale-[1.02] transition">
                <ShieldCheckIcon className="w-7 h-7" />
                <div className="text-left">
                  <div className="text-sm font-semibold">Complete Traceability & Compliance</div>
                  <div className="text-xs opacity-90">Verified records, faster audits, healthier livestock.</div>
                </div>

                {/* animated "live" dots */}
                <div className="flex items-center gap-1 ml-4">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.18s' }} />
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.36s' }} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* About Us Section */}
      <section className="py-20 bg-blue-50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
              About the Department
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Department of Animal Husbandry & Dairying</h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  The Department of Animal Husbandry and Dairying (AH&D) is one of the Departments of the newly created
                  Ministry of Fisheries, Animal Husbandry & Dairying vide Cabinet Secretariat's Notification No.1/2/1/2019-Cab
                  dated 17.06.2019 published in eGazette of India on May 31, 2019.
                </p>
                <p>
                  The Department of Animal Husbandry and Dairying (AH&D) renamed the Department of Animal Husbandry,
                  Dairying & Fisheries (DADF) was one of the Departments in the Ministry of Agriculture and came into existence
                  w.e.f. 1st February 1991, by converting two divisions of the Department of Agriculture and Cooperation namely
                  Animal Husbandry and Dairy Development into a separate Department.
                </p>
                <p>
                  The Department is located at Krishi Bhawan, New Delhi and parts of some Divisions of the Department are
                  functioning from Chander Lok Building, Janpath, New Delhi.
                </p>
              </div>
            </div>
            <div className="p-8 bg-white shadow-sm rounded-xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="w-5 h-5 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Address</h4>
                    <p className="text-gray-600">Krishi Bhawan, New Delhi<br />Government of India</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <PhoneIcon className="w-5 h-5 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Helpline</h4>
                    <p className="text-gray-600">1800-180-1551</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <EnvelopeIcon className="w-5 h-5 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Email</h4>
                    <p className="text-gray-600">support@vasudha.gov.in</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <DocumentTextIcon className="w-5 h-5 mt-1 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Official Website</h4>
                    <p className="text-gray-600">dahd.gov.in</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ministry Leadership Section */}
          <div className="mt-16">
            <motion.div
              className="mb-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="mb-4 text-3xl font-bold text-gray-900">Ministry Leadership</h3>
              <p className="text-lg text-gray-600">
                Meet the distinguished leaders guiding India's livestock and dairy sector
              </p>
            </motion.div>

            <div className="p-4 shadow-lg sm:p-6 md:p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {ministryPersons.map((person, index) => (
                  <motion.div
                    key={index}
                    className="text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                  >
                    <div className="p-4 transition-all duration-300 transform bg-white shadow-md sm:p-6 rounded-2xl hover:shadow-lg hover:-translate-y-2">
                      <div className="w-20 mx-auto mb-3 overflow-hidden bg-green-100 border-4 border-green-200 sm:mb-4 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 rounded-xl">
                        <img
                          src={person.image}
                          alt={person.name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <h4 className="mb-2 text-xs font-bold text-gray-900 sm:text-sm">{person.name}</h4>
                      <p className="px-2 py-1.5 text-xs sm:text-sm font-medium text-green-700 rounded-full bg-green-50 sm:px-3 sm:py-2">
                        {person.position}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-white bg-green-800">
        <div className="px-4 mx-auto text-center max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Ready to Transform Livestock Management?
            </h2>
            <p className="max-w-3xl mx-auto mb-8 text-xl text-green-100">
              Join thousands of farmers, veterinarians, and officials using VASUDHA for safer,
              more compliant livestock management across India.
            </p>
            <button
              onClick={() => navigate('/auth/login')}
              className="px-8 py-4 text-lg font-medium text-green-800 transition-colors bg-white rounded-lg hover:bg-green-50"
            >
              Start Using VASUDHA Today
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-white bg-gray-900">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center mb-4 space-x-3">
                <img
                  src="/logo.png"
                  alt="VASUDHA Logo"
                  className="object-contain w-8 h-8 p-1 bg-white rounded-lg"
                />
                <span className="text-lg font-bold">VASUDHA</span>
              </div>
              <p className="text-sm text-gray-400">
                Digital Farm Management Portal by Ministry of Fisheries, Animal Husbandry & Dairying, Government of India.
              </p>
              <div className="mt-4 text-sm text-gray-400">
                <p>भारत सरकार</p>
                <p>Government of India</p>
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About VASUDHA</a></li>
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#stakeholders" className="hover:text-white">Stakeholders</a></li>
                <li><a href="#working" className="hover:text-white">How it Works</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">Government Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://dahd.gov.in/" className="hover:text-white" target="_blank">DAHD Official Website</a></li>
                <li><a href="https://fssai.gov.in/" className="hover:text-white">FSSAI Portal</a></li>
                <li><a href="https://www.india.gov.in/" className="hover:text-white">National Portal of India</a></li>
                <li><a href="https://mygov.in/" className="hover:text-white">MyGov Portal</a></li>
                <li><a href="https://digitalindiaportal.co.in/" className="hover:text-white">Digital India</a></li>
                <li><a href="https://rtionline.gov.in/" className="hover:text-white">RTI Portal</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold">Contact Us</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start space-x-2">
                  <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Krishi Bhawan, New Delhi<br />Government of India</span>
                </li>
                <li className="flex items-center space-x-2">
                  <EnvelopeIcon className="flex-shrink-0 w-4 h-4" />
                  <span>support@vasudha.gov.in</span>
                </li>
                <li className="flex items-center space-x-2">
                  <PhoneIcon className="flex-shrink-0 w-4 h-4" />
                  <span>1800-180-1551</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-700">
            <div className="flex flex-col items-center justify-between text-sm text-center text-gray-400 md:flex-row">
              <p>&copy; 2025 Government of India. All rights reserved.</p>
              <div className="flex mt-4 space-x-6 md:mt-0">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Service</a>
                <a href="#" className="hover:text-white">Accessibility</a>
                <a href="#" className="hover:text-white">Site Map</a>
              </div>
            </div>
            <div className="mt-4 text-xs text-center text-gray-500">
              <p>Last Updated: November 12, 2025 | Best viewed in Chrome, Firefox, Safari</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

