import React from 'react'
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

const Contact = () => {
  const contactMethods = [
    {
      icon: PhoneIcon,
      title: 'Helpline Number',
      primary: '1800-180-1551',
      secondary: 'Toll-free (9 AM - 6 PM IST)',
      color: 'bg-green-50 text-green-700'
    },
    {
      icon: EnvelopeIcon,
      title: 'Email Support',
      primary: 'support@vasudha-dahd.app',
      secondary: 'Response within 24-48 hours',
      color: 'bg-blue-50 text-blue-700'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Live Chat',
      primary: 'Available on Portal',
      secondary: 'Mon-Fri, 9 AM - 6 PM IST',
      color: 'bg-purple-50 text-purple-700'
    }
  ]

  const offices = [
    {
      name: 'Head Office',
      address: 'Krishi Bhawan, New Delhi - 110001',
      phone: '011-23382651',
      email: 'dahd@gov.in'
    },
    {
      name: 'Technical Support Center',
      address: 'National Informatics Centre, CGO Complex, New Delhi',
      phone: '011-24305000',
      email: 'technical@vasudha.gov.in'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Contact & Support</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">Get help from the VASUDHA support team</p>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contactMethods.map((method, index) => {
          const Icon = method.icon
          return (
            <div key={index} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow sm:p-5">
              <div className={`inline-flex p-2 rounded-lg ${method.color} mb-3`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">{method.title}</h3>
              <p className="mt-1 text-sm font-medium text-gray-900 sm:text-base">{method.primary}</p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">{method.secondary}</p>
            </div>
          )
        })}
      </div>

      {/* Office Locations */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Office Locations</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {offices.map((office, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 sm:p-5">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg">
                <MapPinIcon className="w-5 h-5 text-green-600" />
                {office.name}
              </h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>{office.address}</p>
                <p className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4" />
                  {office.phone}
                </p>
                <p className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" />
                  {office.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <div className="p-4 border-2 border-dashed border-green-200 rounded-lg bg-green-50 sm:p-5">
        <div className="flex items-start gap-3">
          <GlobeAltIcon className="flex-shrink-0 w-6 h-6 text-green-600 sm:w-7 sm:h-7" />
          <div>
            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Official Website</h3>
            <p className="mt-1 text-sm text-gray-600">
              Visit the Department of Animal Husbandry & Dairying website for more information
            </p>
            <a
              href="https://dahd.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
            >
              dahd.gov.in →
            </a>
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Support Hours</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Monday - Friday:</span>
            <span className="font-medium">9:00 AM - 6:00 PM IST</span>
          </div>
          <div className="flex justify-between">
            <span>Saturday:</span>
            <span className="font-medium">9:00 AM - 1:00 PM IST</span>
          </div>
          <div className="flex justify-between">
            <span>Sunday & Holidays:</span>
            <span className="font-medium text-red-600">Closed</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
