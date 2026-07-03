import React, { useState, useEffect } from 'react'

const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
]

const Language = () => {
  const [selected, setSelected] = useState('en')
  const [currentLang, setCurrentLang] = useState('en')

  useEffect(() => {
    // Detect current Google Translate language from cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }

    const googleLangCookie = getCookie('googtrans')
    if (googleLangCookie) {
      // Cookie format: /en/hi (from/to)
      const parts = googleLangCookie.split('/')
      const langCode = parts[2] || 'en'
      setSelected(langCode)
      setCurrentLang(langCode)
    }
  }, [])

  const handleLanguageChange = (langCode) => {
    setSelected(langCode)
    
    // Method 1: Try to use the Google Translate dropdown directly
    const googleCombo = document.querySelector('.goog-te-combo')
    if (googleCombo) {
      googleCombo.value = langCode
      googleCombo.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    
    // Method 2: Set cookies and trigger Google Translate manually
    const domain = window.location.hostname
    const cookieValue = `/en/${langCode}`
    
    // Set multiple cookie variations to ensure it works
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${domain}`
    document.cookie = `googtrans=${cookieValue}; path=/`
    document.cookie = `googtrans=${cookieValue}`
    
    // Also set the googtrans for all subdomains
    const hostParts = domain.split('.')
    if (hostParts.length > 1) {
      const rootDomain = hostParts.slice(-2).join('.')
      document.cookie = `googtrans=${cookieValue}; path=/; domain=.${rootDomain}`
    }
    
    // Method 3: If Google Translate object exists, use it directly
    if (window.google?.translate?.TranslateElement) {
      // Force Google Translate to re-initialize
      const googleElement = document.getElementById('google_element')
      if (googleElement) {
        googleElement.innerHTML = ''
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,pa,sa,mr,ur,bn,ta,te,kn,ml,gu,or,as,ne,si,bo,ks,tcy,sd,kon',
            defaultLanguage: langCode,
          },
          'google_element'
        )
      }
    }
    
    // Reload page after a short delay to apply translation
    setTimeout(() => {
      window.location.reload()
    }, 300)
  }

  const resetToEnglish = () => {
    // Clear all Google Translate cookies
    const domain = window.location.hostname
    const clearCookie = (name) => {
      document.cookie = `${name}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
    }
    
    clearCookie('googtrans')
    clearCookie('googtrans')
    
    // Set to English explicitly
    document.cookie = `googtrans=/en/en; path=/; domain=${domain}`
    document.cookie = `googtrans=/en/en; path=/`
    
    // Reset the dropdown if it exists
    const googleCombo = document.querySelector('.goog-te-combo')
    if (googleCombo) {
      googleCombo.value = ''
      googleCombo.dispatchEvent(new Event('change', { bubbles: true }))
    }
    
    // Reload page
    setTimeout(() => {
      window.location.reload()
    }, 300)
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Language Settings</h1>
      <p className="mb-6 text-gray-600">Choose your preferred language for the application. The entire interface will be translated.</p>
      
      {currentLang !== 'en' && (
        <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              Currently viewing in: <strong>{languages.find(l => l.code === currentLang)?.label || 'Unknown'}</strong>
            </div>
            <button
              onClick={resetToEnglish}
              className="px-3 py-1 text-xs text-white transition-colors bg-blue-600 rounded hover:bg-blue-700"
            >
              Reset to English
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selected === lang.code 
                ? 'bg-green-50 border-green-500 shadow-sm' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{lang.label}</div>
                <div className="mt-1 text-lg text-gray-700">{lang.native}</div>
              </div>
              {selected === lang.code && (
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 mt-6 border border-yellow-200 rounded-lg bg-yellow-50">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Changing language will reload the page. Your selected language will be applied across all pages including dashboards, forms, and settings.
          </div>
        </div>
      </div>
    </div>
  )
}

export default Language
