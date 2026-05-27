export class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export const LOGIN_ERRORS = {
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  OTP_LOCKOUT: 'Too many attempts. Login locked for 15 minutes.',
  PASSWORD_LOCKOUT: 'Too many failed attempts. Account locked for 30 minutes.',
  NOT_FOUND: 'Unable to process request. Please check your details.',
  wrongOtp: (remaining) => `Invalid OTP. ${remaining} attempts remaining.`,
}
