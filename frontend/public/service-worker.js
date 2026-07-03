/* eslint-disable no-restricted-globals */

// Update version to force cache refresh on deployment
const CACHE_VERSION = 'v3.1' // Increment this on every deploy
const CACHE_NAME = `vasudha-${CACHE_VERSION}`
const RUNTIME_CACHE = `vasudha-runtime-${CACHE_VERSION}`

// Only cache static assets, not HTML/JS in development
const urlsToCache = [
  '/logo.png',
  '/manifest.json'
]

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Install service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing, version:', CACHE_VERSION)
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('Cache add failed:', err)
        })
      })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Network First strategy - always try network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // For localhost development - always use network, no cache
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request)
      })
    )
    return
  }
  
  // Network First strategy for GET requests only
  // Don't cache POST/PUT/DELETE (API calls)
  if (request.method !== 'GET') {
    event.respondWith(fetch(request))
    return
  }
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Check if valid response
        if (!response || response.status !== 200) {
          return response
        }
        
        // Only cache successful GET responses
        const responseToCache = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache)
        })
        
        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request)
      })
  )
})

// Activate and clean old caches
// Activate and clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating, version:', CACHE_VERSION)
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE]
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all pages immediately
  return self.clients.claim()
})

// Handle background sync (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  // Implement your data sync logic here
  console.log('Background sync triggered')
}

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  }

  event.waitUntil(
    self.registration.showNotification('VASUDHA', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})
