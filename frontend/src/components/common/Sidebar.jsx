import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { AnimatePresence } from 'framer-motion'
import QRCodeDisplay from './QRCodeDisplay'
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  HomeIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CubeIcon,
  QrCodeIcon,
  MapIcon,
  BoltIcon,
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  InboxArrowDownIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
  BookOpenIcon,
  TruckIcon,
  ShoppingCartIcon,
  CalendarIcon,
  InboxIcon,
  DocumentArrowDownIcon,
  GlobeAltIcon,
  MegaphoneIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline'

const Sidebar = ({ isOpen, onClose }) => {
  const { user, profile, kycCompleted } = useAuthStore()
  const location = useLocation()
  const [showQRCode, setShowQRCode] = useState(false)

  // Navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      { name: 'Dashboard', href: `/dashboard/${user?.role}`, icon: HomeIcon },
    ]

    switch (user?.role) {
      case 'producer':
        return [
          ...commonItems,
          { name: 'Farm Management', href: '/app/farms', icon: BuildingOfficeIcon },
          { name: 'Livestock', href: '/app/animals', icon: UserGroupIcon },
          { name: 'Record Treatment', href: '/app/administration', icon: ClipboardDocumentIcon },
          { name: 'Scanner', href: '/app/qr-scanner', icon: QrCodeIcon },
          { name: 'Connect', href: '/app/connect', icon: ChatBubbleLeftRightIcon },
          { name: 'Send Complaint', href: '/producer/send-complaint', icon: MegaphoneIcon },
          { name: 'Alerts', href: '/producer/alerts', icon: BellAlertIcon },
          { name: 'Analytics', href: '/producer/analytics', icon: ChartBarIcon },
          { name: 'Information', href: '/app/information', icon: BoltIcon },
        ]

      case 'veterinarian':
        return [
          ...commonItems,
          { name: 'Verification', href: '/app/verification/veterinarian', icon: ShieldCheckIcon },
          { name: 'Government Assignments', href: '/vet/government-tasks', icon: ClipboardDocumentListIcon },
          { name: 'My Farms & Patients', href: '/vet/farms-patients', icon: UserGroupIcon },
          { name: 'Prescriptions & AMU', href: '/vet/prescriptions', icon: ClipboardDocumentIcon },
          { name: 'Requests', href: '/vet/requests', icon: InboxIcon },
          { name: 'Lab Reports & MRL', href: '/vet/lab-reports', icon: BeakerIcon },
          { name: 'Farm Visits', href: '/vet/farm-visits', icon: CalendarIcon },
          { name: 'Drug Database', href: '/vet/drug-database', icon: BookOpenIcon },
          { name: 'Alerts', href: '/vet/alerts', icon: BellAlertIcon },
          // { name: 'Scanner', href: '/app/qr-scanner', icon: QrCodeIcon },
        ]

      case 'lab':
        return [
          ...commonItems,
          { name: 'Verification', href: '/app/verification/lab', icon: ShieldCheckIcon },
          { name: 'Samples Reception', href: '/lab/sample-reception', icon: InboxArrowDownIcon },
          { name: 'Pending Tests', href: '/lab/pending-queue', icon: ClockIcon },
          { name: 'Upload Results', href: '/lab/upload-results', icon: ArrowUpTrayIcon },
          { name: 'Test History', href: '/lab/test-history', icon: ArchiveBoxIcon },
          { name: 'Flagged Samples', href: '/lab/flagged-samples', icon: ExclamationTriangleIcon },
          { name: 'MRL Standards', href: '/lab/mrl-standards', icon: BookOpenIcon },
          { name: 'Scanner', href: '/app/qr-scanner', icon: QrCodeIcon }
        ]

      case 'regulator':
        return [
          ...commonItems,
          { name: 'Verification', href: '/app/verification/regulator', icon: ShieldCheckIcon },
          { name: 'Live Surveillance Map', href: '/app/regulator/surveillance-map', icon: MapIcon },
          { name: 'AMU & AMR Analytics', href: '/app/regulator/amu-amr-analytics', icon: ChartBarIcon },
          { name: 'Field Operations', href: '/app/regulator/field-operations', icon: ClipboardDocumentListIcon },
          { name: 'Compliance & Violations', href: '/app/regulator/compliance-violations', icon: ShieldCheckIcon },
          { name: 'Retailer Monitoring', href: '/app/regulator/retailer-monitoring', icon: BuildingStorefrontIcon },
          { name: 'Inspection Management', href: '/app/regulator/inspection-management', icon: ClipboardDocumentIcon },
          { name: 'Audit Trail', href: '/app/audit', icon: DocumentTextIcon },
          { name: 'Policy & Alerts', href: '/app/regulator/policy-alerts', icon: BellAlertIcon },
          { name: 'Generate Reports', href: '/app/regulator/generate-reports', icon: DocumentArrowDownIcon },
          { name: 'National Data', href: '/app/regulator/national-data', icon: GlobeAltIcon },
          { name: 'Complaints', href: '/app/regulator/complaints', icon: InboxStackIcon },
          { name: 'User Registry', href: '/app/regulator/user-registry', icon: UserGroupIcon },
          { name: 'Scanner', href: '/app/qr-scanner', icon: QrCodeIcon },
        ]

      case 'admin':
        return [
          ...commonItems,
          { name: 'User Management', href: '/app/users', icon: UserGroupIcon },
          { name: 'Farm Registry', href: '/app/farms', icon: BuildingOfficeIcon },
          { name: 'System Analytics', href: '/app/analytics', icon: ChartBarIcon },
          { name: 'QR Scanner', href: '/app/qr-scanner', icon: QrCodeIcon },
          { name: 'Settings', href: '/app/settings', icon: CogIcon },
        ]

      case 'collector':
        return [
          ...commonItems,
          { name: 'Verification', href: '/app/verification/collector', icon: ShieldCheckIcon },
          { name: 'Daily Collection', href: '/collector/daily-collection', icon: TruckIcon },
          { name: 'Batch & Tanker', href: '/collector/batch-tanker', icon: ArchiveBoxIcon },
          { name: 'My Assigned Farms', href: '/collector/assigned-farms', icon: MapIcon },
          { name: 'Lab Samples', href: '/collector/lab-samples', icon: BeakerIcon },
          { name: 'Collection History', href: '/collector/collection-history', icon: ClipboardDocumentIcon },
          { name: 'Info', href: '/app/information', icon: BoltIcon },
          { name: 'Scanner', href: '/app/qr-scanner', icon: QrCodeIcon },

        ]

      case 'retailer':
        return [
          ...commonItems,
          { name: 'Record Sales', href: '/retailer/record-sales', icon: ShoppingCartIcon },
          { name: 'Stock Register', href: '/retailer/stock-register', icon: CubeIcon },
          { name: 'Sales History', href: '/retailer/sales-history', icon: ClipboardDocumentIcon },
          { name: 'Shop Profile', href: '/retailer/shop-profile', icon: BuildingStorefrontIcon },
          { name: 'Alerts', href: '/retailer/alerts', icon: BellAlertIcon },
          { name: 'Scanner', href: '/app/qr-scanner', icon: QrCodeIcon },

        ]

      default:
        return commonItems
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo and close button */}
        <div className="flex items-center justify-between flex-shrink-0 h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="VASUDHA Logo" className="object-contain w-8 h-8" />
            <span className="text-lg font-bold text-gray-900">VASUDHA</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-md lg:hidden hover:text-gray-500"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* User info */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600">
                <span className="text-sm font-medium text-white">
                  {(profile?.name || user?.name)?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.name || user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.user_type || user?.role}</p>
              </div>
            </div>

            {/* QR Code Icon Button for Verified Users */}
            {kycCompleted && profile?.unique_id && (
              <button
                onClick={() => setShowQRCode(true)}
                className="flex-shrink-0 p-2 text-green-600 transition-colors rounded-lg bg-green-50 hover:bg-green-100"
                title="View QR Code"
              >
                <QrCodeIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* KYC Status Indicator */}
          <div className="mt-3">
            {kycCompleted ? (
              <div className="flex items-center px-2 py-1 space-x-2 text-xs text-green-700 rounded bg-green-50">
                <CheckCircleIcon className="w-3 h-3" />
                <span>KYC Verified</span>
              </div>
            ) : (
              <NavLink
                to="/app/profile"
                className="flex items-center px-2 py-1 space-x-2 text-xs text-orange-700 transition-colors rounded bg-orange-50 hover:bg-orange-100"
              >
                <ExclamationTriangleIcon className="w-3 h-3" />
                <span>Complete KYC</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isActive
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onClose()
                  }
                }}
              >
                <Icon className="flex-shrink-0 w-5 h-5 mr-3" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer with Profile and Quick Actions */}
        <div className="flex-shrink-0 px-4 py-4 space-y-2 border-t border-gray-200">
          <NavLink
            to="/app/qr-scanner"
            className="flex items-center w-full px-3 py-2 text-sm text-green-600 rounded-lg hover:bg-green-50"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose()
              }
            }}
          >
            <QrCodeIcon className="w-4 h-4 mr-2" />
            Quick Scan
          </NavLink>

          <NavLink
            to="/app/ai-assistant"
            className="flex items-center w-full px-3 py-2 text-sm text-blue-600 rounded-lg hover:bg-blue-50"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose()
              }
            }}
          >
            <BoltIcon className="w-4 h-4 mr-2" />
            AI Assistant
          </NavLink>


          <NavLink
            to="/app/settings"
            className="flex items-center w-full px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose()
              }
            }}
          >
            <CogIcon className="w-4 h-4 mr-2" />
            Settings
          </NavLink>
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
    </>
  )
}

export default Sidebar
