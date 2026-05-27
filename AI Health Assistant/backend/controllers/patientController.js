import prisma from '../config/prismaClient.js'
import { ApiError } from '../utils/apiError.js'
import { omitPassword } from '../utils/userDto.js'
import { uploadImageBuffer } from '../utils/cloudinaryUpload.js'

export const getProfile = async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.user.id } })
  if (!patient) throw new ApiError(404, 'Patient not found', 'NOT_FOUND')
  res.json({ success: true, data: omitPassword(patient) })
}

export const updateProfile = async (req, res) => {
  const {
    fullName,
    age,
    gender,
    height,
    weight,
    bloodGroup,
    dateOfBirth,
    address,
    emergencyContact,
    email,
  } = req.body

  const data = {}
  if (fullName != null) data.fullName = fullName
  if (age != null) data.age = Number(age)
  if (gender != null) data.gender = gender
  if (height != null) data.height = Number(height)
  if (weight != null) data.weight = Number(weight)
  if (bloodGroup != null) data.bloodGroup = bloodGroup
  if (dateOfBirth != null) data.dateOfBirth = new Date(dateOfBirth)
  if (address != null) data.address = address
  if (emergencyContact != null) data.emergencyContact = emergencyContact
  if (email != null) data.email = email.trim().toLowerCase()

  const patient = await prisma.patient.update({ where: { id: req.user.id }, data })
  res.json({ success: true, data: omitPassword(patient) })
}

export const uploadPicture = async (req, res) => {
  if (!req.file?.buffer) throw new ApiError(400, 'Image file is required', 'VALIDATION')
  const url = await uploadImageBuffer(req.file.buffer, 'patients')
  const patient = await prisma.patient.update({
    where: { id: req.user.id },
    data: { profilePicture: url },
  })
  res.json({ success: true, profilePicture: patient.profilePicture })
}

export const getConsultations = async (req, res) => {
  const rows = await prisma.consultation.findMany({
    where: { patientId: req.user.id },
    include: { doctor: { select: { fullName: true, specialization: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: rows })
}

export const getPrescriptions = async (req, res) => {
  const rows = await prisma.prescription.findMany({
    where: { patientId: req.user.id },
    include: { doctor: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: rows })
}

export const getMedicalHistory = async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.user.id } })
  if (!patient) throw new ApiError(404, 'Patient not found', 'NOT_FOUND')
  res.json({
    success: true,
    data: {
      chronicDiseases: patient.chronicDiseases ?? [],
      allergies: patient.allergies ?? [],
      currentMedicines: patient.currentMedicines ?? [],
    },
  })
}

export const updateMedicalHistory = async (req, res) => {
  const { chronicDiseases, allergies, currentMedicines } = req.body
  const patient = await prisma.patient.update({
    where: { id: req.user.id },
    data: {
      chronicDiseases: chronicDiseases ?? [],
      allergies: allergies ?? [],
      currentMedicines: currentMedicines ?? [],
    },
  })
  res.json({
    success: true,
    data: {
      chronicDiseases: patient.chronicDiseases,
      allergies: patient.allergies,
      currentMedicines: patient.currentMedicines,
    },
  })
}

/** Legacy GET /patients/me/medical-history */
export const getMedicalHistoryLegacy = async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.user.id } })
  if (!patient) throw new ApiError(404, 'Patient not found', 'NOT_FOUND')
  res.json({
    chronicDiseases: patient.chronicDiseases ?? [],
    allergies: patient.allergies ?? [],
    currentMedicines: patient.currentMedicines ?? [],
  })
}

/** Legacy PUT /patients/me/medical-history */
export const updateMedicalHistoryLegacy = async (req, res) => {
  const { chronicDiseases, allergies, currentMedicines } = req.body
  const patient = await prisma.patient.update({
    where: { id: req.user.id },
    data: {
      chronicDiseases: chronicDiseases ?? [],
      allergies: allergies ?? [],
      currentMedicines: currentMedicines ?? [],
    },
  })
  res.json({
    chronicDiseases: patient.chronicDiseases,
    allergies: patient.allergies,
    currentMedicines: patient.currentMedicines,
  })
}

/** Legacy GET /patients/me */
export const getProfileLegacy = async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.user.id } })
  if (!patient) throw new ApiError(404, 'Patient not found', 'NOT_FOUND')
  res.json({
    id: patient.id,
    fullName: patient.fullName ?? '',
    age: patient.age ?? 0,
    gender: patient.gender ?? 'OTHER',
    heightCm: patient.height ?? 0,
    weightKg: patient.weight ?? 0,
    bloodGroup: patient.bloodGroup ?? undefined,
  })
}

export const updateProfileLegacy = async (req, res) => {
  const data = {}
  if (req.body.fullName != null) data.fullName = req.body.fullName
  if (req.body.age != null) data.age = Number(req.body.age)
  if (req.body.gender != null) data.gender = req.body.gender
  if (req.body.heightCm != null) data.height = Number(req.body.heightCm)
  if (req.body.weightKg != null) data.weight = Number(req.body.weightKg)
  if (req.body.bloodGroup != null) data.bloodGroup = req.body.bloodGroup
  const patient = await prisma.patient.update({ where: { id: req.user.id }, data })
  res.json({
    id: patient.id,
    fullName: patient.fullName,
    age: patient.age ?? 0,
    gender: patient.gender ?? 'OTHER',
    heightCm: patient.height ?? 0,
    weightKg: patient.weight ?? 0,
    bloodGroup: patient.bloodGroup ?? undefined,
  })
}
