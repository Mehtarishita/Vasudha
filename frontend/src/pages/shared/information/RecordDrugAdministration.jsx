import React from 'react'
import { BeakerIcon, CameraIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const RecordDrugAdministration = () => (
  <div>
    <h1 className="text-2xl font-bold text-gray-900 mb-2">How to Record Drug Administration</h1>
    <p className="text-gray-600 mb-6">Complete guide for livestock owners to record drug treatments and track withdrawal periods.</p>
    
    {/* Quick Drug Recording */}
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <CameraIcon className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Method 1: Image Capture (Recommended)</h2>
      </div>
      <ol className="list-decimal ml-6 space-y-3 text-gray-700">
        <li>
          <strong className="text-gray-900">Navigate to Treatment Recording:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Go to Inventory → "Treatment Recording" in sidebar</li>
            <li>Or use "Capture Drug Image" button from Drug Administration page</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Capture Drug Label:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Click "Upload Image" or "Capture with Camera"</li>
            <li>Take a clear photo of the drug label/packet</li>
            <li>Make sure drug name and composition are visible</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">OCR Detection:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>System automatically scans the image using OCR</li>
            <li>Matches detected text with drug database</li>
            <li>Shows detected drugs with confidence scores</li>
            <li>Select the correct drug from matches</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Auto-Fill Form:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Drug details are automatically populated</li>
            <li>Withdrawal periods pre-filled</li>
            <li>MRL limits shown automatically</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Complete Treatment Details:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Select the livestock (animal) from dropdown</li>
            <li>Enter dosage (e.g., "5ml", "2 tablets")</li>
            <li>Choose administration route (oral, injection, etc.)</li>
            <li>Select purpose (therapeutic, prophylactic)</li>
            <li>Add veterinarian name (if applicable)</li>
            <li>Add any notes</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Submit Record:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Review all information</li>
            <li>System calculates withdrawal end date automatically</li>
            <li>Click "Record Treatment" button</li>
            <li>Treatment is saved and withdrawal period starts</li>
          </ul>
        </li>
      </ol>
    </div>

    {/* Manual Drug Recording */}
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardDocumentCheckIcon className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Method 2: Manual Entry</h2>
      </div>
      <ol className="list-decimal ml-6 space-y-3 text-gray-700">
        <li>
          <strong className="text-gray-900">Go to Drug Administration:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Click Inventory → "Drug Administration" in sidebar</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Fill the Form Manually:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li><strong>Select Livestock:</strong> Choose the animal from dropdown</li>
            <li><strong>Select Drug:</strong> Pick from database (30+ drugs)</li>
            <li><strong>Batch Number:</strong> (Optional) Drug batch/lot number</li>
            <li><strong>Dosage:</strong> Amount given (e.g., "10ml", "3 tablets")</li>
            <li><strong>Route:</strong> Oral, Injection, Topical, IV, IM</li>
            <li><strong>Purpose:</strong> Therapeutic, Prophylactic, Metaphylactic</li>
            <li><strong>Notes:</strong> Additional information</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Review Withdrawal Warning:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>System shows withdrawal period calculation</li>
            <li>MRL limits displayed</li>
            <li>Safe consumption date calculated</li>
          </ul>
        </li>
        <li>
          <strong className="text-gray-900">Submit:</strong>
          <ul className="ml-4 mt-1 list-disc text-sm">
            <li>Click "Record Administration" button</li>
            <li>AMU record created automatically (for antibiotics)</li>
          </ul>
        </li>
      </ol>
    </div>

    {/* After Recording */}
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <BeakerIcon className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">After Recording Treatment</h2>
      </div>
      <ul className="ml-6 space-y-2 text-gray-700 list-disc">
        <li>Animal card in Animal Management will show <strong className="text-red-700">"Under Treatment"</strong> badge</li>
        <li>Card background turns <strong className="text-red-700">light red</strong> to indicate active withdrawal</li>
        <li>Withdrawal countdown badge shows <strong>days remaining</strong></li>
        <li>Animal's milk/meat is marked as <strong className="text-red-700">NOT SAFE</strong> during withdrawal</li>
        <li>QR code for animal displays withdrawal status prominently</li>
        <li>Stats updated: Active Withdrawals, Antibiotic Use, AMU count</li>
      </ul>
    </div>

    {/* Important Warnings */}
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-5 mb-6">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900 mb-2">Critical Warnings:</h3>
          <ul className="space-y-2 text-sm text-red-800">
            <li>⚠️ <strong>BANNED Drugs:</strong> System prevents recording of banned drugs (Colistin, Diclofenac, Chloramphenicol, Nitrofurans)</li>
            <li>⚠️ <strong>Withdrawal Violation:</strong> Do NOT sell milk/meat during active withdrawal period</li>
            <li>⚠️ <strong>MRL Compliance:</strong> Consuming products before withdrawal ends can violate MRL limits</li>
            <li>⚠️ <strong>Regulatory Status:</strong> Check drug status (Approved/Restricted/Banned) before use</li>
            <li>⚠️ <strong>Double Check:</strong> Always verify withdrawal periods before selling animal products</li>
          </ul>
        </div>
      </div>
    </div>

    {/* Quick Reference */}
    <div className="grid grid-cols-2 gap-4">
      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">✓ Do's</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Record ALL drug administrations immediately</li>
          <li>• Use OCR scan for faster, accurate entry</li>
          <li>• Wait for full withdrawal period</li>
          <li>• Check QR code before selling products</li>
          <li>• Keep veterinarian records updated</li>
        </ul>
      </div>
      <div className="border border-red-200 bg-red-50 rounded-lg p-4">
        <h3 className="font-semibold text-red-900 mb-2">✗ Don'ts</h3>
        <ul className="text-sm text-red-800 space-y-1">
          <li>• Never skip recording treatments</li>
          <li>• Don't sell milk/meat during withdrawal</li>
          <li>• Avoid using banned drugs</li>
          <li>• Don't ignore withdrawal warnings</li>
          <li>• Don't forget to update dosage info</li>
        </ul>
      </div>
    </div>
  </div>
)

export default RecordDrugAdministration
