import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GlobeAltIcon,
  BellIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  EyeIcon,
  EnvelopeOpenIcon,
  QuestionMarkCircleIcon,
  ChartBarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

const Overview = () => {
  const navigate = useNavigate()

  const settingsCards = [
    {
      icon: GlobeAltIcon,
      title: 'Language',
      description: 'Change app language and regional settings',
      link: 'language',
      color: 'bg-blue-50 text-blue-600',
      stats: '10 languages available'
    },
    {
      icon: SparklesIcon,
      title: 'App Preferences',
      description: 'Customize appearance, theme, and default behaviors',
      link: 'preferences',
      color: 'bg-purple-50 text-purple-600',
      stats: 'Personalize your experience'
    },
    {
      icon: BellIcon,
      title: 'Notifications',
      description: 'Manage email, SMS, and push notification preferences',
      link: 'notifications',
      color: 'bg-yellow-50 text-yellow-600',
      stats: '3 channels available'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Privacy & Security',
      description: 'Control data sharing, password, and security settings',
      link: 'privacy',
      color: 'bg-green-50 text-green-600',
      stats: 'Your data is protected'
    },
    {
      icon: CircleStackIcon,
      title: 'Data Management',
      description: 'Export, backup, or delete your account data',
      link: 'data',
      color: 'bg-indigo-50 text-indigo-600',
      stats: 'Full data control'
    },
    {
      icon: EyeIcon,
      title: 'Accessibility',
      description: 'Adjust text size, contrast, and screen reader settings',
      link: 'accessibility',
      color: 'bg-pink-50 text-pink-600',
      stats: 'Inclusive design'
    },
    {
      icon: EnvelopeOpenIcon,
      title: 'Contact & Support',
      description: 'Get help from our support team or view resources',
      link: 'contact',
      color: 'bg-orange-50 text-orange-600',
      stats: '24/7 helpline available'
    },
    {
      icon: QuestionMarkCircleIcon,
      title: 'FAQs',
      description: 'Find answers to frequently asked questions',
      link: 'faqs',
      color: 'bg-teal-50 text-teal-600',
      stats: '20+ questions answered'
    },
  ]

  const quickStats = [
    { label: 'Account Status', value: 'Active', icon: UserGroupIcon },
    { label: 'Last Login', value: 'Today', icon: ChartBarIcon },
    { label: 'Data Usage', value: '2.4 MB', icon: CircleStackIcon },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Settings Overview</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">Quick access to all settings and preferences</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg sm:p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 sm:text-sm">{stat.label}</p>
                  <p className="text-sm font-semibold text-gray-900 sm:text-base">{stat.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {settingsCards.map((card, index) => {
          const Icon = card.icon
          return (
            <button
              key={index}
              onClick={() => navigate(card.link)}
              className="p-4 text-left transition-all bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-green-300 group sm:p-5"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`p-2 rounded-lg ${card.color} sm:p-3`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-green-700 sm:text-lg">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 sm:text-sm">{card.description}</p>
                  <p className="mt-2 text-xs font-medium text-gray-500">{card.stats}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Help Section */}
      <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 sm:p-5">
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Need Help?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Explore our comprehensive FAQ section or contact our support team for assistance.
        </p>
        <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:gap-3">
          <button
            onClick={() => navigate('faqs')}
            className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View FAQs
          </button>
          <button
            onClick={() => navigate('contact')}
            className="px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}

export default Overview
