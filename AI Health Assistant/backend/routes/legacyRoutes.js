import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as patient from '../controllers/patientController.js'
import * as doctor from '../controllers/doctorController.js'
import prisma from '../config/prismaClient.js'
import { ApiError } from '../utils/apiError.js'

const router = Router()

// --- Response mappers ---
const consultStatusMap = { pending: 'PENDING', reviewed: 'REVIEWED', completed: 'CLOSED' }
const consultCaseStatusMap = { pending: 'PENDING_REVIEW', reviewed: 'PRESCRIPTION_READY', completed: 'CLOSED' }

const mapConsultation = (row) => ({
  ...row,
  status: consultStatusMap[row.status] ?? 'PENDING',
  caseStatus: consultCaseStatusMap[row.status] ?? 'PENDING_REVIEW',
  patientName: row.patient?.fullName ?? null,
  patientAge: row.patient?.age ?? null,
  patientGender: row.patient?.gender ?? null,
  doctorName: row.doctor?.fullName ?? null,
  possibleCause: row.possibleDisease ?? null,
})

const prescStatusMap = { draft: 'DRAFT', approved: 'APPROVED' }

const mapPrescription = (row) => ({
  ...row,
  status: prescStatusMap[row.status] ?? 'DRAFT',
  doctorName: row.doctor?.fullName ?? null,
  patientName: row.patient?.fullName ?? null,
  patientAge: row.patient?.age ?? null,
  patientGender: row.patient?.gender ?? null,
})

/** GET /api/doctors — public list (spec path) */
router.get('/doctors', asyncHandler(doctor.listDoctors))

router.use(authMiddleware)

router.get('/patients/me', roleMiddleware('patient'), asyncHandler(patient.getProfileLegacy))
router.put('/patients/me', roleMiddleware('patient'), asyncHandler(patient.updateProfileLegacy))
router.get('/patients/me/medical-history', roleMiddleware('patient'), asyncHandler(patient.getMedicalHistoryLegacy))
router.put('/patients/me/medical-history', roleMiddleware('patient'), asyncHandler(patient.updateMedicalHistoryLegacy))

const getDoctorProfileResponse = async (doctorId) => {
  const d = await prisma.doctor.findUnique({ where: { id: doctorId } })
  if (!d) throw new ApiError(404, 'Doctor not found', 'NOT_FOUND')
  return {
    fullName: d.fullName,
    specialization: d.specialization,
    registrationNumber: d.licenseNumber,
    hospital: d.clinicName ?? '',
    experienceYears: String(d.yearsOfExperience ?? ''),
    consultationFee: String(d.consultationFee ?? ''),
    email: d.email ?? '',
    mobile: d.phone,
    profilePictureUrl: d.profilePicture ?? '',
    clinicAddress: d.clinicAddress ?? '',
  }
}

router.get('/doctor/profile', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  res.json(await getDoctorProfileResponse(req.user.id))
}))

/** Alias: GET /api/doctors/me */
router.get('/doctors/me', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  res.json(await getDoctorProfileResponse(req.user.id))
}))

const updateDoctorProfileFromBody = async (doctorId, body) => {
  const { fullName, mobile, email, specialization, hospital, consultationFee, profilePictureUrl } = body
  const d = await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      ...(fullName != null && { fullName }),
      ...(mobile != null && { phone: mobile }),
      ...(email != null && { email }),
      ...(specialization != null && { specialization }),
      ...(hospital != null && { clinicName: hospital }),
      ...(consultationFee != null && { consultationFee: Number(consultationFee) }),
      ...(profilePictureUrl != null && { profilePicture: profilePictureUrl }),
    },
  })
  return {
    fullName: d.fullName,
    specialization: d.specialization,
    registrationNumber: d.licenseNumber,
    hospital: d.clinicName ?? '',
    experienceYears: String(d.yearsOfExperience ?? ''),
    consultationFee: String(d.consultationFee ?? ''),
    email: d.email ?? '',
    mobile: d.phone,
    profilePictureUrl: d.profilePicture ?? '',
    clinicAddress: d.clinicAddress ?? '',
  }
}

router.patch('/doctor/update-profile', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  res.json(await updateDoctorProfileFromBody(req.user.id, req.body))
}))

/** Alias: PUT /api/doctors/profile */
router.put('/doctors/profile', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  res.json(await updateDoctorProfileFromBody(req.user.id, req.body))
}))

router.post('/consultations', roleMiddleware('patient'), asyncHandler(async (req, res) => {
  let doctorId = req.body.doctorId
  // Validate doctorId exists; fall back to first verified doctor if missing or invalid
  if (doctorId) {
    const exists = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!exists) doctorId = null
  }
  if (!doctorId) {
    const first = await prisma.doctor.findFirst({ where: { isVerified: true } })
      ?? await prisma.doctor.findFirst()
    doctorId = first?.id ?? null
  }
  if (!doctorId || !req.body.symptoms) throw new ApiError(400, 'Missing fields', 'VALIDATION')
  const row = await prisma.consultation.create({
    data: {
      patientId: req.user.id,
      doctorId,
      symptoms: req.body.symptoms,
      questionAnswers: req.body.aiAnswers ?? {},
      additionalNotes: req.body.additionalNotes,
      riskLevel: req.body.riskLevel,
      possibleDisease: req.body.aiSummary?.possibleCause,
      status: 'pending',
    },
    include: { patient: true, doctor: true },
  })
  res.status(201).json({ consultation: mapConsultation(row), consultationId: row.id })
}))

router.get('/consultations', asyncHandler(async (req, res) => {
  const where = req.user.role === 'PATIENT' ? { patientId: req.user.id } : { doctorId: req.user.id }
  const rows = await prisma.consultation.findMany({
    where,
    include: { patient: true, doctor: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(mapConsultation))
}))

router.get('/consultations/pending', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  const rows = await prisma.consultation.findMany({
    where: { doctorId: req.user.id, status: 'pending' },
    include: { patient: true, doctor: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(mapConsultation))
}))

router.get('/consultations/doctor', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  const rows = await prisma.consultation.findMany({
    where: { doctorId: req.user.id },
    include: { patient: { select: { fullName: true, age: true, gender: true } }, doctor: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(mapConsultation))
}))

router.get('/consultations/:id', asyncHandler(async (req, res) => {
  const row = await prisma.consultation.findUnique({
    where: { id: req.params.id },
    include: { patient: true, doctor: true, prescription: true },
  })
  if (!row) throw new ApiError(404, 'Consultation not found', 'NOT_FOUND')
  const allowed =
    (req.user.role === 'PATIENT' && row.patientId === req.user.id) ||
    (req.user.role === 'DOCTOR' && row.doctorId === req.user.id)
  if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  res.json(mapConsultation(row))
}))

router.patch('/consultations/:id/status', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  const status = req.body.status ?? req.body.caseStatus
  const statusMap = {
    UNDER_REVIEW: 'pending', PENDING_REVIEW: 'pending',
    PRESCRIPTION_READY: 'reviewed', CLOSED: 'completed',
    reviewed: 'reviewed', completed: 'completed', pending: 'pending',
  }
  const resolved = statusMap[status] ?? String(status ?? '').toLowerCase()
  const allowed = ['reviewed', 'completed', 'pending']
  if (!allowed.includes(resolved)) throw new ApiError(400, 'Invalid status', 'VALIDATION')

  const existing = await prisma.consultation.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.doctorId !== req.user.id) throw new ApiError(404, 'Consultation not found', 'NOT_FOUND')

  const row = await prisma.consultation.update({
    where: { id: req.params.id },
    data: { status: resolved },
    include: { patient: true, doctor: true },
  })
  res.json(mapConsultation(row))
}))

router.get('/prescriptions', asyncHandler(async (req, res) => {
  const where = req.user.role === 'PATIENT' ? { patientId: req.user.id } : { doctorId: req.user.id }
  const rows = await prisma.prescription.findMany({
    where,
    include: { doctor: true, patient: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(mapPrescription))
}))

router.get('/prescriptions/:id', asyncHandler(async (req, res) => {
  const row = await prisma.prescription.findUnique({
    where: { id: req.params.id },
    include: { doctor: true, patient: true, consultation: true },
  })
  if (!row) throw new ApiError(404, 'Prescription not found', 'NOT_FOUND')
  const allowed =
    (req.user.role === 'PATIENT' && row.patientId === req.user.id) ||
    (req.user.role === 'DOCTOR' && row.doctorId === req.user.id)
  if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
  res.json(mapPrescription(row))
}))

router.post('/prescriptions', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  const { consultationId, patientId, diagnosis, medicines, advice, followUpDate } = req.body
  if (!consultationId || !patientId || !diagnosis) {
    throw new ApiError(400, 'consultationId, patientId and diagnosis are required', 'VALIDATION')
  }
  const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } })
  if (!consultation || consultation.doctorId !== req.user.id) {
    throw new ApiError(404, 'Consultation not found', 'NOT_FOUND')
  }
  const row = await prisma.prescription.create({
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
    include: { doctor: true, patient: true },
  })
  res.status(201).json(mapPrescription(row))
}))

router.patch('/prescriptions/:id', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  const row = await prisma.prescription.update({
    where: { id: req.params.id },
    data: {
      ...(req.body.diagnosis && { diagnosis: req.body.diagnosis }),
      ...(req.body.medicines && { medicines: req.body.medicines }),
      ...(req.body.advice != null && { advice: req.body.advice }),
    },
    include: { doctor: true, patient: true },
  })
  res.json(mapPrescription(row))
}))

router.patch('/prescriptions/:id/approve', roleMiddleware('doctor'), asyncHandler(async (req, res) => {
  const existing = await prisma.prescription.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.doctorId !== req.user.id) {
    throw new ApiError(404, 'Prescription not found', 'NOT_FOUND')
  }
  const row = await prisma.prescription.update({
    where: { id: req.params.id },
    data: { status: 'approved' },
    include: { doctor: true, patient: true },
  })
  res.json(mapPrescription(row))
}))

export default router
