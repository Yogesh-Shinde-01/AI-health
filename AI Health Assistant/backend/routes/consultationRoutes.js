import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as consultation from '../controllers/consultationController.js'

const router = Router()

router.use(authMiddleware)

router.post('/submit', roleMiddleware('patient'), asyncHandler(consultation.submit))
router.get('/patient/:patientId', roleMiddleware('patient'), asyncHandler(consultation.listByPatient))
router.get('/doctor/:doctorId', roleMiddleware('doctor'), asyncHandler(consultation.listByDoctor))
router.put('/:id/status', roleMiddleware('doctor'), asyncHandler(consultation.updateStatus))
router.get('/:id', asyncHandler(consultation.getById))

export default router
