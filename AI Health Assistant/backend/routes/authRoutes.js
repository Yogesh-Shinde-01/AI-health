import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as auth from '../controllers/authController.js'

const router = Router()

router.post('/register/patient', asyncHandler(auth.registerPatient))
router.post('/register/doctor', asyncHandler(auth.registerDoctor))
router.post('/verify-otp', asyncHandler(auth.verifyOtp))
router.post('/login', asyncHandler(auth.login))
router.post('/verify-login-otp', asyncHandler(auth.verifyLoginOtp))
router.post('/resend-otp', asyncHandler(auth.resendOtp))
router.post('/forgot-password', asyncHandler(auth.forgotPassword))
router.post('/reset-password', asyncHandler(auth.resetPassword))

// Legacy frontend paths
router.post('/send-otp', asyncHandler(auth.sendOtpLegacy))
router.post('/login/verify', asyncHandler(auth.loginVerifyLegacy))
router.post('/login/resend-otp', asyncHandler(auth.resendOtp))

export default router
