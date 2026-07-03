import React from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon, ShareIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const LivestockQRCodeDisplay = ({ livestock, treatments, onClose }) => {
  // Calculate withdrawal status
  const hasActiveTreatments = treatments && treatments.length > 0
  let withdrawalStatus = 'SAFE FOR CONSUMPTION'
  let withdrawalEndDate = null
  let daysRemaining = 0
  let treatmentDetails = []

  if (hasActiveTreatments) {
    const today = new Date()
    const activeTreatments = treatments.filter(t => {
      const endDate = new Date(t.withdrawal_end_date)
      return endDate >= today
    })

    if (activeTreatments.length > 0) {
      // Get the latest withdrawal end date
      const sortedTreatments = activeTreatments.sort((a, b) => 
        new Date(b.withdrawal_end_date) - new Date(a.withdrawal_end_date)
      )
      const latestTreatment = sortedTreatments[0]
      withdrawalEndDate = new Date(latestTreatment.withdrawal_end_date)
      const timeDiff = withdrawalEndDate - today
      daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      
      withdrawalStatus = daysRemaining > 0 ? 'UNDER WITHDRAWAL PERIOD' : 'SAFE FOR CONSUMPTION'
      
      treatmentDetails = activeTreatments.map(t => ({
        drug: t.drug_name || t.salt_name,
        date: new Date(t.administration_date).toLocaleDateString(),
        withdrawalEnd: new Date(t.withdrawal_end_date).toLocaleDateString()
      }))
    }
  }

  const qrData = JSON.stringify({
    livestock_id: livestock.livestock_id,
    tag_id: livestock.tag_id,
    name: livestock.name || 'N/A',
    species: livestock.species,
    breed: livestock.breed,
    farm_id: livestock.farm_farm_id,
    farm_name: livestock.farm_name,
    farmer_name: livestock.farmer_name || 'N/A',
    farmer_unique_id: livestock.farmer_unique_id,
    phone: livestock.farmer_phone,
    withdrawal_status: withdrawalStatus,
    withdrawal_end_date: withdrawalEndDate ? withdrawalEndDate.toISOString() : null,
    days_remaining: daysRemaining,
    scan_date: new Date().toISOString()
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
    const svg = document.querySelector('#livestock-qr-svg')
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
      ctx.fillText('VASUDHA LIVESTOCK', canvas.width / 2, 100)

      // Add livestock info
      ctx.fillStyle = '#000000'
      ctx.font = '32px Arial'
      ctx.fillText(livestock.tag_id + ' - ' + (livestock.name || livestock.species), canvas.width / 2, 1050)
      ctx.font = '24px Arial'
      ctx.fillText(`Livestock ID: ${livestock.livestock_id}`, canvas.width / 2, 1100)

      // Download
      const link = document.createElement('a')
      link.download = `livestock-qr-${livestock.livestock_id}.png`
      link.href = canvas.toDataURL()
      link.click()

      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  const printQR = () => {
    const printWindow = window.open('', '_blank')
    const statusColor = hasActiveTreatments && daysRemaining > 0 ? '#dc2626' : '#059669'
    const statusBg = hasActiveTreatments && daysRemaining > 0 ? '#fee2e2' : '#d1fae5'
    printWindow.document.write(`
      <html>
        <head>
          <title>Livestock QR Code - ${livestock.tag_id}</title>
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
            .status { 
              background: ${statusBg};
              color: ${statusColor};
              padding: 15px;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .info { margin-top: 20px; text-align: center; }
            .info div { margin: 8px 0; }
            .treatments { 
              background: #fef3c7;
              padding: 15px;
              border-radius: 8px;
              margin-top: 15px;
              text-align: left;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>VASUDHA LIVESTOCK</h1>
          <div class="status">
            ${withdrawalStatus}
            ${hasActiveTreatments && daysRemaining > 0 ? `<br/>${daysRemaining} days remaining until safe` : ''}
          </div>
          <div id="qr-container"></div>
          <h2>${livestock.tag_id}${livestock.name ? ' - ' + livestock.name : ''}</h2>
          <div class="info">
            <div><strong>Livestock ID:</strong> ${livestock.livestock_id}</div>
            <div><strong>Species:</strong> ${livestock.species}</div>
            <div><strong>Breed:</strong> ${livestock.breed}</div>
            <div><strong>Health Status:</strong> ${livestock.health_status}</div>
            <div><strong>Farm:</strong> ${livestock.farm_name}</div>
            <div><strong>Farm ID:</strong> ${livestock.farm_farm_id}</div>
            <div><strong>Farmer Name:</strong> ${livestock.farmer_name || 'N/A'}</div>
            <div><strong>Farmer ID:</strong> ${livestock.farmer_unique_id}</div>
            <div><strong>Phone:</strong> ${livestock.farmer_phone}</div>
          </div>
          ${treatmentDetails.length > 0 ? `
            <div class="treatments">
              <strong>Recent Treatments:</strong><br/>
              ${treatmentDetails.map(t => `
                • ${t.drug} - Given: ${t.date}, Safe after: ${t.withdrawalEnd}
              `).join('<br/>')}
            </div>
          ` : ''}
        </body>
      </html>
    `)

    const svg = document.querySelector('#livestock-qr-svg')
    const clone = svg.cloneNode(true)
    clone.setAttribute('width', '400')
    clone.setAttribute('height', '400')
    printWindow.document.getElementById('qr-container').appendChild(clone)

    printWindow.document.close()
    printWindow.print()
  }

  const shareQR = () => {
    let details = `🐄 VASUDHA LIVESTOCK - ${livestock.tag_id}${livestock.name ? ' (' + livestock.name + ')' : ''}

`
    
    if (hasActiveTreatments && daysRemaining > 0) {
      details += `⚠️ STATUS: ${withdrawalStatus}
🚫 NOT SAFE FOR CONSUMPTION
⏰ Days Remaining: ${daysRemaining}
📅 Safe After: ${withdrawalEndDate?.toLocaleDateString()}

`
      
      if (treatmentDetails.length > 0) {
        details += `💊 Recent Treatments:
`
        treatmentDetails.forEach(t => {
          details += `  • ${t.drug}
    Given: ${t.date}
    Safe after: ${t.withdrawalEnd}
`
        })
        details += `
`
      }
    } else {
      details += `✅ STATUS: SAFE FOR CONSUMPTION

`
    }
    
    details += `📋 Livestock Details:
Livestock ID: ${livestock.livestock_id}
Species: ${livestock.species}
Breed: ${livestock.breed}
Health: ${livestock.health_status}
Farm: ${livestock.farm_name}
Farm ID: ${livestock.farm_farm_id}
Farmer Name: ${livestock.farmer_name || 'N/A'}
Farmer ID: ${livestock.farmer_unique_id}
Phone: ${livestock.farmer_phone}`
    
    navigator.clipboard.writeText(details)
    alert('Livestock details with withdrawal status copied to clipboard!')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black bg-opacity-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 md:p-8 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl font-bold text-gray-900 md:text-2xl">Livestock QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column - QR Code */}
          <div className="flex flex-col items-center">
            {/* Withdrawal Status Banner */}
            {hasActiveTreatments && daysRemaining > 0 && (
              <div className="w-full p-3 mb-4 border-2 border-red-500 rounded-lg md:p-4 bg-red-50">
                <div className="flex items-center justify-center space-x-2">
                  <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 text-red-600 md:h-6 md:w-6" />
                  <span className="text-sm font-bold text-center text-red-800 md:text-lg">UNDER WITHDRAWAL PERIOD</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-center text-red-700 md:text-base">
                  NOT SAFE FOR CONSUMPTION - {daysRemaining} days remaining
                </p>
              </div>
            )}

            {!hasActiveTreatments || daysRemaining === 0 && (
              <div className="w-full p-3 mb-4 border-2 border-green-500 rounded-lg md:p-4 bg-green-50">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-green-600 md:h-6 md:w-6" />
                  <span className="text-sm font-bold text-green-800 md:text-lg">SAFE FOR CONSUMPTION</span>
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className={`bg-white p-4 md:p-6 rounded-xl shadow-lg border-4 ${
              hasActiveTreatments && daysRemaining > 0 ? 'border-red-500' : 'border-green-500'
            }`}>
              <QRCodeSVG
                id="livestock-qr-svg"
                value={qrData}
                size={window.innerWidth < 768 ? 200 : 256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="mt-4 space-y-2 text-center md:mt-6">
              <h3 className="text-lg font-bold text-gray-900 md:text-xl">{livestock.tag_id}</h3>
              {livestock.name && <p className="text-base text-gray-700 md:text-lg">{livestock.name}</p>}
            </div>

            {/* Actions */}
            <div className="grid w-full grid-cols-3 gap-2 mt-4 md:gap-3 md:mt-6">
              <button
                onClick={downloadQR}
                className="flex flex-col items-center justify-center p-3 transition-colors rounded-lg md:p-4 bg-blue-50 hover:bg-blue-100"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mb-1 text-blue-600 md:h-6 md:w-6 md:mb-2" />
                <span className="text-xs font-medium text-blue-900">Download</span>
              </button>

              <button
                onClick={printQR}
                className="flex flex-col items-center justify-center p-3 transition-colors rounded-lg md:p-4 bg-purple-50 hover:bg-purple-100"
              >
                <PrinterIcon className="w-5 h-5 mb-1 text-purple-600 md:h-6 md:w-6 md:mb-2" />
                <span className="text-xs font-medium text-purple-900">Print</span>
              </button>

              <button
                onClick={shareQR}
                className="flex flex-col items-center justify-center p-3 transition-colors rounded-lg md:p-4 bg-green-50 hover:bg-green-100"
              >
                <ShareIcon className="w-5 h-5 mb-1 text-green-600 md:h-6 md:w-6 md:mb-2" />
                <span className="text-xs font-medium text-green-900">Share</span>
              </button>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-4">
            {/* Withdrawal Status */}
            {hasActiveTreatments && daysRemaining > 0 && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg md:p-4">
                <p className="text-sm font-bold text-red-900 md:text-base">Withdrawal Period Active</p>
                <p className="mt-1 text-xs text-red-800 md:text-sm">Safe after: {withdrawalEndDate?.toLocaleDateString()}</p>
                <p className="text-xs text-red-800 md:text-sm">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</p>
              </div>
            )}

            {/* Treatment Details */}
            {treatmentDetails.length > 0 && (
              <div className="p-3 border border-yellow-300 rounded-lg md:p-4 bg-yellow-50">
                <p className="mb-2 text-sm font-bold text-yellow-900 md:text-base">Recent Treatments:</p>
                <div className="space-y-2 overflow-y-auto max-h-40">
                  {treatmentDetails.map((treatment, idx) => (
                    <div key={idx} className="pb-2 text-xs text-yellow-800 border-b border-yellow-200 md:text-sm last:border-0">
                      <p className="font-semibold">• {treatment.drug}</p>
                      <p className="ml-3">Given: {treatment.date}</p>
                      <p className="ml-3">Safe after: {treatment.withdrawalEnd}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Livestock Details */}
            <div className="p-3 border border-gray-200 rounded-lg md:p-4 bg-gray-50">
              <p className="mb-2 text-sm font-bold text-gray-900 md:text-base">Livestock Details:</p>
              <div className="grid grid-cols-1 gap-1 text-xs text-gray-600 md:gap-2 md:text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">Livestock ID:</span>
                  <span className="text-right text-gray-900">{livestock.livestock_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Species:</span>
                  <span className="text-gray-900">{livestock.species}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Breed:</span>
                  <span className="text-right text-gray-900">{livestock.breed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Farm:</span>
                  <span className="text-right text-gray-900">{livestock.farm_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Farm ID:</span>
                  <span className="text-gray-900">{livestock.farm_farm_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Health Status:</span>
                  <span className="text-gray-900">{livestock.health_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Farmer Name:</span>
                  <span className="text-right text-gray-900">{livestock.farmer_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Farmer ID:</span>
                  <span className="text-right text-gray-900">{livestock.farmer_unique_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Phone:</span>
                  <span className="text-gray-900">{livestock.farmer_phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default LivestockQRCodeDisplay
