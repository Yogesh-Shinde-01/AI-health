import { Apple, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UseFormRegisterReturn } from 'react-hook-form'
import FormField from '@/components/forms/FormField'
import { LoginValidationError } from '@/services/authService'

export const OTP_LENGTH = 6
export const OTP_RESEND_SECONDS = 30

export const emptyOtpDigits = () => Array.from({ length: OTP_LENGTH }, () => '')

export const formatOtpCountdown = (total: number) => {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const mapLoginValidationError = (error: unknown): string => {
  if (error instanceof LoginValidationError) {
    return error.message
  }
  return 'Unable to process request. Please check your details.'
}

export const OtpEntryFields = ({
  digits,
  onDigitsChange,
  otpError,
  inputRefs,
  disabled,
  idPrefix = 'login-otp',
}: {
  digits: string[]
  onDigitsChange: (next: string[]) => void
  otpError: string | null
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>
  disabled?: boolean
  idPrefix?: string
}) => {
  const { t } = useTranslation()

  const updateDigits = (next: string[]) => {
    const padded = [...next.slice(0, OTP_LENGTH)]
    while (padded.length < OTP_LENGTH) {
      padded.push('')
    }
    onDigitsChange(padded)
  }

  return (
    <FormField
      label={t('formLabels.otpCode')}
      htmlFor={`${idPrefix}-0`}
      required
      error={otpError ?? undefined}
    >
      <OtpDigitsRow
        digits={digits}
        updateDigits={updateDigits}
        inputRefs={inputRefs}
        disabled={disabled}
        idPrefix={idPrefix}
        t={t}
      />
    </FormField>
  )
}

function OtpDigitsRow({
  digits,
  updateDigits,
  inputRefs,
  disabled,
  idPrefix,
  t,
}: {
  digits: string[]
  updateDigits: (next: string[]) => void
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>
  disabled?: boolean
  idPrefix: string
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="flex justify-between gap-2" role="group" aria-label={t('formLabels.otpCode')}>
      {digits.map((digit, index) => (
        <OtpDigitInput
          key={index}
          digit={digit}
          index={index}
          digits={digits}
          updateDigits={updateDigits}
          inputRefs={inputRefs}
          disabled={disabled}
          idPrefix={idPrefix}
          t={t}
        />
      ))}
    </div>
  )
}

function OtpDigitInput({
  digit,
  index,
  digits,
  updateDigits,
  inputRefs,
  disabled,
  idPrefix,
  t,
}: {
  digit: string
  index: number
  digits: string[]
  updateDigits: (next: string[]) => void
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>
  disabled?: boolean
  idPrefix: string
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="flex-1">
      <label htmlFor={`${idPrefix}-${index}`} className="sr-only">
        {t('formLabels.otpDigit', { n: index + 1 })}
      </label>
      <input
        id={`${idPrefix}-${index}`}
        ref={(el) => {
          inputRefs.current[index] = el
        }}
        value={digit}
        maxLength={1}
        disabled={disabled}
        onChange={(event) => {
          const nextChar = event.target.value.replace(/\D/g, '').slice(-1)
          const copy = [...digits]
          copy[index] = nextChar
          updateDigits(copy)
          if (nextChar && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus()
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Backspace' && !digits[index] && index > 0) {
            const copy = [...digits]
            copy[index - 1] = ''
            updateDigits(copy)
            inputRefs.current[index - 1]?.focus()
          }
        }}
        onPaste={(event) => {
          const value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
          if (value) {
            updateDigits(value.split(''))
          }
        }}
        inputMode="numeric"
        placeholder={index === 0 ? t('otp.digitPlaceholder') : undefined}
        className="h-12 w-full rounded-app border border-border text-center text-xl font-semibold text-foreground outline-none transition placeholder:text-[#9CA3AF] focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
      />
    </div>
  )
}

export const PasswordInput = ({
  id,
  registerProps,
  show,
  onToggle,
  placeholder,
  autoComplete,
}: {
  id: string
  registerProps: UseFormRegisterReturn
  show: boolean
  onToggle: () => void
  placeholder: string
  autoComplete: 'new-password' | 'current-password'
}) => (
  <div className="password-field relative">
    <input
      id={id}
      {...registerProps}
      className="password-field-input input pr-11"
      type={show ? 'text' : 'password'}
      autoComplete={autoComplete}
      placeholder={placeholder}
    />
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="password-field-toggle absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}
    </button>
  </div>
)

export function SocialButtons({ showToast, t }: { showToast: (msg: string) => void; t: (key: string) => string }) {
  return (
    <>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-border" />
        <span>{t('login.continueWith')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-app border border-border bg-white font-medium shadow-card"
          onClick={() => showToast(t('login.socialSoon'))}
        >
          <span className="text-lg font-bold text-[#EA4335]">G</span>
          <span className="hidden sm:inline">{t('login.google')}</span>
        </button>
        <button
          type="button"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-app border border-border bg-white font-medium shadow-card"
          onClick={() => showToast(t('login.socialSoon'))}
        >
          <Apple size={18} className="text-foreground" />
          <span className="hidden sm:inline">{t('login.apple')}</span>
        </button>
      </div>
    </>
  )
}
