import prisma from '../config/prismaClient.js'
import { verifyToken } from '../utils/generateToken.js'
import { ApiError } from '../utils/apiError.js'

const normalizeRole = (role) => {
  const r = String(role ?? '').toUpperCase()
  if (r === 'DOCTOR' || r === 'doctor') return 'doctor'
  if (r === 'PATIENT' || r === 'patient') return 'patient'
  return null
}

export const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const payload = verifyToken(header.slice(7))
    const role = normalizeRole(payload.role)
    if (!payload.id || !role) {
      throw new ApiError(401, 'Invalid token payload', 'UNAUTHORIZED')
    }

    const user =
      role === 'doctor'
        ? await prisma.doctor.findUnique({ where: { id: payload.id } })
        : await prisma.patient.findUnique({ where: { id: payload.id } })

    if (!user) {
      throw new ApiError(401, 'User not found', 'UNAUTHORIZED')
    }

    req.user = { id: user.id, role: role === 'doctor' ? 'DOCTOR' : 'PATIENT' }
    next()
  } catch (e) {
    if (e instanceof ApiError) return next(e)
    next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'))
  }
}
