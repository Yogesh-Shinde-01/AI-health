import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { loginComplete, loginInitiate, loginResendOtp, type LoginUserRole } from '@/services/authService'
import { formatIndianPhone } from '@/utils/phone'
import { LoginValidationError } from '@/services/loginValidation'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import FormField from '@/components/forms/FormField'
import { useToast } from '@/components/feedback/Toast'
import { useAppDispatch } from '@/store'
import { setCredentials } from '@/store/slices/authSlice'
import { classNames, isPatientPendingRegistration, persistLastMobile, readRegisterDraft } from '@/utils'
import {
  OTP_RESEND_SECONDS,
  OtpEntryFields,
  PasswordInput,
  SocialButtons,
  emptyOtpDigits,
  formatOtpCountdown,
  mapLoginValidationError,
} from './authFlowShared'

const isNotVerifiedError = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  error.response?.status === 403 &&
  (error.response.data as { code?: string } | undefined)?.code === 'NOT_VERIFIED'

const mobileSchema = z.object({ mobile: z.string().regex(/^\d{10}$/) })
const emailSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

type LoginMethodTab = 'mobile' | 'email'

export const CredentialLoginForm = ({
  userRole,
  homePath,
}: {
  userRole: LoginUserRole
  homePath: string
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const draft = readRegisterDraft()
  const [method, setMethod] = useState<LoginMethodTab>('mobile')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [emailFormatError, setEmailFormatError] = useState<string | null>(null)
  const [digits, setDigits] = useState<string[]>(emptyOtpDigits)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const loginMethod = method === 'mobile' ? 'mobile_otp' : 'email_password_otp'
  const methodMobileLabel =
    userRole === 'doctor' ? t('login.doctorMethodMobile') : t('login.patientMethodMobile')
  const methodEmailLabel =
    userRole === 'doctor' ? t('login.doctorMethodEmail') : t('login.patientMethodEmail')
  const idPrefix = `${userRole}-login-otp`

  const mobileForm = useForm<{ mobile: string }>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: draft.mobile?.replace(/^\+91/, '') ?? '' },
  })

  const emailForm = useForm<{ email: string; password: string }>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: draft.email ?? '', password: '' },
  })

  useEffect(() => {
    setOtpSent(false)
    setDigits(emptyOtpDigits())
    setOtpError(null)
    setLoginError(null)
    setEmailFormatError(null)
    setResendSeconds(0)
  }, [method])

  useEffect(() => {
    if (resendSeconds <= 0) {
      return
    }
    const timer = window.setTimeout(() => setResendSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  const handleSendOtp = async () => {
    setLoginError(null)
    setOtpError(null)
    setEmailFormatError(null)

    if (method === 'mobile') {
      const valid = await mobileForm.trigger()
      if (!valid) {
        return
      }
      const { mobile } = mobileForm.getValues()
      const formatted = formatIndianPhone(mobile)
      if (!formatted) {
        setLoginError(t('login.unableToProcess'))
        return
      }
      setLoading(true)
      try {
        await loginInitiate({
          userRole,
          login_method: 'mobile_otp',
          mobile: formatted,
        })
        persistLastMobile(formatted)
        setOtpSent(true)
        setResendSeconds(OTP_RESEND_SECONDS)
        setDigits(emptyOtpDigits())
        showToast(t('login.otpSent'))
        window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus())
      } catch (error) {
        if (isNotVerifiedError(error)) {
          setLoginError(t('login.phoneNotVerified'))
        } else {
          setLoginError(mapLoginValidationError(error))
        }
      } finally {
        setLoading(false)
      }
      return
    }

    const valid = await emailForm.trigger()
    if (!valid) {
      return
    }
    const values = emailForm.getValues()
    setLoading(true)
    try {
      await loginInitiate({
        userRole,
        login_method: 'email_password_otp',
        email: values.email,
        password: values.password,
      })
      setOtpSent(true)
      setResendSeconds(OTP_RESEND_SECONDS)
      setDigits(emptyOtpDigits())
      showToast(t('login.otpSent'))
      window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus())
    } catch (error) {
      if (error instanceof LoginValidationError && error.code === 'INVALID_EMAIL') {
        setEmailFormatError(error.message)
      } else if (isNotVerifiedError(error)) {
        setLoginError(t('login.phoneNotVerified'))
      } else {
        setLoginError(mapLoginValidationError(error))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyLogin = async () => {
    setOtpError(null)
    setLoginError(null)
    const otp = digits.join('')
    if (!otp.trim()) {
      setOtpError(t('otp.required'))
      return
    }
    if (otp.length !== 6) {
      setOtpError(t('otp.invalid'))
      return
    }

    setLoading(true)
    try {
      const response = await loginComplete({
        userRole,
        login_method: loginMethod,
        otp,
      })
      if (response.isNewUser || (userRole === 'patient' && isPatientPendingRegistration())) {
        setLoginError(t('login.unableToProcess'))
        return
      }
      dispatch(setCredentials({ user: response.user, token: response.token }))
      navigate(homePath, { replace: true })
    } catch (error) {
      setOtpError(mapLoginValidationError(error))
      setDigits(emptyOtpDigits())
      otpInputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || !otpSent) {
      return
    }
    setLoading(true)
    try {
      await loginResendOtp({ userRole, login_method: loginMethod })
      setResendSeconds(OTP_RESEND_SECONDS)
      setOtpError(null)
      setDigits(emptyOtpDigits())
      showToast(t('login.otpSent'))
    } catch (error) {
      setOtpError(mapLoginValidationError(error))
    } finally {
      setLoading(false)
    }
  }

  const switchMethod = (next: LoginMethodTab) => {
    setMethod(next)
    setLoginError(null)
    setEmailFormatError(null)
  }

  return (
    <>
      <div className="flex rounded-app border border-border bg-slate-50 p-1">
        <button
          type="button"
          className={classNames(
            'flex-1 rounded-app py-2 text-xs font-semibold sm:text-sm',
            method === 'mobile' ? 'bg-white shadow-card' : 'text-muted',
          )}
          onClick={() => switchMethod('mobile')}
        >
          {methodMobileLabel}
        </button>
        <button
          type="button"
          className={classNames(
            'flex-1 rounded-app py-2 text-xs font-semibold sm:text-sm',
            method === 'email' ? 'bg-white shadow-card' : 'text-muted',
          )}
          onClick={() => switchMethod('email')}
        >
          {methodEmailLabel}
        </button>
      </div>

      {method === 'mobile' ? (
        <FormField
          label={t('formLabels.phoneNumber')}
          htmlFor={`auth-login-${userRole}-mobile`}
          required
          error={
            mobileForm.formState.errors.mobile ? t('login.invalidMobile') : loginError ?? undefined
          }
        >
          <div className={`flex h-11 w-full items-stretch overflow-hidden rounded-app border bg-white text-sm transition-all duration-200 focus-within:[box-shadow:0_0_0_3px_rgba(26,115,232,0.14)] focus-within:border-[#1A73E8] ${loading || otpSent ? 'border-[#E5E7EB] opacity-60' : 'border-[#E5E7EB]'}`}>
            <span className="flex select-none items-center border-r border-[#E5E7EB] bg-slate-50 px-3 font-medium text-muted">+91</span>
            <input
              id={`auth-login-${userRole}-mobile`}
              {...mobileForm.register('mobile')}
              maxLength={10}
              className="flex-1 bg-transparent px-3 text-foreground outline-none placeholder:text-[#9CA3AF]"
              inputMode="numeric"
              placeholder="10-digit number"
              disabled={loading || otpSent}
            />
          </div>
        </FormField>
      ) : (
        <>
          <FormField
            label={t('formLabels.email')}
            htmlFor={`auth-login-${userRole}-email`}
            required
            error={
              emailFormatError ??
              (emailForm.formState.errors.email ? t('login.invalidEmailFormat') : undefined) ??
              (loginError && !otpSent ? loginError : undefined)
            }
          >
            <input
              id={`auth-login-${userRole}-email`}
              {...emailForm.register('email')}
              className="input"
              type="email"
              autoComplete="email"
              placeholder={t('formLabels.emailPh')}
              disabled={loading || otpSent}
            />
          </FormField>
          <FormField
            label={t('formLabels.password')}
            htmlFor={`auth-login-${userRole}-password`}
            required
            error={
              emailForm.formState.errors.password
                ? t('validation.password')
                : loginError && !otpSent && !emailFormatError
                  ? loginError
                  : undefined
            }
          >
            <PasswordInput
              id={`auth-login-${userRole}-password`}
              registerProps={emailForm.register('password')}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              placeholder={t('formLabels.passwordPh')}
              autoComplete="current-password"
            />
          </FormField>
        </>
      )}

      {method === 'email' && !otpSent ? (
        <button
          type="button"
          className="text-sm font-medium text-primary"
          onClick={() => showToast(t('auth.forgotPasswordSoon'))}
        >
          {t('auth.forgotPassword')}
        </button>
      ) : null}

      {otpSent ? (
        <>
          <OtpEntryFields
            digits={digits}
            onDigitsChange={(next) => {
              setOtpError(null)
              setDigits(next)
            }}
            otpError={otpError}
            inputRefs={otpInputRefs}
            disabled={loading}
            idPrefix={idPrefix}
          />
          <div className="text-center text-sm text-muted">
            {resendSeconds > 0 ? (
              <span>{t('otp.resendIn', { time: formatOtpCountdown(resendSeconds) })}</span>
            ) : (
              <button
                type="button"
                className="font-semibold text-primary disabled:opacity-50"
                disabled={loading}
                onClick={() => void handleResendOtp()}
              >
                {t('otp.resend')}
              </button>
            )}
          </div>
        </>
      ) : null}

      <button
        type="button"
        className="btn-primary"
        disabled={loading}
        onClick={() => void (otpSent ? handleVerifyLogin() : handleSendOtp())}
      >
        {loading ? (
          <LoadingSpinner size={20} />
        ) : otpSent ? (
          t('login.verifyOtpLogin')
        ) : (
          t('login.sendOtp').trim()
        )}
      </button>

      <SocialButtons showToast={showToast} t={t} />
    </>
  )
}
