import type { LoginVerificationResponse, User, UserRole } from '@/types'
import {
  delay,
  isMobileRegistered,
  persistLastMobile,
  readDoctorCredentials,
  readPatientCredentials,
  setFlowSession,
  storageKeys,
} from '@/utils'
import { resolveDoctorIdForLogin, resolvePatientIdForLogin } from '@/utils/userScope'

export type LoginMethod = 'email_password_otp' | 'mobile_otp'
export type LoginUserRole = 'patient' | 'doctor'

export const LOGIN_ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  wrongOtp: (remaining: number) => `Invalid OTP. ${remaining} attempts remaining.`,
  OTP_LOCKOUT: 'Too many attempts. Login locked for 15 minutes.',
  PASSWORD_LOCKOUT: 'Too many failed attempts. Account locked for 30 minutes.',
  NOT_FOUND: 'Unable to process request. Please check your details.',
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_TTL_MS = 5 * 60 * 1000
const MAX_OTP_ATTEMPTS = 3
const OTP_LOCK_MS = 15 * 60 * 1000
const MAX_PASSWORD_ATTEMPTS = 5
const PASSWORD_LOCK_MS = 30 * 60 * 1000

const LOCKS_KEY = 'ai-health-login-locks'
const PENDING_LOGIN_KEY = 'ai-health-pending-login'

export class LoginValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'INVALID_EMAIL'
      | 'INVALID_CREDENTIALS'
      | 'OTP_EXPIRED'
      | 'WRONG_OTP'
      | 'OTP_LOCKOUT'
      | 'PASSWORD_LOCKOUT'
      | 'NOT_FOUND'
      | 'NO_PENDING_LOGIN',
  ) {
    super(message)
    this.name = 'LoginValidationError'
  }
}

interface PendingLogin {
  userRole: LoginUserRole
  loginMethod: LoginMethod
  mobile: string
  email?: string
  otp: string
  otpSentAt: number
  otpUsed: boolean
}

interface LockRecord {
  attempts: number
  lockedUntil: number | null
}

type LockStore = Record<string, LockRecord>

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

/** 10-digit national number; optional +91 / 91 country prefix. */
export const parseLoginMobile = (input: string): string | null => {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91${digits}`
  }
  if ((digits.length === 12 && digits.startsWith('91')) || (digits.length === 13 && digits.startsWith('091'))) {
    const national = digits.slice(-10)
    if (national.length === 10) {
      return `+91${national}`
    }
  }
  return null
}

export const isValidEmailFormat = (email: string): boolean => EMAIL_REGEX.test(email.trim())

const roleToUserRole = (role: LoginUserRole): UserRole => (role === 'doctor' ? 'DOCTOR' : 'PATIENT')

const readLocks = (): LockStore => {
  if (typeof window === 'undefined') {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(LOCKS_KEY)
    return raw ? (JSON.parse(raw) as LockStore) : {}
  } catch {
    return {}
  }
}

const writeLocks = (store: LockStore): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCKS_KEY, JSON.stringify(store))
  }
}

const lockKey = (role: LoginUserRole, kind: 'password' | 'otp', identifier: string): string =>
  `${role}:${kind}:${identifier}`

const getLock = (key: string): LockRecord => {
  const store = readLocks()
  return store[key] ?? { attempts: 0, lockedUntil: null }
}

const setLock = (key: string, record: LockRecord): void => {
  const store = readLocks()
  store[key] = record
  writeLocks(store)
}

const assertNotLocked = (key: string, lockMs: number, message: string): void => {
  const record = getLock(key)
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    throw new LoginValidationError(message, key.includes(':password:') ? 'PASSWORD_LOCKOUT' : 'OTP_LOCKOUT')
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    setLock(key, { attempts: 0, lockedUntil: null })
  }
}

const recordFailedAttempt = (
  key: string,
  maxAttempts: number,
  lockMs: number,
  lockoutMessage: string,
): number => {
  const record = getLock(key)
  const attempts = record.attempts + 1
  if (attempts >= maxAttempts) {
    setLock(key, { attempts, lockedUntil: Date.now() + lockMs })
    throw new LoginValidationError(lockoutMessage, key.includes(':password:') ? 'PASSWORD_LOCKOUT' : 'OTP_LOCKOUT')
  }
  setLock(key, { attempts, lockedUntil: null })
  return maxAttempts - attempts
}

const clearLock = (key: string): void => {
  setLock(key, { attempts: 0, lockedUntil: null })
}

const generateOtp = (): string => String(Math.floor(100000 + Math.random() * 900000))

const hashPassword = async (password: string, salt: string): Promise<string> => {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const verifyStoredPassword = async (
  password: string,
  record: { password?: string; passwordHash?: string; passwordSalt?: string },
): Promise<boolean> => {
  if (record.passwordHash && record.passwordSalt) {
    const hash = await hashPassword(password, record.passwordSalt)
    return hash === record.passwordHash
  }
  if (record.password) {
    return record.password === password
  }
  return false
}

const findCredentialByEmail = (role: LoginUserRole, email: string) => {
  const normalized = normalizeEmail(email)
  const list = role === 'doctor' ? readDoctorCredentials() : readPatientCredentials()
  return list.find((item) => normalizeEmail(item.email) === normalized) ?? null
}

const findCredentialByMobile = (role: LoginUserRole, mobile: string) => {
  const normalized = parseLoginMobile(mobile.replace(/\s/g, '')) ?? mobile.replace(/\s/g, '')
  const list = role === 'doctor' ? readDoctorCredentials() : readPatientCredentials()
  return (
    list.find((item) => {
      const parsed = parseLoginMobile(item.mobile) ?? item.mobile.replace(/\s/g, '')
      return parsed === normalized
    }) ?? null
  )
}

const readPendingLogin = (): PendingLogin | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.sessionStorage.getItem(PENDING_LOGIN_KEY)
    return raw ? (JSON.parse(raw) as PendingLogin) : null
  } catch {
    return null
  }
}

const writePendingLogin = (pending: PendingLogin): void => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(pending))
    setFlowSession(storageKeys.otpSentAt, String(pending.otpSentAt))
    window.sessionStorage.setItem(storageKeys.draftOtp, pending.otp)
    persistLastMobile(pending.mobile)
  }
}

export const clearPendingLogin = (): void => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(PENDING_LOGIN_KEY)
  }
}

const createMockJwt = (role: UserRole, userId: string, mobile: string): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      role,
      mobile,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    }),
  )
  const signature = btoa(`mock-sig-${role}-${userId}`)
  return `${header}.${payload}.${signature}`
}

export interface InitiateLoginParams {
  userRole: LoginUserRole
  login_method: LoginMethod
  email?: string
  password?: string
  mobile?: string
}

export const initiateLogin = async (params: InitiateLoginParams): Promise<void> => {
  await delay(200)
  const { userRole, login_method } = params

  if (login_method === 'email_password_otp') {
    const email = params.email?.trim() ?? ''
    const password = params.password ?? ''

    if (!email || !password) {
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
    }

    if (!isValidEmailFormat(email)) {
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_EMAIL, 'INVALID_EMAIL')
    }

    const passwordLockKey = lockKey(userRole, 'password', normalizeEmail(email))
    assertNotLocked(passwordLockKey, PASSWORD_LOCK_MS, LOGIN_ERROR_MESSAGES.PASSWORD_LOCKOUT)

    const credential = findCredentialByEmail(userRole, email)
    const emailExists = credential !== null
    const mobileRegistered =
      credential !== null && isMobileRegistered(credential.mobile, userRole)

    if (!emailExists || !mobileRegistered) {
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.NOT_FOUND, 'NOT_FOUND')
    }

    const passwordOk = await verifyStoredPassword(password, credential)
    if (!passwordOk) {
      try {
        recordFailedAttempt(
          passwordLockKey,
          MAX_PASSWORD_ATTEMPTS,
          PASSWORD_LOCK_MS,
          LOGIN_ERROR_MESSAGES.PASSWORD_LOCKOUT,
        )
      } catch (error) {
        if (error instanceof LoginValidationError && error.code === 'PASSWORD_LOCKOUT') {
          throw error
        }
      }
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
    }

    clearLock(passwordLockKey)
    const mobile = parseLoginMobile(credential.mobile) ?? credential.mobile
    const otp = generateOtp()
    writePendingLogin({
      userRole,
      loginMethod: login_method,
      mobile,
      email: normalizeEmail(email),
      otp,
      otpSentAt: Date.now(),
      otpUsed: false,
    })
    clearLock(lockKey(userRole, 'otp', mobile))
    return
  }

  if (login_method === 'mobile_otp') {
    const mobileInput = params.mobile?.trim() ?? ''
    const mobile = parseLoginMobile(mobileInput)

    if (!mobile) {
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.NOT_FOUND, 'NOT_FOUND')
    }

    const otpLockKey = lockKey(userRole, 'otp', mobile)
    assertNotLocked(otpLockKey, OTP_LOCK_MS, LOGIN_ERROR_MESSAGES.OTP_LOCKOUT)

    if (!isMobileRegistered(mobile, userRole)) {
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.NOT_FOUND, 'NOT_FOUND')
    }

    const otp = generateOtp()
    writePendingLogin({
      userRole,
      loginMethod: login_method,
      mobile,
      otp,
      otpSentAt: Date.now(),
      otpUsed: false,
    })
    clearLock(otpLockKey)
    return
  }

  throw new LoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
}

export interface VerifyLoginOtpParams {
  userRole: LoginUserRole
  login_method: LoginMethod
  otp: string
}

export const verifyLoginOtp = async (params: VerifyLoginOtpParams): Promise<LoginVerificationResponse> => {
  await delay(200)
  const { userRole, login_method, otp } = params
  const pending = readPendingLogin()

  if (!pending || pending.userRole !== userRole || pending.loginMethod !== login_method) {
    throw new LoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS, 'NO_PENDING_LOGIN')
  }

  const otpLockKey = lockKey(userRole, 'otp', pending.mobile)
  assertNotLocked(otpLockKey, OTP_LOCK_MS, LOGIN_ERROR_MESSAGES.OTP_LOCKOUT)

  if (pending.otpUsed) {
    throw new LoginValidationError(LOGIN_ERROR_MESSAGES.OTP_EXPIRED, 'OTP_EXPIRED')
  }

  if (Date.now() - pending.otpSentAt > OTP_TTL_MS) {
    throw new LoginValidationError(LOGIN_ERROR_MESSAGES.OTP_EXPIRED, 'OTP_EXPIRED')
  }

  const normalizedOtp = otp.replace(/\D/g, '').slice(0, 6)
  if (normalizedOtp.length !== 6 || normalizedOtp !== pending.otp) {
    try {
      const remaining = recordFailedAttempt(
        otpLockKey,
        MAX_OTP_ATTEMPTS,
        OTP_LOCK_MS,
        LOGIN_ERROR_MESSAGES.OTP_LOCKOUT,
      )
      throw new LoginValidationError(LOGIN_ERROR_MESSAGES.wrongOtp(remaining), 'WRONG_OTP')
    } catch (error) {
      if (error instanceof LoginValidationError) {
        throw error
      }
      throw error
    }
  }

  clearLock(otpLockKey)
  if (pending.email) {
    clearLock(lockKey(userRole, 'password', pending.email))
  }

  writePendingLogin({ ...pending, otpUsed: true })

  const userRoleApi = roleToUserRole(userRole)
  const user: User = {
    id:
      userRole === 'doctor'
        ? resolveDoctorIdForLogin(pending.mobile)
        : resolvePatientIdForLogin(pending.mobile),
    mobile: pending.mobile,
    role: userRoleApi,
  }

  clearPendingLogin()
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(storageKeys.draftOtp)
    window.sessionStorage.setItem(storageKeys.pendingIsNewUser, 'false')
  }

  return {
    user,
    token: createMockJwt(userRoleApi, user.id, user.mobile),
    isNewUser: false,
  }
}

export const resendLoginOtp = async (params: {
  userRole: LoginUserRole
  login_method: LoginMethod
}): Promise<void> => {
  const pending = readPendingLogin()
  if (!pending || pending.userRole !== params.userRole || pending.loginMethod !== params.login_method) {
    throw new LoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS, 'NO_PENDING_LOGIN')
  }

  const otpLockKey = lockKey(params.userRole, 'otp', pending.mobile)
  assertNotLocked(otpLockKey, OTP_LOCK_MS, LOGIN_ERROR_MESSAGES.OTP_LOCKOUT)

  const otp = generateOtp()
  writePendingLogin({
    ...pending,
    otp,
    otpSentAt: Date.now(),
    otpUsed: false,
  })
  clearLock(otpLockKey)
}

export const hashPasswordForStorage = async (password: string): Promise<{ passwordHash: string; passwordSalt: string }> => {
  const passwordSalt = crypto.randomUUID()
  const passwordHash = await hashPassword(password, passwordSalt)
  return { passwordHash, passwordSalt }
}
