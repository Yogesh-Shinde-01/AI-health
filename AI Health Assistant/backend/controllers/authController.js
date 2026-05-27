import bcrypt from 'bcryptjs'
import prisma from '../config/prismaClient.js'
import { signToken } from '../utils/generateToken.js'
import { ApiError } from '../utils/apiError.js'
import { normalizePhone, createAndSendOtp, verifyOtpCode } from '../utils/otpService.js'
import { phoneLookupVariants } from '../utils/phone.js'
import { omitPassword, toAuthUser } from '../utils/userDto.js'

const success = (message, extra = {}) => ({ success: true, message, ...extra })

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

const findByEmail = async (email, role) => {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  return role === 'doctor'
    ? prisma.doctor.findFirst({ where: { email: normalized } })
    : prisma.patient.findFirst({ where: { email: normalized } })
}

const phoneModel = (role) => (role === 'doctor' ? prisma.doctor : prisma.patient)

/** Find user by phone; migrates legacy 10-digit storage to +91. */
const findByPhone = async (phone, role) => {
  const canonical = normalizePhone(phone)
  const variants = phoneLookupVariants(phone)
  if (!variants.length && !canonical) return null

  const tried = new Set()
  for (const candidate of [...(canonical ? [canonical] : []), ...variants]) {
    if (!candidate || tried.has(candidate)) continue
    tried.add(candidate)
    const user = await phoneModel(role).findUnique({ where: { phone: candidate } })
    if (!user) continue
    if (canonical && user.phone !== canonical) {
      try {
        return await phoneModel(role).update({
          where: { id: user.id },
          data: { phone: canonical },
        })
      } catch {
        return user
      }
    }
    return user
  }
  return null
}

const resolvePhoneFromBody = (body) => body.phone ?? body.mobile

const markVerified = async (phone, role) => {
  const normalized = normalizePhone(phone)
  if (role === 'doctor') {
    return prisma.doctor.update({ where: { phone: normalized }, data: { isVerified: true } })
  }
  return prisma.patient.update({ where: { phone: normalized }, data: { isVerified: true } })
}

const registerAccount = async ({
  role,
  normalizedPhone,
  createData,
  res,
  createdMessage,
  resentMessage,
}) => {
  const { password: plainPassword, ...rest } = createData
  const hashed = await bcrypt.hash(plainPassword, 10)
  const data = { ...rest, password: hashed, phone: normalizedPhone }

  try {
    await phoneModel(role).create({ data })
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await findByPhone(normalizedPhone, role)
      if (!existing) {
        throw new ApiError(409, 'Phone or email already registered', 'DUPLICATE')
      }
      if (existing.isVerified) {
        throw new ApiError(409, 'Phone already registered. Please login.', 'DUPLICATE')
      }
      await createAndSendOtp({ phone: normalizedPhone, purpose: 'register', role, email: existing.email })
      return res.json(success(resentMessage, { phone: normalizedPhone, needsVerification: true }))
    }
    throw err
  }

  await createAndSendOtp({ phone: normalizedPhone, purpose: 'register', role, email: data.email })
  res.status(201).json(success(createdMessage, { phone: normalizedPhone }))
}

export const registerPatient = async (req, res) => {
  const { fullName, phone, email, password, chronicDiseases, allergies, currentMedicines } = req.body
  if (!fullName?.trim() || !phone || !password) {
    throw new ApiError(400, 'fullName, phone and password are required', 'VALIDATION')
  }

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) throw new ApiError(400, 'Invalid phone number', 'VALIDATION')

  await registerAccount({
    role: 'patient',
    normalizedPhone,
    createData: {
      fullName: fullName.trim(),
      email: email?.trim().toLowerCase() || null,
      password,
      chronicDiseases: toStringArray(chronicDiseases),
      allergies: toStringArray(allergies),
      currentMedicines: toStringArray(currentMedicines),
      isVerified: false,
    },
    res,
    createdMessage: 'Patient registered. OTP sent to phone.',
    resentMessage: 'Account exists but is not verified. OTP resent to phone.',
  })
}

export const registerDoctor = async (req, res) => {
  const {
    fullName,
    phone,
    email,
    password,
    specialization,
    licenseNumber,
    clinicName,
    yearsOfExperience,
    consultationFee,
    clinicAddress,
  } = req.body

  if (!fullName?.trim() || !phone || !password || !specialization || !licenseNumber) {
    throw new ApiError(400, 'Required fields missing', 'VALIDATION')
  }

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) throw new ApiError(400, 'Invalid phone number', 'VALIDATION')

  await registerAccount({
    role: 'doctor',
    normalizedPhone,
    createData: {
      fullName: fullName.trim(),
      email: email?.trim().toLowerCase() || null,
      password,
      specialization,
      licenseNumber,
      clinicName: clinicName ?? null,
      clinicAddress: clinicAddress ?? null,
      yearsOfExperience: yearsOfExperience != null ? Number(yearsOfExperience) : null,
      consultationFee: consultationFee != null ? Number(consultationFee) : null,
      isVerified: false,
    },
    res,
    createdMessage: 'Doctor registered. OTP sent to phone.',
    resentMessage: 'Account exists but is not verified. OTP resent to phone.',
  })
}

export const verifyOtp = async (req, res) => {
  const phone = resolvePhoneFromBody(req.body)
  const { otp, role = 'patient' } = req.body
  if (!phone || !otp) throw new ApiError(400, 'phone and otp are required', 'VALIDATION')

  await verifyOtpCode({ phone, otp, purpose: 'register' })
  const user = await markVerified(phone, role)
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND')

  const authRole = role === 'doctor' ? 'DOCTOR' : 'PATIENT'
  const token = signToken({ id: user.id, role: authRole })

  res.json({
    success: true,
    message: 'Phone verified successfully.',
    token,
    user: { id: user.id, mobile: user.phone, role: authRole },
    role: authRole,
    isNewUser: false,
  })
}

const resolveLoginRole = (body) => {
  const raw = body.userRole ?? body.role ?? 'patient'
  return raw === 'doctor' || raw === 'DOCTOR' ? 'doctor' : 'patient'
}

const issueLoginOtp = async (user, role) => {
  await createAndSendOtp({
    phone: user.phone,
    purpose: 'login',
    role,
    email: user.email ?? null,
  })
}

export const login = async (req, res) => {
  const { email, password, login_method, mobile, phone: bodyPhone } = req.body
  const role = resolveLoginRole(req.body)

  if (login_method === 'mobile_otp') {
    const normalized = normalizePhone(mobile ?? bodyPhone)
    if (!normalized) {
      throw new ApiError(400, 'Unable to process request. Please check your details.', 'NOT_FOUND')
    }

    const user = await findByPhone(normalized, role)
    if (!user) {
      throw new ApiError(400, 'Unable to process request. Please check your details.', 'NOT_FOUND')
    }
    if (!user.isVerified) {
      throw new ApiError(403, 'Please verify your phone number first', 'NOT_VERIFIED')
    }

    await issueLoginOtp(user, role)
    return res.json({ success: true, phone: user.phone })
  }

  const isEmailLogin =
    login_method === 'email_password_otp' || (!login_method && email?.trim() && password)

  if (isEmailLogin) {
    if (!email?.trim() || !password) {
      throw new ApiError(400, 'email and password are required', 'VALIDATION')
    }

    const user = await findByEmail(email, role)
    if (!user) {
      throw new ApiError(400, 'Invalid credentials. Please try again.', 'INVALID_CREDENTIALS')
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      throw new ApiError(400, 'Invalid credentials. Please try again.', 'INVALID_CREDENTIALS')
    }

    if (!user.isVerified) {
      throw new ApiError(403, 'Please verify your phone number first', 'NOT_VERIFIED')
    }

    await issueLoginOtp(user, role)
    return res.json({ success: true, phone: user.phone })
  }

  throw new ApiError(400, 'Invalid login method', 'VALIDATION')
}

export const verifyLoginOtp = async (req, res) => {
  const phone = resolvePhoneFromBody(req.body)
  const { otp, role = 'patient' } = req.body
  if (!phone || !otp) throw new ApiError(400, 'phone and otp are required', 'VALIDATION')

  await verifyOtpCode({ phone, otp, purpose: 'login' })
  const user = await findByPhone(phone, role)
  if (!user || !user.isVerified) {
    throw new ApiError(400, 'Invalid credentials', 'INVALID_CREDENTIALS')
  }

  const authRole = role === 'doctor' ? 'DOCTOR' : 'PATIENT'
  const token = signToken({ id: user.id, role: authRole })

  res.json({
    success: true,
    token,
    user: toAuthUser(user, role),
    role: authRole,
  })
}

export const resendOtp = async (req, res) => {
  const rawPhone = resolvePhoneFromBody(req.body)
  const role = req.body.role === 'doctor' ? 'doctor' : 'patient'
  const purpose = req.body.purpose === 'login' ? 'login' : 'register'
  if (!rawPhone) throw new ApiError(400, 'phone is required', 'VALIDATION')

  const account = await findByPhone(rawPhone, role)
  if (!account) throw new ApiError(404, 'User not found', 'NOT_FOUND')

  await createAndSendOtp({ phone: account.phone, purpose, role, email: account.email })
  res.json(success('OTP resent successfully.', { phone: account.phone }))
}

export const forgotPassword = async (req, res) => {
  const { email, role = 'patient' } = req.body
  if (!email?.trim()) throw new ApiError(400, 'email is required', 'VALIDATION')

  const user = await findByEmail(email, role)
  if (!user) {
    return res.json(success('If the account exists, an OTP has been sent to the registered phone.'))
  }

  await createAndSendOtp({ phone: user.phone, purpose: 'reset', role, email: user.email })
  res.json(success('If the account exists, an OTP has been sent to the registered phone.'))
}

export const resetPassword = async (req, res) => {
  const { phone, otp, newPassword } = req.body
  if (!phone || !otp || !newPassword) {
    throw new ApiError(400, 'phone, otp and newPassword are required', 'VALIDATION')
  }

  await verifyOtpCode({ phone, otp, purpose: 'reset' })
  const normalized = normalizePhone(phone)
  const hashed = await bcrypt.hash(newPassword, 10)

  const patient = await prisma.patient.findUnique({ where: { phone: normalized } })
  if (patient) {
    await prisma.patient.update({ where: { phone: normalized }, data: { password: hashed } })
  } else {
    await prisma.doctor.update({ where: { phone: normalized }, data: { password: hashed } })
  }

  res.json(success('Password reset successfully.'))
}

export const loginVerifyLegacy = async (req, res) => {
  const { userRole, otp } = req.body
  const pending = await prisma.oTP.findFirst({
    where: { purpose: 'login', role: userRole, isUsed: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!pending) throw new ApiError(400, 'No pending OTP', 'NO_PENDING')

  req.body = { phone: pending.phone, otp, role: userRole }
  return verifyLoginOtp(req, res)
}

export const sendOtpLegacy = async (req, res) => {
  const { mobile, role = 'patient' } = req.body
  const normalized = normalizePhone(mobile)
  if (!normalized) throw new ApiError(400, 'Invalid phone number', 'VALIDATION')

  const exists = await findByPhone(normalized, role)
  if (!exists) {
    await createAndSendOtp({ phone: normalized, purpose: 'register', role })
  } else if (!exists.isVerified) {
    await createAndSendOtp({ phone: exists.phone, purpose: 'register', role, email: exists.email })
  }
  res.json({ success: true, isNewUser: !exists, phone: exists?.phone ?? normalized })
}

export const verifyOtpLegacy = async (req, res) => {
  const { mobile, otp, role = 'patient' } = req.body
  const phone = normalizePhone(mobile)
  if (!phone) throw new ApiError(400, 'Invalid phone number', 'VALIDATION')

  await verifyOtpCode({ phone, otp, purpose: 'register' })

  const user = await findByPhone(phone, role)
  if (!user) {
    return res.json({
      user: { id: '', mobile: phone, role: role === 'doctor' ? 'DOCTOR' : 'PATIENT' },
      token: '',
      isNewUser: true,
    })
  }

  await markVerified(phone, role)
  const authRole = role === 'doctor' ? 'DOCTOR' : 'PATIENT'
  res.json({
    user: { id: user.id, mobile: user.phone, role: authRole },
    token: signToken({ id: user.id, role: authRole }),
    isNewUser: false,
  })
}
