import React, { useState } from 'react'
import {
    ShieldCheckIcon,
    LockClosedIcon,
    KeyIcon,
    FingerPrintIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline'

const Privacy = () => {
    const [settings, setSettings] = useState({
        profileVisibility: 'public',
        dataSharing: true,
        analyticsTracking: true,
        twoFactorAuth: false,
        loginAlerts: true
    })

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Privacy & Security</h1>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">Manage your privacy and security preferences</p>
            </div>

            {/* Password Section */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <LockClosedIcon className="w-5 h-5 text-blue-600 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Password</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Last changed 30 days ago</p>
                    </div>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">
                    Change Password
                </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <FingerPrintIcon className="w-5 h-5 text-purple-600 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Two-Factor Authentication</h2>
                            <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                                Add an extra layer of security to your account
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleSetting('twoFactorAuth')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.twoFactorAuth ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Privacy Settings */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Privacy Settings</h2>
                <div className="space-y-4">
                    {/* Profile Visibility */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Profile Visibility</label>
                        <select
                            value={settings.profileVisibility}
                            onChange={(e) => setSettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent sm:w-auto"
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="contacts">Contacts Only</option>
                        </select>
                    </div>

                    {/* Data Sharing */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Share data for analytics</p>
                            <p className="text-xs text-gray-500">Help improve VASUDHA by sharing usage data</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('dataSharing')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.dataSharing ? 'bg-green-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${settings.dataSharing ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Login Alerts */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-200">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Login alerts</p>
                            <p className="text-xs text-gray-500">Get notified of new login attempts</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('loginAlerts')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.loginAlerts ? 'bg-green-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${settings.loginAlerts ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Sessions */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Active Sessions</h2>
                <div className="space-y-3">
                    <div className="flex items-start justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Current Device</p>
                            <p className="text-xs text-gray-500">Windows • Chrome • New Delhi, India</p>
                            <p className="text-xs text-green-600">Active now</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">Current</span>
                    </div>
                </div>
                <button className="mt-4 text-sm font-medium text-red-600 hover:text-red-700">
                    Sign out all other sessions
                </button>
            </div>
        </div>
    )
}

export default Privacy
