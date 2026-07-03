import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalculatorIcon, ClipboardDocumentCheckIcon, PlusCircleIcon, DocumentMagnifyingGlassIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

const navItems = [
  {
    to: 'getting-started',
    label: 'Getting Started',
    icon: RocketLaunchIcon,
    description: 'Learn the basics'
  },
  {
    to: 'withdrawal',
    label: 'Withdrawal Calculator',
    icon: CalculatorIcon,
    description: 'Calculate withdrawal periods'
  },
  {
    to: 'antibiotics',
    label: 'Drug Database',
    icon: ClipboardDocumentCheckIcon,
    description: 'Browse medications'
  },
  {
    to: 'register',
    label: 'Register',
    icon: PlusCircleIcon,
    description: 'Add animal or farm'
  },
  {
    to: 'drug-record',
    label: 'Record Administration',
    icon: DocumentMagnifyingGlassIcon,
    description: 'Log drug usage'
  },
]

const Information = () => {
  const location = useLocation()

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Information Center</h1>
        <p className="text-gray-600">Access guides, calculators, and essential tools for farm management</p>
      </motion.div>

      {/* Navigation Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
      >
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = location.pathname.includes(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="group"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  relative p-5 rounded-xl border-2 transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-500 shadow-lg shadow-green-100'
                    : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`
                    p-3 rounded-lg transition-all duration-300
                    ${isActive
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-600'
                    }
                  `}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`
                      font-semibold text-sm mb-1 transition-colors
                      ${isActive ? 'text-green-700' : 'text-gray-900 group-hover:text-green-700'}
                    `}>
                      {item.label}
                    </h3>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-green-500 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.div>
            </NavLink>
          )
        })}
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]"
      >
        <Outlet />
      </motion.div>
    </div>
  )
}

export default Information
