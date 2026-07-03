import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker Configuration
// Set to false to disable PWA features during development
const ENABLE_SERVICE_WORKER = false // Change to true when you need PWA

if (ENABLE_SERVICE_WORKER && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope)
        
        // Check for updates immediately
        registration.update()
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          console.log('🔄 New service worker found, installing...')
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New service worker available
                console.log('✅ New version available! Page will refresh...')
                
                // Skip waiting and claim immediately
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                
                // Reload after a short delay
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              } else {
                console.log('✅ Service worker installed for first time')
              }
            }
          })
        })
        
        // Check for updates every 30 seconds in development
        const isDev = window.location.hostname === 'localhost'
        const updateInterval = isDev ? 30000 : 300000 // 30s dev, 5min prod
        
        setInterval(() => {
          registration.update().then(() => {
            console.log('🔍 Checked for updates')
          })
        }, updateInterval)
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error)
      })
  })
  
  // Handle service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RELOAD') {
      window.location.reload()
    }
  })
} else if ('serviceWorker' in navigator) {
  // Unregister existing service workers when disabled
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
      console.log('🗑️ Service Worker unregistered (disabled in development)')
    })
  })
}

