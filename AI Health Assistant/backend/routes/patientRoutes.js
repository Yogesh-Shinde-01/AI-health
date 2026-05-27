import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as patient from '../controllers/patientController.js'

const router = Router()

router.use(authMiddleware, roleMiddleware('patient'))

router.get('/profile', asyncHandler(patient.getProfile))
router.put('/update-profile', asyncHandler(patient.updateProfile))
router.post('/upload-picture', upload.single('image'), asyncHandler(patient.uploadPicture))
router.get('/consultations', asyncHandler(patient.getConsultations))
router.get('/prescriptions', asyncHandler(patient.getPrescriptions))
router.get('/medical-history', asyncHandler(patient.getMedicalHistory))
router.put('/medical-history', asyncHandler(patient.updateMedicalHistory))

export default router
