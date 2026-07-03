import React, { useState } from 'react'
import {
    EyeIcon,
    SpeakerWaveIcon,
    AdjustmentsHorizontalIcon,
    SwatchIcon
} from '@heroicons/react/24/outline'

const Accessibility = () => {
    const [settings, setSettings] = useState({
        fontSize: 'medium',
        contrast: 'normal',
        screenReader: false,
        reduceMotion: false,
        keyboardNav: true,
        colorBlindMode: 'none'
    })

    const toggleSetting = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Accessibility</h1>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">Customize the app for better accessibility</p>
            </div>

            {/* Text Size */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <EyeIcon className="w-5 h-5 text-blue-600 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Text Size</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Adjust the size of text throughout the app</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-20">Small</span>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            value={settings.fontSize === 'small' ? 0 : settings.fontSize === 'medium' ? 1 : 2}
                            onChange={(e) => {
                                const sizes = ['small', 'medium', 'large']
                                updateSetting('fontSize', sizes[e.target.value])
                            }}
                            className="flex-1"
                        />
                        <span className="text-sm text-gray-600 w-20 text-right">Large</span>
                    </div>
                    <p className="text-sm text-gray-500">Current: <span className="font-medium capitalize">{settings.fontSize}</span></p>
                </div>
            </div>

            {/* Contrast */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-600 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Contrast</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Increase contrast for better visibility</p>
                    </div>
                </div>

                <div className="space-y-2">
                    {['normal', 'high', 'higher'].map((level) => (
                        <label key={level} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="contrast"
                                value={level}
                                checked={settings.contrast === level}
                                onChange={(e) => updateSetting('contrast', e.target.value)}
                                className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900 capitalize">{level} Contrast</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Color Blind Mode */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-pink-50 rounded-lg">
                        <SwatchIcon className="w-5 h-5 text-pink-600 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Color Blind Mode</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Adjust colors for color vision deficiency</p>
                    </div>
                </div>

                <select
                    value={settings.colorBlindMode}
                    onChange={(e) => updateSetting('colorBlindMode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                    <option value="none">None</option>
                    <option value="protanopia">Protanopia (Red-Blind)</option>
                    <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                    <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                </select>
            </div>

            {/* Screen Reader */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <SpeakerWaveIcon className="w-5 h-5 text-green-600 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Screen Reader Support</h2>
                            <p className="text-xs text-gray-500 sm:text-sm">Optimize for screen reader compatibility</p>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleSetting('screenReader')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.screenReader ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${settings.screenReader ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Reduce Motion */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Reduce Motion</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Minimize animations and transitions</p>
                    </div>
                    <button
                        onClick={() => toggleSetting('reduceMotion')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.reduceMotion ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${settings.reduceMotion ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Keyboard Navigation */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Keyboard Navigation</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Enable full keyboard navigation support</p>
                    </div>
                    <button
                        onClick={() => toggleSetting('keyboardNav')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.keyboardNav ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${settings.keyboardNav ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50 sm:p-5">
                <h3 className="text-base font-semibold text-blue-900 sm:text-lg">Accessibility Resources</h3>
                <p className="mt-2 text-sm text-blue-700">
                    VASUDHA is committed to providing an accessible experience for all users.
                    If you encounter any accessibility issues, please contact our support team.
                </p>
            </div>
        </div>
    )
}

export default Accessibility
