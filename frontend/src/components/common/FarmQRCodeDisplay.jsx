import React from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon, ShareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const FarmQRCodeDisplay = ({ farm, withdrawalCount = 0, onClose }) => {
  const qrData = JSON.stringify({
    farm_id: farm.farm_id,
    farm_name: farm.name,
    farmer_name: farm.farmer_name || 'N/A',
    farmer_unique_id: farm.farmer_unique_id,
    location: farm.location,
    farm_type: farm.farm_type,
    total_livestock: farm.total_livestock,
    withdrawal_count: withdrawalCount,
    phone: farm.phone,
  })

  const downloadQR = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1000
    canvas.height = 1200

    // White background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add QR code
    const svg = document.querySelector('#farm-qr-svg')
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      ctx.drawImage(img, 100, 200, 800, 800)

      // Add header
      ctx.fillStyle = '#059669'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('VASUDHA FARM', canvas.width / 2, 100)

      // Add farm info
      ctx.fillStyle = '#000000'
      ctx.font = '32px Arial'
      ctx.fillText(farm.name, canvas.width / 2, 1050)
      ctx.font = '24px Arial'
      ctx.fillText(`Farm ID: ${farm.farm_id}`, canvas.width / 2, 1100)

      // Download
      const link = document.createElement('a')
      link.download = `farm-qr-${farm.farm_id}.png`
      link.href = canvas.toDataURL()
      link.click()

      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  const printQR = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Farm QR Code - ${farm.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 40px;
            }
            h1 { color: #059669; margin-bottom: 10px; }
            h2 { color: #333; margin-top: 20px; }
            .info { margin-top: 20px; text-align: center; }
            .info div { margin: 8px 0; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>VASUDHA FARM</h1>
          <div id="qr-container"></div>
          <h2>${farm.name}</h2>
          <div class="info">
            <div><strong>Farm ID:</strong> ${farm.farm_id}</div>
            <div><strong>Farmer Name:</strong> ${farm.farmer_name || 'N/A'}</div>
            <div><strong>Farmer ID:</strong> ${farm.farmer_unique_id}</div>
            <div><strong>Phone:</strong> ${farm.phone}</div>
            <div><strong>Location:</strong> ${farm.location}</div>
            <div><strong>Type:</strong> ${farm.farm_type}</div>
            <div><strong>Total Livestock:</strong> ${farm.total_livestock}</div>
            ${withdrawalCount > 0 ? `<div style="color: #dc2626;"><strong>⚠️ Under Withdrawal Period:</strong> ${withdrawalCount} animal(s)</div>` : ''}
          </div>
        </body>
      </html>
    `)

    const svg = document.querySelector('#farm-qr-svg')
    const clone = svg.cloneNode(true)
    clone.setAttribute('width', '400')
    clone.setAttribute('height', '400')
    printWindow.document.getElementById('qr-container').appendChild(clone)

    printWindow.document.close()
    printWindow.print()
  }

  const shareQR = () => {
    let details = `Farm: ${farm.name}\nFarm ID: ${farm.farm_id}\nFarmer ID: ${farm.farmer_unique_id}\nPhone: ${farm.phone}\nLocation: ${farm.location}\nType: ${farm.farm_type}\nLivestock: ${farm.total_livestock}`
    if (withdrawalCount > 0) {
      details += `\n⚠️ Under Withdrawal Period: ${withdrawalCount} animal(s)`
    }
    navigator.clipboard.writeText(details)
    alert('Farm details copied to clipboard!')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Farm QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-4 border-green-500">
            <QRCodeSVG
              id="farm-qr-svg"
              value={qrData}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="mt-6 text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{farm.name}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-semibold">Farm ID:</span> {farm.farm_id}</p>
              <p><span className="font-semibold">Farmer Name:</span> {farm.farmer_name || 'N/A'}</p>
              <p><span className="font-semibold">Farmer ID:</span> {farm.farmer_unique_id}</p>
              <p><span className="font-semibold">Phone:</span> {farm.phone}</p>
              <p><span className="font-semibold">Location:</span> {farm.location}</p>
              <p><span className="font-semibold">Type:</span> <span className="capitalize">{farm.farm_type}</span></p>
              <p><span className="font-semibold">Livestock:</span> {farm.total_livestock}</p>
              {withdrawalCount > 0 && (
                <p className="flex items-center text-red-600">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                  <span className="font-semibold">Under Withdrawal:</span> <span className="ml-1">{withdrawalCount}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={downloadQR}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <ArrowDownTrayIcon className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-xs font-medium text-blue-900">Download</span>
          </button>

          <button
            onClick={printQR}
            className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <PrinterIcon className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-xs font-medium text-purple-900">Print</span>
          </button>

          <button
            onClick={shareQR}
            className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <ShareIcon className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-xs font-medium text-green-900">Share</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default FarmQRCodeDisplay
