import React from 'react'
import {
    ArrowDownTrayIcon,
    TrashIcon,
    CloudArrowUpIcon,
    DocumentArrowDownIcon,
    ClockIcon
} from '@heroicons/react/24/outline'

const DataManagement = () => {
    const dataStats = [
        { label: 'Total Records', value: '1,234', color: 'text-blue-600' },
        { label: 'Storage Used', value: '2.4 MB', color: 'text-green-600' },
        { label: 'Last Backup', value: '2 days ago', color: 'text-purple-600' },
    ]

    const exportOptions = [
        { format: 'CSV', description: 'Comma-separated values for spreadsheets', icon: DocumentArrowDownIcon },
        { format: 'JSON', description: 'Structured data format for developers', icon: DocumentArrowDownIcon },
        { format: 'PDF', description: 'Printable document format', icon: DocumentArrowDownIcon },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Data Management</h1>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">Export, backup, or manage your account data</p>
            </div>

            {/* Data Statistics */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {dataStats.map((stat, index) => (
                    <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
                        <p className="text-xs text-gray-500 sm:text-sm">{stat.label}</p>
                        <p className={`text-xl font-bold ${stat.color} sm:text-2xl`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Export Data */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <ArrowDownTrayIcon className="w-5 h-5 text-blue-600 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Export Your Data</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Download a copy of your VASUDHA data</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {exportOptions.map((option, index) => {
                        const Icon = option.icon
                        return (
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <Icon className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{option.format}</p>
                                        <p className="text-xs text-gray-500">{option.description}</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1 text-sm font-medium text-green-600 transition-colors border border-green-600 rounded-lg hover:bg-green-50">
                                    Export
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Backup & Restore */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-50 rounded-lg">
                        <CloudArrowUpIcon className="w-5 h-5 text-green-600 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Backup & Restore</h2>
                        <p className="text-xs text-gray-500 sm:text-sm">Automatic backups are enabled</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <ClockIcon className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Last Backup</p>
                                <p className="text-xs text-gray-500">December 27, 2025 at 10:30 AM</p>
                            </div>
                        </div>
                        <button className="px-3 py-1 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-white">
                            Restore
                        </button>
                    </div>

                    <button className="w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">
                        Create Manual Backup
                    </button>
                </div>
            </div>

            {/* Data Retention */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg sm:p-5">
                <h2 className="mb-3 text-base font-semibold text-gray-900 sm:text-lg">Data Retention Policy</h2>
                <div className="p-3 space-y-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                    <p>• Your data is retained for 7 years as per government regulations</p>
                    <p>• You can request data deletion by contacting support</p>
                    <p>• Deleted data is permanently removed after 30 days</p>
                    <p>• Compliance records cannot be deleted during active investigations</p>
                </div>
            </div>

            {/* Delete Account */}
            <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50 sm:p-5">
                <div className="flex items-start gap-3">
                    <TrashIcon className="flex-shrink-0 w-6 h-6 text-red-600" />
                    <div className="flex-1">
                        <h2 className="text-base font-semibold text-red-900 sm:text-lg">Delete Account</h2>
                        <p className="mt-1 text-sm text-red-700">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button className="px-4 py-2 mt-4 text-sm font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700">
                            Request Account Deletion
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DataManagement
