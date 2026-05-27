import { ApiError } from '../utils/apiError.js'
import { env } from '../config/env.js'
import { mapPrismaError } from '../utils/prismaErrors.js'

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
}

export const errorHandler = (err, req, res, _next) => {
  const mapped = mapPrismaError(err)
  if (mapped instanceof ApiError) {
    return res.status(mapped.statusCode).json({ success: false, message: mapped.message, code: mapped.code })
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code })
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Record already exists', code: 'DUPLICATE' })
  }

  if (env.NODE_ENV === 'development') {
    console.error(err)
  }

  const status = err.status || err.statusCode || 500
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  })
}
