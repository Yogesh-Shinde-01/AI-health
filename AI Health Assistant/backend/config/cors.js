import { env } from './env.js'

/** Matches http://localhost:5173, http://127.0.0.1:5174, etc. */
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

const parseAllowedOrigins = () =>
  (env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

export const corsOriginCallback = (origin, callback) => {
  // Same-origin / curl / Postman
  if (!origin) {
    return callback(null, true)
  }

  if (env.NODE_ENV === 'development' && LOCALHOST_ORIGIN.test(origin)) {
    return callback(null, true)
  }

  const allowed = new Set(parseAllowedOrigins())
  if (allowed.has(origin)) {
    return callback(null, true)
  }

  callback(new Error(`CORS blocked origin: ${origin}`))
}

export const corsOptions = {
  origin: corsOriginCallback,
  credentials: true,
}
