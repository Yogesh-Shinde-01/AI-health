import { Prisma } from '@prisma/client'
import { ApiError } from './apiError.js'

const PLACEHOLDER_MARKERS = ['[PROJECT-REF]', '[PASSWORD-ENCODED]', '[REGION]']

export function assertDatabaseConfigured() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.trim()) {
    throw new ApiError(
      503,
      'Database is not configured. Set DATABASE_URL in backend/.env, then run npm run db:push.',
      'DATABASE_NOT_CONFIGURED',
    )
  }
  if (PLACEHOLDER_MARKERS.some((marker) => url.includes(marker))) {
    throw new ApiError(
      503,
      'DATABASE_URL still has placeholder values. Paste your Supabase connection strings into backend/.env, then run npm run db:push.',
      'DATABASE_NOT_CONFIGURED',
    )
  }
}

export function mapPrismaError(err) {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new ApiError(
      503,
      'Cannot connect to the database. Check DATABASE_URL in backend/.env and run npm run db:push.',
      'DATABASE_UNAVAILABLE',
    )
  }
  if (err?.code === 'P1013') {
    return new ApiError(
      503,
      'Invalid DATABASE_URL. Check special-character encoding in backend/.env.',
      'DATABASE_NOT_CONFIGURED',
    )
  }
  return err
}
