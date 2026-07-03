import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { 
  XMarkIcon, 
  ArrowDownTrayIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const QRCodeDisplay = ({ profile, onClose }) => {
  const qrRef = useRef(null)

  // Generate QR code data
  const qrData = JSON.stringify({
    id: profile.unique_id,
    name: profile.name,
    mobile: profile.mobile_number,
    type: profile.user_type,
    verified: profile.kyc_status === 'verified'
  })

  // Download QR Code as PNG
  const downloadQR = () => {
    const svg = qrRef.current.querySelector('svg')
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    canvas.width = 1000
    canvas.height = 1200

    img.onload = () => {
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR code
      ctx.drawImage(img, 100, 200, 800, 800)

      // Add header
      ctx.fillStyle = '#1F2937'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('VASUDHA', 500, 80)
      
      ctx.font = '32px Arial'
      ctx.fillText('Verified User ID', 500, 130)

      // Add user details below QR
      ctx.font = 'bold 36px Arial'
      ctx.fillText(profile.name, 500, 1050)
      
      ctx.font = '28px Arial'
      ctx.fillStyle = '#6B7280'
      ctx.fillText(`ID: ${profile.unique_id}`, 500, 1090)
      ctx.fillText(`Mobile: ${profile.mobile_number}`, 500, 1130)
      ctx.fillText(`Type: ${profile.user_type.toUpperCase()}`, 500, 1170)

      // Download
      const link = document.createElement('a')
      link.download = `VASUDHA_QR_${profile.unique_id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      toast.success('QR Code downloaded successfully!')
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  // Print QR Code
  const printQR = () => {
    const printWindow = window.open('', '_blank')
    const svg = qrRef.current.querySelector('svg')
    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VASUDHA QR Code - ${profile.unique_id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 40px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #1F2937;
              font-size: 36px;
            }
            .header p {
              margin: 5px 0;
              color: #6B7280;
              font-size: 18px;
            }
            .qr-container {
              border: 2px solid #E5E7EB;
              padding: 30px;
              border-radius: 10px;
              background: white;
            }
            .details {
              margin-top: 30px;
              text-align: center;
            }
            .details h2 {
              margin: 10px 0;
              color: #1F2937;
            }
            .details p {
              margin: 5px 0;
              color: #6B7280;
              font-size: 16px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>VASUDHA</h1>
            <p>Verified User ID</p>
          </div>
          <div class="qr-container">
            ${svgData}
          </div>
          <div class="details">
            <h2>${profile.name}</h2>
            <p><strong>ID:</strong> ${profile.unique_id}</p>
            <p><strong>Mobile:</strong> ${profile.mobile_number}</p>
            <p><strong>Type:</strong> ${profile.user_type.toUpperCase()}</p>
            <p><strong>Status:</strong> Verified ✓</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  // Share QR Code (copy link)
  const shareQR = async () => {
    const shareData = `VASUDHA Verified User\nName: ${profile.name}\nID: ${profile.unique_id}\nMobile: ${profile.mobile_number}\nType: ${profile.user_type.toUpperCase()}`
    
    try {
      await navigator.clipboard.writeText(shareData)
      toast.success('User details copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy details')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your QR Code</h2>
            <p className="text-sm text-gray-600">Scan to verify identity</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* QR Code */}
        <div className="p-8">
          <div ref={qrRef} className="flex flex-col items-center p-6 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <QRCodeSVG
              value={qrData}
              size={280}
              level="H"
              includeMargin={true}
              fgColor="#1F2937"
              bgColor="#F9FAFB"
            />
          </div>

          {/* User Details */}
          <div className="mt-6 space-y-2 text-center">
            <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">ID:</span> {profile.unique_id}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Mobile:</span> {profile.mobile_number}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Type:</span> {profile.user_type.toUpperCase()}
              </p>
            </div>
            <div className="inline-flex items-center px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
              ✓ Verified User
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <button
              onClick={downloadQR}
              className="flex flex-col items-center justify-center p-4 text-blue-600 transition-colors bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <ArrowDownTrayIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Download</span>
            </button>
            
            <button
              onClick={printQR}
              className="flex flex-col items-center justify-center p-4 text-purple-600 transition-colors bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
            >
              <PrinterIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Print</span>
            </button>
            
            <button
              onClick={shareQR}
              className="flex flex-col items-center justify-center p-4 text-green-600 transition-colors bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
            >
              <ShareIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Share</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default QRCodeDisplay
