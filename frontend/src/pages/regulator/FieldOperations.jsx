import React, { useState, useMemo } from 'react'
import {
    UserGroupIcon,
    ClipboardDocumentListIcon,
    MagnifyingGlassIcon,
    BellAlertIcon,
    ArrowDownTrayIcon,
    DocumentArrowDownIcon,
    FunnelIcon,
    MapPinIcon,
    PlusIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../config/supabase'
import { useAuthStore } from '../../store/authStore'
import statesData from '../../data/states-and-districts.json'
import { jsPDF } from 'jspdf'

const FieldOperations = () => {
    const { profile } = useAuthStore()
    const [activeTab, setActiveTab] = useState('dispatcher') // 'dispatcher' or 'audit'

    // ========== DUMMY DATA ==========
    const dummyTasks = [
        { task_id: 'TASK-001', vet_name: 'Dr. Sharma', vet_id: 'VET-20251201-006', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-12-09', status: 'Pending' },
        { task_id: 'TASK-002', vet_name: 'Dr. Verma', vet_id: 'VET-20251201-008', district: 'Indore', state: 'Madhya Pradesh', date: '2025-12-09', status: 'In Progress' },
        { task_id: 'TASK-003', vet_name: 'Dr. Kumar', vet_id: 'VET-20251201-012', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-12-08', status: 'Completed' },
        { task_id: 'TASK-004', vet_name: 'Dr. Patel', vet_id: 'VET-20251201-015', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-12-08', status: 'Pending' },
        { task_id: 'TASK-005', vet_name: 'Dr. Singh', vet_id: 'VET-20251201-018', district: 'Indore', state: 'Madhya Pradesh', date: '2025-12-07', status: 'Completed' },
        { task_id: 'TASK-006', vet_name: 'Dr. Mishra', vet_id: 'VET-20251201-021', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-12-07', status: 'In Progress' },
        { task_id: 'TASK-007', vet_name: 'Dr. Gupta', vet_id: 'VET-20251201-024', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-12-06', status: 'Completed' },
        { task_id: 'TASK-008', vet_name: 'Dr. Yadav', vet_id: 'VET-20251201-027', district: 'Indore', state: 'Madhya Pradesh', date: '2025-12-06', status: 'Pending' },
        { task_id: 'TASK-009', vet_name: 'Dr. Tiwari', vet_id: 'VET-20251201-030', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-12-05', status: 'In Progress' },
        { task_id: 'TASK-010', vet_name: 'Dr. Joshi', vet_id: 'VET-20251201-033', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-12-05', status: 'Completed' },
        { task_id: 'TASK-011', vet_name: 'Dr. Pandey', vet_id: 'VET-20251201-036', district: 'Indore', state: 'Madhya Pradesh', date: '2025-12-04', status: 'Pending' },
        { task_id: 'TASK-012', vet_name: 'Dr. Saxena', vet_id: 'VET-20251201-039', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-12-04', status: 'Completed' },
        { task_id: 'TASK-013', vet_name: 'Dr. Agarwal', vet_id: 'VET-20251201-042', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-12-03', status: 'In Progress' },
        { task_id: 'TASK-014', vet_name: 'Dr. Chaturvedi', vet_id: 'VET-20251201-045', district: 'Indore', state: 'Madhya Pradesh', date: '2025-12-03', status: 'Pending' },
        { task_id: 'TASK-015', vet_name: 'Dr. Dubey', vet_id: 'VET-20251201-048', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-12-02', status: 'Completed' },
        { task_id: 'TASK-016', vet_name: 'Dr. Tripathi', vet_id: 'VET-20251201-051', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-12-02', status: 'In Progress' },
        { task_id: 'TASK-017', vet_name: 'Dr. Shukla', vet_id: 'VET-20251201-054', district: 'Indore', state: 'Madhya Pradesh', date: '2025-12-01', status: 'Completed' },
        { task_id: 'TASK-018', vet_name: 'Dr. Dwivedi', vet_id: 'VET-20251201-057', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-12-01', status: 'Pending' },
        { task_id: 'TASK-019', vet_name: 'Dr. Srivastava', vet_id: 'VET-20251201-060', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-11-30', status: 'Completed' },
        { task_id: 'TASK-020', vet_name: 'Dr. Bharti', vet_id: 'VET-20251201-063', district: 'Indore', state: 'Madhya Pradesh', date: '2025-11-30', status: 'In Progress' },
        { task_id: 'TASK-021', vet_name: 'Dr. Rao', vet_id: 'VET-20251201-066', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-11-29', status: 'Pending' },
        { task_id: 'TASK-022', vet_name: 'Dr. Malhotra', vet_id: 'VET-20251201-069', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-11-29', status: 'Completed' },
        { task_id: 'TASK-023', vet_name: 'Dr. Kapoor', vet_id: 'VET-20251201-072', district: 'Indore', state: 'Madhya Pradesh', date: '2025-11-28', status: 'In Progress' },
        { task_id: 'TASK-024', vet_name: 'Dr. Chopra', vet_id: 'VET-20251201-075', district: 'Sehore', state: 'Madhya Pradesh', date: '2025-11-28', status: 'Pending' },
        { task_id: 'TASK-025', vet_name: 'Dr. Mehta', vet_id: 'VET-20251201-078', district: 'Bhopal', state: 'Madhya Pradesh', date: '2025-11-27', status: 'Completed' }
    ]

    const dummyAuditLogs = [
        { id: 1, event_time: '2025-12-09T10:30:00', user_name: 'Dr. Sharma', user_role: 'Veterinarian', action: 'ISSUED_RX', resource_type: 'Prescription', resource_id: 'RX-001', details: 'Issued prescription for cattle treatment', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 2, event_time: '2025-12-09T09:15:00', user_name: 'Dr. Verma', user_role: 'Veterinarian', action: 'FLAGGED_FARM', resource_type: 'Farm', resource_id: 'FARM-234', details: 'Farm flagged for non-compliance', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 3, event_time: '2025-12-08T16:45:00', user_name: 'Dr. Kumar', user_role: 'Veterinarian', action: 'COMPLETED_TASK', resource_type: 'Task', resource_id: 'TASK-567', details: 'Farm inspection completed', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 4, event_time: '2025-12-08T14:20:00', user_name: 'Dr. Patel', user_role: 'Veterinarian', action: 'INSPECTION', resource_type: 'Farm', resource_id: 'FARM-890', details: 'Routine farm inspection', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 5, event_time: '2025-12-08T11:30:00', user_name: 'Dr. Singh', user_role: 'Veterinarian', action: 'SAMPLE_COLLECTED', resource_type: 'Sample', resource_id: 'SAMPLE-123', details: 'Milk sample collected for testing', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 6, event_time: '2025-12-07T15:10:00', user_name: 'Dr. Mishra', user_role: 'Veterinarian', action: 'ISSUED_RX', resource_type: 'Prescription', resource_id: 'RX-002', details: 'Antibiotic prescription issued', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 7, event_time: '2025-12-07T13:45:00', user_name: 'Dr. Gupta', user_role: 'Veterinarian', action: 'COMPLETED_TASK', resource_type: 'Task', resource_id: 'TASK-456', details: 'Follow-up visit completed', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 8, event_time: '2025-12-07T10:20:00', user_name: 'Dr. Yadav', user_role: 'Veterinarian', action: 'INSPECTION', resource_type: 'Farm', resource_id: 'FARM-345', details: 'Disease investigation conducted', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 9, event_time: '2025-12-06T16:00:00', user_name: 'Dr. Tiwari', user_role: 'Veterinarian', action: 'SAMPLE_COLLECTED', resource_type: 'Sample', resource_id: 'SAMPLE-456', details: 'Blood sample collected', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 10, event_time: '2025-12-06T14:30:00', user_name: 'Dr. Joshi', user_role: 'Veterinarian', action: 'FLAGGED_FARM', resource_type: 'Farm', resource_id: 'FARM-678', details: 'AMU compliance violation', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 11, event_time: '2025-12-06T11:15:00', user_name: 'Dr. Pandey', user_role: 'Veterinarian', action: 'ISSUED_RX', resource_type: 'Prescription', resource_id: 'RX-003', details: 'Treatment plan prescribed', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 12, event_time: '2025-12-05T15:45:00', user_name: 'Dr. Saxena', user_role: 'Veterinarian', action: 'COMPLETED_TASK', resource_type: 'Task', resource_id: 'TASK-789', details: 'Compliance audit completed', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 13, event_time: '2025-12-05T13:20:00', user_name: 'Dr. Agarwal', user_role: 'Veterinarian', action: 'INSPECTION', resource_type: 'Farm', resource_id: 'FARM-901', details: 'Livestock health check', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 14, event_time: '2025-12-05T10:00:00', user_name: 'Dr. Chaturvedi', user_role: 'Veterinarian', action: 'SAMPLE_COLLECTED', resource_type: 'Sample', resource_id: 'SAMPLE-789', details: 'Feed sample collected', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 15, event_time: '2025-12-04T16:30:00', user_name: 'Dr. Dubey', user_role: 'Veterinarian', action: 'ISSUED_RX', resource_type: 'Prescription', resource_id: 'RX-004', details: 'Vaccination protocol prescribed', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 16, event_time: '2025-12-04T14:15:00', user_name: 'Dr. Tripathi', user_role: 'Veterinarian', action: 'COMPLETED_TASK', resource_type: 'Task', resource_id: 'TASK-234', details: 'Sample collection task completed', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 17, event_time: '2025-12-04T11:40:00', user_name: 'Dr. Shukla', user_role: 'Veterinarian', action: 'FLAGGED_FARM', resource_type: 'Farm', resource_id: 'FARM-012', details: 'Record-keeping violations', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 18, event_time: '2025-12-03T15:20:00', user_name: 'Dr. Dwivedi', user_role: 'Veterinarian', action: 'INSPECTION', resource_type: 'Farm', resource_id: 'FARM-234', details: 'Emergency disease check', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 19, event_time: '2025-12-03T13:00:00', user_name: 'Dr. Srivastava', user_role: 'Veterinarian', action: 'SAMPLE_COLLECTED', resource_type: 'Sample', resource_id: 'SAMPLE-012', details: 'Water quality sample', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 20, event_time: '2025-12-03T10:30:00', user_name: 'Dr. Bharti', user_role: 'Veterinarian', action: 'ISSUED_RX', resource_type: 'Prescription', resource_id: 'RX-005', details: 'Deworming treatment prescribed', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 21, event_time: '2025-12-02T16:10:00', user_name: 'Dr. Rao', user_role: 'Veterinarian', action: 'COMPLETED_TASK', resource_type: 'Task', resource_id: 'TASK-901', details: 'Farm surveillance completed', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 22, event_time: '2025-12-02T14:45:00', user_name: 'Dr. Malhotra', user_role: 'Veterinarian', action: 'INSPECTION', resource_type: 'Farm', resource_id: 'FARM-456', details: 'Quarterly compliance check', district: 'Bhopal', state: 'Madhya Pradesh' },
        { id: 23, event_time: '2025-12-02T11:20:00', user_name: 'Dr. Kapoor', user_role: 'Veterinarian', action: 'SAMPLE_COLLECTED', resource_type: 'Sample', resource_id: 'SAMPLE-345', details: 'Tissue sample for lab analysis', district: 'Indore', state: 'Madhya Pradesh' },
        { id: 24, event_time: '2025-12-01T15:30:00', user_name: 'Dr. Chopra', user_role: 'Veterinarian', action: 'FLAGGED_FARM', resource_type: 'Farm', resource_id: 'FARM-567', details: 'Antibiotic residue detected', district: 'Sehore', state: 'Madhya Pradesh' },
        { id: 25, event_time: '2025-12-01T13:15:00', user_name: 'Dr. Mehta', user_role: 'Veterinarian', action: 'ISSUED_RX', resource_type: 'Prescription', resource_id: 'RX-006', details: 'Pain management prescription', district: 'Bhopal', state: 'Madhya Pradesh' }
    ]

    // ========== TAB A: TASK DISPATCHER ==========
    const [selectedState, setSelectedState] = useState(profile?.state || '')
    const [selectedDistrict, setSelectedDistrict] = useState('')
    const [tasks, setTasks] = useState([])
    const [selectedVets, setSelectedVets] = useState([])
    const [loadingVets, setLoadingVets] = useState(false)

    // Task Assignment Modal
    const [showTaskModal, setShowTaskModal] = useState(false)
    const [selectedVet, setSelectedVet] = useState(null)
    const [taskForm, setTaskForm] = useState({
        taskType: 'Farm Inspection',
        farmId: '',
        priority: 'Normal',
        scheduledDate: new Date().toISOString().split('T')[0],
        instructions: ''
    })
    const [submittingTask, setSubmittingTask] = useState(false)

    // ========== TAB B: AUDIT LOGS ==========
    const [auditState, setAuditState] = useState(profile?.state || '')
    const [auditDistrict, setAuditDistrict] = useState('')
    const [auditFromDate, setAuditFromDate] = useState('')
    const [auditToDate, setAuditToDate] = useState('')
    const [auditEventFilter, setAuditEventFilter] = useState('')
    const [auditLogs, setAuditLogs] = useState([])
    const [loadingAudit, setLoadingAudit] = useState(false)

    // Dropdown options
    const stateOptions = useMemo(
        () => statesData.states.map((s) => s.state),
        []
    )

    const districtOptions = useMemo(() => {
        if (!selectedState) return []
        const stateObj = statesData.states.find((s) => s.state === selectedState)
        return stateObj ? stateObj.districts : []
    }, [selectedState])

    const auditDistrictOptions = useMemo(() => {
        if (!auditState) return []
        const stateObj = statesData.states.find((s) => s.state === auditState)
        return stateObj ? stateObj.districts : []
    }, [auditState])

    // ========== LOAD VETERINARIANS FROM DATABASE ==========
    const handleLoadTasks = async () => {
        if (!selectedState) {
            toast.error('Please select a state')
            return
        }

        setLoadingVets(true)
        try {
            console.log('Searching for veterinarians in state:', selectedState, 'District:', selectedDistrict || 'All')

            // Build query for veterinarian profiles
            let query = supabase
                .from('profiles')
                .select('*')
                .eq('user_type', 'veterinarian')
                .eq('state', selectedState)
                .eq('kyc_status', 'verified')

            // Add district filter if selected
            if (selectedDistrict) {
                query = query.eq('district', selectedDistrict)
            }

            const { data: vetProfilesData, error: profilesError } = await query

            console.log('Veterinarian profiles found:', vetProfilesData?.length || 0, vetProfilesData)

            if (profilesError) {
                console.error('Error fetching vet profiles:', profilesError)
                throw profilesError
            }

            if (!vetProfilesData || vetProfilesData.length === 0) {
                console.log('No verified veterinarians found')
                setTasks([])
                toast.info(`No verified veterinarians found in ${selectedDistrict ? selectedDistrict + ', ' : ''}${selectedState}`)
                return
            }

            // Transform profiles into task format
            const transformedTasks = vetProfilesData.map((profile, index) => ({
                task_id: `VET-${profile.unique_id || String(index + 1).padStart(3, '0')}`,
                vet_name: profile.name,
                vet_id: profile.unique_id || `VET-${profile.id.slice(0, 8)}`,
                district: profile.district || 'N/A',
                state: profile.state || selectedState,
                date: new Date().toISOString().split('T')[0],
                status: 'Active',
                mobile_number: profile.mobile_number,
                address: profile.address,
                profile_id: profile.id
            }))

            console.log('Transformed veterinarian data:', transformedTasks.length)
            setTasks(transformedTasks)
            toast.success(`Found ${transformedTasks.length} verified veterinarian(s)`)
        } catch (err) {
            console.error('Error loading veterinarians:', err)
            toast.error(`Failed to load veterinarians: ${err.message}`)
        } finally {
            setLoadingVets(false)
        }
    }

    // ========== ASSIGN TASK TO VETERINARIAN ==========
    const handleAssignTask = (vet) => {
        setSelectedVet(vet)
        setShowTaskModal(true)
    }

    // ========== SUBMIT TASK ASSIGNMENT ==========
    const handleSubmitTask = async () => {
        if (!taskForm.farmId || !taskForm.instructions) {
            toast.error('Please fill all required fields')
            return
        }

        setSubmittingTask(true)
        try {
            // Create task in field_tasks table
            const { data, error } = await supabase
                .from('field_tasks')
                .insert([{
                    regulator_id: profile.id,
                    vet_id: selectedVet.profile_id,
                    farm_id: taskForm.farmId,
                    task_type: taskForm.taskType,
                    status: 'Pending',
                    priority: taskForm.priority,
                    notes: taskForm.instructions,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()

            if (error) throw error

            toast.success(`Task assigned to ${selectedVet.vet_name} successfully!`)
            setShowTaskModal(false)
            setTaskForm({
                taskType: 'Farm Inspection',
                farmId: '',
                priority: 'Normal',
                scheduledDate: new Date().toISOString().split('T')[0],
                instructions: ''
            })
        } catch (error) {
            console.error('Error assigning task:', error)
            toast.error('Failed to assign task: ' + error.message)
        } finally {
            setSubmittingTask(false)
        }
    }

    // ========== FETCH AUDIT LOGS ==========
    const handleLoadAuditLogs = async () => {
        if (!auditFromDate || !auditToDate) {
            toast.error('Please select both From and To dates')
            return
        }
        if (auditFromDate > auditToDate) {
            toast.error('From date cannot be after To date')
            return
        }

        setLoadingAudit(true)
        try {
            // Simulate loading delay
            await new Promise(resolve => setTimeout(resolve, 500))

            // Filter dummy audit logs
            let filteredLogs = dummyAuditLogs.filter(log => {
                const logDate = log.event_time.split('T')[0]
                return logDate >= auditFromDate && logDate <= auditToDate
            })

            // Filter by state if provided
            if (auditState) {
                filteredLogs = filteredLogs.filter(log => log.state === auditState)
            }

            // Filter by district if provided
            if (auditDistrict) {
                filteredLogs = filteredLogs.filter(log => log.district === auditDistrict)
            }

            // Filter by event type if provided
            if (auditEventFilter) {
                filteredLogs = filteredLogs.filter(log => log.action === auditEventFilter)
            }

            console.log('Audit logs loaded:', filteredLogs)
            setAuditLogs(filteredLogs)
            toast.success(`Loaded ${filteredLogs.length} audit logs`)
        } catch (err) {
            console.error('Error loading audit logs:', err)
            toast.error(`Failed to load audit logs: ${err.message}`)
        } finally {
            setLoadingAudit(false)
        }
    }

    // ========== EXPORT AUDIT LOGS ==========
    const handleExportPDF = () => {
        if (!auditLogs.length) {
            toast.error('No audit logs to export')
            return
        }

        try {
            const doc = new jsPDF()
            doc.setFontSize(16)
            doc.text('Veterinary Audit Log Report', 14, 18)

            doc.setFontSize(10)
            doc.text(`State: ${auditState || 'All'}`, 14, 28)
            doc.text(`District: ${auditDistrict || 'All'}`, 14, 34)
            doc.text(`Period: ${auditFromDate} to ${auditToDate}`, 14, 40)
            doc.text(`Total Records: ${auditLogs.length}`, 14, 46)

            let y = 56
            doc.setFontSize(9)
            doc.text('Timestamp          Vet Name              Action              Details', 14, y)
            y += 6

            auditLogs.slice(0, 40).forEach((log) => {
                if (y > 280) {
                    doc.addPage()
                    y = 20
                }
                const timestamp = new Date(log.event_time).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                const vetName = (log.user_name || 'Unknown').slice(0, 18)
                const action = (log.action || 'Unknown').slice(0, 16)
                const details = (log.details || '').slice(0, 25)

                doc.text(`${timestamp}  ${vetName.padEnd(18)}  ${action.padEnd(16)}  ${details}`, 14, y)
                y += 5
            })

            doc.save('vet-audit-log-report.pdf')
            toast.success('PDF exported successfully')
        } catch (err) {
            console.error('Error generating PDF:', err)
            toast.error('Failed to generate PDF')
        }
    }

    const handleExportCSV = () => {
        if (!auditLogs.length) {
            toast.error('No audit logs to export')
            return
        }

        try {
            const headers = ['Timestamp', 'Vet Name', 'User Role', 'Action', 'Resource Type', 'Resource ID', 'Details', 'District', 'State']
            const rows = auditLogs.map((log) => [
                new Date(log.event_time).toLocaleString('en-IN'),
                log.user_name || '',
                log.user_role || '',
                log.action || '',
                log.resource_type || '',
                log.resource_id || '',
                log.details || '',
                log.district || '',
                log.state || '',
            ])

            const csvContent = [
                headers.join(','),
                ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'vet-audit-logs.csv'
            a.click()
            window.URL.revokeObjectURL(url)

            toast.success('CSV exported successfully')
        } catch (err) {
            console.error('Error generating CSV:', err)
            toast.error('Failed to generate CSV')
        }
    }

    // ========== RENDER ==========
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Field Operations</h1>
                    <p className="text-sm text-gray-600">
                        Manage veterinary field tasks and monitor audit logs
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('dispatcher')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'dispatcher'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <UserGroupIcon className="inline-block w-5 h-5 mr-2" />
                        Task Dispatcher
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'audit'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <ClipboardDocumentListIcon className="inline-block w-5 h-5 mr-2" />
                        Vet Audit Logs
                    </button>
                </nav>
            </div>

            {/* TAB A: TASK DISPATCHER */}
            {activeTab === 'dispatcher' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <FunnelIcon className="w-5 h-5 text-gray-500" />
                            <h2 className="text-sm font-semibold text-gray-800">
                                Search Veterinarians
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    State *
                                </label>
                                <select
                                    value={selectedState}
                                    onChange={(e) => {
                                        setSelectedState(e.target.value)
                                        setSelectedDistrict('')
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">Select state...</option>
                                    {stateOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    District (optional)
                                </label>
                                <select
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    disabled={!selectedState}
                                >
                                    <option value="">All districts</option>
                                    {districtOptions.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={handleLoadTasks}
                                    disabled={loadingVets}
                                    className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                                >
                                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                                    {loadingVets ? 'Searching...' : 'Search Veterinarians'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Veterinarians Table */}
                    {tasks.length > 0 && (
                        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-800">
                                    Verified Veterinarians ({tasks.length})
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Vet ID
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Vet Name
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Mobile Number
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                District
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                State
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Status
                                            </th>
                                            <th className="px-3 py-2 font-medium text-center text-gray-500 uppercase">
                                                Assign Task
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tasks.map((task) => (
                                            <tr key={task.task_id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 font-medium text-gray-900">
                                                    {task.vet_id}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700">
                                                    {task.vet_name}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {task.mobile_number}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {task.district}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {task.state}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        onClick={() => handleAssignTask(task)}
                                                        className="flex items-center justify-center w-8 h-8 mx-auto text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                                                        title="Assign Task"
                                                    >
                                                        <PlusIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Task Assignment Modal */}
                    {showTaskModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                            <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between p-6 border-b">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Assign Task to Veterinarian
                                        </h3>
                                        {selectedVet && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                Assigning to: <span className="font-medium text-green-600">{selectedVet.vet_name}</span> ({selectedVet.vet_id})
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowTaskModal(false)
                                            setSelectedVet(null)
                                        }}
                                        className="p-2 text-gray-400 transition-colors rounded-lg hover:bg-gray-100"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 space-y-4">
                                    {/* Task Type */}
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Task Type *
                                        </label>
                                        <select
                                            value={taskForm.taskType}
                                            onChange={(e) => setTaskForm(prev => ({ ...prev, taskType: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        >
                                            <option value="Farm Inspection">Farm Inspection</option>
                                            <option value="Compliance Audit">Compliance Audit</option>
                                            <option value="Disease Investigation">Disease Investigation</option>
                                            <option value="Sample Collection">Sample Collection</option>
                                            <option value="Follow-up Visit">Follow-up Visit</option>
                                            <option value="AMU Monitoring">AMU Monitoring</option>
                                            <option value="Vaccination Drive">Vaccination Drive</option>
                                        </select>
                                    </div>

                                    {/* Farm ID */}
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Farm ID *
                                        </label>
                                        <input
                                            type="text"
                                            value={taskForm.farmId}
                                            onChange={(e) => setTaskForm(prev => ({ ...prev, farmId: e.target.value }))}
                                            placeholder="Enter farm ID (e.g., FARM-001)"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Enter the unique farm ID for this task
                                        </p>
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Priority Level
                                        </label>
                                        <select
                                            value={taskForm.priority}
                                            onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        >
                                            <option value="Routine">Routine</option>
                                            <option value="Urgent">Urgent</option>
                                            <option value="Emergency">Emergency</option>
                                        </select>
                                    </div>

                                    {/* Scheduled Date */}
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Scheduled Date
                                        </label>
                                        <input
                                            type="date"
                                            value={taskForm.scheduledDate}
                                            onChange={(e) => setTaskForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Task Instructions *
                                        </label>
                                        <textarea
                                            value={taskForm.instructions}
                                            onChange={(e) => setTaskForm(prev => ({ ...prev, instructions: e.target.value }))}
                                            rows={4}
                                            placeholder="Enter detailed instructions for the veterinarian..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Veterinarian Info Box */}
                                    {selectedVet && (
                                        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                                            <h4 className="mb-2 text-sm font-semibold text-green-900">Assigned Veterinarian</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-green-700">Name:</span>
                                                    <p className="font-medium text-green-900">{selectedVet.vet_name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-green-700">Vet ID:</span>
                                                    <p className="font-medium text-green-900">{selectedVet.vet_id}</p>
                                                </div>
                                                <div>
                                                    <span className="text-green-700">Mobile:</span>
                                                    <p className="font-medium text-green-900">{selectedVet.mobile_number}</p>
                                                </div>
                                                <div>
                                                    <span className="text-green-700">Location:</span>
                                                    <p className="font-medium text-green-900">{selectedVet.district}, {selectedVet.state}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                                    <button
                                        onClick={() => {
                                            setShowTaskModal(false)
                                            setSelectedVet(null)
                                        }}
                                        disabled={submittingTask}
                                        className="px-6 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitTask}
                                        disabled={submittingTask}
                                        className="flex items-center px-6 py-2 space-x-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {submittingTask ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                                                <span>Assigning...</span>
                                            </>
                                        ) : (
                                            <>
                                                <PlusIcon className="w-4 h-4" />
                                                <span>Assign Task</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB B: AUDIT LOGS */}
            {activeTab === 'audit' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <FunnelIcon className="w-5 h-5 text-gray-500" />
                            <h2 className="text-sm font-semibold text-gray-800">
                                Filter Audit Logs
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    State
                                </label>
                                <select
                                    value={auditState}
                                    onChange={(e) => {
                                        setAuditState(e.target.value)
                                        setAuditDistrict('')
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">All states</option>
                                    {stateOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    District
                                </label>
                                <select
                                    value={auditDistrict}
                                    onChange={(e) => setAuditDistrict(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    disabled={!auditState}
                                >
                                    <option value="">All districts</option>
                                    {auditDistrictOptions.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    From Date *
                                </label>
                                <input
                                    type="date"
                                    value={auditFromDate}
                                    onChange={(e) => setAuditFromDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    To Date *
                                </label>
                                <input
                                    type="date"
                                    value={auditToDate}
                                    onChange={(e) => setAuditToDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">
                                    Event Type
                                </label>
                                <select
                                    value={auditEventFilter}
                                    onChange={(e) => setAuditEventFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">All events</option>
                                    <option value="ISSUED_RX">Prescription Issued</option>
                                    <option value="FLAGGED_FARM">Farm Flagged</option>
                                    <option value="COMPLETED_TASK">Task Completed</option>
                                    <option value="INSPECTION">Inspection</option>
                                    <option value="SAMPLE_COLLECTED">Sample Collected</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <button
                                onClick={handleLoadAuditLogs}
                                disabled={loadingAudit}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                            >
                                {loadingAudit ? 'Loading...' : 'Load Audit Logs'}
                            </button>

                            {auditLogs.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExportPDF}
                                        className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                        Export CSV
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audit Logs Table */}
                    {auditLogs.length > 0 && (
                        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <h3 className="mb-4 text-sm font-semibold text-gray-800">
                                Audit Log Records ({auditLogs.length})
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="border-b bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Timestamp
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Vet Name
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Action
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Resource ID
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Details
                                            </th>
                                            <th className="px-3 py-2 font-medium text-left text-gray-500 uppercase">
                                                Location
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {auditLogs.map((log, idx) => (
                                            <tr key={log.id || idx} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {new Date(log.event_time).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-3 py-2 font-medium text-gray-900">
                                                    {log.user_name || 'N/A'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${log.action === 'FLAGGED_FARM'
                                                                ? 'bg-red-100 text-red-700'
                                                                : log.action === 'ISSUED_RX'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : log.action === 'SAMPLE_COLLECTED'
                                                                        ? 'bg-purple-100 text-purple-700'
                                                                        : 'bg-gray-100 text-gray-700'
                                                            }`}
                                                    >
                                                        {log.action || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {log.resource_id || 'N/A'}
                                                </td>
                                                <td className="max-w-xs px-3 py-2 text-gray-600 truncate">
                                                    {log.details || 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {log.district ? `${log.district}, ${log.state}` : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {auditLogs.length === 0 && !loadingAudit && (
                        <div className="p-8 text-sm text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                            No audit logs found. Please select date range and click "Load Audit Logs".
                        </div>
                    )}

                    {loadingAudit && (
                        <div className="p-8 text-sm text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                            Loading audit logs...
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default FieldOperations
