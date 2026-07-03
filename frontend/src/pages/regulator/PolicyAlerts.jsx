import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BellAlertIcon, 
  MegaphoneIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'

const PolicyAlerts = () => {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('broadcast')
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    priority: 'medium',
    recipients: 'all',
    type: 'advisory'
  })

  const [recentAlerts, setRecentAlerts] = useState([
    {
      id: 1,
      title: 'Lumpy Skin Disease Alert',
      message: 'Immediate vaccination required for all cattle in affected districts',
      priority: 'high',
      recipients: 'Farmers, Veterinarians',
      date: '2025-11-14',
      status: 'sent'
    },
    {
      id: 2,
      title: 'New MRL Guidelines',
      message: 'Updated Maximum Residue Limits for Oxytetracycline - effective immediately',
      priority: 'medium',
      recipients: 'All Stakeholders',
      date: '2025-11-12',
      status: 'sent'
    }
  ])

  const [bannedDrugs, setBannedDrugs] = useState([
    { id: 1, name: 'Chloramphenicol', category: 'Antibiotic', dateAdded: '2024-01-15', reason: 'Carcinogenic risk' },
    { id: 2, name: 'Nitrofurans', category: 'Antibiotic', dateAdded: '2024-03-20', reason: 'Genotoxic effects' },
    { id: 3, name: 'Colistin (Growth Promoter)', category: 'Antibiotic', dateAdded: '2024-06-10', reason: 'AMR concerns' }
  ])

  const handleBroadcast = () => {
    const newAlert = {
      id: recentAlerts.length + 1,
      ...alertForm,
      date: new Date().toISOString().split('T')[0],
      status: 'sent',
      recipients: alertForm.recipients === 'all' ? 'All Stakeholders' : alertForm.recipients
    }
    setRecentAlerts([newAlert, ...recentAlerts])
    setAlertForm({
      title: '',
      message: '',
      priority: 'medium',
      recipients: 'all',
      type: 'advisory'
    })
    toast.success('Alert broadcast successfully!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy & Alerts</h1>
          <p className="text-gray-600">Broadcast advisories and manage banned substances</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
          <SparklesIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">AI Assistant Available</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'broadcast'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MegaphoneIcon className="w-4 h-4" />
              <span>Broadcast Advisory</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('banned-drugs')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'banned-drugs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShieldExclamationIcon className="w-4 h-4" />
              <span>Banned Drug Database</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-4 h-4" />
              <span>Alert History</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Broadcast Advisory Tab */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Advisory</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
                <select
                  value={alertForm.type}
                  onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="advisory">General Advisory</option>
                  <option value="disease">Disease Alert</option>
                  <option value="policy">Policy Update</option>
                  <option value="emergency">Emergency Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={alertForm.title}
                  onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                  placeholder="e.g., Lumpy Skin Disease Alert"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={alertForm.message}
                  onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                  rows="4"
                  placeholder="Enter detailed message..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={alertForm.priority}
                    onChange={(e) => setAlertForm({ ...alertForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                  <select
                    value={alertForm.recipients}
                    onChange={(e) => setAlertForm({ ...alertForm, recipients: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Stakeholders</option>
                    <option value="farmers">Farmers Only</option>
                    <option value="veterinarians">Veterinarians Only</option>
                    <option value="retailers">Retailers Only</option>
                    <option value="labs">Labs Only</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleBroadcast}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center space-x-2"
              >
                <MegaphoneIcon className="w-5 h-5" />
                <span>Broadcast Alert</span>
              </button>
            </div>
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start space-x-3 mb-4">
                <BellAlertIcon className={`w-6 h-6 ${
                  alertForm.priority === 'critical' ? 'text-red-600' :
                  alertForm.priority === 'high' ? 'text-orange-600' :
                  alertForm.priority === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {alertForm.title || 'Alert Title'}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alertForm.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      alertForm.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      alertForm.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alertForm.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {alertForm.message || 'Your message will appear here...'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>• From: {user?.name || 'Regulator'}</span>
                    <span>• To: {alertForm.recipients === 'all' ? 'All Stakeholders' : alertForm.recipients}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Banned Drug Database Tab */}
      {activeTab === 'banned-drugs' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm"
        >
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Banned Substances Registry</h3>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                Add New Ban
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bannedDrugs.map((drug) => (
                  <tr key={drug.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{drug.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {drug.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(drug.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {drug.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-900 font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Alert History Tab */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {recentAlerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.priority === 'high' ? 'bg-red-100 text-red-700' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{alert.message}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>• {new Date(alert.date).toLocaleDateString()}</span>
                    <span>• Sent to: {alert.recipients}</span>
                    <span className="text-green-600">• {alert.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default PolicyAlerts
