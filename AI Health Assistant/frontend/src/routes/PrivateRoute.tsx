import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'
import { isDoctorOnlyPath } from '@/utils/userScope'

interface ProtectedRouteProps extends PropsWithChildren {
  /** When set, user must have this exact role (e.g. doctor-only routes). */
  role?: UserRole
  /** When true, doctors are redirected away (patient-only routes). */
  patientOnly?: boolean
}

const ProtectedRoute = ({ children, role, patientOnly }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  if (patientOnly && user?.role === 'DOCTOR') {
    return <Navigate to="/doctor-dashboard" replace />
  }

  if (user?.role === 'PATIENT' && isDoctorOnlyPath(location.pathname)) {
    return <Navigate to="/home" replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'DOCTOR' ? '/doctor-dashboard' : '/home'} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
