import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as prescription from '../controllers/prescriptionController.js'

const router = Router()

router.use(authMiddleware)

router.post('/create', roleMiddleware('doctor'), asyncHandler(prescription.create))
router.put('/:id/approve', roleMiddleware('doctor'), asyncHandler(prescription.approve))
router.get('/patient/:patientId', roleMiddleware('patient'), asyncHandler(prescription.listByPatient))
router.get('/consultation/:consultationId', roleMiddleware('doctor'), asyncHandler(prescription.getByConsultation))
router.get('/:id', asyncHandler(prescription.getById))

export default router
