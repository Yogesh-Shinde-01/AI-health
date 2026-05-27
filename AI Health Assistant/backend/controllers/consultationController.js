import prisma from '../config/prismaClient.js'
import { ApiError } from '../utils/apiError.js'

const canAccess = (consultation, user) => {
  if (user.role === 'PATIENT' && consultation.patientId === user.id) return true
  if (user.role === 'DOCTOR' && consultation.doctorId === user.id) return true
  return false
}

export const submit = async (req, res) => {
  const {
    doctorId,
    symptoms,
    questionAnswers,
    additionalNotes,
    detectedSpecialization,
    possibleDisease,
    confidence,
    riskLevel,
    disclaimer,
  } = req.body

  if (!doctorId || !symptoms?.trim()) {
    throw new ApiError(400, 'doctorId and symptoms are required', 'VALIDATION')
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor?.isVerified) throw new ApiError(400, 'Doctor not found', 'NOT_FOUND')

  const consultation = await prisma.consultation.create({
    data: {
      patientId: req.user.id,
      doctorId,
      symptoms,
      questionAnswers: questionAnswers ?? {},
      additionalNotes,
      detectedSpecialization,
      possibleDisease,
      confidence,
      riskLevel,
      disclaimer,
      status: 'pending',
    },
    include: { patient: true, doctor: true },
  })

  res.status(201).json({ success: true, data: consultation })
}

export const getById = async (req, res) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: req.params.id },
    include: { patient: true, doctor: true, prescription: true },
  })
  if (!consultation) throw new ApiError(404, 'Consultation not found', 'NOT_FOUND')
  if (!canAccess(consultation, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  res.json({ success: true, data: consultation })
}

export const updateStatus = async (req, res) => {
  const { status } = req.body
  const allowed = ['reviewed', 'completed', 'pending']
  if (!allowed.includes(String(status))) {
    throw new ApiError(400, 'Invalid status', 'VALIDATION')
  }

  const existing = await prisma.consultation.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.doctorId !== req.user.id) {
    throw new ApiError(404, 'Consultation not found', 'NOT_FOUND')
  }

  const consultation = await prisma.consultation.update({
    where: { id: req.params.id },
    data: { status },
    include: { patient: true, doctor: true },
  })
  res.json({ success: true, data: consultation })
}

export const listByPatient = async (req, res) => {
  if (req.params.patientId !== req.user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  }
  const rows = await prisma.consultation.findMany({
    where: { patientId: req.params.patientId },
    include: { doctor: { select: { fullName: true, specialization: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: rows })
}

export const listByDoctor = async (req, res) => {
  if (req.params.doctorId !== req.user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  }
  const rows = await prisma.consultation.findMany({
    where: { doctorId: req.params.doctorId },
    include: { patient: { select: { fullName: true, age: true, gender: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: rows })
}
