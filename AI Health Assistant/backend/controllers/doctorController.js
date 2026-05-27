import prisma from '../config/prismaClient.js'
import { ApiError } from '../utils/apiError.js'
import { omitPassword } from '../utils/userDto.js'
import { uploadImageBuffer } from '../utils/cloudinaryUpload.js'

export const getProfile = async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: req.user.id } })
  if (!doctor) throw new ApiError(404, 'Doctor not found', 'NOT_FOUND')
  // Return flat DoctorProfileRecord shape (same as legacyRoutes) so frontend
  // getDoctorProfile() can read fields directly without unwrapping an envelope
  res.json({
    fullName: doctor.fullName,
    specialization: doctor.specialization,
    registrationNumber: doctor.licenseNumber ?? '',
    hospital: doctor.clinicName ?? '',
    experienceYears: String(doctor.yearsOfExperience ?? ''),
    consultationFee: String(doctor.consultationFee ?? ''),
    email: doctor.email ?? '',
    mobile: doctor.phone ?? '',
    profilePictureUrl: doctor.profilePicture ?? '',
    clinicAddress: doctor.clinicAddress ?? '',
  })
}

export const updateProfile = async (req, res) => {
  const {
    fullName,
    phone,
    email,
    specialization,
    clinicName,
    clinicAddress,
    consultationFee,
    yearsOfExperience,
  } = req.body

  const data = {}
  if (fullName != null) data.fullName = fullName
  if (phone != null) data.phone = phone.replace(/\s/g, '')
  if (email != null) data.email = email.trim().toLowerCase()
  if (specialization != null) data.specialization = specialization
  if (clinicName != null) data.clinicName = clinicName
  if (clinicAddress != null) data.clinicAddress = clinicAddress
  if (consultationFee != null) data.consultationFee = Number(consultationFee)
  if (yearsOfExperience != null) data.yearsOfExperience = Number(yearsOfExperience)

  const doctor = await prisma.doctor.update({ where: { id: req.user.id }, data })
  res.json({ success: true, data: omitPassword(doctor) })
}

export const uploadPicture = async (req, res) => {
  if (!req.file?.buffer) throw new ApiError(400, 'Image file is required', 'VALIDATION')
  const url = await uploadImageBuffer(req.file.buffer, 'doctors')
  const doctor = await prisma.doctor.update({
    where: { id: req.user.id },
    data: { profilePicture: url },
  })
  res.json({ success: true, profilePicture: doctor.profilePicture })
}

export const setAvailability = async (req, res) => {
  const { availability } = req.body
  if (typeof availability !== 'boolean') {
    throw new ApiError(400, 'availability must be boolean', 'VALIDATION')
  }
  const doctor = await prisma.doctor.update({
    where: { id: req.user.id },
    data: { availability },
  })
  res.json({ success: true, availability: doctor.availability })
}

export const getPatients = async (req, res) => {
  const consultations = await prisma.consultation.findMany({
    where: { doctorId: req.user.id },
    include: { patient: { select: { id: true, fullName: true, age: true, gender: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const seen = new Set()
  const patients = []
  for (const row of consultations) {
    if (!seen.has(row.patientId)) {
      seen.add(row.patientId)
      patients.push({ ...row.patient, consultationId: row.id })
    }
  }
  res.json({ success: true, data: patients })
}

export const getConsultations = async (req, res) => {
  const rows = await prisma.consultation.findMany({
    where: { doctorId: req.user.id },
    include: { patient: { select: { fullName: true, age: true, gender: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: rows })
}

/** PUBLIC — no auth */
export const listDoctors = async (req, res) => {
  const { specialization } = req.query
  const where = {
    isVerified: true,
    availability: true,
    ...(specialization ? { specialization: String(specialization) } : {}),
  }

  const doctors = await prisma.doctor.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      specialization: true,
      clinicName: true,
      consultationFee: true,
      rating: true,
      profilePicture: true,
      yearsOfExperience: true,
      availability: true,
    },
    orderBy: { rating: 'desc' },
  })

  res.json({ success: true, data: doctors })
}
