import 'dotenv/config'

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-change-me-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  /** Comma-separated allowed origins in production (e.g. https://app.example.com) */
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173,http://localhost:5174',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES ?? 10),
  DEV_LOG_OTP: process.env.DEV_LOG_OTP !== 'false',
}
