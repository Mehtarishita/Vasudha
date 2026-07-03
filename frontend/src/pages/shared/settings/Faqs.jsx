import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

const faqCategories = [
  {
    category: 'Getting Started',
    faqs: [
      {
        q: 'What is VASUDHA?',
        a: 'VASUDHA (Virtual Animal System for Understanding Data for Health Assurance) is a comprehensive digital platform for Maximum Residue Limits (MRL) monitoring and Antimicrobial Usage (AMU) management in India\'s livestock sector.'
      },
      {
        q: 'How do I register on VASUDHA?',
        a: 'Click on "Sign Up" from the login page, select your role (Farmer, Veterinarian, Retailer, etc.), fill in your details, complete KYC verification, and submit. You\'ll receive confirmation via email/SMS.'
      },
      {
        q: 'What documents are required for KYC?',
        a: 'You need a valid government ID (Aadhaar, PAN, Driving License), proof of address, and role-specific documents (e.g., veterinary license for vets, farm registration for farmers).'
      },
    ]
  },
  {
    category: 'Account & Profile',
    faqs: [
      {
        q: 'How do I change my password?',
        a: 'Go to Profile > Security Settings and click "Change Password". Enter your current password and new password, then confirm.'
      },
      {
        q: 'How do I update my profile information?',
        a: 'Navigate to Profile > Edit Profile. Update your information and click "Save Changes". Some changes may require re-verification.'
      },
      {
        q: 'Can I change my registered role?',
        a: 'Role changes require admin approval. Contact support at support@vasudha.gov.in with your request and supporting documents.'
      },
    ]
  },
  {
    category: 'QR Code & Scanning',
    faqs: [
      {
        q: 'How do I scan a QR code?',
        a: 'Go to the QR Scanner page, click "Start Camera", and point your camera at the QR code. The system will automatically detect and decode it.'
      },
      {
        q: 'What if the QR code doesn\'t scan?',
        a: 'Ensure good lighting, hold the camera steady, and position the QR code within the scanning frame. You can also upload an image of the QR code instead.'
      },
      {
        q: 'Can I scan QR codes offline?',
        a: 'No, scanning requires an internet connection to verify and retrieve data from the VASUDHA database.'
      },
    ]
  },
  {
    category: 'MRL & Drug Management',
    faqs: [
      {
        q: 'What is MRL (Maximum Residue Limit)?',
        a: 'MRL is the maximum concentration of drug residue legally permitted in food products from treated animals. VASUDHA helps track and ensure compliance with MRL standards.'
      },
      {
        q: 'How do I record drug administration?',
        a: 'Go to Farm Management > Record Treatment, scan the animal\'s QR code, scan the drug bottle, enter dosage and date, then submit. The system calculates the withdrawal period automatically.'
      },
      {
        q: 'What is a withdrawal period?',
        a: 'The withdrawal period is the time required after drug administration before the animal\'s products (milk, meat) can be safely consumed or sold. VASUDHA calculates this automatically.'
      },
    ]
  },
  {
    category: 'Notifications & Alerts',
    faqs: [
      {
        q: 'How do I enable notifications?',
        a: 'Go to Settings > Notifications and toggle the channels you want (Email, SMS, Push). You can customize notification types for each channel.'
      },
      {
        q: 'Why am I not receiving notifications?',
        a: 'Check your notification settings, ensure your email/phone is verified, and check spam/junk folders. For push notifications, allow browser permissions.'
      },
      {
        q: 'Can I customize which notifications I receive?',
        a: 'Yes, in Settings > Notifications, you can enable/disable specific notification types like withdrawal alerts, prescription updates, and system announcements.'
      },
    ]
  },
  {
    category: 'Technical Support',
    faqs: [
      {
        q: 'How do I contact support?',
        a: 'Call our helpline at 1800-180-1551 (toll-free), email support@vasudha.gov.in, or use the live chat feature available on the portal during business hours.'
      },
      {
        q: 'What are the support hours?',
        a: 'Our support team is available Monday-Friday, 9 AM - 6 PM IST, and Saturday 9 AM - 1 PM IST. We are closed on Sundays and public holidays.'
      },
      {
        q: 'How do I report a bug or issue?',
        a: 'Go to Settings > Contact & Support, describe the issue in detail with screenshots if possible, and submit. Our technical team will investigate and respond within 24-48 hours.'
      },
    ]
  },
  {
    category: 'Data & Privacy',
    faqs: [
      {
        q: 'Is my data secure on VASUDHA?',
        a: 'Yes, VASUDHA uses industry-standard encryption, secure servers, and follows government data protection guidelines. Your data is stored securely and accessed only by authorized personnel.'
      },
      {
        q: 'Can I export my data?',
        a: 'Yes, go to Settings > Data Management and click "Export Data". You can download your records in CSV or PDF format.'
      },
      {
        q: 'How long is my data retained?',
        a: 'Data is retained as per government regulations - typically 7 years for compliance records. You can request data deletion by contacting support.'
      },
    ]
  },
]

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState(null)
  const [openCategory, setOpenCategory] = useState(0)

  const toggleFaq = (categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`
    setOpenIndex(openIndex === key ? null : key)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Frequently Asked Questions</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">Find answers to common questions about VASUDHA</p>
      </div>

      {/* Search Box */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search FAQs..."
          className="w-full px-4 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <svg className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 right-3 top-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-4">
        {faqCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="overflow-hidden border border-gray-200 rounded-lg">
            <button
              onClick={() => setOpenCategory(openCategory === categoryIndex ? null : categoryIndex)}
              className="flex items-center justify-between w-full px-4 py-3 text-left transition-colors bg-gray-50 hover:bg-gray-100 sm:px-5"
            >
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">{category.category}</h2>
              {openCategory === categoryIndex ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {openCategory === categoryIndex && (
              <div className="p-3 space-y-2 bg-white sm:p-4 sm:space-y-3">
                {category.faqs.map((faq, faqIndex) => {
                  const isOpen = openIndex === `${categoryIndex}-${faqIndex}`
                  return (
                    <div key={faqIndex} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleFaq(categoryIndex, faqIndex)}
                        className="flex items-start justify-between w-full gap-3 p-3 text-left transition-colors hover:bg-gray-50 sm:p-4"
                      >
                        <span className="text-sm font-medium text-gray-900 sm:text-base">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUpIcon className="flex-shrink-0 w-5 h-5 text-green-600" />
                        ) : (
                          <ChevronDownIcon className="flex-shrink-0 w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                          <p className="text-sm leading-relaxed text-gray-600 sm:text-base">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Still have questions */}
      <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Still have questions?</h3>
        <p className="mt-2 text-sm text-gray-600">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <button
          onClick={() => window.location.href = '/settings/contact'}
          className="inline-flex items-center px-4 py-2 mt-4 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
        >
          Contact Support
        </button>
      </div>
    </div>
  )
}

export default Faqs
