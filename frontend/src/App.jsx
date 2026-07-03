import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
// Layout Components
import Layout from './components/common/Layout'
import AuthLayout from './components/common/AuthLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import LandingPage from './pages/auth/LandingPage'

// Dashboard Pages
import ProducerDashboard from './pages/dashboards/ProducerDashboard'
import VeterinarianDashboard from './pages/dashboards/VeterinarianDashboard'
import LabDashboard from './pages/dashboards/LabDashboard'
import RegulatorDashboard from './pages/dashboards/RegulatorDashboard'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import CollectorDashboard from './pages/dashboards/CollectorDashboard'
import RetailerDashboard from './pages/dashboards/RetailerDashboard'

// Farm Management
import FarmManagement from './pages/farm/FarmManagement'
import AnimalManagement from './pages/farm/AnimalManagement'
import AnimalProfile from './pages/farm/AnimalProfile'
import ConnectVeterinary from './pages/farm/ConnectVeterinary'


// Veterinary Pages
import MyFarmsPatients from './pages/vet/MyFarmsPatients'
import PrescriptionsAMU from './pages/vet/PrescriptionsAMU'
import VetRequests from './pages/vet/VetRequests'
import LabReportsMRL from './pages/vet/LabReportsMRL'
import FarmVisitsSchedule from './pages/vet/FarmVisitsSchedule'
import DrugDatabaseProtocols from './pages/vet/DrugDatabaseProtocols'
import VetAlerts from './pages/vet/VetAlerts'
import VetTaskDashboard from './pages/vet/VetTaskDashboard'

// Drug & Inventory
import DrugInventory from './pages/inventory/DrugInventory'
import DrugAdministration from './pages/inventory/DrugAdministration'
import TreatmentRecording from './pages/inventory/TreatmentRecording'
import PrescriptionManagement from './pages/vet/PrescriptionManagement'

// Sampling & Lab
import SampleCollection from './pages/lab/SampleCollection'
import LabResults from './pages/lab/LabResults'
import TestReports from './pages/lab/TestReports'
import LabResultsGov from './pages/regulator/LabResultsGov'

// New Lab Workflow Pages
import SampleReception from './pages/lab/SampleReception'
import PendingQueue from './pages/lab/PendingQueue'
import UploadResults from './pages/lab/UploadResults'
import TestHistory from './pages/lab/TestHistory'
import FlaggedSamples from './pages/lab/FlaggedSamples'
import MRLStandards from './pages/lab/MRLStandards'

// Analytics & Reporting
import Analytics from './pages/shared/Analytics'
import ComplianceReports from './pages/regulator/ComplianceReports'
import AuditTrail from './pages/regulator/AuditTrail'
import GeographyView from './pages/regulator/GeographyView'
import RiskAnalytics from './pages/regulator/RiskAnalytics'
import AIAssistant from './pages/shared/AIAssistant'
import VoiceAssistant from './pages/producer/VoiceAssistant'
import SurveillanceMap from './pages/regulator/SurveillanceMap'
import ComplianceViolations from './pages/regulator/ComplianceViolations'
import PolicyAlerts from './pages/regulator/PolicyAlerts'
import UserRegistry from './pages/regulator/UserRegistry'
import RetailerMonitoring from './pages/regulator/RetailerMonitoring'
import FieldOperations from './pages/regulator/FieldOperations'
import GenerateReports from './pages/regulator/GenerateReports'
import NationalData from './pages/regulator/NationalData'
import ComplaintsDashboard from './pages/regulator/ComplaintsDashboard'

// Profile & Settings
import Profile from './pages/shared/Profile'
import Settings from './pages/shared/Settings'
import QRScanner from './pages/shared/QRScanner'

// Verification Pages
import VeterinarianVerification from './pages/shared/VeterinarianVerification'
import LabVerification from './pages/shared/LabVerification'
import CollectorVerification from './pages/shared/CollectorVerification'
import RegulatorVerification from './pages/shared/RegulatorVerification'

// Settings subpages
import Overview from './pages/shared/settings/Overview'
import Language from './pages/shared/settings/Language'
import Contact from './pages/shared/settings/Contact'
import Faqs from './pages/shared/settings/Faqs'
import Preferences from './pages/shared/settings/Preferences'
import Notifications from './pages/shared/settings/Notifications'
import Privacy from './pages/shared/settings/Privacy'
import Data from './pages/shared/settings/Data'
import Accessibility from './pages/shared/settings/Accessibility'

// Information section
import Information from './pages/shared/information/Information'
import GettingStarted from './pages/shared/information/GettingStarted'
import WithdrawalPeriod from './pages/shared/information/WithdrawalPeriod'
import AntibioticsDetails from './pages/shared/information/AntibioticsDetails'
import RegisterAnimalFarm from './pages/shared/information/RegisterAnimalFarm'
import RecordDrugAdministration from './pages/shared/information/RecordDrugAdministration'

// Main Dashboard
import MainDashboard from './components/common/MainDashboard'

// Producer Components
import AMULogging from './components/producer/AMULogging'
import AlertsReminders from './components/producer/AlertsReminders'
import ComplianceDashboard from './components/producer/ComplianceDashboard'
import AnimalProfiles from './components/producer/AnimalProfiles'
import MarketplaceIntegration from './components/producer/MarketplaceIntegration'
import MyLivestock from './pages/producer/MyLivestock'
import ProducerAnalytics from './pages/producer/Analytics'
import SendComplaint from './pages/producer/SendComplaint'

// Veterinarian Components
import DigitalPrescriptionManagement from './components/veterinarian/DigitalPrescriptionManagement'
import FarmOversightDashboard from './components/veterinarian/FarmOversightDashboard'
import Teleconsultation from './components/veterinarian/Teleconsultation'
import KnowledgeBase from './components/veterinarian/KnowledgeBase'

// Lab Components
import SampleManagement from './components/lab/SampleManagement'
import ResultSubmission from './components/lab/ResultSubmission'
import DataAPIInterface from './components/lab/DataAPIInterface'

// Collector Components
import FarmComplianceCheck from './components/collector/FarmComplianceCheck'
import CollectionScheduling from './components/collector/CollectionScheduling'
import DigitalReceipts from './components/collector/DigitalReceipts'
import RiskInsights from './components/collector/RiskInsights'

// Collector Pages
import DailyCollection from './pages/collector/DailyCollection'
import BatchTanker from './pages/collector/BatchTanker'
import MyAssignedFarms from './pages/collector/MyAssignedFarms'
import FarmDetailView from './pages/collector/FarmDetailView'
import LabSamples from './pages/collector/LabSamples'
import CollectionHistory from './pages/collector/CollectionHistory'

// Retailer Pages
import RecordSales from './pages/retailer/RecordSales'
import StockRegister from './pages/retailer/StockRegister'
import SalesHistory from './pages/retailer/SalesHistory'
import ShopProfile from './pages/retailer/ShopProfile'
import RetailerAlerts from './pages/retailer/RetailerAlerts'
// Store
import { useAuthStore } from './store/authStore'

// KYC Protection
import ProtectedRouteWithKYC from './components/common/ProtectedRouteWithKYC'

function App() {
  const { user, profile, isAuthenticated, isLoading, initializeAuth } = useAuthStore()

  // Initialize auth on app mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Protected Route Component
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    // Show loading state while checking authentication
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return <Navigate to="/auth/login" replace />
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.user_type)) {
      return <Navigate to="/auth/login" replace />
    }

    return children
  }

  // Get dashboard based on user role
  const getDashboardRoute = (userType) => {
    switch (userType) {
      case 'producer': return '/dashboard/producer'
      case 'veterinarian': return '/dashboard/veterinarian'
      case 'lab': return '/dashboard/lab'
      case 'collector': return '/dashboard/collector'
      case 'regulator': return '/dashboard/regulator'
      case 'retailer': return '/dashboard/retailer'
      case 'admin': return '/dashboard/admin'
      default: return '/'
    }
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Page - show when not authenticated */}
          <Route path="/" element={
            isAuthenticated ? (
              <Navigate to={getDashboardRoute(profile?.user_type)} replace />
            ) : (
              <LandingPage />
            )
          } />

          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />

          {/* Main Dashboard Route */}
          <Route path="/main-dashboard" element={
            <ProtectedRoute>
              <MainDashboard />
            </ProtectedRoute>
          } />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="producer" element={
              <ProtectedRoute allowedRoles={['producer']}>
                <ProducerDashboard />
              </ProtectedRoute>
            } />

            <Route path="veterinarian" element={
              <ProtectedRoute allowedRoles={['veterinarian']}>
                <VeterinarianDashboard />
              </ProtectedRoute>
            } />

            <Route path="lab" element={
              <ProtectedRoute allowedRoles={['lab']}>
                <LabDashboard />
              </ProtectedRoute>
            } />

            <Route path="collector" element={
              <ProtectedRoute allowedRoles={['collector']}>
                <CollectorDashboard />
              </ProtectedRoute>
            } />

            <Route path="regulator" element={
              <ProtectedRoute allowedRoles={['regulator']}>
                <RegulatorDashboard />
              </ProtectedRoute>
            } />

            <Route path="retailer" element={
              <ProtectedRoute allowedRoles={['retailer']}>
                <RetailerDashboard />
              </ProtectedRoute>
            } />

            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Route>

          {/* Protected App Routes */}
          <Route path="/app" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Farm Management - Requires KYC */}
            <Route path="farms" element={
              <ProtectedRouteWithKYC>
                <FarmManagement />
              </ProtectedRouteWithKYC>
            } />
            <Route path="animals" element={
              <ProtectedRouteWithKYC>
                <AnimalManagement />
              </ProtectedRouteWithKYC>
            } />
            <Route path="animals/:id" element={
              <ProtectedRouteWithKYC>
                <AnimalProfile />
              </ProtectedRouteWithKYC>
            } />
            <Route path="connect" element={
              <ProtectedRouteWithKYC>
                <ConnectVeterinary />
              </ProtectedRouteWithKYC>
            } />

            {/* Drug & Inventory - Requires KYC */}
            <Route path="inventory" element={
              <ProtectedRouteWithKYC>
                <DrugInventory />
              </ProtectedRouteWithKYC>
            } />
            <Route path="treatment-recording" element={
              <ProtectedRouteWithKYC>
                <TreatmentRecording />
              </ProtectedRouteWithKYC>
            } />
            <Route path="administration" element={
              <ProtectedRouteWithKYC>
                <DrugAdministration />
              </ProtectedRouteWithKYC>
            } />
            <Route path="prescriptions" element={
              <ProtectedRouteWithKYC>
                <PrescriptionManagement />
              </ProtectedRouteWithKYC>
            } />


            {/* Sampling & Lab - Requires KYC */}
            <Route path="sampling" element={
              <ProtectedRouteWithKYC>
                <SampleCollection />
              </ProtectedRouteWithKYC>
            } />
            <Route path="lab-results" element={
              <ProtectedRouteWithKYC>
                <LabResults />
              </ProtectedRouteWithKYC>
            } />
            <Route path="test-reports" element={
              <ProtectedRouteWithKYC>
                <TestReports />
              </ProtectedRouteWithKYC>
            } />


            {/* Analytics & Reports - Requires KYC */}
            <Route path="analytics" element={
              <ProtectedRouteWithKYC>
                <Analytics />
              </ProtectedRouteWithKYC>
            } />
            <Route path="compliance" element={
              <ProtectedRouteWithKYC>
                <ComplianceReports />
              </ProtectedRouteWithKYC>
            } />

            {/* AI Assistant - Available to all roles */}
            <Route path="ai-assistant" element={
              <ProtectedRouteWithKYC>
                <VoiceAssistant />
              </ProtectedRouteWithKYC>
            } />
            <Route path="geo-view" element={
              <ProtectedRouteWithKYC>
                <GeographyView />
              </ProtectedRouteWithKYC>
            } />
            <Route path="audit" element={
              <ProtectedRouteWithKYC>
                <AuditTrail />
              </ProtectedRouteWithKYC>
            } />

            <Route path="risk-analytics" element={
              <ProtectedRouteWithKYC>
                <RiskAnalytics />
              </ProtectedRouteWithKYC>
            } />

            {/* New Regulator Pages - Requires KYC */}
            <Route path="regulator/lab-results-gov" element={
              <ProtectedRouteWithKYC>
                <LabResultsGov />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/surveillance-map" element={
              <ProtectedRouteWithKYC>
                <SurveillanceMap />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/compliance-violations" element={
              <ProtectedRouteWithKYC>
                <ComplianceViolations />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/amu-amr-analytics" element={
              <ProtectedRouteWithKYC>
                <RiskAnalytics />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/inspection-management" element={
              <ProtectedRouteWithKYC>
                <ComplianceReports />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/lab-testing-reports" element={
              <ProtectedRouteWithKYC>
                <LabResults />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/policy-alerts" element={
              <ProtectedRouteWithKYC>
                <PolicyAlerts />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/retailer-monitoring" element={
              <ProtectedRouteWithKYC>
                <RetailerMonitoring />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/user-registry" element={
              <ProtectedRouteWithKYC>
                <UserRegistry />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/field-operations" element={
              <ProtectedRouteWithKYC>
                <FieldOperations />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/generate-reports" element={
              <ProtectedRouteWithKYC>
                <GenerateReports />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/national-data" element={
              <ProtectedRouteWithKYC>
                <NationalData />
              </ProtectedRouteWithKYC>
            } />
            <Route path="regulator/complaints" element={
              <ProtectedRouteWithKYC>
                <ComplaintsDashboard />
              </ProtectedRouteWithKYC>
            } />

            {/* Shared Tools - Requires KYC */}
            <Route path="qr-scanner" element={
              <ProtectedRouteWithKYC>
                <QRScanner />
              </ProtectedRouteWithKYC>
            } />
            <Route path="connect" element={
              <ProtectedRouteWithKYC>
                <ConnectVeterinary />
              </ProtectedRouteWithKYC>
            } />

            {/* Profile & Settings - No KYC Required (users need to access profile to complete KYC) */}
            <Route path="profile" element={<Profile />} />

            {/* Verification Pages - No KYC Required */}
            <Route path="verification/veterinarian" element={<VeterinarianVerification />} />
            <Route path="verification/lab" element={<LabVerification />} />
            <Route path="verification/collector" element={<CollectorVerification />} />
            <Route path="verification/regulator" element={<RegulatorVerification />} />

            <Route path="settings" element={<Settings />}>
              <Route index element={<Overview />} />
              <Route path="overview" element={<Overview />} />
              <Route path="language" element={<Language />} />
              <Route path="preferences" element={<Preferences />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="data" element={<Data />} />
              <Route path="accessibility" element={<Accessibility />} />
              <Route path="contact" element={<Contact />} />
              <Route path="faqs" element={<Faqs />} />
            </Route>

            {/* Information Section */}
            <Route path="information" element={<Information />}>
              <Route index element={<GettingStarted />} />
              <Route path="getting-started" element={<GettingStarted />} />
              <Route path="withdrawal" element={<WithdrawalPeriod />} />
              <Route path="antibiotics" element={<AntibioticsDetails />} />
              <Route path="register" element={<RegisterAnimalFarm />} />
              <Route path="drug-record" element={<RecordDrugAdministration />} />
            </Route>
          </Route>

          {/* Producer Routes */}
          <Route path="/producer" element={
            <ProtectedRoute allowedRoles={['producer']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="my-livestock" element={<MyLivestock />} />
            <Route path="amu-logging" element={
              <ProtectedRouteWithKYC>
                <AMULogging />
              </ProtectedRouteWithKYC>
            } />
            <Route path="alerts" element={
              <ProtectedRouteWithKYC>
                <AlertsReminders />
              </ProtectedRouteWithKYC>
            } />
            <Route path="compliance" element={
              <ProtectedRouteWithKYC>
                <ComplianceDashboard />
              </ProtectedRouteWithKYC>
            } />
            <Route path="animal-profiles" element={
              <ProtectedRouteWithKYC>
                <AnimalProfiles />
              </ProtectedRouteWithKYC>
            } />
            <Route path="marketplace" element={
              <ProtectedRouteWithKYC>
                <MarketplaceIntegration />
              </ProtectedRouteWithKYC>
            } />
            <Route path="analytics" element={
              <ProtectedRouteWithKYC>
                <ProducerAnalytics />
              </ProtectedRouteWithKYC>
            } />
            <Route path="send-complaint" element={
              <ProtectedRouteWithKYC>
                <SendComplaint />
              </ProtectedRouteWithKYC>
            } />
          </Route>

          {/* Veterinarian Routes */}
          <Route path="/vet" element={
            <ProtectedRoute allowedRoles={['veterinarian']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="farms-patients" element={
              <ProtectedRouteWithKYC>
                <MyFarmsPatients />
              </ProtectedRouteWithKYC>
            } />
            <Route path="prescriptions" element={
              <ProtectedRouteWithKYC>
                <PrescriptionsAMU />
              </ProtectedRouteWithKYC>
            } />
            <Route path="requests" element={
              <ProtectedRouteWithKYC>
                <VetRequests />
              </ProtectedRouteWithKYC>
            } />
            <Route path="lab-reports" element={
              <ProtectedRouteWithKYC>
                <LabReportsMRL />
              </ProtectedRouteWithKYC>
            } />
            <Route path="farm-visits" element={
              <ProtectedRouteWithKYC>
                <FarmVisitsSchedule />
              </ProtectedRouteWithKYC>
            } />
            <Route path="drug-database" element={
              <ProtectedRouteWithKYC>
                <DrugDatabaseProtocols />
              </ProtectedRouteWithKYC>
            } />
            <Route path="government-tasks" element={
              <ProtectedRouteWithKYC>
                <VetTaskDashboard />
              </ProtectedRouteWithKYC>
            } />
            <Route path="alerts" element={
              <ProtectedRouteWithKYC>
                <VetAlerts />
              </ProtectedRouteWithKYC>
            } />
          </Route>

          {/* Legacy Veterinarian Routes (keeping for backward compatibility) */}
          <Route path="/veterinarian" element={
            <ProtectedRoute allowedRoles={['veterinarian']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="prescriptions" element={
              <ProtectedRouteWithKYC>
                <DigitalPrescriptionManagement />
              </ProtectedRouteWithKYC>
            } />
            <Route path="farm-oversight" element={
              <ProtectedRouteWithKYC>
                <FarmOversightDashboard />
              </ProtectedRouteWithKYC>
            } />
            <Route path="teleconsultation" element={
              <ProtectedRouteWithKYC>
                <Teleconsultation />
              </ProtectedRouteWithKYC>
            } />
            <Route path="knowledge-base" element={
              <ProtectedRouteWithKYC>
                <KnowledgeBase />
              </ProtectedRouteWithKYC>
            } />
          </Route>

          {/* Lab Routes */}
          <Route path="/lab" element={
            <ProtectedRoute allowedRoles={['lab']}>
              <Layout />
            </ProtectedRoute>
          }>
            {/* New Lab Workflow Routes */}
            <Route path="sample-reception" element={
              <ProtectedRouteWithKYC>
                <SampleReception />
              </ProtectedRouteWithKYC>
            } />
            <Route path="pending-queue" element={
              <ProtectedRouteWithKYC>
                <PendingQueue />
              </ProtectedRouteWithKYC>
            } />
            <Route path="upload-results" element={
              <ProtectedRouteWithKYC>
                <UploadResults />
              </ProtectedRouteWithKYC>
            } />
            <Route path="test-history" element={
              <ProtectedRouteWithKYC>
                <TestHistory />
              </ProtectedRouteWithKYC>
            } />
            <Route path="flagged-samples" element={
              <ProtectedRouteWithKYC>
                <FlaggedSamples />
              </ProtectedRouteWithKYC>
            } />
            <Route path="mrl-standards" element={
              <ProtectedRouteWithKYC>
                <MRLStandards />
              </ProtectedRouteWithKYC>
            } />

            {/* Legacy Lab Component Routes */}
            <Route path="sample-management" element={
              <ProtectedRouteWithKYC>
                <SampleManagement />
              </ProtectedRouteWithKYC>
            } />
            <Route path="result-submission" element={
              <ProtectedRouteWithKYC>
                <ResultSubmission />
              </ProtectedRouteWithKYC>
            } />
            <Route path="data-api" element={
              <ProtectedRouteWithKYC>
                <DataAPIInterface />
              </ProtectedRouteWithKYC>
            } />
          </Route>

          {/* Retailer Routes */}
          <Route path="/retailer" element={
            <ProtectedRoute allowedRoles={['retailer']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="record-sales" element={
              <ProtectedRouteWithKYC>
                <RecordSales />
              </ProtectedRouteWithKYC>
            } />
            <Route path="stock-register" element={
              <ProtectedRouteWithKYC>
                <StockRegister />
              </ProtectedRouteWithKYC>
            } />
            <Route path="sales-history" element={
              <ProtectedRouteWithKYC>
                <SalesHistory />
              </ProtectedRouteWithKYC>
            } />
            <Route path="shop-profile" element={
              <ProtectedRouteWithKYC>
                <ShopProfile />
              </ProtectedRouteWithKYC>
            } />
            <Route path="alerts" element={
              <ProtectedRouteWithKYC>
                <RetailerAlerts />
              </ProtectedRouteWithKYC>
            } />
          </Route>

          {/* Collector Routes */}
          <Route path="/collector" element={
            <ProtectedRoute allowedRoles={['collector']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="daily-collection" element={
              <ProtectedRouteWithKYC>
                <DailyCollection />
              </ProtectedRouteWithKYC>
            } />
            <Route path="batch-tanker" element={
              <ProtectedRouteWithKYC>
                <BatchTanker />
              </ProtectedRouteWithKYC>
            } />
            <Route path="assigned-farms" element={
              <ProtectedRouteWithKYC>
                <MyAssignedFarms />
              </ProtectedRouteWithKYC>
            } />
            <Route path="farms/:farmId" element={
              <ProtectedRouteWithKYC>
                <FarmDetailView />
              </ProtectedRouteWithKYC>
            } />
            <Route path="lab-samples" element={
              <ProtectedRouteWithKYC>
                <LabSamples />
              </ProtectedRouteWithKYC>
            } />
            <Route path="collection-history" element={
              <ProtectedRouteWithKYC>
                <CollectionHistory />
              </ProtectedRouteWithKYC>
            } />
            <Route path="compliance-check" element={
              <ProtectedRouteWithKYC>
                <FarmComplianceCheck />
              </ProtectedRouteWithKYC>
            } />
            <Route path="scheduling" element={
              <ProtectedRouteWithKYC>
                <CollectionScheduling />
              </ProtectedRouteWithKYC>
            } />
            <Route path="receipts" element={
              <ProtectedRouteWithKYC>
                <DigitalReceipts />
              </ProtectedRouteWithKYC>
            } />
            <Route path="risk-insights" element={
              <ProtectedRouteWithKYC>
                <RiskInsights />
              </ProtectedRouteWithKYC>
            } />


          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'text-sm',
          }}
        />
      </div>
    </Router>
  )
}

export default App;
