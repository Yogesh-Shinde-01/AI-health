import bcrypt from 'bcryptjs'
import prisma from '../config/prismaClient.js'
import { env } from '../config/env.js'
import { generateOTP } from './generateOTP.js'
import { sendOTP } from './sendOTP.js'
import { parseLoginMobile, isValidEmail } from './phone.js'
import { ApiError, LOGIN_ERRORS } from './apiError.js'

const otpExpiry = () => new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000)

const lockKey = (kind, role, identifier) => `${role}:${kind}:${identifier}`

export const hashPassword = (plain) => bcrypt.hash(plain, 10)
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash)

async function getLock(key) {
  return prisma.loginLock.findUnique({ where: { lockKey: key } })
}

async function assertNotLocked(key, lockoutMessage) {
  const record = await getLock(key)
  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    throw new ApiError(429, lockoutMessage, 'LOCKED')
  }
  if (record?.lockedUntil && record.lockedUntil <= new Date()) {
    await prisma.loginLock.update({
      where: { lockKey: key },
      data: { attempts: 0, lockedUntil: null },
    })
  }
}

async function recordFailedAttempt(key, maxAttempts, lockMinutes, lockoutMessage) {
  const existing = await getLock(key)
  const attempts = (existing?.attempts ?? 0) + 1
  if (attempts >= maxAttempts) {
    await prisma.loginLock.upsert({
      where: { lockKey: key },
      create: {
        lockKey: key,
        attempts,
        lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
      },
      update: {
        attempts,
        lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
      },
    })
    throw new ApiError(429, lockoutMessage, 'LOCKED')
  }
  await prisma.loginLock.upsert({
    where: { lockKey: key },
    create: { lockKey: key, attempts },
    update: { attempts },
  })
  return maxAttempts - attempts
}

async function clearLock(key) {
  await prisma.loginLock.deleteMany({ where: { lockKey: key } })
}

async function invalidateOtps(phone, purpose) {
  await prisma.oTP.updateMany({
    where: { phone, purpose, isUsed: false },
    data: { isUsed: true },
  })
}

async function createOtpRecord({ phone, role, purpose, channel, email }) {
  const otp = generateOTP()
  await invalidateOtps(phone, purpose)
  await prisma.oTP.create({
    data: {
      phone,
      otp,
      purpose,
      role,
      expiresAt: otpExpiry(),
    },
  })
  await sendOTP({ phone, email, otp, channel })
  return otp
}

async function verifyOtpRecord(phone, purpose, otpInput) {
  const otpLock = lockKey('otp', 'shared', phone)
  await assertNotLocked(otpLock, LOGIN_ERRORS.OTP_LOCKOUT)

  const record = await prisma.oTP.findFirst({
    where: { phone, purpose, isUsed: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!record || record.expiresAt < new Date()) {
    throw new ApiError(400, LOGIN_ERRORS.OTP_EXPIRED, 'OTP_EXPIRED')
  }

  if (record.otp !== String(otpInput).replace(/\D/g, '').slice(0, 6)) {
    const remaining = await recordFailedAttempt(
      otpLock,
      env.MAX_OTP_ATTEMPTS,
      env.OTP_LOCK_MINUTES,
      LOGIN_ERRORS.OTP_LOCKOUT,
    )
    throw new ApiError(400, LOGIN_ERRORS.wrongOtp(remaining), 'WRONG_OTP')
  }

  await prisma.oTP.update({ where: { id: record.id }, data: { isUsed: true } })
  await clearLock(otpLock)
  return record
}

export async function findPatientByPhone(phone) {
  return prisma.patient.findUnique({ where: { phone } })
}

export async function findDoctorByPhone(phone) {
  return prisma.doctor.findUnique({ where: { phone } })
}

export async function findPatientByEmail(email) {
  return prisma.patient.findFirst({ where: { email: email.trim().toLowerCase() } })
}

export async function findDoctorByEmail(email) {
  return prisma.doctor.findFirst({ where: { email: email.trim().toLowerCase() } })
}

/** Registration / legacy send-otp */
export async function sendRegistrationOtp(mobile, role) {
  const phone = parseLoginMobile(mobile)
  if (!phone) throw new ApiError(400, LOGIN_ERRORS.NOT_FOUND, 'NOT_FOUND')

  const exists =
    role === 'doctor' ? await findDoctorByPhone(phone) : await findPatientByPhone(phone)

  await createOtpRecord({ phone, role, purpose: 'register' })
  return { success: true, isNewUser: !exists }
}

export async function verifyRegistrationOtp(mobile, otp, role) {
  const phone = parseLoginMobile(mobile)
  if (!phone) throw new ApiError(400, 'Invalid OTP', 'INVALID_OTP')

  await verifyOtpRecord(phone, 'register', otp)
  const exists =
    role === 'doctor' ? await findDoctorByPhone(phone) : await findPatientByPhone(phone)

  return { phone, isNewUser: !exists }
}

/** login_method: email_password_otp | mobile_otp */
export async function initiateLogin({ userRole, login_method, email, password, mobile }) {
  if (login_method === 'email_password_otp') {
    if (!email?.trim() || !password) {
      throw new ApiError(400, LOGIN_ERRORS.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
    }
    if (!isValidEmail(email)) {
      throw new ApiError(400, LOGIN_ERRORS.INVALID_EMAIL, 'INVALID_EMAIL')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const pwdKey = lockKey('password', userRole, normalizedEmail)
    await assertNotLocked(pwdKey, LOGIN_ERRORS.PASSWORD_LOCKOUT)

    const user =
      userRole === 'doctor'
        ? await findDoctorByEmail(normalizedEmail)
        : await findPatientByEmail(normalizedEmail)

    if (!user) {
      throw new ApiError(400, LOGIN_ERRORS.NOT_FOUND, 'NOT_FOUND')
    }

    const ok = await comparePassword(password, user.password)
    if (!ok) {
      try {
        await recordFailedAttempt(
          pwdKey,
          env.MAX_PASSWORD_ATTEMPTS,
          env.PASSWORD_LOCK_MINUTES,
          LOGIN_ERRORS.PASSWORD_LOCKOUT,
        )
      } catch (e) {
        throw e
      }
      throw new ApiError(400, LOGIN_ERRORS.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
    }

    await clearLock(pwdKey)
    await createOtpRecord({
      phone: user.phone,
      role: userRole,
      purpose: 'login',
      channel: 'email',
      email: user.email,
    })
    return { phone: user.phone }
  }

  if (login_method === 'mobile_otp') {
    const phone = parseLoginMobile(mobile)
    if (!phone) throw new ApiError(400, LOGIN_ERRORS.NOT_FOUND, 'NOT_FOUND')

    const user =
      userRole === 'doctor' ? await findDoctorByPhone(phone) : await findPatientByPhone(phone)
    if (!user) throw new ApiError(400, LOGIN_ERRORS.NOT_FOUND, 'NOT_FOUND')

    await createOtpRecord({ phone, role: userRole, purpose: 'login', channel: 'sms' })
    return { phone }
  }

  throw new ApiError(400, LOGIN_ERRORS.INVALID_CREDENTIALS, 'INVALID_CREDENTIALS')
}

export async function completeLogin({ userRole, login_method, otp }) {
  const pending = await prisma.oTP.findFirst({
    where: { purpose: 'login', role: userRole, isUsed: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!pending) {
    throw new ApiError(400, LOGIN_ERRORS.INVALID_CREDENTIALS, 'NO_PENDING')
  }

  await verifyOtpRecord(pending.phone, 'login', otp)

  const user =
    userRole === 'doctor'
      ? await findDoctorByPhone(pending.phone)
      : await findPatientByPhone(pending.phone)

  if (!user) throw new ApiError(400, LOGIN_ERRORS.NOT_FOUND, 'NOT_FOUND')

  return {
    user: {
      id: user.id,
      mobile: user.phone,
      role: userRole === 'doctor' ? 'DOCTOR' : 'PATIENT',
    },
    isNewUser: false,
  }
}

export async function resendLoginOtp({ userRole }) {
  const pending = await prisma.oTP.findFirst({
    where: { purpose: 'login', role: userRole, isUsed: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!pending) {
    throw new ApiError(400, LOGIN_ERRORS.INVALID_CREDENTIALS, 'NO_PENDING')
  }
  const account =
    userRole === 'doctor'
      ? await findDoctorByPhone(pending.phone)
      : await findPatientByPhone(pending.phone)
  await createOtpRecord({
    phone: pending.phone,
    role: userRole,
    purpose: 'login',
    channel: 'email',
    email: account?.email,
  })
}
