import React from 'react'
import { 
  RocketLaunchIcon, 
  BuildingOffice2Icon, 
  TagIcon, 
  BeakerIcon, 
  CalendarDaysIcon,
  QrCodeIcon,
  CheckBadgeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const GettingStarted = () => (
  <div>
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <RocketLaunchIcon className="h-8 w-8 text-green-600" />
        <h1 className="text-3xl font-bold text-gray-900">Getting Started with VASUDHA</h1>
      </div>
      <p className="text-lg text-gray-600">
        Welcome to VASUDHA - Your complete livestock management and antimicrobial residue monitoring platform.
      </p>
      <p className="text-gray-600 mt-2">
        Follow this step-by-step guide to get started with managing your farm, animals, and ensuring food safety compliance.
      </p>
    </div>

    {/* What is VASUDHA */}
    <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">What is VASUDHA?</h2>
      <p className="text-gray-700 mb-3">
        VASUDHA is a comprehensive platform designed to help livestock owners track drug administrations, 
        monitor antimicrobial usage (AMU), and ensure withdrawal periods are followed to prevent 
        antimicrobial residues in milk and meat products.
      </p>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <CheckBadgeIcon className="h-6 w-6 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">Food Safety</h3>
          <p className="text-sm text-gray-600">Track withdrawal periods to ensure MRL compliance</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <BeakerIcon className="h-6 w-6 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">AMU Monitoring</h3>
          <p className="text-sm text-gray-600">Record antibiotic usage for regulatory compliance</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <QrCodeIcon className="h-6 w-6 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">QR Traceability</h3>
          <p className="text-sm text-gray-600">Generate QR codes for livestock verification</p>
        </div>
      </div>
    </div>

    {/* Step-by-Step Workflow */}
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Complete Workflow</h2>
      
      {/* Step 1: Register Farm */}
      <div className="mb-6 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BuildingOffice2Icon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Register Your Farm</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Create your farm profile in the system with location, size, and type details.
            </p>
            <ul className="ml-4 space-y-1 text-sm text-gray-600">
              <li>• Navigate to Farm Management</li>
              <li>• Click "Add New Farm"</li>
              <li>• Fill in farm details (name, location, size, type)</li>
              <li>• Submit and get your unique Farm ID</li>
            </ul>
            <div className="mt-3">
              <span className="inline-flex items-center text-sm text-green-700 font-medium">
                Learn more in "How to Register Animals & Farm"
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Register Animals */}
      <div className="mb-6 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Add Your Livestock</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Register each animal with details like species, breed, date of birth, and health status.
            </p>
            <ul className="ml-4 space-y-1 text-sm text-gray-600">
              <li>• Go to Animal Management</li>
              <li>• Click "Add Livestock"</li>
              <li>• Enter animal details (tag ID auto-generated)</li>
              <li>• Each animal gets a unique QR code</li>
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Auto QR Code Generation
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Unique Tag ID
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Record Treatments */}
      <div className="mb-6 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BeakerIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Record Drug Administration</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Track all drug/antibiotic treatments with OCR image scanning or manual entry.
            </p>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 text-sm mb-2">📸 OCR Method (Recommended)</h4>
                <ul className="ml-4 space-y-1 text-xs text-blue-800">
                  <li>• Capture drug label image</li>
                  <li>• Auto-detect drug from database</li>
                  <li>• Auto-fill withdrawal periods</li>
                  <li>• Select animal and complete details</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <h4 className="font-semibold text-purple-900 text-sm mb-2">✍️ Manual Method</h4>
                <ul className="ml-4 space-y-1 text-xs text-purple-800">
                  <li>• Select drug from dropdown (30+ drugs)</li>
                  <li>• Enter dosage and route</li>
                  <li>• System calculates withdrawal</li>
                  <li>• Submit treatment record</li>
                </ul>
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center text-sm text-green-700 font-medium">
                Complete guide in "How to Record Drug Administration"
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Monitor Withdrawal */}
      <div className="mb-6 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            4
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Track Withdrawal Periods</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Monitor which animals are under treatment and when they are safe for consumption.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-yellow-900 font-medium mb-2">🔴 Animals under withdrawal show:</p>
              <ul className="ml-4 space-y-1 text-sm text-yellow-800">
                <li>• Red highlighted card in Animal Management</li>
                <li>• "Under Treatment" status badge</li>
                <li>• Days remaining countdown</li>
                <li>• QR code with withdrawal warning</li>
              </ul>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center text-sm text-green-700 font-medium">
                Use "Withdrawal Period Calculator" for manual checks
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 5: Use QR Codes */}
      <div className="mb-6 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            5
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <QrCodeIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Generate & Scan QR Codes</h3>
            </div>
            <p className="text-gray-700 mb-3">
              Each animal has a unique QR code showing real-time withdrawal status.
            </p>
            <ul className="ml-4 space-y-1 text-sm text-gray-600">
              <li>• View QR codes in Animal Management</li>
              <li>• Print QR codes for physical tags</li>
              <li>• Share QR codes with collectors/buyers</li>
              <li>• QR shows: Tag ID, Species, Breed, Withdrawal Status, Days Remaining</li>
            </ul>
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-900">
                ✅ <strong>Green QR:</strong> Safe for consumption<br/>
                🔴 <strong>Red QR:</strong> Under treatment - NOT safe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Key Features */}
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features You'll Use</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Real-time Statistics</h3>
          <p className="text-sm text-gray-600">
            Track total treatments, active withdrawals, antibiotic usage, and AMU compliance in one dashboard.
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <h3 className="font-semibold text-gray-900 mb-2">🗄️ Drug Database</h3>
          <p className="text-sm text-gray-600">
            Access 30+ drugs with withdrawal periods, MRL limits, and regulatory status (Approved/Restricted/Banned).
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <h3 className="font-semibold text-gray-900 mb-2">🔍 OCR Drug Detection</h3>
          <p className="text-sm text-gray-600">
            Take a photo of drug packets - system automatically detects and fills details using AI-powered OCR.
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <h3 className="font-semibold text-gray-900 mb-2">🧮 Auto Withdrawal Calculation</h3>
          <p className="text-sm text-gray-600">
            System automatically calculates withdrawal end dates for both milk and meat products based on drug data.
          </p>
        </div>
      </div>
    </div>

    {/* Quick Tips */}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">💡 Quick Tips for Success</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium text-blue-900 mb-2">Best Practices:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>✓ Record treatments immediately after administration</li>
            <li>✓ Use OCR scanning for faster, accurate entry</li>
            <li>✓ Check animal QR codes before selling products</li>
            <li>✓ Update animal health status regularly</li>
            <li>✓ Keep veterinarian contact info updated</li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-blue-900 mb-2">Important Reminders:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>⚠️ Never sell milk/meat during withdrawal periods</li>
            <li>⚠️ Banned drugs cannot be recorded in the system</li>
            <li>⚠️ MRL violations can result in regulatory action</li>
            <li>⚠️ Always wait for the full withdrawal period</li>
            <li>⚠️ QR codes update in real-time with treatment status</li>
          </ul>
        </div>
      </div>
    </div>

    {/* Navigation Help */}
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">📚 Need More Help?</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Register Farm & Animals</h3>
          <p className="text-xs text-gray-600">Detailed guide for farm and livestock registration</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Record Drug Administration</h3>
          <p className="text-xs text-gray-600">Complete workflow for OCR and manual treatment entry</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Withdrawal Calculator</h3>
          <p className="text-xs text-gray-600">Check withdrawal periods for milk and meat products</p>
        </div>
      </div>
    </div>
  </div>
)

export default GettingStarted
