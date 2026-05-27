import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Apple,
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Globe,
  Headphones,
  Heart,
  LogOut,
  Mic,
  Pencil,
  Pill,
  Plus,
  Search,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react'
import DoctorSelectDropdown from '@/components/ui/DoctorSelectDropdown'
import CaseStatusBadge from '@/components/ui/CaseStatusBadge'
import { useFieldArray, useForm } from 'react-hook-form'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { sendOtp, verifyOtp } from '@/services/authService'
import { finalizeDoctorRegistrationData, finalizePatientRegistrationData } from '@/pages/auth/authFlow'
import RegistrationSuccessModal from '@/components/ui/RegistrationSuccessModal'
import {
  getConsultation,
  getConsultations,
  submitConsultation,
  updateConsultationCaseStatus,
} from '@/services/consultationsService'
import { bookFollowUp } from '@/services/followUpsService'
import { getDoctorProfile, getDoctors, updateDoctorProfile } from '@/services/doctorsService'
import { getProfile, updateMedicalHistory, updateProfile } from '@/services/patientsService'
import { analyzeSymptoms, fetchNextQuestion, runFinalAnalysis } from '@/services/aiService'
import {
  approvePrescription,
  createPrescription,
  downloadPdf,
  getPrescription,
  getPrescriptions,
  updatePrescription,
} from '@/services/prescriptionsService'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import RiskBadge from '@/components/ui/RiskBadge'
import { useToast } from '@/components/feedback/Toast'
import { AnswerChip } from '@/components/ui/AnswerChip'
import FormField from '@/components/forms/FormField'
import MedicalHistoryForm from '@/components/forms/MedicalHistoryForm'
import MedicineRow from '@/components/forms/MedicineRow'
import Layout from '@/layouts/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/hooks/useLanguage'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useAppDispatch, useAppSelector } from '@/store'
import { logout, setCredentials, setRole } from '@/store/slices/authSlice'
import { useOnboardingStore } from '@/store/slices/onboardingStore'
import {
  hydrateFromConsultation,
  resetConsultation,
  setAiAnalysis,
  setDynamicAnswer,
  syncDynamicQaToAnswers,
  setAiQuestions,
  setRiskLevel,
  setSymptomQuestionData,
  setSymptoms,
} from '@/store/slices/consultationSlice'
import { setProfile, setMedicalHistory } from '@/store/slices/patientSlice'
import type {
  BloodGroup,
  ChillsAnswer,
  Consultation,
  FeverAnswer,
  FeverDuration,
  FollowUpPayload,
  MedicalHistory,
  Patient,
  Prescription,
  PrescriptionFormValues,
  TemperatureBand,
} from '@/types'
import { computeRiskFromSymptomData } from '@/types'
import {
  buildAiSummary,
  classNames,
  clearDoctorSession,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getActivePrescriptionId,
  getNowIso,
  isDocProfileComplete,
  isMobileRegistered,
  isDoctorPendingPractice,
  isPatientAwaitingOtp,
  isPatientPendingRegistration,
  persistLastMobile,
  readLastMobile,
  readRegisterDraft,
  readStorage,
  removeStorage,
  clearPatientRegistrationFlow,
  isOtpExpired,
  markOtpSent,
  languageOptions,
  maskMobile,
  readDoctorProfile,
  readPatientExtendedProfile,
  registerMobile,
  setActivePrescriptionId,
  setDocProfileComplete,
  setOtpVerified,
  storageKeys,
  writeDoctorProfile,
  writePatientExtendedProfile,
} from '@/utils'
import type { DoctorProfileRecord, PatientExtendedProfile } from '@/utils'
import {
  getSymptomTagsForDisplay,
  recommendSpecialization,
} from '@/utils/doctors'
import { getDoctorsBySpecialization } from '@/services/doctorsService'
import { getUnreadCount, notifyPatientNeedMoreInfo } from '@/utils/notifications'
import type { MatchedDoctor } from '@/types/doctors'

const Header = ({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  subtitle?: string
}) => (
  <div className="mb-6 flex items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="rounded-full border border-border p-2">
          <ArrowLeft size={18} />
        </button>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
    </div>
    {right}
  </div>
)

const EmptyState = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center text-muted">
    {icon}
    <p>{text}</p>
  </div>
)

const profileSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().min(1).max(120),
  gender: z.string().refine((value) => value === 'MALE' || value === 'FEMALE' || value === 'OTHER'),
  heightCm: z.coerce.number().min(50).max(250),
  weightKg: z.coerce.number().min(10).max(250),
  bloodGroup: z.string().refine((value) => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(value)),
})

export const LanguagePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectedLanguage, setLanguage } = useLanguage()
  const { watch, setValue, handleSubmit } = useForm<{ language: string }>({
    defaultValues: { language: selectedLanguage || 'mr' },
  })
  const language = watch('language')

  return (
    <Layout hideNav>
      <div className="page-padding flex min-h-screen flex-col bg-background">
        <div className="flex flex-col items-center pt-4">
          <div className="mb-4 text-primary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-center text-2xl font-semibold text-foreground">{t('language.title')}</h1>
          <p className="mt-2 text-center text-sm text-muted">{t('language.subtitle')}</p>
        </div>

        <form
          onSubmit={handleSubmit((values) => {
            setLanguage(values.language)
            navigate('/welcome')
          })}
          className="mt-6 flex flex-1 flex-col"
        >
          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            {languageOptions.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setValue('language', item.code)}
                className={classNames(
                  'flex w-full items-center justify-between rounded-card border px-4 py-4 text-left transition',
                  language === item.code ? 'border-primary bg-primary/5' : 'border-border bg-white shadow-card',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={classNames(
                      'flex h-5 w-5 items-center justify-center rounded-full border-2',
                      language === item.code ? 'border-primary' : 'border-border',
                    )}
                  >
                    {language === item.code ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <span className="text-sm text-muted">{item.nativeLabel}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-4 bg-background pt-2">
            <button type="submit" className="btn-primary" disabled={!language}>
              {t('language.continue')}
            </button>
            <div className="pb-4 text-center">
              <button type="button" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                {t('language.support')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  )
}

const WelcomeHeartIcon = () => (
  <svg
    className="animate-pulse-heart drop-shadow-md"
    width="88"
    height="88"
    viewBox="0 0 100 100"
    aria-hidden
  >
    <path
      fill="#EA4335"
      d="M50 88c-1.2 0-2.4-.4-3.4-1.1C18.2 64.8 8 52.1 8 36.5 8 23.8 17.8 14 30.5 14c6.8 0 13.2 3.2 17.3 8.6C51.9 17.2 58.3 14 65.1 14 77.8 14 87.6 23.8 87.6 36.5c0 15.6-10.2 28.3-38.6 50.4-1 0.7-2.2 1.1-3.4 1.1z"
    />
    <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round">
      <line x1="50" y1="38" x2="50" y2="62" />
      <line x1="38" y1="50" x2="62" y2="50" />
    </g>
  </svg>
)

export const WelcomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Layout hideNav>
      <div className="page-padding flex min-h-screen flex-col items-center bg-background text-center">
        <div className="mt-6 w-full rounded-[28px] bg-gradient-to-br from-[#EBF3FF] via-[#EEF4FF] to-[#F0F7FF] py-8 shadow-[0_4px_24px_rgba(26,115,232,0.10)]">
          <div className="flex justify-center">
            <WelcomeHeartIcon />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-primary">{t('welcome.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('welcome.tagline')}</p>
        </div>

        <ul className="mt-6 w-full max-w-sm space-y-2.5 text-left">
          {[t('welcome.features.ai'), t('welcome.features.voice'), t('welcome.features.doctor'), t('welcome.features.secure')].map(
            (label) => (
              <li key={label} className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white px-4 py-3 shadow-sm transition-all hover:border-primary/20 hover:shadow">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle size={16} strokeWidth={2.5} />
                </div>
                <span className="font-medium text-foreground">{label}</span>
              </li>
            ),
          )}
        </ul>

        <div className="mt-auto w-full max-w-sm space-y-3 pt-8">
          <button type="button" className="btn-primary" onClick={() => navigate('/role-selection')}>
            {t('welcome.getStarted')}
          </button>
          <div className="flex justify-center gap-4 pb-4 text-xs text-muted">
            <button type="button">{t('welcome.terms')}</button>
            <button type="button">{t('welcome.privacy')}</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export const OtpPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const userRole = useOnboardingStore((s) => s.userRole)
  const isDoctor = userRole === 'doctor'
  const [digits, setDigits] = useState<string[]>(Array.from({ length: 6 }, () => ''))
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpVerifiedSuccess, setOtpVerifiedSuccess] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const mobile = readLastMobile()

  const formatCountdown = (total: number) => {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  useEffect(() => {
    const resolved = mobile || readRegisterDraft().mobile || ''
    if (!resolved) {
      navigate('/auth', { replace: true })
      return
    }
    if (!mobile && resolved) {
      persistLastMobile(resolved)
    }
  }, [mobile, navigate])

  useEffect(() => {
    if (seconds <= 0) {
      return
    }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  const otp = digits.join('')

  const updateDigits = (next: string[]) => {
    const padded = [...next.slice(0, 6)]
    while (padded.length < 6) {
      padded.push('')
    }
    setDigits(padded)
  }

  const handleVerify = async () => {
    setOtpError(null)
    if (!otp.trim()) {
      setOtpError(t('otp.required'))
      return
    }
    if (otp.length !== 6) {
      setOtpError(t('otp.invalid'))
      return
    }
    if (isOtpExpired()) {
      setOtpError(t('otp.expired'))
      return
    }
    setLoading(true)
    try {
      const response = await verifyOtp(mobile, otp, userRole)
      const isDoctorRegistrationFlow = isDoctor && (response.isNewUser || isDoctorPendingPractice())

      if (isDoctorRegistrationFlow) {
        setOtpVerifiedSuccess(true)
        finalizeDoctorRegistrationData(mobile, dispatch)
        window.setTimeout(() => {
          navigate('/doctor-register', { replace: true, state: { showRegistrationSuccess: true } })
        }, 900)
        return
      }

      const isPatientRegistrationFlow =
        !isDoctor &&
        (isPatientPendingRegistration() || isPatientAwaitingOtp() || response.isNewUser)

      if (isPatientRegistrationFlow) {
        setOtpVerifiedSuccess(true)
        finalizePatientRegistrationData(mobile, dispatch)
        if (response.token && response.user) {
          dispatch(setCredentials({ user: response.user, token: response.token }))
          const savedProfile = readStorage<Partial<Patient> | null>(storageKeys.profile, null)
          const savedHistory = readStorage<MedicalHistory | null>(storageKeys.medicalHistory, null)
          if (savedProfile) {
            try {
              const updated = await updateProfile(savedProfile)
              dispatch(setProfile(updated))
            } catch {}
          }
          if (savedHistory) { try { await updateMedicalHistory(savedHistory) } catch {} }
        }
        removeStorage(storageKeys.registerDraft)
        clearPatientRegistrationFlow()
        window.setTimeout(() => {
          navigate('/patient-register', { replace: true, state: { showRegistrationSuccess: true } })
        }, 900)
        return
      }
      dispatch(setCredentials({ user: response.user, token: response.token }))
      const isDoctorUser = response.user.role === 'DOCTOR' || isDoctor
      if (isDoctorUser) {
        if (!isDocProfileComplete()) {
          navigate('/doctor-register', { replace: true })
          return
        }
        navigate('/doctor-dashboard', { replace: true })
        return
      }
      // Fetch patient profile from backend after login so profile page shows real data
      try {
        const fetchedProfile = await getProfile()
        dispatch(setProfile(fetchedProfile))
      } catch {}
      navigate('/home', { replace: true })
    } catch {
      setOtpError(t('otp.wrong'))
      updateDigits(Array.from({ length: 6 }, () => ''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout hideNav>
      <div className="page-padding min-h-screen bg-background">
        <Header
          title={otpVerifiedSuccess ? t('otp.verifiedTitle') : t('otp.title')}
          subtitle={
            otpVerifiedSuccess
              ? t('otp.verifiedSubtitle')
              : `${t('otp.subtitle')} ${maskMobile(mobile)}`
          }
          onBack={() => {
            if (isDoctor && isDoctorPendingPractice()) {
              navigate('/doctor-register', { replace: true })
              return
            }
            if (!isDoctor && (isPatientPendingRegistration() || isPatientAwaitingOtp())) {
              navigate('/patient-register', { replace: true })
              return
            }
            navigate(isDoctor ? '/login' : '/auth', { replace: true })
          }}
          right={
            <span
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                isDoctor ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success',
              )}
            >
              {isDoctor ? <Stethoscope size={14} /> : <UserRound size={14} />}
              {isDoctor ? t('auth.badgeDoctor') : t('auth.badgePatient')}
            </span>
          }
        />

        <FormField
          label={t('formLabels.otpCode')}
          htmlFor="otp-digit-0"
          required
          className="mb-4"
          error={otpError ?? undefined}
        >
          <div className="flex justify-between gap-2" role="group" aria-label={t('formLabels.otpCode')}>
            {digits.map((digit, index) => (
              <div key={index} className="flex-1">
                <label htmlFor={`otp-digit-${index}`} className="sr-only">
                  {t('formLabels.otpDigit', { n: index + 1 })}
                </label>
                <input
                  id={`otp-digit-${index}`}
                  name={`otp-digit-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  value={digit}
                  maxLength={1}
                  onChange={(event) => {
                    setOtpError(null)
                    const nextChar = event.target.value.replace(/\D/g, '').slice(-1)
                    const copy = [...digits]
                    copy[index] = nextChar
                    updateDigits(copy)
                    if (nextChar && index < 5) {
                      inputRefs.current[index + 1]?.focus()
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace') {
                      if (!digits[index] && index > 0) {
                        const copy = [...digits]
                        copy[index - 1] = ''
                        updateDigits(copy)
                        inputRefs.current[index - 1]?.focus()
                      }
                    }
                  }}
                  onPaste={(event) => {
                    const value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                    if (value) {
                      updateDigits(value.split(''))
                    }
                  }}
                  inputMode="numeric"
                  placeholder={index === 0 ? t('otp.digitPlaceholder') : undefined}
                  className="otp-digit h-14 w-full rounded-2xl border-2 border-border bg-white text-center text-2xl font-bold text-foreground shadow-sm outline-none transition-all duration-200 placeholder:text-[#D1D5DB] focus:border-primary focus:shadow-[0_0_0_4px_rgba(26,115,232,0.12)] focus:ring-0"
                  style={{ letterSpacing: digit ? '0.1em' : 0 }}
                />
              </div>
            ))}
          </div>
        </FormField>

        <div className="mb-6 text-center text-sm text-muted">
          {seconds > 0 ? (
            <span>{t('otp.resendIn', { time: formatCountdown(seconds) })}</span>
          ) : (
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={async () => {
                setOtpError(null)
                setSeconds(30)
                markOtpSent()
                await sendOtp(mobile, userRole)
                showToast(t('login.otpSent'))
              }}
            >
              {t('otp.resend')}
            </button>
          )}
        </div>

        {otpVerifiedSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle className="text-success" size={48} />
            <p className="text-sm font-medium text-foreground">{t('otp.verifiedSubtitle')}</p>
            <LoadingSpinner size={24} />
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={handleVerify}
          >
            {loading ? <LoadingSpinner size={20} /> : t('otp.next')}
          </button>
        )}
      </div>
    </Layout>
  )
}

export const PatientProfilePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const profile = useAppSelector((state) => state.patient.profile)
  const mobile = readLastMobile()
  const registerName =
    typeof window !== 'undefined' ? window.sessionStorage.getItem('ai-health-register-name') ?? '' : ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? registerName,
      age: profile?.age ?? undefined,
      gender: (profile?.gender ?? '') as '' | 'MALE' | 'FEMALE' | 'OTHER',
      heightCm: profile?.heightCm ?? undefined,
      weightKg: profile?.weightKg ?? undefined,
      bloodGroup: (profile?.bloodGroup ?? '') as '' | BloodGroup,
    },
  })

  return (
    <Layout>
      <div className="page-padding bg-background">
        <Header title={t('profile.title')} subtitle={t('profile.subtitle')} />

        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            setLoading(true)
            try {
              const nextProfile = await updateProfile({
                ...values,
                gender: values.gender as 'MALE' | 'FEMALE' | 'OTHER',
                bloodGroup: values.bloodGroup as BloodGroup,
              })
              dispatch(setProfile(nextProfile))
              showToast(t('toast.profileUpdated'))
              navigate('/medical-history')
            } finally {
              setLoading(false)
            }
          })}
        >
          <FormField
            label={t('formLabels.fullName')}
            htmlFor="onboard-profile-fullName"
            required
            error={errors.fullName ? t('validation.fullName') : undefined}
          >
            <input
              id="onboard-profile-fullName"
              {...register('fullName')}
              className={classNames('input', errors.fullName && 'input-error')}
              placeholder={t('formLabels.fullNamePh')}
            />
          </FormField>

          <div className="flex gap-2.5">
            <div className="form-group flex-1">
              <label htmlFor="onboard-profile-age" className="form-label">
                {t('formLabels.age')} <span className="text-danger">*</span>
              </label>
              <input
                id="onboard-profile-age"
                {...register('age')}
                type="number"
                min={0}
                max={120}
                className={classNames('input', errors.age && 'input-error')}
                placeholder={t('formLabels.agePh')}
              />
              {errors.age ? <p className="mt-1 text-xs text-danger">{t('validation.age')}</p> : null}
            </div>
            <div className="form-group flex-1">
              <label htmlFor="onboard-profile-gender" className="form-label">
                {t('formLabels.gender')} <span className="text-danger">*</span>
              </label>
              <select id="onboard-profile-gender" {...register('gender')} className={classNames('input', errors.gender && 'input-error')} defaultValue="">
                <option value="" disabled>{t('formLabels.genderPh')}</option>
                <option value="MALE">{t('profile.male')}</option>
                <option value="FEMALE">{t('profile.female')}</option>
                <option value="OTHER">{t('profile.other')}</option>
              </select>
              {errors.gender ? <p className="mt-1 text-xs text-danger">{t('validation.gender')}</p> : null}
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="form-group flex-1">
              <label htmlFor="onboard-profile-height" className="form-label">{t('formLabels.height')}</label>
              <input
                id="onboard-profile-height"
                {...register('heightCm')}
                type="number"
                min={50}
                max={250}
                className="input"
                placeholder={t('formLabels.heightPh')}
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="onboard-profile-weight" className="form-label">{t('formLabels.weight')}</label>
              <input
                id="onboard-profile-weight"
                {...register('weightKg')}
                type="number"
                min={1}
                max={300}
                className="input"
                placeholder={t('formLabels.weightPh')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="onboard-profile-bloodGroup" className="form-label">{t('formLabels.bloodGroup')}</label>
            <select id="onboard-profile-bloodGroup" {...register('bloodGroup')} className={classNames('input', errors.bloodGroup && 'input-error')} defaultValue="">
              <option value="" disabled>{t('formLabels.bloodGroupPh')}</option>
              {(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            {errors.bloodGroup ? <p className="mt-1 text-xs text-danger">{t('validation.bloodGroup')}</p> : null}
          </div>

          <div>
            <label htmlFor="onboard-profile-mobile" className="form-label">{t('formLabels.phoneNumber')}</label>
            <input id="onboard-profile-mobile" name="mobile" className="input input-readonly" value={mobile} readOnly />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <LoadingSpinner size={20} /> : t('profile.next')}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export const MedicalHistoryPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const storedHistory = useAppSelector((state) => state.patient.medicalHistory)
  const [loading, setLoading] = useState(false)

  return (
    <Layout>
      <div className="page-padding bg-background">
        <Header title={t('medicalHistory.title')} subtitle={t('medicalHistory.subtitle')} />
        <MedicalHistoryForm
          initial={storedHistory}
          submitLabel={loading ? t('common.loading') : `${t('common.next')} →`}
          loading={loading}
          onSubmit={async (payload) => {
            setLoading(true)
            try {
              const saved = await updateMedicalHistory(payload)
              dispatch(setMedicalHistory(saved))
              showToast(t('toast.historyUpdated'))
              navigate('/home')
            } finally {
              setLoading(false)
            }
          }}
        />
      </div>
    </Layout>
  )
}

export const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const profile = useAppSelector((state) => state.patient.profile)

  useEffect(() => {
    if (user?.role === 'DOCTOR') {
      navigate('/doctor-dashboard', { replace: true })
    }
  }, [navigate, user?.role])

  const quickActions = [
    { icon: Clock3, label: t('home.history'), to: '/history' },
    { icon: FileText, label: t('home.prescriptions'), to: '/history' },
    { icon: Search, label: t('home.findDoctor') },
    { icon: Heart, label: t('home.healthTips') },
    { icon: AlertTriangle, label: t('home.emergency') },
    { icon: Headphones, label: t('home.support') },
  ]

  const firstName = profile?.fullName?.split(' ')[0] ?? 'User'
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    setNotificationCount(getUnreadCount('PATIENT'))
  }, [])

  return (
    <Layout>
      <div className="space-y-5 bg-background pb-6">
        {/* Gradient hero banner */}
        <div className="rounded-b-[32px] bg-gradient-to-br from-primary to-[#0D47A1] px-5 pb-8 pt-6 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Heart size={22} fill="white" className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{t('home.greeting', { name: firstName })}</h1>
                <p className="text-sm text-white/70">{t('home.subtitle')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNotificationCount(0)
                navigate('/notifications')
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all active:scale-[0.94]"
              aria-label={t('notifications.title')}
            >
              <Bell size={22} strokeWidth={1.5} />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              ) : null}
            </button>
          </div>

          {/* Mic button inside hero */}
          <div className="mt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => navigate('/symptoms')}
              className="pulse-ring relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-primary shadow-[0_8px_32px_rgba(255,255,255,0.3)] transition-all active:scale-[0.96]"
              aria-label={t('home.tapToSpeak')}
            >
              <Mic size={36} strokeWidth={2} />
            </button>
            <p className="mt-3 text-sm font-semibold text-white/90">{t('home.tapToSpeak')}</p>
          </div>
        </div>

        <div className="page-padding pt-0">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    item.to
                      ? navigate(item.to)
                      : item.label === t('home.emergency')
                        ? window.alert(t('home.emergencyAlert'))
                        : window.alert(item.label)
                  }
                  className="card flex min-h-[100px] flex-col items-start justify-between p-4 text-left transition-all duration-200 hover:shadow-card-hover active:scale-[0.98]"
                >
                  <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 text-primary">
                    <Icon size={22} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}

const VoiceWaveform = () => (
  <div className="flex h-14 items-end justify-center gap-1.5" aria-hidden>
    {Array.from({ length: 9 }).map((_, index) => (
      <span
        key={index}
        className="w-1.5 origin-bottom rounded-full bg-primary/80 animate-wave-bar"
        style={{ height: `${40 + (index % 5) * 12}%`, animationDelay: `${index * 0.08}s` }}
      />
    ))}
  </div>
)

function feverAnswerLabel(key: FeverAnswer, t: TFunction): string {
  const index = key === 'yes' ? 0 : key === 'no' ? 1 : 2
  return t(`aiQuestions.mock.fever.options.${index}`)
}

function temperatureLabel(key: TemperatureBand, t: TFunction): string {
  const order: TemperatureBand[] = ['normal', 'low', 'mild', 'high', 'very_high']
  const index = order.indexOf(key)
  return t(`aiQuestions.mock.temperature.options.${index}`)
}

function feverDurationLabel(key: FeverDuration, t: TFunction): string {
  const order: FeverDuration[] = ['today', '1-2days', '3-5days', 'more']
  const index = order.indexOf(key)
  return t(`aiQuestions.mock.duration.options.${index}`)
}

function chillsAnswerLabel(key: ChillsAnswer, t: TFunction): string {
  if (key === 'yes') {
    return t('common.yes')
  }
  if (key === 'no') {
    return t('common.no')
  }
  return t('common.notSure')
}

function structuredSymptomsForDoctorReview(c: Consultation, t: TFunction): string[] | null {
  const a = c.aiAnswers ?? {}
  const hasAny = Boolean(a.hasFever || a.temperature || a.feverDuration || a.hasChills)
  if (!hasAny) {
    return null
  }
  const lines: string[] = []
  if (a.hasFever === 'yes' || a.hasFever === 'no' || a.hasFever === 'not_sure') {
    lines.push(`${t('doctorReview.labels.fever')}: ${feverAnswerLabel(a.hasFever as FeverAnswer, t)}`)
  }
  if (a.temperature === 'normal' || a.temperature === 'low' || a.temperature === 'mild' || a.temperature === 'high' || a.temperature === 'very_high') {
    lines.push(`${t('doctorReview.labels.temperature')}: ${temperatureLabel(a.temperature as TemperatureBand, t)}`)
  }
  if (a.feverDuration === 'today' || a.feverDuration === '1-2days' || a.feverDuration === '3-5days' || a.feverDuration === 'more') {
    lines.push(`${t('doctorReview.labels.duration')}: ${feverDurationLabel(a.feverDuration as FeverDuration, t)}`)
  }
  if (a.hasChills === 'yes' || a.hasChills === 'no' || a.hasChills === 'not_sure') {
    lines.push(`${t('doctorReview.labels.chills')}: ${chillsAnswerLabel(a.hasChills as ChillsAnswer, t)}`)
  }
  if (c.additionalNotes?.trim()) {
    lines.push(`${t('doctorReview.labels.additionalNotes')}: ${c.additionalNotes.trim()}`)
  }
  return lines
}

export const SymptomsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'voice' | 'type'>('voice')
  const [recordSeconds, setRecordSeconds] = useState(0)
  const { transcript, isListening, startListening, stopListening, isSupported, error } = useVoiceInput()
  const maxChars = 2000
  const { register, handleSubmit, watch, setValue } = useForm<{ text: string }>({
    defaultValues: { text: '' },
  })
  const textValue = watch('text')

  useEffect(() => {
    dispatch(resetConsultation())
  }, [dispatch])

  useEffect(() => {
    if (!isListening) {
      return
    }
    setRecordSeconds(0)
    const id = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [isListening])

  useEffect(() => {
    if (transcript) {
      setValue('text', transcript)
    }
  }, [setValue, transcript])

  const formatRec = (total: number) => {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const [analyzing, setAnalyzing] = useState(false)

  const goNext = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    dispatch(setSymptoms(trimmed))
    setAnalyzing(true)
    try {
      const result = await analyzeSymptoms(trimmed)
      if (result.isEmergency) {
        dispatch(
          setAiAnalysis({
            isEmergency: true,
            detectedSymptom: result.detectedSymptom,
            bodySystem: result.bodySystem,
            disease: result.disease,
            aiSpecialization: result.specialization,
            riskLevel: result.riskLevel,
            confidence: result.confidence,
            questions: [],
            aiAdvice: result.advice,
            emergencyMessage: result.emergencyMessage,
          }),
        )
        navigate('/ai-questions')
        return
      }

      const first = await fetchNextQuestion(trimmed, [])
      if (first.done === false && first.question) {
        dispatch(
          setAiAnalysis({
            isEmergency: false,
            detectedSymptom: result.detectedSymptom,
            bodySystem: result.bodySystem,
            disease: result.disease,
            aiSpecialization: result.specialization,
            riskLevel: result.riskLevel,
            confidence: result.confidence,
            questions: [first.question],
            aiAdvice: result.advice,
            emergencyMessage: result.emergencyMessage,
          }),
        )
        navigate('/ai-questions')
        return
      }

      dispatch(
        setAiAnalysis({
          isEmergency: false,
          detectedSymptom: result.detectedSymptom,
          bodySystem: result.bodySystem,
          disease: result.disease,
          aiSpecialization: result.specialization,
          riskLevel: result.riskLevel,
          confidence: result.confidence,
          questions: [],
          aiAdvice: result.advice,
          emergencyMessage: result.emergencyMessage,
        }),
      )
      showToast(t('symptoms.questionGenFailed') || 'Could not generate follow-up questions. Please try again.')
      navigate('/ai-questions')
    } catch {
      showToast(t('symptoms.analyzeFailed') || 'Symptom analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Layout>
      <div className="page-padding space-y-5 bg-background">
        <Header title={t('symptoms.title')} onBack={() => navigate(-1)} />

        <div className="grid grid-cols-2 rounded-card border border-border bg-white p-1 shadow-card">
          <button
            type="button"
            onClick={() => setTab('voice')}
            className={classNames(
              'rounded-app py-2.5 text-sm font-semibold transition',
              tab === 'voice' ? 'bg-primary text-white' : 'text-muted',
            )}
          >
            {t('forms.voiceInput')}
          </button>
          <button
            type="button"
            onClick={() => setTab('type')}
            className={classNames(
              'rounded-app py-2.5 text-sm font-semibold transition',
              tab === 'type' ? 'bg-primary text-white' : 'text-muted',
            )}
          >
            {t('forms.typeInput')}
          </button>
        </div>

        {tab === 'voice' ? (
          <div className="card space-y-5 p-5">
            <VoiceWaveform />
            <div className="text-center text-sm text-muted">{formatRec(recordSeconds)}</div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primaryDark text-white shadow-card"
              >
                <Mic size={36} />
              </button>
              <p className="text-sm text-muted">{t('home.tapHint')}</p>
              {!isSupported || error ? <p className="text-center text-sm text-danger">{error}</p> : null}
            </div>
            <div className="min-h-[80px] rounded-app border border-border bg-white p-3 text-sm text-foreground">
              {textValue || t('forms.transcriptPlaceholder')}
            </div>
          </div>
        ) : (
          <div className="form-group card space-y-3 p-5">
            <label htmlFor="symptoms-text" className="form-label">
              {t('formLabels.symptoms')} <span className="text-danger">*</span>
            </label>
            <textarea
              id="symptoms-text"
              {...register('text')}
              className="textarea min-h-[160px]"
              maxLength={maxChars}
              rows={5}
              placeholder={t('formLabels.symptomsPh')}
            />
            <p className="text-right text-xs text-muted">
              {t('symptoms.chars', { count: textValue.length, max: maxChars })}
            </p>
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={analyzing}
          onClick={handleSubmit((values) => { void goNext(values.text) })}
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size={20} />
              {t('symptoms.analyzing') || 'Analyzing...'}
            </span>
          ) : (
            t('common.next').trim()
          )}
        </button>
      </div>
    </Layout>
  )
}

export const AiQuestionsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saved = useAppSelector((state) => state.consultation.symptomData)
  const aiQuestions = useAppSelector((state) => state.consultation.aiQuestions)
  const savedDynamic = useAppSelector((state) => state.consultation.dynamicAnswers)
  const isEmergency = useAppSelector((state) => state.consultation.isEmergency)
  const emergencyMessage = useAppSelector((state) => state.consultation.emergencyMessage)
  const hasDynamic = aiQuestions.length >= 1
  const symptoms = useAppSelector((state) => state.consultation.currentSymptoms)
  const additionalNotes = useAppSelector((state) => state.consultation.symptomData.additionalNotes)
  const [questionError, setQuestionError] = useState<string | null>(null)

  // Hardcoded fallback state
  const [hasFever, setHasFever] = useState<FeverAnswer | null>(() => saved.hasFever)
  const [temperature, setTemperature] = useState<TemperatureBand | null>(() => saved.temperature)
  const sectionBRef = useRef<HTMLDivElement | null>(null)

  // Dynamic question state (one-at-a-time, no fixed limit)
  const [currentIdx, setCurrentIdx] = useState<number>(0)
  const [dynAnswer, setDynAnswer] = useState<string>(() => savedDynamic[0] ?? '')
  const [doneAsking, setDoneAsking] = useState<boolean>(false)
  const [loadingNext, setLoadingNext] = useState<boolean>(false)
  const dynSectionRef = useRef<HTMLDivElement | null>(null)

  const feverItems: { key: FeverAnswer; label: string }[] = [
    { key: 'yes', label: t('aiQuestions.mock.fever.options.0') },
    { key: 'no', label: t('aiQuestions.mock.fever.options.1') },
    { key: 'not_sure', label: t('aiQuestions.mock.fever.options.2') },
  ]
  const temperatureItems: { key: TemperatureBand; label: string }[] = (
    ['normal', 'low', 'mild', 'high', 'very_high'] as const
  ).map((key, index) => ({
    key,
    label: t(`aiQuestions.mock.temperature.options.${index}`),
  }))

  const showTemperature = hasFever !== null
  const canNext = hasDynamic ? (doneAsking ? true : dynAnswer !== '') : hasFever !== null && temperature !== null

  useEffect(() => {
    if (hasDynamic) {
      if (!dynSectionRef.current) return
      window.requestAnimationFrame(() => {
        dynSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    } else {
      if (!showTemperature || !sectionBRef.current) return
      window.requestAnimationFrame(() => {
        sectionBRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [showTemperature, hasDynamic, currentIdx])

  const buildHistory = (answersByIndex: string[]) =>
    aiQuestions
      .map((q, idx) => ({ question: q.question, answer: answersByIndex[idx] ?? '' }))
      .filter((pair) => pair.question && pair.answer)

  const runFinalAnalysisAndProceed = async (history: { question: string; answer: string }[]) => {
    const answersRecord = Object.fromEntries(history.map((h) => [h.question, h.answer]))
    try {
      const final = await runFinalAnalysis(symptoms, answersRecord, additionalNotes)
      dispatch(
        setAiAnalysis({
          disease: final.disease,
          confidence: final.confidence,
          aiSpecialization: final.specialization,
          riskLevel: final.riskLevel,
        }),
      )
    } catch {
      // Keep initial triage values if final analysis fails.
    }
    dispatch(syncDynamicQaToAnswers())
    navigate('/additional-notes')
  }

  const advanceDynamic = async (answer: string) => {
    if (!symptoms) return
    setLoadingNext(true)
    setQuestionError(null)
    try {
      dispatch(setDynamicAnswer({ index: currentIdx, answer }))

      const nextAnswers = [...savedDynamic]
      while (nextAnswers.length <= currentIdx) {
        nextAnswers.push('')
      }
      nextAnswers[currentIdx] = answer
      const history = buildHistory(nextAnswers)

      const next = await fetchNextQuestion(symptoms, history, additionalNotes)
      if (next.done) {
        setDoneAsking(true)
        await runFinalAnalysisAndProceed(history)
        return
      }
      if (next.question) {
        dispatch(setAiQuestions([...aiQuestions, next.question]))
        setCurrentIdx((i) => i + 1)
        setDynAnswer('')
        return
      }
      setQuestionError(t('symptoms.questionGenFailed') || 'Could not generate the next question.')
    } catch {
      setQuestionError(t('symptoms.questionGenFailed') || 'Could not generate the next question.')
      showToast(t('symptoms.questionGenFailed') || 'Could not generate the next question.')
    } finally {
      setLoadingNext(false)
    }
  }

  const retryFirstQuestion = async () => {
    if (!symptoms) return
    setLoadingNext(true)
    setQuestionError(null)
    try {
      const first = await fetchNextQuestion(symptoms, [])
      if (first.done === false && first.question) {
        dispatch(setAiQuestions([first.question]))
        setCurrentIdx(0)
        setDynAnswer('')
        setDoneAsking(false)
        return
      }
      setQuestionError(t('symptoms.questionGenFailed') || 'Could not generate follow-up questions.')
    } catch {
      setQuestionError(t('symptoms.questionGenFailed') || 'Could not generate follow-up questions.')
    } finally {
      setLoadingNext(false)
    }
  }

  const handleNext = () => {
    if (!canNext) return
    if (hasDynamic) {
      if (doneAsking) {
        dispatch(syncDynamicQaToAnswers())
        navigate('/additional-notes')
        return
      }
      void advanceDynamic(dynAnswer)
      return
    }
    dispatch(setSymptomQuestionData({ hasFever, temperature }))
    navigate('/more-questions')
  }

  if (isEmergency) {
    return (
      <Layout>
        <div className="page-padding space-y-6 bg-background">
          <Header title={t('aiQuestions.title')} onBack={() => navigate('/symptoms')} />
          <div className="card space-y-3 border-danger/30 bg-danger/5 p-5">
            <p className="text-sm font-semibold text-danger">{t('symptoms.emergencyTitle') || 'Possible emergency'}</p>
            <p className="text-sm text-foreground">{emergencyMessage || t('symptoms.emergencyBody')}</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => navigate('/home')}>
            {t('common.ok') || 'OK'}
          </button>
        </div>
      </Layout>
    )
  }

  if (symptoms && !hasDynamic) {
    return (
      <Layout>
        <div className="page-padding space-y-6 bg-background">
          <Header title={t('aiQuestions.title')} onBack={() => navigate('/symptoms')} />
          <div className="card space-y-4 p-5">
            <p className="text-sm text-muted">
              {questionError || t('symptoms.questionGenFailed') || 'Could not generate follow-up questions.'}
            </p>
            <button type="button" className="btn-primary" disabled={loadingNext} onClick={() => void retryFirstQuestion()}>
              {loadingNext ? (t('symptoms.analyzing') || 'Loading...') : (t('common.retry') || 'Retry')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (hasDynamic) {
    const q = aiQuestions[currentIdx]
    return (
      <Layout>
        <div className="page-padding space-y-6 bg-background">
          <Header title={t('aiQuestions.title')} onBack={() => navigate('/symptoms')} />
          <div className="space-y-6">
            <section ref={dynSectionRef} className="card space-y-4 p-5">
              <h2 className="text-base font-semibold text-foreground">{q?.question}</h2>
              <div className="flex flex-wrap gap-2">
                {q?.options?.map((opt) => (
                  <AnswerChip
                    key={opt}
                    label={opt}
                    selected={dynAnswer === opt}
                    onPress={() => setDynAnswer(opt)}
                  />
                ))}
              </div>
              {questionError ? <p className="text-sm text-danger">{questionError}</p> : null}
            </section>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/symptoms')}>{t('common.back')}</button>
            <button type="button" className="btn-primary" disabled={!canNext || loadingNext} onClick={handleNext}>
              {loadingNext ? (t('symptoms.analyzing') || 'Loading...') : t('common.next')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-padding space-y-6 bg-background">
        <Header title={t('aiQuestions.title')} onBack={() => navigate('/symptoms')} />

        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="text-base font-semibold text-foreground">{t('aiQuestions.mock.fever.question')}</h2>
            <div className="flex flex-wrap gap-2">
              {feverItems.map((item) => (
                <AnswerChip
                  key={item.key}
                  label={item.label}
                  selected={hasFever === item.key}
                  onPress={() => {
                    setHasFever(item.key)
                    setTemperature(null)
                  }}
                />
              ))}
            </div>
          </section>

          {showTemperature ? (
            <section
              ref={sectionBRef}
              key="temperature-section"
              className="card animate-section-reveal space-y-4 p-5"
            >
              <h2 className="text-base font-semibold text-foreground">
                {t('aiQuestions.mock.temperature.question')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {temperatureItems.map((item) => (
                  <AnswerChip
                    key={item.key}
                    label={item.label}
                    selected={temperature === item.key}
                    onPress={() => setTemperature(item.key)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/symptoms')}>
            {t('common.back')}
          </button>
          <button type="button" className="btn-primary" disabled={!canNext} onClick={handleNext}>
            {t('common.next')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const MoreQuestionsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const saved = useAppSelector((state) => state.consultation.symptomData)
  const aiQuestions = useAppSelector((state) => state.consultation.aiQuestions)
  const savedDynamic = useAppSelector((state) => state.consultation.dynamicAnswers)
  const hasDynamic = aiQuestions.length >= 1

  // Hardcoded fallback state
  const [feverDuration, setFeverDuration] = useState<FeverDuration | null>(() => saved.feverDuration)
  const [hasChills, setHasChills] = useState<ChillsAnswer | null>(() => saved.hasChills)
  const sectionBRef = useRef<HTMLDivElement | null>(null)

  // Dynamic question state
  const [dynA2, setDynA2] = useState<string>(() => savedDynamic[2] ?? '')
  const [dynA3, setDynA3] = useState<string>(() => savedDynamic[3] ?? '')
  const dynShowQ4 = dynA2 !== ''
  const dynSectionBRef = useRef<HTMLDivElement | null>(null)

  const durationItems: { key: FeverDuration; label: string }[] = (
    ['today', '1-2days', '3-5days', 'more'] as const
  ).map((key, index) => ({
    key,
    label: t(`aiQuestions.mock.duration.options.${index}`),
  }))

  const chillsItems: { key: ChillsAnswer; label: string }[] = [
    { key: 'yes', label: t('common.yes') },
    { key: 'no', label: t('common.no') },
    { key: 'not_sure', label: t('common.notSure') },
  ]

  const showChills = feverDuration !== null
  const canNext = hasDynamic ? dynA2 !== '' && dynA3 !== '' : feverDuration !== null && hasChills !== null

  useEffect(() => {
    if (hasDynamic) {
      if (!dynShowQ4 || !dynSectionBRef.current) return
      window.requestAnimationFrame(() => {
        dynSectionBRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    } else {
      if (!showChills || !sectionBRef.current) return
      window.requestAnimationFrame(() => {
        sectionBRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [showChills, dynShowQ4, hasDynamic])

  const handleNext = () => {
    if (!canNext) return
    if (hasDynamic) {
      // Dynamic flow now lives in AiQuestionsPage (unlimited, one-at-a-time).
      navigate('/ai-questions')
      return
    } else {
      dispatch(setSymptomQuestionData({ feverDuration, hasChills, moreQuestionsVoiceNotes: '' }))
    }
    navigate('/additional-notes')
  }

  if (hasDynamic) {
    // Dynamic flow is handled in AiQuestionsPage now.
    return <Navigate to="/ai-questions" replace />
  }

  return (
    <Layout>
      <div className="page-padding space-y-6 bg-background">
        <Header title={t('moreQuestions.title')} onBack={() => navigate('/ai-questions')} />

        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="text-base font-semibold text-foreground">{t('aiQuestions.mock.duration.question')}</h2>
            <div className="flex flex-wrap gap-2">
              {durationItems.map((item) => (
                <AnswerChip
                  key={item.key}
                  label={item.label}
                  selected={feverDuration === item.key}
                  onPress={() => {
                    setFeverDuration(item.key)
                    setHasChills(null)
                  }}
                />
              ))}
            </div>
          </section>

          {showChills ? (
            <section ref={sectionBRef} className="card animate-section-reveal space-y-4 p-5">
              <h2 className="text-base font-semibold text-foreground">{t('moreQuestions.chillsQuestion')}</h2>
              <div className="flex flex-wrap gap-2">
                {chillsItems.map((item) => (
                  <AnswerChip
                    key={item.key}
                    label={item.label}
                    selected={hasChills === item.key}
                    onPress={() => setHasChills(item.key)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/ai-questions')}>
            {t('common.back')}
          </button>
          <button type="button" className="btn-primary" disabled={!canNext} onClick={handleNext}>
            {t('common.next')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const AdditionalNotesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const savedNotes = useAppSelector((state) => state.consultation.symptomData.additionalNotes)
  const [tab, setTab] = useState<'voice' | 'type'>('voice')
  const [recordSeconds, setRecordSeconds] = useState(0)
  const { transcript, isListening, startListening, stopListening, isSupported, error } = useVoiceInput()
  const maxChars = 2000
  const { register, handleSubmit, watch, setValue } = useForm<{ text: string }>({
    defaultValues: { text: '' },
  })
  const textValue = watch('text')
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) {
      return
    }
    hydrated.current = true
    if (savedNotes) {
      setValue('text', savedNotes)
    }
  }, [savedNotes, setValue])

  useEffect(() => {
    if (!isListening) {
      return
    }
    setRecordSeconds(0)
    const id = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [isListening])

  useEffect(() => {
    if (transcript) {
      setValue('text', transcript)
    }
  }, [setValue, transcript])

  const formatRec = (total: number) => {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const goSummary = (text: string) => {
    dispatch(setSymptomQuestionData({ additionalNotes: text.trim() }))
    navigate('/summary')
  }

  return (
    <Layout>
      <div className="page-padding space-y-5 bg-background">
        <Header
          title={t('additionalNotes.title')}
          subtitle={t('additionalNotes.subtitle')}
          onBack={() => navigate('/more-questions')}
        />

        <div className="grid grid-cols-2 rounded-card border border-border bg-white p-1 shadow-card">
          <button
            type="button"
            onClick={() => setTab('voice')}
            className={classNames(
              'rounded-app py-2.5 text-sm font-semibold transition',
              tab === 'voice' ? 'bg-primary text-white' : 'text-muted',
            )}
          >
            {t('forms.voiceInput')}
          </button>
          <button
            type="button"
            onClick={() => setTab('type')}
            className={classNames(
              'rounded-app py-2.5 text-sm font-semibold transition',
              tab === 'type' ? 'bg-primary text-white' : 'text-muted',
            )}
          >
            {t('forms.typeInput')}
          </button>
        </div>

        {tab === 'voice' ? (
          <div className="card space-y-5 p-5">
            <VoiceWaveform />
            <div className="text-center text-sm text-muted">{formatRec(recordSeconds)}</div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primaryDark text-white shadow-card transition active:scale-[0.96]"
              >
                <Mic size={36} />
              </button>
              <p className="text-sm text-muted">{t('additionalNotes.tapSpeakOrType')}</p>
              {!isSupported || error ? <p className="text-center text-sm text-danger">{error}</p> : null}
            </div>
            <div className="min-h-[80px] rounded-app border border-border bg-white p-3 text-sm text-foreground">
              {textValue || t('forms.transcriptPlaceholder')}
            </div>
          </div>
        ) : (
          <div className="form-group card space-y-3 p-5">
            <label htmlFor="additional-notes-text" className="form-label">{t('formLabels.additionalNotes')}</label>
            <textarea
              id="additional-notes-text"
              {...register('text')}
              className="textarea min-h-[160px]"
              maxLength={maxChars}
              rows={5}
              placeholder={t('formLabels.additionalNotesPh')}
            />
            <p className="text-right text-xs text-muted">
              {t('symptoms.chars', { count: textValue.length, max: maxChars })}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              dispatch(setSymptomQuestionData({ additionalNotes: '' }))
              navigate('/summary')
            }}
          >
            {t('common.skip')}
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit((values) => goSummary(values.text))}>
            {t('common.next')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const SummaryPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const consultation = useAppSelector((state) => state.consultation)
  const profile = useAppSelector((state) => state.patient.profile)
  const [loading, setLoading] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<MatchedDoctor | null>(null)
  const [showSelectHint, setShowSelectHint] = useState(false)
  const {
    symptomData,
    currentSymptoms,
    consultationId,
    additionalNotes,
    disease,
    confidence,
    aiSpecialization,
    aiQuestions,
    dynamicAnswers,
    aiAnswers,
  } = consultation

  const symptomsText = currentSymptoms || ''

  const summaryBullets = useMemo(() => {
    const lines: string[] = []
    if (symptomsText.trim()) {
      lines.push(`${t('summary.labels.symptoms') || 'Symptoms'}: ${symptomsText.trim()}`)
    }
    aiQuestions.forEach((q, index) => {
      const answer = dynamicAnswers[index] ?? aiAnswers[q.question]
      if (q.question && answer) {
        lines.push(`${q.question}: ${answer}`)
      }
    })
    if (symptomData.hasFever) {
      lines.push(`${t('summary.labels.fever')}: ${feverAnswerLabel(symptomData.hasFever, t)}`)
    }
    if (symptomData.temperature) {
      lines.push(`${t('summary.labels.temperature')}: ${temperatureLabel(symptomData.temperature, t)}`)
    }
    if (symptomData.feverDuration) {
      lines.push(`${t('summary.labels.feverDuration')}: ${feverDurationLabel(symptomData.feverDuration, t)}`)
    }
    if (symptomData.hasChills) {
      lines.push(`${t('summary.labels.chills')}: ${chillsAnswerLabel(symptomData.hasChills, t)}`)
    }
    if (symptomData.moreQuestionsVoiceNotes.trim()) {
      lines.push(`${t('summary.labels.voiceNotes')}: ${symptomData.moreQuestionsVoiceNotes.trim()}`)
    }
    if (additionalNotes.trim()) {
      lines.push(`${t('summary.labels.additionalNotes')}: ${additionalNotes.trim()}`)
    }
    return lines.length ? lines : symptomsText.split(/[.,\n]/).map((item) => item.trim()).filter(Boolean)
  }, [additionalNotes, aiAnswers, aiQuestions, dynamicAnswers, symptomData, symptomsText, t])

  const [doctors, setDoctors] = useState<MatchedDoctor[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [doctorsError, setDoctorsError] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const [effectiveSpecialization, setEffectiveSpecialization] = useState('')

  const flowRisk = useMemo(() => computeRiskFromSymptomData(symptomData), [symptomData])
  const riskLevel = consultation.riskLevel ?? flowRisk
  const patientAge = profile?.age ?? 0
  const recommendedSpecialization = useMemo(
    () => recommendSpecialization(symptomsText, symptomData, patientAge),
    [symptomsText, symptomData, patientAge],
  )
  const symptomTags = useMemo(
    () => getSymptomTagsForDisplay(symptomsText, symptomData),
    [symptomsText, symptomData],
  )

  useEffect(() => {
    if (!recommendedSpecialization) return
    setDoctorsLoading(true)
    setDoctorsError(false)
    getDoctorsBySpecialization(recommendedSpecialization)
      .then(({ doctors: fetched, usedFallback: fb, effectiveSpecialization: eff }) => {
        setDoctors(fetched)
        setUsedFallback(fb)
        setEffectiveSpecialization(eff || recommendedSpecialization)
        setDoctorsLoading(false)
      })
      .catch(() => {
        setDoctorsError(true)
        setDoctorsLoading(false)
      })
  }, [recommendedSpecialization])

  const submitAiAnswers = useMemo(() => {
    const fromDynamic: Record<string, string> = {}
    aiQuestions.forEach((q, index) => {
      const answer = dynamicAnswers[index] ?? aiAnswers[q.question]
      if (q.question && answer) {
        fromDynamic[q.question] = answer
      }
    })
    return {
      ...fromDynamic,
      hasFever: symptomData.hasFever ?? '',
      temperature: symptomData.temperature ?? '',
      feverDuration: symptomData.feverDuration ?? '',
      hasChills: symptomData.hasChills ?? '',
      moreQuestionsVoiceNotes: symptomData.moreQuestionsVoiceNotes ?? '',
    }
  }, [aiAnswers, aiQuestions, dynamicAnswers, symptomData])

  return (
    <Layout>
      <div className="page-padding space-y-5 bg-background">
        <Header title={t('summary.title')} onBack={() => navigate(-1)} />

        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-foreground">{t('summary.cardTitle')}</h2>
          <h3 className="text-sm font-semibold text-foreground">{t('summary.yourSymptoms')}</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">
            {summaryBullets.map((item, index) => (
              <li key={`${index}-${item.slice(0, 48)}`}>{item}</li>
            ))}
          </ul>
        </div>

        {disease ? (
          <div className="card space-y-3 p-5">
            <h3 className="text-sm font-semibold text-foreground">AI Analysis</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-app bg-[#E8F0FE] px-3 py-2">
                <span className="text-sm text-muted">Possible Condition</span>
                <span className="text-sm font-semibold text-primary">{disease}</span>
              </div>
              {confidence > 0 ? (
                <div className="flex items-center justify-between rounded-app bg-[#F0FDF4] px-3 py-2">
                  <span className="text-sm text-muted">Confidence</span>
                  <span className="text-sm font-semibold text-success">{confidence}%</span>
                </div>
              ) : null}
              {aiSpecialization ? (
                <div className="flex items-center justify-between rounded-app bg-[#FFF9F0] px-3 py-2">
                  <span className="text-sm text-muted">AI Recommended Specialist</span>
                  <span className="text-sm font-semibold text-[#D97706]">{aiSpecialization}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="card space-y-4 p-5 text-center">
          <RiskBadge level={riskLevel} />
          <p className="text-sm text-muted">{t('summary.doctorReview')}</p>
          <p className="text-xs italic text-muted">{'\u26A0\uFE0F'} {t('summary.disclaimer')}</p>
        </div>

        <div className="card space-y-3 p-5">
          <h3 className="text-sm font-semibold text-foreground">{t('summary.recommendedSpecialist')}</h3>
          <div className="flex items-start gap-3 rounded-app bg-[#E8F0FE] p-4">
            <Stethoscope size={22} className="mt-0.5 shrink-0 text-[#1A73E8]" />
            <div>
              <p className="font-semibold text-[#1A73E8]">
                {t('summary.recommendPrefix', { specialization: recommendedSpecialization })}
              </p>
              <p className="mt-1 text-xs text-muted">{t('summary.recommendBasedOn')}</p>
              <p className="mt-1 text-xs text-[#6B7280]">
                {t('summary.recommendSymptoms', { symptoms: symptomTags.join(', ') })}
              </p>
            </div>
          </div>
        </div>

        {doctorsLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size={28} />
          </div>
        ) : doctorsError ? (
          <p className="rounded-app bg-danger/10 px-4 py-3 text-center text-sm text-danger">
            {t('common.loadError')}
          </p>
        ) : doctors.length === 0 ? (
          <p className="rounded-app bg-muted/10 px-4 py-3 text-center text-sm text-muted">
            {t('summary.noDoctorsFound')}
          </p>
        ) : (
          <DoctorSelectDropdown
            doctors={doctors}
            specialization={effectiveSpecialization || recommendedSpecialization}
            selected={selectedDoctor}
            onSelect={(doctor) => {
              setSelectedDoctor(doctor)
              setShowSelectHint(false)
            }}
            usedFallback={usedFallback}
            requestedSpecialization={recommendedSpecialization}
          />
        )}

        {showSelectHint ? (
          <p className="text-center text-xs text-danger">{t('summary.selectDoctorFirst')}</p>
        ) : null}

        <button
          type="button"
          className={classNames('btn-primary', !selectedDoctor && !loading && 'opacity-60')}
          disabled={loading || !selectedDoctor}
          title={!selectedDoctor ? t('summary.selectDoctorFirst') : undefined}
          onClick={async () => {
            if (!selectedDoctor) {
              setShowSelectHint(true)
              return
            }
            setLoading(true)
            try {
              const response = await submitConsultation({
                consultationId,
                symptoms: symptomsText || summaryBullets.join(', '),
                additionalNotes,
                aiAnswers: submitAiAnswers,
                riskLevel: consultation.riskLevel ?? flowRisk,
                doctorId: selectedDoctor.id,
                recommendedSpecialization: aiSpecialization || recommendedSpecialization,
                patientId: profile?.id,
              })
              dispatch(resetConsultation())
              navigate('/submission-success', {
                state: { doctor: selectedDoctor, consultationId: response.consultationId },
              })
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size={20} />
              {t('summary.submitting')}
            </span>
          ) : (
            t('summary.submitToDoctor')
          )}
        </button>
      </div>
    </Layout>
  )
}

export const SubmissionSuccessPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { doctor?: MatchedDoctor; consultationId?: string } | null
  const doctor = state?.doctor

  if (!doctor) {
    return (
      <Layout>
        <div className="page-padding">
          <button type="button" className="btn-primary" onClick={() => navigate('/home')}>
            {t('submissionSuccess.goHome')}
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNav>
      <div className="page-padding flex min-h-screen flex-col items-center bg-background pb-8 pt-10 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-[-12px] rounded-full bg-success/5" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-success/20 to-success/5 shadow-success-glow">
            <CheckCircle size={52} className="animate-scale-in text-success" strokeWidth={2} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('submissionSuccess.title')}</h1>
        <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted">{t('submissionSuccess.subtitle', { doctorName: doctor.name })}</p>
        <div className="mt-6 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <div className="h-1.5 w-full bg-gradient-to-r from-success to-[#1e8c3c]" />
          <div className="space-y-4 p-5 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">
                {doctor.name.replace(/^Dr\.\s*/i, '').charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-foreground">{doctor.name}</p>
                <p className="text-sm text-muted">{doctor.specialization}</p>
              </div>
            </div>
            <CaseStatusBadge status="PENDING_REVIEW" />
            <p className="text-sm leading-relaxed text-muted">{t('submissionSuccess.infoBody')}</p>
          </div>
        </div>
        <div className="mt-auto w-full space-y-3 pt-8">
          <button type="button" className="btn-primary" onClick={() => navigate('/history')}>
            {t('submissionSuccess.trackStatus')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/home')}>
            {t('submissionSuccess.goHome')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const DoctorProfileSetupPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const existing = readDoctorProfile()

  useEffect(() => {
    if (isDocProfileComplete()) {
      navigate('/doctor-dashboard', { replace: true })
    }
  }, [navigate])

  const specializationChoices = [
    'General Physician',
    'Cardiologist',
    'Pediatrician',
    'Dermatologist',
    'Orthopedic',
    'ENT',
    'Other',
  ]

  const { register, handleSubmit } = useForm<DoctorProfileRecord>({
    defaultValues: existing ?? {
      fullName: '',
      specialization: 'General Physician',
      registrationNumber: '',
      hospital: '',
      experienceYears: '',
      consultationFee: '',
    },
  })

  return (
    <Layout hideNav>
      <div className="page-padding min-h-screen space-y-5 bg-background pb-8">
        <Header
          title={t('doctorProfileSetup.title')}
          subtitle={t('doctorProfileSetup.subtitle')}
          onBack={() => navigate('/auth')}
        />

        <form
          className="space-y-4"
          onSubmit={handleSubmit((data) => {
            writeDoctorProfile(data)
            setDocProfileComplete()
            navigate('/doctor-dashboard', { replace: true })
          })}
        >
          <FormField label={t('formLabels.fullName')} htmlFor="doctor-setup-fullName" required>
            <input id="doctor-setup-fullName" {...register('fullName', { required: true })} className="input" placeholder={t('formLabels.fullNamePh')} />
          </FormField>
          <FormField label={t('formLabels.specialization')} htmlFor="doctor-setup-specialization" required>
            <select id="doctor-setup-specialization" {...register('specialization')} className="input" defaultValue="">
              <option value="" disabled>{t('formLabels.specializationPh')}</option>
              {specializationChoices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('formLabels.licenseNumber')} htmlFor="doctor-setup-license" required>
            <input id="doctor-setup-license" {...register('registrationNumber')} className="input" placeholder={t('formLabels.licenseNumberPh')} />
          </FormField>
          <FormField label={t('formLabels.hospital')} htmlFor="doctor-setup-hospital" required>
            <input id="doctor-setup-hospital" {...register('hospital')} className="input" placeholder={t('formLabels.hospitalPh')} />
          </FormField>
          <FormField label={t('formLabels.experienceYears')} htmlFor="doctor-setup-experience" required>
            <input id="doctor-setup-experience" {...register('experienceYears')} className="input" inputMode="numeric" placeholder={t('formLabels.experienceYearsPh')} />
          </FormField>
          <FormField label={t('formLabels.consultationFee')} htmlFor="doctor-setup-fee" required>
            <input id="doctor-setup-fee" {...register('consultationFee')} className="input" placeholder={t('formLabels.consultationFeePh')} />
          </FormField>
          <button type="submit" className="btn-primary">
            {t('doctorProfileSetup.saveContinue')}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export const DoctorConsultationPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [consultation, setConsultationState] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm<{ message: string }>({
    defaultValues: { message: '' },
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getConsultation(id)
        setConsultationState(data)
        if (data.caseStatus === 'PENDING_REVIEW') {
          const updated = await updateConsultationCaseStatus(id, 'UNDER_REVIEW')
          setConsultationState(updated)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  if (loading) {
    return (
      <Layout hideNav>
        <LoadingSpinner className="min-h-screen" />
      </Layout>
    )
  }

  if (!consultation) {
    return (
      <Layout hideNav>
        <div className="page-padding">
          <EmptyState icon={<ClipboardList size={36} className="text-primary" />} text={t('doctorDashboard.noConsultations')} />
        </div>
      </Layout>
    )
  }

  const summary = consultation.aiSummary ?? buildAiSummary(consultation.symptoms)
  const structuredLines = structuredSymptomsForDoctorReview(consultation, t)
  const symptomLines =
    structuredLines ??
    (consultation.symptomList ?? consultation.symptoms.split(/[.,\n]/).map((s) => s.trim()).filter(Boolean))

  return (
    <Layout hideNav>
      <div className="page-padding space-y-5 bg-background">
        <Header title={t('doctorReview.headerTitle')} onBack={() => navigate('/doctor-dashboard')} />

        <div className="card p-5">
          <p className="font-semibold text-foreground">{consultation.patientName}</p>
          <p className="mt-1 text-sm text-muted">
            {consultation.patientAge} · {consultation.patientGender}
          </p>
          <p className="mt-3 text-xs text-muted">
            {t('doctorReview.submitted')}: {formatDateTime(consultation.createdAt)}
          </p>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-foreground">{t('doctorConsultation.symptomsSummary')}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            {symptomLines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-foreground">{t('doctorConsultation.medicalHistory')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(consultation.medicalHistory?.chronicDiseases ?? []).map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            {consultation.medicalHistory?.allergies?.length
              ? consultation.medicalHistory.allergies.join(', ')
              : t('common.unknown')}
          </p>
          <p className="mt-2 text-sm text-muted">
            {consultation.medicalHistory?.currentMedicines?.length
              ? consultation.medicalHistory.currentMedicines.join(', ')
              : t('common.unknown')}
          </p>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-foreground">{t('doctorReview.aiRiskTitle')}</h2>
          <div className="mt-3">
            <RiskBadge level={consultation.riskLevel ?? summary.riskLevel} />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{t('doctorReview.possibleConditions')}</p>
          <p className="mt-1 text-sm text-muted">{summary.possibleCause}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {summary.suggestedTests.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-secondary" onClick={() => setSheetOpen(true)}>
            {t('doctorConsultation.needMoreInfo')}
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate(`/create-prescription/${id}`)}>
            {t('doctorConsultation.createRx')}
          </button>
        </div>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30">
          <div className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl bg-white p-5">
            <p className="mb-3 text-lg font-semibold">{t('doctorReview.needMoreInfoTitle')}</p>
            <form
              className="space-y-4"
              onSubmit={handleSubmit(async (values) => {
                if (!consultation || !values.message.trim()) {
                  return
                }
                await updateConsultationCaseStatus(consultation.id, 'NEED_MORE_INFO')
                if (consultation.patientId) {
                  notifyPatientNeedMoreInfo({
                    patientId: consultation.patientId,
                    doctorName: consultation.doctorName ?? '',
                    message: values.message.trim(),
                    caseId: consultation.id,
                  })
                }
                reset()
                setSheetOpen(false)
              })}
            >
              <FormField label={t('formLabels.messageToPatient')} htmlFor="doctor-review-message" required>
                <textarea
                  id="doctor-review-message"
                  {...register('message')}
                  className="textarea"
                  placeholder={t('formLabels.messageToPatientPh')}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn-secondary" onClick={() => setSheetOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('doctorReview.sendNotification')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}

export const CreatePrescriptionPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [docProfile, setDocProfile] = useState(() => readDoctorProfile())

  const form = useForm<PrescriptionFormValues>({
    defaultValues: {
      diagnosis: '',
      medicines: [{ name: '', dosage: '', frequency: 'Once', duration: '' }],
      advice: '',
      ors: '',
      dateTime: getNowIso(),
    },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medicines',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConsultation(id)
        setConsultation(data)
      } catch {
        setConsultation(null)
      }
    }
    void load()
  }, [id])

  useEffect(() => {
    getDoctorProfile().then((fetched) => {
      if (fetched) {
        writeDoctorProfile(fetched)
        setDocProfile(fetched)
      }
    }).catch(() => {})
  }, [])

  const savePrescription = async (status: 'DRAFT' | 'APPROVED' = 'DRAFT') => {
    const values = form.getValues()
    setLoading(true)
    try {
      const prescription = await createPrescription({
        consultationId: id,
        diagnosis: values.diagnosis,
        medicines: values.medicines,
        advice: values.advice,
        ors: values.ors,
        dateTime: values.dateTime,
        status,
      })

      setActivePrescriptionId(prescription.id)
      if (status === 'DRAFT') {
        showToast(t('toast.savedDraft'))
      }
      return prescription
    } finally {
      setLoading(false)
    }
  }

  const goNext = form.handleSubmit(async () => {
    const prescription = await savePrescription('DRAFT')
    if (prescription) {
      navigate(`/edit-prescription/${prescription.id}`)
    }
  })

  return (
    <Layout hideNav>
      <div className="page-padding space-y-5 bg-background">
        <Header title={t('createPrescription.title')} onBack={() => navigate(`/doctor-consultation/${id}`)} />

        {consultation ? (
          <div className="card rounded-app border border-dashed border-border bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-foreground">{consultation.patientName}</p>
            <p className="text-muted">
              {consultation.patientAge} · {consultation.patientGender}
            </p>
            <p className="mt-2 text-xs text-muted">{formatDate(form.watch('dateTime') || getNowIso())}</p>
          </div>
        ) : null}

        <div className="space-y-4">
          <FormField label={t('formLabels.diagnosis')} htmlFor="create-rx-diagnosis" required>
            <textarea
              id="create-rx-diagnosis"
              {...form.register('diagnosis')}
              className="textarea"
              placeholder={t('formLabels.diagnosisPh')}
            />
          </FormField>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{t('createPrescription.medicines')}</h2>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-primary"
              onClick={() => append({ name: '', dosage: '', frequency: 'Once', duration: '' })}
            >
              <Plus size={16} />
              {t('createPrescription.addMedicine')}
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <MedicineRow key={field.id} index={index} onRemove={remove} register={form.register} />
            ))}
          </div>

          <FormField label={t('formLabels.ors')} htmlFor="create-rx-ors">
            <textarea id="create-rx-ors" {...form.register('ors')} className="textarea" placeholder={t('formLabels.orsPh')} />
          </FormField>
          <FormField label={t('formLabels.advice')} htmlFor="create-rx-advice">
            <textarea id="create-rx-advice" {...form.register('advice')} className="textarea" placeholder={t('formLabels.advicePh')} />
          </FormField>
          <FormField label={t('formLabels.prescriptionDateTime')} htmlFor="create-rx-datetime">
            <input id="create-rx-datetime" {...form.register('dateTime')} className="input" type="datetime-local" />
          </FormField>

          <div className="card space-y-1 border-dashed p-4 text-sm text-muted">
            <p className="font-semibold text-foreground">
              {t('createPrescription.signaturePrefix')}
              {docProfile?.fullName ? (docProfile.fullName.startsWith('Dr') ? docProfile.fullName : `Dr. ${docProfile.fullName}`) : ''}
            </p>
            {docProfile?.specialization ? <p>{docProfile.specialization}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={async () => {
              const prescription = await savePrescription('DRAFT')
              if (prescription) {
                navigate('/doctor-dashboard')
              }
            }}
          >
            {t('createPrescription.saveDraft')}
          </button>
          <button type="button" className="btn-primary" disabled={loading} onClick={() => void goNext()}>
            {loading ? <LoadingSpinner size={20} /> : t('createPrescription.nextFinalize')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const EditPrescriptionPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [consultationId, setConsultationId] = useState('')
  const [editingRows, setEditingRows] = useState<Record<number, boolean>>({})
  const form = useForm<PrescriptionFormValues>({
    defaultValues: {
      diagnosis: '',
      medicines: [],
      advice: '',
      ors: '',
      dateTime: '',
    },
  })
  const { fields, remove } = useFieldArray({
    control: form.control,
    name: 'medicines',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const prescription = await getPrescription(id)
        setConsultationId(prescription.consultationId)
        form.reset({
          diagnosis: prescription.diagnosis,
          medicines: prescription.medicines,
          advice: prescription.advice ?? '',
          ors: prescription.ors ?? '',
          dateTime: prescription.dateTime ?? getNowIso(),
        })
        setEditingRows(
          Object.fromEntries(prescription.medicines.map((_, index) => [index, false])) as Record<number, boolean>,
        )
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [form, id])

  if (loading) {
    return (
      <Layout hideNav>
        <LoadingSpinner className="min-h-screen" />
      </Layout>
    )
  }

  return (
    <Layout hideNav>
      <div className="page-padding space-y-5 bg-background">
        <Header
          title={t('editPrescription.title')}
          onBack={() =>
            consultationId ? navigate(`/create-prescription/${consultationId}`) : navigate('/doctor-dashboard')
          }
        />
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setLoading(true)
            try {
              await updatePrescription(id, {
                diagnosis: values.diagnosis,
                medicines: values.medicines,
                advice: values.advice,
                ors: values.ors,
                dateTime: values.dateTime,
              })
              await approvePrescription(id)
              showToast(t('toast.prescriptionApproved'))
              navigate('/prescription-approved')
            } finally {
              setLoading(false)
            }
          })}
        >
          <FormField label={t('formLabels.diagnosis')} htmlFor="edit-rx-diagnosis" required>
            <textarea
              id="edit-rx-diagnosis"
              {...form.register('diagnosis')}
              className="textarea"
              placeholder={t('formLabels.diagnosisPh')}
            />
          </FormField>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <MedicineRow
                key={field.id}
                index={index}
                onRemove={remove}
                register={form.register}
                disabled
                showEditToggle
                isEditing={editingRows[index]}
                onToggleEdit={(rowIndex) =>
                  setEditingRows((current) => ({
                    ...current,
                    [rowIndex]: !current[rowIndex],
                  }))
                }
              />
            ))}
          </div>
          <FormField label={t('formLabels.ors')} htmlFor="edit-rx-ors">
            <textarea id="edit-rx-ors" {...form.register('ors')} className="textarea" placeholder={t('formLabels.orsPh')} />
          </FormField>
          <FormField label={t('formLabels.advice')} htmlFor="edit-rx-advice">
            <textarea
              id="edit-rx-advice"
              {...form.register('advice')}
              className="textarea"
              placeholder={t('formLabels.advicePh')}
            />
          </FormField>
          <FormField label={t('formLabels.prescriptionDateTime')} htmlFor="edit-rx-datetime">
            <input id="edit-rx-datetime" {...form.register('dateTime')} className="input" type="datetime-local" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                consultationId ? navigate(`/create-prescription/${consultationId}`) : navigate('/doctor-dashboard')
              }
            >
              {t('common.back')}
            </button>
            <button type="submit" className="flex h-12 w-full items-center justify-center rounded-xl bg-success text-white">
              {loading ? <LoadingSpinner size={20} /> : t('editPrescription.approve')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export const PrescriptionApprovedPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Layout hideNav>
      <div className="page-padding flex min-h-screen flex-col items-center justify-center text-center">
        <div className="relative mb-2">
          <div className="absolute inset-[-16px] rounded-full bg-success/5" />
          <div className="animate-scale-in relative rounded-full bg-gradient-to-br from-success/20 to-success/5 p-7 shadow-success-glow">
            <CheckCircle size={56} className="text-success" strokeWidth={2} />
          </div>
        </div>
        <h1 className="mt-7 text-2xl font-bold text-success">{t('prescriptionApproved.title')}</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t('prescriptionApproved.subtitle')}</p>
        <div className="mt-10 w-full space-y-3">
          <button type="button" className="btn-primary" onClick={() => navigate('/my-prescription')}>
            {t('prescriptionApproved.viewPrescription')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/doctor-dashboard')}>
            {t('prescriptionApproved.backToDashboard')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

const usePrescriptionView = (prescriptionId?: string) => {
  const [prescription, setPrescriptionState] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const targetId = prescriptionId ?? getActivePrescriptionId()
      if (targetId) {
        const rx = await getPrescription(targetId)
        setPrescriptionState(rx)
        setActivePrescriptionId(targetId)
        return
      }
      const list = await getPrescriptions()
      const fallback = list.find((item) => item.status === 'APPROVED') ?? list[0] ?? null
      setPrescriptionState(fallback)
      if (fallback) {
        setActivePrescriptionId(fallback.id)
      }
    } catch {
      setPrescriptionState(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [prescriptionId])

  useEffect(() => {
    void load()
  }, [load])

  return { prescription, loading, error, reload: load }
}

export const PatientPrescriptionPage = () => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { prescriptionId } = useParams()
  const { prescription, loading, error, reload } = usePrescriptionView(prescriptionId)

  const handleDownload = async () => {
    if (!prescription) {
      return
    }
    const blob = await downloadPdf(prescription.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${prescription.id}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="min-h-screen" />
      </Layout>
    )
  }

  if (error || !prescription) {
    return (
      <Layout>
        <div className="page-padding space-y-4">
          <Header title={t('patientPrescription.title')} onBack={() => window.history.back()} />
          <EmptyState
            icon={<FileText size={36} className="text-primary" />}
            text={error ? t('doctorDashboard.loadError') : t('history.noPrescriptions')}
          />
          {error ? (
            <button type="button" className="btn-primary" onClick={() => void reload()}>
              {t('doctorDashboard.retry')}
            </button>
          ) : null}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-padding space-y-5">
        <Header
          title={t('patientPrescription.title')}
          onBack={() => window.history.back()}
          right={
            <button type="button" onClick={() => void handleDownload()} className="rounded-full border border-border p-2">
              <Download size={18} />
            </button>
          }
        />

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{prescription.doctorName}</p>
              <p className="text-sm text-slate-500">{prescription.qualification}</p>
              <p className="text-sm text-slate-500">{prescription.registrationNumber}</p>
            </div>
            <p className="text-right text-sm text-slate-500">{formatDateTime(prescription.dateTime ?? getNowIso())}</p>
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="flex justify-between text-sm text-slate-600">
            <span>{prescription.patientName}</span>
            <span>
              {prescription.patientAge} • {prescription.patientGender}
            </span>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-semibold">{t('patientPrescription.diagnosis')}</p>
          <p className="mt-2 text-slate-600">{prescription.diagnosis}</p>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">{t('patientPrescription.medicines')}</h2>
          {prescription.medicines.map((item) => (
            <div key={`${item.name}-${item.dosage}`} className="card p-4">
              <p className="font-semibold">{item.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {item.dosage} • {item.frequency} • {item.duration}
              </p>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <p className="font-semibold">{t('patientPrescription.advice')}</p>
          <p className="mt-2 text-slate-600">{prescription.advice}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button type="button" className="btn-primary" onClick={() => void handleDownload()}>
            {t('patientPrescription.downloadPdf')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => showToast(t('patientPrescription.shareHint'))}>
            {t('common.share')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.alert(t('prescriptionApproved.findPharmacy'))}
          >
            {t('patientPrescription.findPharmacy')}
          </button>
        </div>

        <div className="mx-auto flex h-12 w-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-slate-400">
          {t('patientPrescription.signature')}
        </div>
      </div>
    </Layout>
  )
}

export const PdfSharePage = () => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { prescription, loading } = usePrescriptionView()

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner className="min-h-screen" />
      </Layout>
    )
  }

  if (!prescription) {
    return (
      <Layout>
        <div className="page-padding">
          <EmptyState icon={<FileText size={36} className="text-primary" />} text={t('history.noPrescriptions')} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-padding space-y-5">
        <Header title={t('pdfShare.title')} />
        <div className="card space-y-4 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{prescription.doctorName}</p>
              <p className="text-sm text-slate-500">{prescription.qualification}</p>
            </div>
            <p className="text-sm text-slate-500">{formatDate(prescription.dateTime ?? getNowIso())}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
            <span>{prescription.patientName}</span>
            <span>
              {prescription.patientAge} • {prescription.patientGender}
            </span>
          </div>
          <div>
            <p className="font-semibold">{t('patientPrescription.diagnosis')}</p>
            <p className="mt-1 text-slate-600">{prescription.diagnosis}</p>
          </div>
          <div>
            <p className="font-semibold">{t('patientPrescription.medicines')}</p>
            <div className="mt-2 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-4 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <span>Medicine</span>
                <span>Dosage</span>
                <span>Frequency</span>
                <span>Duration</span>
              </div>
              {prescription.medicines.map((item: Prescription['medicines'][number]) => (
                <div
                  key={`${item.name}-${item.dosage}`}
                  className="grid grid-cols-4 gap-2 border-t border-border px-3 py-3 text-sm text-slate-600"
                >
                  <span>{item.name}</span>
                  <span>{item.dosage}</span>
                  <span>{item.frequency}</span>
                  <span>{item.duration}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold">{t('patientPrescription.advice')}</p>
            <p className="mt-1 text-slate-600">{prescription.advice}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              const blob = await downloadPdf(prescription.id)
              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')
              anchor.href = url
              anchor.download = `${prescription.id}.pdf`
              anchor.click()
              URL.revokeObjectURL(url)
            }}
          >
            {t('pdfShare.downloadPdf')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: t('pdfShare.title'),
                  text: prescription.diagnosis,
                  url: window.location.href,
                })
                return
              }
              await navigator.clipboard.writeText(window.location.href)
              showToast(t('pdfShare.shareSuccess'))
            }}
          >
            {t('pdfShare.share')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const FollowUpPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState('morning')
  const [availableDoctors, setAvailableDoctors] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    getDoctors().then((list) => {
      setAvailableDoctors(list)
      if (list.length > 0) {
        setValue('doctorId', list[0].id)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [loading, setLoading] = useState(false)
  const monthStart = useMemo(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }, [])
  const monthEnd = useMemo(
    () => new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0),
    [monthStart],
  )
  const days = Array.from({ length: monthEnd.getDate() }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1))
  const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

  const { register, handleSubmit, setValue } = useForm<{ doctorId: string; notes: string }>({
    defaultValues: {
      doctorId: '',
      notes: '',
    },
  })

  const buildScheduledAt = (): string => {
    const date = selectedDate ?? new Date()
    const hour = slot === 'morning' ? 10 : slot === 'afternoon' ? 14 : 18
    const next = new Date(date)
    next.setHours(hour, 0, 0, 0)
    return next.toISOString()
  }

  return (
    <Layout>
      <div className="page-padding space-y-5">
        <Header title={t('followUp.title')} />

        <div className="form-group">
          <p id="followup-appointment-date-label" className="form-label">
            {t('formLabels.appointmentDate')} <span className="text-danger">*</span>
          </p>
        <div className="card p-5" role="group" aria-labelledby="followup-appointment-date-label">
          <div className="mb-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
            {days.slice(0, 7).map((day) => (
              <span key={day.toISOString()}>{dayFormatter.format(day).slice(0, 3)}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
              const isSelected = selectedDate?.toDateString() === day.toDateString()
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(day)}
                  className={classNames(
                    'flex h-10 items-center justify-center rounded-xl border text-sm',
                    isSelected ? 'border-primary bg-primary text-white' : 'border-border',
                    isPast ? 'pointer-events-none text-slate-300' : 'text-slate-700',
                  )}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
        </div>

        <div className="form-group">
          <p id="followup-appointment-time-label" className="form-label">
            {t('formLabels.appointmentTime')} <span className="text-danger">*</span>
          </p>
        <div className="flex gap-2" role="group" aria-labelledby="followup-appointment-time-label">
          {[
            { key: 'morning', label: t('followUp.morning') },
            { key: 'afternoon', label: t('followUp.afternoon') },
            { key: 'evening', label: t('followUp.evening') },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSlot(item.key)}
              className={classNames('chip', slot === item.key ? 'chip-active' : '')}
            >
              {item.label}
            </button>
          ))}
        </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            setLoading(true)
            const payload: FollowUpPayload = {
              doctorId: values.doctorId,
              scheduledAt: buildScheduledAt(),
              notes: values.notes,
            }
            try {
              await bookFollowUp(payload)
              showToast(t('followUp.booked'))
              navigate('/history')
            } finally {
              setLoading(false)
            }
          })}
        >
          <FormField label={t('formLabels.selectDoctor')} htmlFor="followup-doctor" required>
            <select id="followup-doctor" {...register('doctorId')} className="input" defaultValue="">
              <option value="" disabled>{t('formLabels.selectDoctorPh')}</option>
              {availableDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('formLabels.additionalNotes')} htmlFor="followup-notes">
            <textarea
              id="followup-notes"
              {...register('notes')}
              className="textarea"
              placeholder={t('formLabels.additionalNotesPh')}
            />
          </FormField>
          <button type="submit" className="btn-primary" disabled={!selectedDate || loading}>
            {loading ? <LoadingSpinner size={20} /> : t('followUp.confirm')}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export const HistoryPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'consultations' | 'prescriptions'>('consultations')
  const [consultations, setConsultationsState] = useState<Consultation[]>([])
  const [prescriptions, setPrescriptionsState] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  const prescriptionByConsultation = useMemo(() => {
    const map = new Map<string, Prescription>()
    prescriptions.forEach((rx) => {
      if (rx.consultationId) {
        map.set(rx.consultationId, rx)
      }
    })
    return map
  }, [prescriptions])

  const openPrescription = (consultationId: string) => {
    const rx = prescriptionByConsultation.get(consultationId)
    if (!rx) {
      showToast(t('history.prescriptionNotReady'))
      return
    }
    setActivePrescriptionId(rx.id)
    navigate(`/my-prescription/${rx.id}`, {
      state: { caseId: consultationId, prescriptionId: rx.id },
    })
  }

  const loadHistory = async () => {
    const [consultationItems, prescriptionItems] = await Promise.all([
      getConsultations(),
      getPrescriptions(),
    ])
    setConsultationsState(consultationItems)
    setPrescriptionsState(prescriptionItems)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await loadHistory()
      } finally {
        setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void loadHistory()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <Layout>
      <div className="page-padding space-y-5">
        <Header title={t('history.title')} />
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          {[
            { key: 'consultations', label: t('history.consultations') },
            { key: 'prescriptions', label: t('history.prescriptions') },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as 'consultations' | 'prescriptions')}
              className={classNames(
                'rounded-xl px-3 py-2 text-sm font-medium',
                tab === item.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner className="py-10" /> : null}

        {!loading && tab === 'consultations' ? (
          consultations.length ? (
            <div className="space-y-3">
              {consultations.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all hover:shadow-card-hover">
                  <div className="border-l-4 border-primary p-4">
                    <p className="text-xs font-medium text-muted">{formatDate(item.createdAt)}</p>
                    <p className="mt-1 font-semibold text-foreground">{item.possibleCause ?? item.aiSummary?.possibleCause}</p>
                    {item.doctorName ? <p className="mt-0.5 text-sm text-muted">{item.doctorName}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RiskBadge level={item.riskLevel ?? 'MEDIUM'} />
                      {item.caseStatus ? <CaseStatusBadge status={item.caseStatus} /> : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border-t border-border/60">
                    <button
                      type="button"
                      className="py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 active:scale-[0.97]"
                      onClick={() => {
                        dispatch(hydrateFromConsultation(item))
                        navigate('/summary')
                      }}
                    >
                      {t('common.view')}
                    </button>
                    <div className="border-l border-border/60">
                    {item.caseStatus === 'NEED_MORE_INFO' ? (
                      <button
                        type="button"
                        className="w-full py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 active:scale-[0.97]"
                        onClick={() => navigate('/notifications')}
                      >
                        {t('history.replyToDoctor')}
                      </button>
                    ) : item.caseStatus === 'PRESCRIPTION_READY' || item.caseStatus === 'CLOSED' ? (
                      <button
                        type="button"
                        className={classNames(
                          'w-full py-2.5 text-sm font-semibold transition-colors active:scale-[0.97]',
                          item.caseStatus === 'CLOSED' ? 'text-muted hover:bg-slate-50' : 'text-primary hover:bg-primary/5',
                        )}
                        onClick={() => openPrescription(item.id)}
                      >
                        {t('history.viewPrescription')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="w-full py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 active:scale-[0.97]"
                        onClick={() => navigate('/follow-up')}
                      >
                        {t('history.bookFollowUp')}
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ClipboardList size={36} className="text-primary" />} text={t('history.noConsultations')} />
          )
        ) : null}

        {!loading && tab === 'prescriptions' ? (
          prescriptions.filter((item) => item.status === 'APPROVED').length ? (
            <div className="space-y-3">
              {prescriptions.filter((item) => item.status === 'APPROVED').map((item) => (
                <div key={item.id} className="card p-4">
                  <p className="text-sm text-slate-400">{formatDate(item.dateTime ?? getNowIso())}</p>
                  <p className="mt-1 font-medium">{item.diagnosis}</p>
                  <p className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {item.medicines.length} meds
                  </p>
                  <button
                    type="button"
                    className="btn-secondary mt-4"
                    onClick={() => {
                      setActivePrescriptionId(item.id)
                      navigate(`/my-prescription/${item.id}`, {
                          state: { prescriptionId: item.id, caseId: item.consultationId },
                        })
                    }}
                  >
                    {t('history.viewPrescription')} →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <FileText size={48} className="mb-3 text-primary/30" strokeWidth={1.5} />
              <p className="font-medium text-foreground">{t('history.noPrescriptions')}</p>
            </div>
          )
        ) : null}
      </div>
    </Layout>
  )
}

const simpleScreen = (
  title: string,
  icon: ReactNode,
  primaryLabel: string,
  primaryAction: () => void,
  secondaryLabel?: string,
  secondaryAction?: () => void,
  subtitle?: string,
) => (
  <Layout>
    <div className="page-padding flex min-h-screen flex-col items-center justify-center text-center">
      <div className="rounded-full bg-primary/10 p-5 text-primary">{icon}</div>
      <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
      {subtitle ? <p className="mt-2 text-slate-500">{subtitle}</p> : null}
      <div className="mt-8 w-full space-y-3">
        <button type="button" className="btn-primary" onClick={primaryAction}>
          {primaryLabel}
        </button>
        {secondaryLabel && secondaryAction ? (
          <button type="button" className="btn-secondary" onClick={secondaryAction}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  </Layout>
)

export const DoctorCalendarPage = () => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i += 1) {
    cells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(d)
  }

  const countForDay = (_day: number) => 0

  // Calendar slots come from real follow-up bookings — no hardcoded names
  const mockSlots: { time: string; name: string; type: 'consultation' | 'follow-up' }[] = []

  return (
    <Layout>
      <div className="page-padding space-y-4 bg-background pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t('doctorCalendar.title')}</h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-app border border-border px-3 py-1 text-sm"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <button
              type="button"
              className="rounded-app border border-border px-3 py-1 text-sm"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>
        </div>
        <p className="text-center text-sm font-semibold text-foreground">
          {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor)}
        </p>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) =>
            day === null ? (
              <span key={`e-${idx}`} className="h-10" />
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={classNames(
                  'relative flex h-10 flex-col items-center justify-center rounded-app text-sm font-medium',
                  selectedDay === day ? 'bg-primary text-white' : 'bg-white text-foreground shadow-sm',
                )}
              >
                {day}
                {countForDay(day) > 0 ? (
                  <span className="absolute bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[9px] font-bold text-white">
                    {countForDay(day)}
                  </span>
                ) : null}
              </button>
            ),
          )}
        </div>

        {selectedDay !== null ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('doctorCalendar.dayAppointments', { day: selectedDay })}</p>
            {mockSlots.length === 0 ? (
              <p className="text-sm text-muted">{t('doctorCalendar.noAppointments')}</p>
            ) : (
              mockSlots.map((slot) => (
                <div key={slot.time} className="card flex justify-between p-3 text-sm">
                  <span className="font-medium text-foreground">{slot.time}</span>
                  <span className="text-muted">{slot.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {slot.type === 'consultation' ? t('doctorCalendar.typeConsult') : t('doctorCalendar.typeFollowUp')}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : null}

        <button
          type="button"
          className="fab"
          onClick={() => showToast(t('doctorCalendar.addSoon'))}
          aria-label={t('doctorCalendar.addAppointment')}
        >
          <Plus size={26} />
        </button>
      </div>
    </Layout>
  )
}

const doctorSpecializationChoices = [
  'General Physician',
  'Cardiologist',
  'Pediatrician',
  'Dermatologist',
  'Orthopedic',
  'ENT',
  'Other',
]

const doctorProfileEditSchema = z.object({
  fullName: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/),
  email: z.string().email(),
  profilePictureUrl: z.string().min(1),
  specialization: z.string().min(1),
  hospital: z.string().min(2),
  consultationFee: z.string().min(1),
})

export const DoctorProfilePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const token = useAppSelector((state) => state.auth.token)
  const setUserRole = useOnboardingStore((s) => s.setUserRole)
  const { showToast } = useToast()
  const [docProfile, setDocProfile] = useState<DoctorProfileRecord | null>(() => readDoctorProfile())
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [online, setOnline] = useState(true)
  const [profileLoading, setProfileLoading] = useState(!readDoctorProfile())
  const photoInputRef = useRef<HTMLInputElement>(null)

  const displayName = docProfile?.fullName?.trim() || ''
  const displaySpecialization = docProfile?.specialization?.trim() || ''
  const profilePhoto = docProfile?.profilePictureUrl

  const buildFormValues = () => ({
    fullName: docProfile?.fullName?.trim()?.replace(/^Dr\.\s*/i, '') || '',
    mobile: docProfile?.mobile ?? user?.mobile ?? '',
    email: docProfile?.email ?? '',
    profilePictureUrl: docProfile?.profilePictureUrl ?? '',
    specialization: docProfile?.specialization ?? doctorSpecializationChoices[0],
    hospital: docProfile?.hospital ?? '',
    consultationFee: docProfile?.consultationFee ?? '',
  })

  const form = useForm({
    resolver: zodResolver(doctorProfileEditSchema),
    defaultValues: buildFormValues(),
  })

  const watchedPhoto = form.watch('profilePictureUrl')

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const resetFormToSaved = () => {
    form.reset(buildFormValues())
  }

  useEffect(() => {
    getDoctorProfile().then((fetched) => {
      if (fetched) {
        writeDoctorProfile(fetched)
        setDocProfile(fetched)
        if (!editing) {
          form.reset({
            fullName: fetched.fullName?.replace(/^Dr\.\s*/i, '') || '',
            mobile: fetched.mobile || user?.mobile || '',
            email: fetched.email || '',
            profilePictureUrl: fetched.profilePictureUrl || '',
            specialization: fetched.specialization || '',
            hospital: fetched.hospital || '',
            consultationFee: fetched.consultationFee || '',
          })
        }
      }
    }).catch(() => {}).finally(() => setProfileLoading(false))
  // form.reset is stable; editing intentionally excluded — we don't want re-fetch on edit toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const hasUnsavedChanges = form.formState.isDirty

  const exitEditMode = () => {
    if (hasUnsavedChanges && !window.confirm(t('doctorProfile.discardChanges'))) {
      return false
    }
    resetFormToSaved()
    setEditing(false)
    return true
  }

  const handleEditToggle = () => {
    if (editing) {
      exitEditMode()
    } else {
      resetFormToSaved()
      setEditing(true)
    }
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      form.setValue('profilePictureUrl', result, { shouldDirty: true, shouldValidate: true })
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    const valid = await form.trigger()
    if (!valid) {
      return
    }

    setLoading(true)
    try {
      const values = form.getValues()
      const updated = await updateDoctorProfile(values)
      setDocProfile(updated)
      form.reset(values)

      if (user && token && values.mobile !== user.mobile) {
        dispatch(setCredentials({ user: { ...user, mobile: values.mobile }, token }))
      }

      showToast(t('toast.doctorProfileUpdated'))
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const headerPhoto = (editing ? watchedPhoto : profilePhoto) || undefined

  return (
    <Layout>
      <div className="space-y-5 bg-background pb-8">
        {/* Hero gradient header */}
        <div className="relative rounded-b-[32px] bg-gradient-to-br from-[#1557B0] to-[#0D47A1] px-5 pb-8 pt-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white">{t('doctorNav.profileTitle')}</h1>
            <button
              type="button"
              className={classNames(
                'rounded-full p-2 transition-all',
                editing ? 'bg-white/30 text-white' : 'bg-white/20 text-white',
              )}
              onClick={handleEditToggle}
              aria-label={t('doctorProfile.edit')}
              aria-pressed={editing}
            >
              <Pencil size={18} />
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center text-center">
            <div className="relative">
              {headerPhoto ? (
                <img
                  src={headerPhoto}
                  alt=""
                  className="h-22 w-22 rounded-full object-cover ring-4 ring-white/40"
                  style={{ width: 88, height: 88 }}
                />
              ) : (
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-white/20 text-3xl font-extrabold text-white backdrop-blur-sm ring-4 ring-white/30">
                  {initials}
                </div>
              )}
              {online && (
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-success shadow-sm" />
              )}
            </div>
            <p className="mt-3 text-lg font-bold text-white">
              {profileLoading ? <span className="animate-pulse opacity-60">···</span> : displayName}
            </p>
            <p className="text-sm text-white/75">
              {profileLoading ? <span className="animate-pulse opacity-60">···</span> : displaySpecialization}
            </p>
            {!profileLoading && docProfile?.registrationNumber ? (
              <p className="mt-0.5 text-xs text-white/55">{docProfile.registrationNumber}</p>
            ) : null}
          </div>

          {/* Stats row inside hero */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/15 px-2 py-3 backdrop-blur-sm">
              <p className="text-xl font-extrabold text-white">128</p>
              <p className="text-[10px] font-medium text-white/70">{t('doctorProfile.statsPatients')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-3 backdrop-blur-sm">
              <p className="text-xl font-extrabold text-white">{docProfile?.experienceYears ?? '—'}</p>
              <p className="text-[10px] font-medium text-white/70">{t('doctorProfile.statsYears')}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-2 py-3 backdrop-blur-sm">
              <p className="text-xl font-extrabold text-white">4.8</p>
              <p className="text-[10px] font-medium text-white/70">{t('doctorProfile.statsRating')}</p>
            </div>
          </div>
        </div>

        <div className="page-padding pt-0">

        <form className="space-y-6" onSubmit={form.handleSubmit(() => void saveProfile())} noValidate>
          <div className="card space-y-3 p-4">
            <p className="text-sm font-semibold text-foreground">{t('doctorProfile.personalSection')}</p>
            <FormField
              label={t('formLabels.fullName')}
              htmlFor="doctor-profile-fullName"
              required={editing}
              error={editing && form.formState.errors.fullName ? t('validation.fullName') : undefined}
            >
              <input
                id="doctor-profile-fullName"
                {...form.register('fullName')}
                className={classNames('input', !editing && 'input-readonly')}
                readOnly={!editing}
                placeholder={t('formLabels.fullNamePh')}
              />
            </FormField>
            <FormField
              label={t('formLabels.phoneNumber')}
              htmlFor="doctor-profile-mobile"
            >
              <input
                id="doctor-profile-mobile"
                {...form.register('mobile')}
                className="input input-readonly"
                readOnly
                inputMode="numeric"
                maxLength={10}
                placeholder={t('formLabels.phoneNumberPh')}
              />
            </FormField>
            <FormField
              label={t('formLabels.email')}
              htmlFor="doctor-profile-email"
              required={editing}
              error={editing && form.formState.errors.email ? t('validation.email') : undefined}
            >
              <input
                id="doctor-profile-email"
                {...form.register('email')}
                className={classNames('input', !editing && 'input-readonly')}
                readOnly={!editing}
                type="email"
                placeholder={t('formLabels.emailPh')}
              />
            </FormField>
            <FormField
              label={t('formLabels.profilePicture')}
              htmlFor="doctor-profile-photo"
              required={editing}
              error={
                editing && form.formState.errors.profilePictureUrl ? t('validation.profilePicture') : undefined
              }
            >
              {editing ? (
                <div className="flex items-center gap-3">
                  {watchedPhoto || profilePhoto ? (
                    <img
                      src={watchedPhoto || profilePhoto}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials}
                    </div>
                  )}
                  <input
                    ref={photoInputRef}
                    id="doctor-profile-photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {t('doctorProfile.changePhoto')}
                  </button>
                </div>
              ) : profilePhoto ? (
                <img src={profilePhoto} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <p className="text-sm text-muted">{t('myProfile.notProvided')}</p>
              )}
            </FormField>
          </div>

          <div className="card space-y-3 p-4">
            <p className="text-sm font-semibold text-foreground">{t('doctorProfile.proSection')}</p>
            <FormField
              label={t('formLabels.specialization')}
              htmlFor="doctor-profile-specialization"
              required={editing}
              error={editing && form.formState.errors.specialization ? t('validation.specialization') : undefined}
            >
              {editing ? (
                <select id="doctor-profile-specialization" {...form.register('specialization')} className="input">
                  {doctorSpecializationChoices.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="doctor-profile-specialization"
                  className="input input-readonly"
                  value={docProfile?.specialization ?? ''}
                  readOnly
                />
              )}
            </FormField>
            <FormField
              label={t('formLabels.hospital')}
              htmlFor="doctor-profile-hospital"
              required={editing}
              error={editing && form.formState.errors.hospital ? t('validation.hospital') : undefined}
            >
              <input
                id="doctor-profile-hospital"
                {...form.register('hospital')}
                className={classNames('input', !editing && 'input-readonly')}
                readOnly={!editing}
                placeholder={t('formLabels.hospitalPh')}
              />
            </FormField>
            <FormField
              label={t('formLabels.consultationFee')}
              htmlFor="doctor-profile-fee"
              required={editing}
              error={editing && form.formState.errors.consultationFee ? t('validation.consultationFee') : undefined}
            >
              <input
                id="doctor-profile-fee"
                {...form.register('consultationFee')}
                className={classNames('input', !editing && 'input-readonly')}
                readOnly={!editing}
                placeholder={t('formLabels.consultationFeePh')}
              />
            </FormField>
          </div>

          {editing ? (
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" disabled={loading} onClick={() => exitEditMode()}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? <LoadingSpinner size={20} /> : t('common.save')}
              </button>
            </div>
          ) : null}
        </form>

        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="font-medium text-foreground">{t('doctorProfile.availability')}</p>
            <p className="text-xs text-muted">{online ? t('doctorProfile.online') : t('doctorProfile.offline')}</p>
          </div>
          <button
            type="button"
            onClick={() => setOnline((o) => !o)}
            className={classNames(
              'relative h-8 w-14 rounded-full transition',
              online ? 'bg-success' : 'bg-border',
            )}
          >
            <span
              className={classNames(
                'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition',
                online ? 'left-7' : 'left-1',
              )}
            />
          </button>
        </div>

        <button
          type="button"
          className="btn-secondary flex items-center justify-center gap-2"
          onClick={() => {
            clearDoctorSession()
            dispatch(logout())
            setUserRole('patient')
            navigate('/welcome')
          }}
        >
          <LogOut size={18} />
          {t('doctorProfile.logout')}
        </button>
        </div>{/* close page-padding */}
      </div>
    </Layout>
  )
}

export {
  RoleSelectionPage,
  AuthPage as LoginPage,
  PatientRegistrationPage,
  DoctorRegistrationPage,
  PatientMyProfilePage,
  NotificationsPage,
} from '@/pages/auth/authFlow'


