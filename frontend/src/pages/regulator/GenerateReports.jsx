import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { 
  DocumentArrowDownIcon, 
  CalendarIcon, 
  GlobeAltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'

const GenerateReports = () => {
  const [reportType, setReportType] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  })
  const [selectedState, setSelectedState] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  const reportTemplates = [
    {
      id: 'woah',
      name: 'WOAH Annual Questionnaire',
      description: 'Annual Report on Antimicrobial Agents for Animals',
      frequency: 'Annually',
      submittedTo: 'World Organisation for Animal Health (WOAH)',
      icon: GlobeAltIcon,
      color: 'blue',
      fields: ['species', 'dateRange', 'route']
    },
    {
      id: 'nrcp',
      name: 'NRCP Violation Report',
      description: 'National Residue Control Plan Data',
      frequency: 'Monthly/Annual',
      submittedTo: 'FSSAI / Export Inspection Council',
      icon: ShieldCheckIcon,
      color: 'red',
      fields: ['state', 'dateRange']
    },
    {
      id: 'infaar',
      name: 'INFAAR Surveillance Report',
      description: 'AMR Resistance Surveillance Data',
      frequency: 'Periodic',
      submittedTo: 'ICAR / NCDC',
      icon: ChartBarIcon,
      color: 'green',
      fields: ['state', 'dateRange', 'species']
    },
    {
      id: 'napamr',
      name: 'NAP-AMR Progress Report',
      description: 'National Action Plan Compliance Report',
      frequency: 'Annually',
      submittedTo: 'Ministry of Health & Family Welfare',
      icon: ClipboardDocumentCheckIcon,
      color: 'purple',
      fields: ['dateRange']
    }
  ]

  const speciesOptions = [
    'Bovine (Cattle)',
    'Buffalo',
    'Poultry',
    'Sheep',
    'Goat',
    'Pig',
    'Fish'
  ]

  const stateOptions = [
    'Madhya Pradesh',
    'Uttar Pradesh',
    'Maharashtra',
    'Rajasthan',
    'Gujarat',
    'Punjab',
    'Haryana',
    'All States'
  ]

  const handleSpeciesToggle = (species) => {
    if (selectedSpecies.includes(species)) {
      setSelectedSpecies(selectedSpecies.filter(s => s !== species))
    } else {
      setSelectedSpecies([...selectedSpecies, species])
    }
  }

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast.error('Please select a report type')
      return
    }

    const template = reportTemplates.find(t => t.id === reportType)
    
    // Validate required fields
    if (template.fields.includes('dateRange') && (!dateRange.from || !dateRange.to)) {
      toast.error('Please select date range')
      return
    }
    if (template.fields.includes('state') && !selectedState) {
      toast.error('Please select a state')
      return
    }
    if (template.fields.includes('species') && selectedSpecies.length === 0) {
      toast.error('Please select at least one species')
      return
    }

    setIsGenerating(true)

    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      // In production, this would call your API to generate the actual report
      toast.success(`${template.name} generated successfully!`)
      
      // Trigger download (mock)
      const filename = `${reportType}_report_${dateRange.from}_${dateRange.to}.csv`
      toast.success(`Download started: ${filename}`)
      
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedTemplate = reportTemplates.find(t => t.id === reportType)

  return (
    <div className="min-h-screen p-4 bg-gray-50 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate Reports</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate mandatory regulatory reports for national and international submissions
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Report Templates */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Report Template</h2>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reportTemplates.map((template) => {
                  const Icon = template.icon
                  const isSelected = reportType === template.id
                  const colorClasses = {
                    blue: 'border-blue-500 bg-blue-50',
                    red: 'border-red-500 bg-red-50',
                    green: 'border-green-500 bg-green-50',
                    purple: 'border-purple-500 bg-purple-50'
                  }

                  return (
                    <button
                      key={template.id}
                      onClick={() => setReportType(template.id)}
                      className={`p-4 text-left border-2 rounded-lg transition-all ${
                        isSelected 
                          ? colorClasses[template.color] + ' shadow-md' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 mt-1 ${
                          isSelected ? `text-${template.color}-600` : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="mt-1 text-xs text-gray-600">{template.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500">
                              📅 {template.frequency}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            → {template.submittedTo}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Report Configuration */}
            {selectedTemplate && (
              <div className="p-6 mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Report Configuration</h2>

                <div className="space-y-4">
                  {/* Date Range */}
                  {selectedTemplate.fields.includes('dateRange') && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          From Date *
                        </label>
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          To Date *
                        </label>
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* State Selection */}
                  {selectedTemplate.fields.includes('state') && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        State *
                      </label>
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select state...</option>
                        {stateOptions.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Species Selection */}
                  {selectedTemplate.fields.includes('species') && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Species * (Select multiple)
                      </label>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {speciesOptions.map(species => (
                          <label
                            key={species}
                            className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSpecies.includes(species)}
                              onChange={() => handleSpeciesToggle(species)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">{species}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="flex items-center justify-center w-full gap-2 px-4 py-3 mt-6 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                    {isGenerating ? 'Generating...' : 'Generate & Download Report'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Table */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Report Summary</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left text-gray-600">Report</th>
                      <th className="px-2 py-2 text-left text-gray-600">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportTemplates.map(template => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 font-medium text-gray-900">
                          {template.name.split(' ')[0]}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {template.frequency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 mt-6 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="mb-2 text-sm font-semibold text-blue-900">📋 Submission Guidelines</h3>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>• WOAH reports due by March 31st</li>
                  <li>• NRCP monthly by 5th of next month</li>
                  <li>• INFAAR quarterly submissions</li>
                  <li>• NAP-AMR annual by December 31st</li>
                </ul>
              </div>

              <div className="p-4 mt-4 border rounded-lg border-amber-200 bg-amber-50">
                <h3 className="mb-2 text-sm font-semibold text-amber-900">⚠️ Important Notes</h3>
                <ul className="space-y-1 text-xs text-amber-800">
                  <li>• Verify data before submission</li>
                  <li>• Keep backup copies of all reports</li>
                  <li>• Reports are auto-formatted per standards</li>
                  <li>• CSV format compatible with portals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GenerateReports
