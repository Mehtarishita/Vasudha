import React, { useState } from 'react'

const channels = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'push', label: 'Push Notifications' },
]

const Notifications = () => {
  const [enabled, setEnabled] = useState({ email: true, sms: false, push: true })

  const toggle = (id) => setEnabled((s) => ({ ...s, [id]: !s[id] }))

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Notifications</h1>
      <p className="text-gray-600 mb-4">Manage notification channels and their frequency.</p>

      <div className="space-y-3">
        {channels.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-md border bg-white border-gray-200">
            <div>
              <div className="font-medium">{c.label}</div>
              <div className="text-xs text-gray-500">Enable or disable {c.label.toLowerCase()} notifications.</div>
            </div>
            <button
              onClick={() => toggle(c.id)}
              className={`px-3 py-1 rounded-full font-medium ${enabled[c.id] ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {enabled[c.id] ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">Save Notification Settings</button>
      </div>
    </div>
  )
}

export default Notifications
