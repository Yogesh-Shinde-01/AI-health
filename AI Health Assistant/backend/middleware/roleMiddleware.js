import { ApiError } from '../utils/apiError.js'

const normalizeRequired = (role) => {
  const r = String(role).toLowerCase()
  return r === 'doctor' ? 'DOCTOR' : 'PATIENT'
}

/** Usage: roleMiddleware('patient') or roleMiddleware('doctor') */
export const roleMiddleware = (requiredRole) => (req, res, next) => {
  const required = normalizeRequired(requiredRole)
  if (!req.user?.role || req.user.role !== required) {
    return next(new ApiError(403, 'Forbidden', 'FORBIDDEN'))
  }
  next()
}

export const requirePatient = roleMiddleware('patient')
export const requireDoctor = roleMiddleware('doctor')
