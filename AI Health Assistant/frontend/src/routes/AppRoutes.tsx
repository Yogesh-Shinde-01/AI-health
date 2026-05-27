import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/routes/PrivateRoute'
import AdditionalNotesPage from '@/pages/patient/AdditionalNotesPage'
import AiQuestionsPage from '@/pages/patient/AiQuestionsPage'
import CreatePrescriptionPage from '@/pages/doctor/CreatePrescriptionPage'
import DoctorCalendarPage from '@/pages/doctor/DoctorCalendarPage'
import DoctorConsultationPage from '@/pages/doctor/DoctorConsultationPage'
import DoctorDashboardPage from '@/pages/doctor/DoctorDashboardPage'
import DoctorPatientsPage from '@/pages/doctor/DoctorPatientsPage'
import DoctorProfilePage from '@/pages/doctor/DoctorProfilePage'
import EditPrescriptionPage from '@/pages/doctor/EditPrescriptionPage'
import FollowUpPage from '@/pages/patient/FollowUpPage'
import HistoryPage from '@/pages/patient/HistoryPage'
import HomePage from '@/pages/patient/HomePage'
import LanguagePage from '@/pages/auth/LanguagePage'
import LoginPage from '@/pages/auth/LoginPage'
import MedicalHistoryPage from '@/pages/patient/MedicalHistoryPage'
import MoreQuestionsPage from '@/pages/patient/MoreQuestionsPage'
import OtpPage from '@/pages/auth/OtpPage'
import PatientPrescriptionPage from '@/pages/patient/PatientPrescriptionPage'
import PatientProfilePage from '@/pages/patient/PatientProfilePage'
import PdfSharePage from '@/pages/patient/PdfSharePage'
import PrescriptionApprovedPage from '@/pages/doctor/PrescriptionApprovedPage'
import SummaryPage from '@/pages/patient/SummaryPage'
import SubmissionSuccessPage from '@/pages/patient/SubmissionSuccessPage'
import SymptomsPage from '@/pages/patient/SymptomsPage'
import WelcomePage from '@/pages/auth/WelcomePage'
import ErrorBoundary from '@/components/feedback/ErrorBoundary'
import {
  AuthPage,
  DoctorRegistrationPage,
  NotificationsPage,
  PatientMyProfilePage,
  PatientRegistrationPage,
  RoleSelectionPage,
} from '@/pages/auth/authFlow'

export const router = createBrowserRouter([
  { path: '/', element: <LanguagePage /> },
  { path: '/welcome', element: <WelcomePage /> },
  { path: '/role-selection', element: <RoleSelectionPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/otp', element: <OtpPage /> },
  {
    path: '/patient-register',
    element: (
      <ErrorBoundary title="Registration could not load">
        <PatientRegistrationPage />
      </ErrorBoundary>
    ),
  },
  {
    path: '/doctor-register',
    element: (
      <ErrorBoundary title="Registration could not load">
        <DoctorRegistrationPage />
      </ErrorBoundary>
    ),
  },
  { path: '/doctor-login', element: <Navigate to="/auth" replace /> },
  { path: '/doctor-otp', element: <Navigate to="/otp" replace /> },
  { path: '/register', element: <Navigate to="/auth?tab=register" replace /> },
  { path: '/doctor-profile-setup', element: <Navigate to="/doctor-register" replace /> },
  {
    path: '/my-profile',
    element: (
      <ProtectedRoute patientOnly>
        <PatientMyProfilePage />
      </ProtectedRoute>
    ),
  },
  { path: '/profile', element: <Navigate to="/my-profile" replace /> },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute patientOnly>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/medical-history',
    element: (
      <ProtectedRoute patientOnly>
        <MedicalHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/home',
    element: (
      <ProtectedRoute patientOnly>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/symptoms',
    element: (
      <ProtectedRoute patientOnly>
        <SymptomsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ai-questions',
    element: (
      <ProtectedRoute patientOnly>
        <AiQuestionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/more-questions',
    element: (
      <ProtectedRoute patientOnly>
        <MoreQuestionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/additional-notes',
    element: (
      <ProtectedRoute patientOnly>
        <AdditionalNotesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/summary',
    element: (
      <ProtectedRoute patientOnly>
        <SummaryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/submission-success',
    element: (
      <ProtectedRoute patientOnly>
        <SubmissionSuccessPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor-dashboard',
    element: (
      <ProtectedRoute role="DOCTOR">
        <DoctorDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor-notifications',
    element: (
      <ProtectedRoute role="DOCTOR">
        <NotificationsPage role="DOCTOR" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor-patients',
    element: (
      <ProtectedRoute role="DOCTOR">
        <DoctorPatientsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor-calendar',
    element: (
      <ProtectedRoute role="DOCTOR">
        <DoctorCalendarPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor-profile',
    element: (
      <ProtectedRoute role="DOCTOR">
        <DoctorProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor-consultation/:id',
    element: (
      <ProtectedRoute role="DOCTOR">
        <DoctorConsultationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/create-prescription/:id',
    element: (
      <ProtectedRoute role="DOCTOR">
        <CreatePrescriptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/edit-prescription/:id',
    element: (
      <ProtectedRoute role="DOCTOR">
        <EditPrescriptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/prescription-approved',
    element: (
      <ProtectedRoute role="DOCTOR">
        <PrescriptionApprovedPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-prescription/:prescriptionId?',
    element: (
      <ProtectedRoute patientOnly>
        <PatientPrescriptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pdf-share',
    element: (
      <ProtectedRoute>
        <PdfSharePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/follow-up',
    element: (
      <ProtectedRoute patientOnly>
        <FollowUpPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/history',
    element: (
      <ProtectedRoute patientOnly>
        <HistoryPage />
      </ProtectedRoute>
    ),
  },
])

