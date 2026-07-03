import React from 'react'
import { CheckCircleIcon, BuildingOffice2Icon, TagIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const RegisterAnimalFarm = () => (
  <div>
    <h1 className="text-2xl font-bold text-gray-900 mb-2">How to Register Animals & Farm</h1>
    <p className="text-gray-600 mb-6">Step-by-step guide for livestock owners to register their farm and animals in VASUDHA system.</p>
    
    {/* Farm Registration */}
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <BuildingOffice2Icon className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Step 1: Register Your Farm</h2>
      </div>
      <ol className="list-decimal ml-6 space-y-3 text-gray-700">
        <li>
          <strong className="text-gray-900">Navigate to Farm Management:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Click on "Farm Management" in the main sidebar</li>
            <li>You'll see your farms dashboard</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Click "Add New Farm":</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Look for the green "+ Add Farm" button at the top</li>
            <li>A registration form will open</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Fill in Farm Details:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li><strong>Farm Name:</strong> Give your farm a recognizable name</li>
            <li><strong>Location:</strong> Enter your farm's address or area</li>
            <li><strong>Farm Size:</strong> Specify area in acres/hectares</li>
            <li><strong>Phone Number:</strong> Your contact number (from KYC)</li>
            <li><strong>Farm Type:</strong> Dairy, Poultry, Mixed, etc.</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Submit & Verify:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Click "Register Farm" button</li>
            <li>Your farm will be created with a unique Farm ID</li>
            <li>Verify the farm appears in your dashboard</li>
          </ul>
        </li>
      </ol>
    </div>

    {/* Animal Registration */}
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TagIcon className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Step 2: Register Individual Animals</h2>
      </div>
      <ol className="list-decimal ml-6 space-y-3 text-gray-700">
        <li>
          <strong className="text-gray-900">Go to Animal Management:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Click "Animal Management" in the Farm section</li>
            <li>You'll see all your registered livestock</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Click "Add Livestock":</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Green "+ Add Animal" button at the top right</li>
            <li>Registration form will appear</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Enter Animal Information:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li><strong>Tag ID:</strong> Auto-generated unique identifier (e.g., TAG ABC123)</li>
            <li><strong>Species:</strong> Cattle, Buffalo, Goat, Sheep, etc.</li>
            <li><strong>Breed:</strong> Holstein, Gir, Murrah, etc.</li>
            <li><strong>Name:</strong> (Optional) Give your animal a name</li>
            <li><strong>Date of Birth:</strong> Animal's birth date</li>
            <li><strong>Gender:</strong> Male or Female</li>
            <li><strong>Weight:</strong> Current weight in kg</li>
            <li><strong>Average Produce:</strong> Daily milk yield (L/day)</li>
            <li><strong>Select Farm:</strong> Choose which farm this animal belongs to</li>
            <li><strong>Health Status:</strong> Healthy, Under Treatment, Sick, etc.</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Submit Registration:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Review all entered information</li>
            <li>Click "Add Livestock" button</li>
            <li>Animal will appear in your livestock list with QR code</li>
          </ul>
        </li>
      </ol>
    </div>

    {/* Important Tips */}
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Important Tips:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ <strong>Tag ID</strong> is automatically generated and unique - you cannot change it later</li>
            <li>✓ <strong>QR Code</strong> is generated for each animal for easy identification and tracking</li>
            <li>✓ Keep animal records <strong>up-to-date</strong> for accurate withdrawal period calculations</li>
            <li>✓ Register animals <strong>before</strong> administering any drugs or treatments</li>
            <li>✓ You can <strong>edit</strong> animal details anytime (except Tag ID)</li>
            <li>✓ Use the <strong>QR scanner</strong> to quickly verify animal information</li>
          </ul>
        </div>
      </div>
    </div>

    {/* Quick Links */}
    <div className="mt-6 grid grid-cols-2 gap-4">
      <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <UserGroupIcon className="h-8 w-8 text-green-600 mb-2" />
        <h3 className="font-semibold text-gray-900 mb-1">Bulk Import</h3>
        <p className="text-sm text-gray-600">Register multiple animals at once using CSV import (coming soon)</p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <TagIcon className="h-8 w-8 text-green-600 mb-2" />
        <h3 className="font-semibold text-gray-900 mb-1">View Animals</h3>
        <p className="text-sm text-gray-600">Go to Animal Management to see all your registered livestock</p>
      </div>
    </div>
  </div>
)

export default RegisterAnimalFarm
