import { env } from '../config/env.js'

/**
 * Mock SMS/email delivery — logs OTP in development.
 * Replace with Twilio, MSG91, SendGrid, etc. in production.
 */
export const sendOTP = async ({ phone, email, otp, channel = 'sms' }) => {
  const target = channel === 'email' && email ? email : phone
  if (env.DEV_LOG_OTP) {
    console.log(`[OTP] ${channel.toUpperCase()} → ${target}: ${otp}`)
  }
  return { success: true }
}
