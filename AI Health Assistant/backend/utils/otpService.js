import prisma from '../config/prismaClient.js'
import { env } from '../config/env.js'
import { generateOTP } from './generateOTP.js'
import { sendOTP } from './sendOTP.js'
import { parseLoginMobile } from './phone.js'
import { ApiError } from './apiError.js'

const otpExpiry = () => new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000)

export const normalizePhone = (input) => parseLoginMobile(input)

export async function invalidateOtpsForPhone(phone) {
  await prisma.oTP.updateMany({
    where: { phone, isUsed: false },
    data: { isUsed: true },
  })
}

export async function createAndSendOtp({ phone, purpose, role = null, email = null }) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new ApiError(400, 'Invalid phone number', 'VALIDATION')

  const otp = generateOTP()
  await invalidateOtpsForPhone(normalized)
  await prisma.oTP.create({
    data: {
      phone: normalized,
      otp,
      purpose,
      role,
      expiresAt: otpExpiry(),
    },
  })
  await sendOTP({ phone: normalized, email, otp, channel: email ? 'email' : 'sms' })
  return { phone: normalized, otp: env.DEV_LOG_OTP ? otp : undefined }
}

export async function verifyOtpCode({ phone, otp, purpose }) {
  const normalized = normalizePhone(phone)
  if (!normalized || !otp) {
    throw new ApiError(400, 'Invalid OTP', 'INVALID_OTP')
  }

  const code = String(otp).replace(/\D/g, '').slice(0, 6)
  const record = await prisma.oTP.findFirst({
    where: { phone: normalized, otp: code, isUsed: false, purpose },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    throw new ApiError(400, 'Invalid OTP', 'INVALID_OTP')
  }
  if (record.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new one.', 'OTP_EXPIRED')
  }

  await prisma.oTP.update({ where: { id: record.id }, data: { isUsed: true } })
  return record
}
