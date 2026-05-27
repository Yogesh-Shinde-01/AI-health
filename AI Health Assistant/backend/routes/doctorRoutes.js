import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as doctor from '../controllers/doctorController.js'

const router = Router()

/** PUBLIC */
router.get('/list', asyncHandler(doctor.listDoctors))

router.use(authMiddleware, roleMiddleware('doctor'))

router.get('/profile', asyncHandler(doctor.getProfile))
router.put('/update-profile', asyncHandler(doctor.updateProfile))
router.post('/upload-picture', upload.single('image'), asyncHandler(doctor.uploadPicture))
router.put('/availability', asyncHandler(doctor.setAvailability))
router.get('/patients', asyncHandler(doctor.getPatients))
router.get('/consultations', asyncHandler(doctor.getConsultations))

export default router
