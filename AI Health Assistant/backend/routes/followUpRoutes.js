import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { requirePatient } from '../middleware/roleMiddleware.js'
import { createFollowUp, listMyFollowUps } from '../controllers/followUpController.js'

const router = Router()

router.use(authMiddleware, requirePatient)

router.post('/', createFollowUp)
router.get('/me', listMyFollowUps)

export default router
