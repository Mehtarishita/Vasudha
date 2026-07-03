import React, { useState, useEffect } from 'react'
import {
    ClipboardDocumentListIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    MapPinIcon,
    CalendarIcon,
    DocumentTextIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'

const VetTaskDashboard = () => {
    const { profile } = useAuthStore()
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('Pending') // 'Pending', 'In_Progress', 'Completed'
    const [selectedTask, setSelectedTask] = useState(null)
    const [reportText, setReportText] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error('Please log in to view tasks')
                return
            }

            const { data, error } = await supabase
                .from('field_tasks')
                .select('*')
                .eq('vet_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            console.log('Tasks fetched:', data)
            setTasks(data || [])
        } catch (error) {
            console.error('Error fetching tasks:', error)
            toast.error('Failed to load tasks')
        } finally {
            setLoading(false)
        }
    }

    // Accept a pending task
    const handleAcceptTask = async (taskId) => {
        try {
            const { error } = await supabase
                .from('field_tasks')
                .update({ status: 'In_Progress' })
                .eq('id', taskId)

            if (error) throw error

            toast.success('Task accepted successfully')
            fetchTasks()
        } catch (error) {
            console.error('Error accepting task:', error)
            toast.error('Failed to accept task')
        }
    }

    // Reject a pending task
    const handleRejectTask = async (taskId) => {
        try {
            const { error } = await supabase
                .from('field_tasks')
                .update({ status: 'Rejected' })
                .eq('id', taskId)

            if (error) throw error

            toast.success('Task rejected')
            fetchTasks()
        } catch (error) {
            console.error('Error rejecting task:', error)
            toast.error('Failed to reject task')
        }
    }

    // Submit completion report
    const handleSubmitReport = async () => {
        if (!selectedTask || !reportText.trim()) {
            toast.error('Please enter your report')
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('field_tasks')
                .update({
                    status: 'Completed',
                    completion_report: reportText,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', selectedTask.id)

            if (error) throw error

            toast.success('Report submitted successfully')
            setSelectedTask(null)
            setReportText('')
            fetchTasks()
        } catch (error) {
            console.error('Error submitting report:', error)
            toast.error('Failed to submit report')
        } finally {
            setSubmitting(false)
        }
    }

    // Filter tasks by status
    const displayedTasks = tasks.filter((t) => t.status === filter)

    // Get task counts for badges
    const taskCounts = {
        Pending: tasks.filter((t) => t.status === 'Pending').length,
        In_Progress: tasks.filter((t) => t.status === 'In_Progress').length,
        Completed: tasks.filter((t) => t.status === 'Completed').length,
    }

    // Priority badge colors
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Emergency':
                return 'bg-red-100 text-red-700 border-red-200'
            case 'Urgent':
                return 'bg-orange-100 text-orange-700 border-orange-200'
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Government Assignments</h1>
                    <p className="text-sm text-gray-600">
                        Manage inspections and audits assigned by the District Regulator
                    </p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px space-x-8">
                    {['Pending', 'In_Progress', 'Completed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${filter === status
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {status === 'In_Progress' ? 'In Progress' : status}
                            <span
                                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${filter === status
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                {taskCounts[status]}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Task List */}
            {loading ? (
                <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                    Loading tasks...
                </div>
            ) : displayedTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                    <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No tasks found in this category</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayedTasks.map((task) => (
                        <div
                            key={task.id}
                            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition"
                        >
                            {/* Priority Badge & Date */}
                            <div className="flex items-start justify-between mb-3">
                                <span
                                    className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                                        task.priority
                                    )}`}
                                >
                                    {task.priority}
                                </span>
                                <div className="flex items-center text-xs text-gray-500">
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    {new Date(task.created_at).toLocaleDateString('en-IN', {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </div>
                            </div>

                            {/* Task Type */}
                            <h3 className="mb-2 text-lg font-semibold text-gray-800">
                                {task.task_type}
                            </h3>

                            {/* Farm ID */}
                            <div className="flex items-center mb-3 text-sm text-gray-600">
                                <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                                <span className="font-mono">{task.farm_id}</span>
                            </div>

                            {/* Notes */}
                            {task.notes && (
                                <div className="p-3 mb-4 text-sm text-gray-700 bg-gray-50 rounded">
                                    "{task.notes}"
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-auto space-y-2">
                                {task.status === 'Pending' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAcceptTask(task.id)}
                                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                                        >
                                            <CheckCircleIcon className="inline-block w-4 h-4 mr-1" />
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleRejectTask(task.id)}
                                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {task.status === 'In_Progress' && (
                                    <button
                                        onClick={() => setSelectedTask(task)}
                                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                    >
                                        <DocumentTextIcon className="inline-block w-4 h-4 mr-1" />
                                        Complete & Report
                                    </button>
                                )}

                                {task.status === 'Completed' && (
                                    <div className="flex items-center justify-center text-sm font-semibold text-green-600">
                                        <CheckCircleIcon className="w-5 h-5 mr-1" />
                                        Completed on{' '}
                                        {new Date(task.completed_at).toLocaleDateString('en-IN', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Show report if completed */}
                            {task.status === 'Completed' && task.completion_report && (
                                <div className="p-3 mt-3 text-xs text-gray-600 bg-green-50 border border-green-200 rounded">
                                    <p className="mb-1 font-semibold text-green-800">Report:</p>
                                    <p>{task.completion_report}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Report Submission Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">
                                Submit Inspection Report
                            </h3>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Task:</span> {selectedTask.task_type}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Farm ID:</span>{' '}
                                <span className="font-mono">{selectedTask.farm_id}</span>
                            </p>
                        </div>

                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Field Observations & Findings *
                        </label>
                        <textarea
                            className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="e.g., Verified livestock health records, checked animal tags, inspected storage facilities. Found MRL compliance issues in milk samples..."
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitReport}
                                disabled={submitting || !reportText.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                            >
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default VetTaskDashboard
