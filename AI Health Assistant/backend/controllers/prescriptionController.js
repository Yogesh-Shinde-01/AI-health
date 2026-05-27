import prisma from '../config/prismaClient.js'
import { ApiError } from '../utils/apiError.js'

const canAccess = (prescription, user) => {
  if (user.role === 'PATIENT' && prescription.patientId === user.id) return true
  if (user.role === 'DOCTOR' && prescription.doctorId === user.id) return true
  return false
}

export const create = async (req, res) => {
  const { consultationId, patientId, diagnosis, medicines, advice, followUpDate } = req.body
  if (!consultationId || !patientId || !diagnosis) {
    throw new ApiError(400, 'consultationId, patientId and diagnosis are required', 'VALIDATION')
  }

  const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } })
  if (!consultation || consultation.doctorId !== req.user.id) {
    throw new ApiError(404, 'Consultation not found', 'NOT_FOUND')
  }

  const prescription = await prisma.prescription.create({
    data: {
      consultationId,
      patientId,
      doctorId: req.user.id,
      diagnosis,
      medicines: medicines ?? [],
      advice,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: 'draft',
    },
  })

  res.status(201).json({ success: true, data: prescription })
}

export const approve = async (req, res) => {
  const existing = await prisma.prescription.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.doctorId !== req.user.id) {
    throw new ApiError(404, 'Prescription not found', 'NOT_FOUND')
  }
  const prescription = await prisma.prescription.update({
    where: { id: req.params.id },
    data: { status: 'approved' },
  })
  res.json({ success: true, data: prescription })
}

export const getById = async (req, res) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id: req.params.id },
    include: { doctor: true, patient: true, consultation: true },
  })
  if (!prescription) throw new ApiError(404, 'Prescription not found', 'NOT_FOUND')
  if (!canAccess(prescription, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  res.json({ success: true, data: prescription })
}

export const listByPatient = async (req, res) => {
  if (req.params.patientId !== req.user.id) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  }
  const rows = await prisma.prescription.findMany({
    where: { patientId: req.params.patientId },
    include: { doctor: { select: { fullName: true, specialization: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data: rows })
}

export const getByConsultation = async (req, res) => {
  const prescription = await prisma.prescription.findUnique({
    where: { consultationId: req.params.consultationId },
    include: { patient: true, doctor: true },
  })
  if (!prescription || prescription.doctorId !== req.user.id) {
    throw new ApiError(404, 'Prescription not found', 'NOT_FOUND')
  }
  res.json({ success: true, data: prescription })
}
