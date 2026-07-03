import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cog6ToothIcon,
  GlobeAltIcon,
  EnvelopeOpenIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  BellIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const navItems = [
  { to: 'overview', label: 'Overview', icon: Cog6ToothIcon },
  { to: 'language', label: 'Language', icon: GlobeAltIcon },
  { to: 'preferences', label: 'App Preferences', icon: SparklesIcon },
  { to: 'notifications', label: 'Notifications', icon: BellIcon },
  { to: 'privacy', label: 'Privacy & Security', icon: ShieldCheckIcon },
  { to: 'data', label: 'Data Management', icon: CircleStackIcon },
  { to: 'accessibility', label: 'Accessibility', icon: EyeIcon },
  { to: 'contact', label: 'Contact & Support', icon: EnvelopeOpenIcon },
  { to: 'faqs', label: 'FAQs', icon: QuestionMarkCircleIcon },
]

const languageMap = {
  English: 'en', Hindi: 'hi', Bengali: 'bn', Tamil: 'ta', Telugu: 'te', Kannada: 'kn', Malayalam: 'ml', Gujarati: 'gu', Punjabi: 'pa', Marathi: 'mr'
}

export const TranslationContext = React.createContext('en')

const Settings = () => {
  const location = useLocation()
  const savedLang = localStorage.getItem('vasudha_language') || 'English'
  const [lang, setLang] = useState(languageMap[savedLang] || 'en')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    setLang(languageMap[savedLang] || 'en')
  }, [savedLang])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  return (
    <TranslationContext.Provider value={lang}>
      <div className="relative">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-20 left-4 z-50">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
          >
            {isSidebarOpen ? (
              <XMarkIcon className="w-6 h-6 text-gray-700" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        <div className="flex gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 sticky top-20 h-[calc(100vh-80px)] overflow-auto">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
              <p className="text-sm text-gray-500">Customize your experience</p>

              <nav className="mt-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-green-50 hover:translate-x-1 ${isActive || location.pathname.endsWith(item.to) ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`
                      }
                    >
                      <Icon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Sidebar - Mobile Overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                />

                {/* Sidebar */}
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: 'tween', duration: 0.3 }}
                  className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white shadow-2xl z-50 overflow-auto"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
                        <p className="text-sm text-gray-500">Customize your experience</p>
                      </div>
                      <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    <nav className="space-y-2">
                      {navItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-green-50 ${isActive || location.pathname.endsWith(item.to) ? 'bg-green-50 text-green-700' : 'text-gray-700'
                              }`
                            }
                          >
                            <Icon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </NavLink>
                        )
                      })}
                    </nav>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 min-h-[420px]"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </TranslationContext.Provider>
  )
}

export default Settings
