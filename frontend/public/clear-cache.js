// Clear all caches and unregister service workers
// Run this in browser console if you need to completely reset: 
// fetch('/clear-cache.js').then(r => r.text()).then(eval)

(async function clearAllCache() {
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (let registration of registrations) {
      await registration.unregister()
      console.log('Unregistered service worker:', registration.scope)
    }
  }

  // Clear all caches
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    for (let name of cacheNames) {
      await caches.delete(name)
      console.log('Deleted cache:', name)
    }
  }

  // Clear localStorage
  localStorage.clear()
  console.log('Cleared localStorage')

  // Clear sessionStorage
  sessionStorage.clear()
  console.log('Cleared sessionStorage')

  console.log('✅ All caches cleared! Refreshing page...')
  
  // Reload the page
  setTimeout(() => {
    window.location.reload(true)
  }, 1000)
})()
