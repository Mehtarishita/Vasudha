import React, { useState } from 'react'

const Preferences = () => {
  const [compactView, setCompactView] = useState(false)
  const [theme, setTheme] = useState('system')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">App Preferences</h1>
      <p className="text-gray-600 mb-4">Customize layout and appearance of the app.</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-md border bg-white border-gray-200">
          <div>
            <div className="font-medium">Compact List View</div>
            <div className="text-xs text-gray-500">Reduce spacing in lists for denser information.</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={compactView} onChange={() => setCompactView(!compactView)} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="p-3 rounded-md border bg-white border-gray-200">
          <div className="font-medium">Theme</div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setTheme('light')} className={`px-3 py-1 rounded ${theme === 'light' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Light</button>
            <button onClick={() => setTheme('dark')} className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Dark</button>
            <button onClick={() => setTheme('system')} className={`px-3 py-1 rounded ${theme === 'system' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>System</button>
          </div>
        </div>

        <div className="mt-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">Save Preferences</button>
        </div>
      </div>

      {/* Simple styles for the toggle switch */}
      <style>{`
        .switch { position: relative; display: inline-block; width: 44px; height: 24px }
        .switch input { opacity: 0; width: 0; height: 0 }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e5e7eb; transition: .2s; border-radius: 9999px }
        .slider:before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: white; transition: .2s; border-radius: 9999px }
        input:checked + .slider { background-color: #34d399 }
        input:checked + .slider:before { transform: translateX(20px) }
      `}</style>
    </div>
  )
}

export default Preferences
