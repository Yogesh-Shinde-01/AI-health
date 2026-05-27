import { useEffect, useRef, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Apple, ArrowLeft, Bell, ChevronRight, Eye, EyeOff, Heart, LogOut, Pencil, Stethoscope, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import {
  RegistrationApiError,
  registerDoctor,
  registerPatient,
  roleToUserRole,
} from '@/services/authService'
import { formatIndianPhone } from '@/utils/phone'
import { DoctorLoginForm } from './DoctorLoginForm'
import { PatientLoginForm } from './PatientLoginForm'
import { getProfile, updateMedicalHistory, updateProfile } from '@/services/patientsService'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import RegistrationSuccessModal from '@/components/ui/RegistrationSuccessModal'
import FormField from '@/components/forms/FormField'
import MedicalHistoryForm from '@/components/forms/MedicalHistoryForm'
import { useToast } from '@/components/feedback/Toast'
import Layout from '@/layouts/MainLayout'
import { useAppDispatch, useAppSelector } from '@/store'
import { useDoctorDashboardStore } from '@/store/slices/doctorDashboardStore'
import { logout, setCredentials, setRole } from '@/store/slices/authSlice'
import { useOnboardingStore } from '@/store/slices/onboardingStore'
import { setMedicalHistory, setProfile } from '@/store/slices/patientSlice'
import type { AppNotification } from '@/types/doctors'
import type { BloodGroup, Gender, MedicalHistory } from '@/types'
import {
  classNames,
  clearDoctorSession,
  clearDoctorRegPassword,
  clearPatientRegPassword,
  clearRegistrationSession,
  formatRelativeTime,
  isDoctorPendingPractice,
  clearPatientRegistrationFlow,
  isPatientAwaitingOtp,
  isPatientPendingRegistration,
  isOtpVerified,
  persistLastMobile,
  readLastMobile,
  removeStorage,
  readDoctorRegPassword,
  readPatientRegPassword,
  readPatientExtendedProfile,
  readRegisterDraft,
  registerMobile,
  saveDoctorCredentials,
  savePatientCredentials,
  setDocProfileComplete,
  setDoctorPendingPractice,
  setFlowSession,
  setPatientAwaitingOtp,
  setPatientPendingRegistration,
  setOtpVerified,
  storageKeys,
  writeDoctorProfile,
  writeDoctorRegPassword,
  writePatientRegPassword,
  writePatientExtendedProfile,
  writeRegisterDraft,
} from '@/utils'
import type { DoctorProfileRecord, PatientExtendedProfile, RegisterDraft } from '@/utils'
import {
  getNotificationsForRole,
  markAllRead,
  markNotificationRead,
} from '@/utils/notifications'
import {
  findPatientAccount,
  registerPatientAccount,
  resolveDoctorIdForLogin,
} from '@/utils/userScope'

const loginSchema = z.object({ mobile: z.string().regex(/^\d{10}$/) })

const patientRegisterSchema = z
  .object({
    fullName: z.string().min(2),
    mobile: z.string().regex(/^\d{10}$/),
    email: z.string().email().optional().or(z.literal('')),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'mismatch',
    path: ['confirmPassword'],
  })

const doctorRegisterSchema = z
  .object({
    fullName: z.string().min(2),
    mobile: z.string().regex(/^\d{10}$/),
    email: z.string().email(),
    registrationNumber: z.string().min(2),
    specialization: z.string().min(1),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'mismatch',
    path: ['confirmPassword'],
  })

const profileSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().min(1).max(120),
  gender: z.string().refine((value) => value === 'MALE' || value === 'FEMALE' || value === 'OTHER'),
  heightCm: z.coerce.number().min(50).max(250),
  weightKg: z.coerce.number().min(10).max(250),
  bloodGroup: z.string().refine((value) => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(value)),
})

const extendedProfileSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
})

const doctorDetailsSchema = z.object({
  hospital: z.string().min(2),
  experienceYears: z.string().min(1),
  consultationFee: z.string().min(1),
  clinicAddress: z.string().min(5),
})

import { PasswordInput, SocialButtons } from './authFlowShared'

const AuthFlowHeader = ({
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

const RoleBadge = ({ role }: { role: 'patient' | 'doctor' }) => {
  const { t } = useTranslation()
  return (
    <span
      className={classNames(
        'inline-flex rounded-pill px-3 py-1 text-xs font-semibold',
        role === 'doctor' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary',
      )}
    >
      {role === 'doctor' ? t('auth.badgeDoctor') : t('auth.badgePatient')}
    </span>
  )
}

export const RoleSelectionPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const setUserRole = useOnboardingStore((s) => s.setUserRole)

  return (
    <Layout hideNav>
      <div className="page-padding flex min-h-screen flex-col bg-background">
        <AuthFlowHeader title={t('roleSelection.title')} subtitle={t('roleSelection.subtitle')} onBack={() => navigate('/welcome')} />

        <div className="mt-4 flex flex-1 flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setUserRole('patient')
              dispatch(setRole('PATIENT'))
              navigate('/login')
            }}
            className="group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-primary/15 bg-white p-5 text-left shadow-card transition-all duration-200 hover:border-primary/30 hover:shadow-card-hover active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary transition-all group-hover:from-primary/30 group-hover:to-primary/10">
              <UserRound size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground">{t('roleSelection.patientTitle')}</p>
              <p className="mt-0.5 text-sm text-muted">{t('roleSelection.patientDesc')}</p>
            </div>
            <ChevronRight className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setUserRole('doctor')
              dispatch(setRole('DOCTOR'))
              navigate('/login')
            }}
            className="group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-success/15 bg-white p-5 text-left shadow-card transition-all duration-200 hover:border-success/30 hover:shadow-card-hover active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-success/20 to-success/5 text-success transition-all group-hover:from-success/30 group-hover:to-success/10">
              <Stethoscope size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground">{t('roleSelection.doctorTitle')}</p>
              <p className="mt-0.5 text-sm text-muted">{t('roleSelection.doctorDesc')}</p>
            </div>
            <ChevronRight className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </Layout>
  )
}

export const AuthPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const userRole = useOnboardingStore((s) => s.userRole)
  const [tab, setTab] = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login',
  )
  const [loading, setLoading] = useState(false)
  const [showPatientPassword, setShowPatientPassword] = useState(false)
  const [showPatientConfirmPassword, setShowPatientConfirmPassword] = useState(false)
  const registrationToastShownRef = useRef(false)
  const isDoctor = userRole === 'doctor'

  useEffect(() => {
    dispatch(setRole(isDoctor ? 'DOCTOR' : 'PATIENT'))
  }, [dispatch, isDoctor])

  useEffect(() => {
    if (searchParams.get('tab') === 'register') {
      setTab('register')
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined' || registrationToastShownRef.current) {
      return
    }
    const fromRegistration = (location.state as { registrationComplete?: boolean } | null)?.registrationComplete
    if (!fromRegistration) {
      return
    }
    registrationToastShownRef.current = true
    setTab('login')
    setSearchParams({})
    showToast(t('registrationSuccess.loginToast'))
    navigate(location.pathname, { replace: true, state: {} })
  }, [showToast, t, location.pathname, location.state, navigate, setSearchParams])

  const switchTab = (next: 'login' | 'register') => {
    setTab(next)
    if (next === 'register') {
      setSearchParams({ tab: 'register' })
    } else {
      setSearchParams({})
    }
  }

  const patientRegForm = useForm<{
    fullName: string
    mobile: string
    email: string
    password: string
    confirmPassword: string
  }>({
    resolver: zodResolver(patientRegisterSchema),
    defaultValues: { fullName: '', mobile: '', email: '', password: '', confirmPassword: '' },
  })

  const doctorRegForm = useForm<{
    fullName: string
    mobile: string
    email: string
    specialization: string
    registrationNumber: string
    password: string
    confirmPassword: string
  }>({
    resolver: zodResolver(doctorRegisterSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      specialization: '',
      registrationNumber: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (tab !== 'register') return
    // Wipe every piece of state that could carry a previous patient's data
    removeStorage(storageKeys.registerDraft)
    removeStorage(storageKeys.profile)
    removeStorage(storageKeys.medicalHistory)
    clearPatientRegistrationFlow()
    clearPatientRegPassword()
    removeStorage(storageKeys.token)
    removeStorage(storageKeys.authUser)
    dispatch(logout())
  }, [tab, dispatch])

  return (
    <Layout hideNav>
      <div className="page-padding flex min-h-screen flex-col bg-background">
        {/* App branding */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primaryDark shadow-primary-glow">
            <Heart size={20} fill="white" className="text-white" />
          </div>
          <div>
            <span className="text-[17px] font-bold text-primary">AI Health</span>
            <span className="ml-1 text-[17px] font-bold text-foreground">Assistant</span>
          </div>
        </div>

        <AuthFlowHeader
          title={tab === 'login' ? t('login.title') : t('login.createTitle')}
          subtitle={tab === 'login' ? t('login.subtitle') : t('login.createSubtitle')}
          onBack={() => navigate('/role-selection')}
          right={<RoleBadge role={userRole} />}
        />

        <div className="mb-6 flex rounded-xl border border-border bg-slate-50/80 p-1 shadow-sm">
          <button
            type="button"
            className={classNames(
              'flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition-all duration-200',
              tab === 'login' ? 'bg-white shadow-card text-foreground' : 'text-muted hover:text-foreground',
            )}
            onClick={() => switchTab('login')}
          >
            {t('auth.tabLogin')}
          </button>
          <button
            type="button"
            className={classNames(
              'flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition-all duration-200',
              tab === 'register' ? 'bg-white shadow-card text-foreground' : 'text-muted hover:text-foreground',
            )}
            onClick={() => switchTab('register')}
          >
            {t('auth.tabRegister')}
          </button>
        </div>

        {tab === 'login' ? (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4">
              {isDoctor ? <DoctorLoginForm /> : <PatientLoginForm />}
            </div>
            <div className="mt-auto border-t border-border pt-6 text-center text-sm">
              <span className="text-muted">{t('login.newUser')} </span>
              <button type="button" className="font-semibold text-primary" onClick={() => switchTab('register')}>
                {t('login.registerNow')}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-1 flex-col"
            autoComplete="off"
            onSubmit={
              isDoctor
                ? doctorRegForm.handleSubmit(async (values) => {
                    clearDoctorSession()
                    writeRegisterDraft({
                      fullName: values.fullName,
                      mobile: `+91${values.mobile}`,
                      email: values.email,
                      specialization: values.specialization,
                      registrationNumber: values.registrationNumber,
                    })
                    writeDoctorRegPassword(values.password)
                    setDoctorPendingPractice(true)
                    persistLastMobile(`+91${values.mobile}`)
                    navigate('/doctor-register', { replace: true })
                  })
                : patientRegForm.handleSubmit(async (values) => {
                    writeRegisterDraft({
                      fullName: values.fullName,
                      mobile: `+91${values.mobile}`,
                      email: values.email,
                    })
                    writePatientRegPassword(values.password)
                    if (values.email?.trim()) {
                      savePatientCredentials(values.email, `+91${values.mobile}`, values.password)
                    }
                    setPatientPendingRegistration(true)
                    persistLastMobile(`+91${values.mobile}`)
                    navigate('/patient-register', { replace: true })
                  })
            }
          >
            <div className="flex-1 space-y-4">
              {isDoctor ? (
                <>
                  <FormField label={t('formLabels.fullName')} htmlFor="auth-reg-doctor-fullName" required>
                    <input
                      id="auth-reg-doctor-fullName"
                      {...doctorRegForm.register('fullName')}
                      className="input"
                      autoComplete="off"
                      placeholder={t('formLabels.fullNamePh')}
                    />
                  </FormField>
                  <FormField label={t('formLabels.phoneNumber')} htmlFor="auth-reg-doctor-mobile" required error={doctorRegForm.formState.errors.mobile ? t('login.invalidMobile') : undefined}>
                    <div className="flex h-11 w-full items-stretch overflow-hidden rounded-app border border-[#E5E7EB] bg-white text-sm transition-all duration-200 focus-within:[box-shadow:0_0_0_3px_rgba(26,115,232,0.14)] focus-within:border-[#1A73E8]">
                      <span className="flex select-none items-center border-r border-[#E5E7EB] bg-slate-50 px-3 font-medium text-muted">+91</span>
                      <input
                        id="auth-reg-doctor-mobile"
                        {...doctorRegForm.register('mobile')}
                        maxLength={10}
                        className="flex-1 bg-transparent px-3 text-foreground outline-none placeholder:text-[#9CA3AF]"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="10-digit number"
                      />
                    </div>
                  </FormField>
                  <FormField label={t('formLabels.email')} htmlFor="auth-reg-doctor-email" required>
                    <input
                      id="auth-reg-doctor-email"
                      {...doctorRegForm.register('email')}
                      className="input"
                      type="email"
                      autoComplete="off"
                      placeholder={t('formLabels.emailPh')}
                    />
                  </FormField>
                  <FormField label={t('formLabels.password')} htmlFor="auth-reg-doctor-password" required>
                    <input
                      id="auth-reg-doctor-password"
                      {...doctorRegForm.register('password')}
                      className="input"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t('formLabels.passwordPh')}
                    />
                  </FormField>
                  <FormField
                    label={t('formLabels.confirmPassword')}
                    htmlFor="auth-reg-doctor-confirm-password"
                    required
                    error={
                      doctorRegForm.formState.errors.confirmPassword?.message === 'mismatch'
                        ? t('formLabels.passwordMismatch')
                        : undefined
                    }
                  >
                    <input
                      id="auth-reg-doctor-confirm-password"
                      {...doctorRegForm.register('confirmPassword')}
                      className="input"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t('formLabels.confirmPasswordPh')}
                    />
                  </FormField>
                  <FormField label={t('formLabels.specialization')} htmlFor="auth-reg-doctor-specialization" required>
                    <select
                      id="auth-reg-doctor-specialization"
                      {...doctorRegForm.register('specialization')}
                      className="input"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {t('formLabels.specializationPh')}
                      </option>
                      {[
                        'General Physician',
                        'Cardiologist',
                        'Pediatrician',
                        'Dermatologist',
                        'Orthopedic',
                        'ENT Specialist',
                        'Gynecologist',
                        'Neurologist',
                        'Other',
                      ].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t('formLabels.licenseNumber')} htmlFor="auth-reg-doctor-license" required>
                    <input
                      id="auth-reg-doctor-license"
                      {...doctorRegForm.register('registrationNumber')}
                      className="input"
                      autoComplete="off"
                      placeholder={t('formLabels.licenseNumberPh')}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label={t('formLabels.fullName')} htmlFor="auth-reg-patient-fullName" required>
                    <input
                      id="auth-reg-patient-fullName"
                      {...patientRegForm.register('fullName')}
                      className="input"
                      autoComplete="off"
                      placeholder={t('formLabels.fullNamePh')}
                    />
                  </FormField>
                  <FormField label={t('formLabels.phoneNumber')} htmlFor="auth-reg-patient-mobile" required error={patientRegForm.formState.errors.mobile ? t('login.invalidMobile') : undefined}>
                    <div className="flex h-11 w-full items-stretch overflow-hidden rounded-app border border-[#E5E7EB] bg-white text-sm transition-all duration-200 focus-within:[box-shadow:0_0_0_3px_rgba(26,115,232,0.14)] focus-within:border-[#1A73E8]">
                      <span className="flex select-none items-center border-r border-[#E5E7EB] bg-slate-50 px-3 font-medium text-muted">+91</span>
                      <input
                        id="auth-reg-patient-mobile"
                        {...patientRegForm.register('mobile')}
                        maxLength={10}
                        className="flex-1 bg-transparent px-3 text-foreground outline-none placeholder:text-[#9CA3AF]"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="10-digit number"
                      />
                    </div>
                  </FormField>
                  <FormField label={t('formLabels.email')} htmlFor="auth-reg-patient-email">
                    <input
                      id="auth-reg-patient-email"
                      {...patientRegForm.register('email')}
                      className="input"
                      type="email"
                      autoComplete="off"
                      placeholder={t('formLabels.emailPh')}
                    />
                  </FormField>
                  <FormField
                    label={t('formLabels.password')}
                    htmlFor="auth-reg-patient-password"
                    required
                    error={
                      patientRegForm.formState.errors.password
                        ? t('validation.password')
                        : undefined
                    }
                  >
                    <PasswordInput
                      id="auth-reg-patient-password"
                      registerProps={patientRegForm.register('password')}
                      show={showPatientPassword}
                      onToggle={() => setShowPatientPassword((v) => !v)}
                      placeholder={t('formLabels.passwordPh')}
                      autoComplete="new-password"
                    />
                  </FormField>
                  <FormField
                    label={t('formLabels.confirmPassword')}
                    htmlFor="auth-reg-patient-confirm-password"
                    required
                    error={
                      patientRegForm.formState.errors.confirmPassword?.message === 'mismatch'
                        ? t('formLabels.passwordMismatch')
                        : patientRegForm.formState.errors.confirmPassword
                          ? t('validation.password')
                          : undefined
                    }
                  >
                    <PasswordInput
                      id="auth-reg-patient-confirm-password"
                      registerProps={patientRegForm.register('confirmPassword')}
                      show={showPatientConfirmPassword}
                      onToggle={() => setShowPatientConfirmPassword((v) => !v)}
                      placeholder={t('formLabels.confirmPasswordPh')}
                      autoComplete="new-password"
                    />
                  </FormField>
                </>
              )}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <LoadingSpinner size={20} />
                ) : isDoctor ? (
                  t('register.continueDoctor')
                ) : (
                  t('register.submit')
                )}
              </button>
              <SocialButtons showToast={showToast} t={t} />
            </div>
            <div className="mt-auto border-t border-border pt-6 text-center text-sm">
              <span className="text-muted">{t('login.existingUser')} </span>
              <button type="button" className="font-semibold text-primary" onClick={() => switchTab('login')}>
                {t('login.loginNow')}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}

export const finalizePatientRegistrationData = (mobile: string, dispatch: ReturnType<typeof useAppDispatch>) => {
  const draft = readRegisterDraft()
  const password = readPatientRegPassword()
  if (draft.email?.trim() && password && mobile) {
    savePatientCredentials(draft.email, mobile, password)
  }
  if (mobile) {
    registerMobile(mobile, 'patient')
    if (!findPatientAccount(mobile)) {
      registerPatientAccount(mobile)
    }
  }
  clearPatientRegistrationFlow()
  setOtpVerified(false)
}

export const goToLoginAfterPatientRegistration = (navigate: ReturnType<typeof useNavigate>) => {
  removeStorage(storageKeys.registerDraft)
  clearPatientRegistrationFlow()
  navigate('/login', { replace: true })
}

export const PatientRegistrationPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const draft = readRegisterDraft()
  const mobile = readLastMobile() || draft.mobile || ''
  const showRegistrationSuccess = Boolean(
    (location.state as { showRegistrationSuccess?: boolean } | null)?.showRegistrationSuccess,
  )
  const canAccessPatientRegister =
    isPatientPendingRegistration() ||
    isPatientAwaitingOtp() ||
    showRegistrationSuccess ||
    (Boolean(draft.fullName && draft.mobile) && Boolean(readPatientRegPassword()))

  useEffect(() => {
    if (!showRegistrationSuccess) return
    const timer = window.setTimeout(() => {
      goToLoginAfterPatientRegistration(navigate)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [showRegistrationSuccess, navigate])

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: draft.fullName ?? '',
      age: undefined as number | undefined,
      gender: '' as '' | Gender,
      heightCm: undefined as number | undefined,
      weightKg: undefined as number | undefined,
      bloodGroup: '' as '' | BloodGroup,
    },
  })

  const extendedForm = useForm({
    resolver: zodResolver(extendedProfileSchema),
    defaultValues: {
      email: draft.email ?? '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
    },
  })

  const finishProfileStep = async () => {
    const profileValues = profileForm.getValues()
    const extendedValues = extendedForm.getValues()
    const patientId = mobile
      ? (findPatientAccount(mobile)?.patientId ?? registerPatientAccount(mobile))
      : undefined
    const nextProfile = await updateProfile({
      ...(patientId ? { id: patientId } : {}),
      ...profileValues,
      gender: profileValues.gender as Gender,
      bloodGroup: profileValues.bloodGroup as BloodGroup,
    })
    dispatch(setProfile(nextProfile))
    writePatientExtendedProfile({
      ...extendedValues,
      email: draft.email ?? '',
    } as PatientExtendedProfile)
    setStep(2)
  }

  const proceedToOtp = async (medical: MedicalHistory) => {
    const phone = formatIndianPhone(mobile) ?? mobile
    const password = readPatientRegPassword()
    if (!phone || !draft.fullName || !password) {
      navigate('/login?tab=register', { replace: true })
      return
    }
    setLoading(true)
    try {
      const saved = await updateMedicalHistory(medical)

      dispatch(setMedicalHistory(saved))
      setPatientPendingRegistration(true)
      setFlowSession(storageKeys.pendingIsNewUser, 'true')
      persistLastMobile(phone)
      await registerPatient({
        fullName: draft.fullName,
        phone,
        email: draft.email,
        password,
      })
      setPatientAwaitingOtp(true)
      navigate('/otp', { replace: true })
    } catch (error) {
      if (error instanceof RegistrationApiError && error.code === 'DUPLICATE') {
        showToast(error.message)
        clearPatientRegistrationFlow()
        navigate('/login', { replace: true })
        return
      }
      showToast(t('login.unableToProcess'))
    } finally {
      setLoading(false)
    }
  }

  if (!draft.fullName || !draft.mobile) {
    return <Navigate to="/login?tab=register" replace />
  }

  if (!canAccessPatientRegister) {
    return <Navigate to="/login?tab=register" replace />
  }

  if (showRegistrationSuccess) {
    return (
      <Layout hideNav>
        <div className="min-h-screen bg-background" />
        <RegistrationSuccessModal
          open
          onGoToLogin={() => goToLoginAfterPatientRegistration(navigate)}
        />
      </Layout>
    )
  }

  return (
    <Layout hideNav>
      <div className="page-padding min-h-screen bg-background pb-8">
        <AuthFlowHeader
          title={t('patientReg.title')}
          subtitle={step === 1 ? t('patientReg.step1Subtitle') : t('patientReg.step2Subtitle')}
          onBack={() => (step === 1 ? navigate('/login?tab=register') : setStep(1))}
          right={<RoleBadge role="patient" />}
        />
        <div className="mb-5 flex items-center gap-2">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={classNames(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                n <= step ? 'bg-gradient-to-br from-primary to-primaryDark text-white shadow-primary-glow' : 'bg-slate-100 text-muted',
              )}>
                {n}
              </div>
              {n < 2 && (
                <div className={classNames(
                  'h-1 w-12 rounded-full transition-all',
                  step >= 2 ? 'bg-primary' : 'bg-slate-200',
                )} />
              )}
            </div>
          ))}
          <span className="ml-1 text-xs text-muted">{t('patientReg.step', { current: step, total: 2 })}</span>
        </div>

        {step === 1 ? (
          <form
            className="space-y-4"
            onSubmit={profileForm.handleSubmit(() =>
              extendedForm.handleSubmit(() => void finishProfileStep())(),
            )}
          >
            <FormField label={t('formLabels.fullName')} htmlFor="patient-reg-fullName" required>
              <input
                id="patient-reg-fullName"
                {...profileForm.register('fullName')}
                className="input"
                placeholder={t('formLabels.fullNamePh')}
              />
            </FormField>
            <div className="flex gap-2.5">
              <FormField label={t('formLabels.age')} htmlFor="patient-reg-age" required className="flex-1">
                <input
                  id="patient-reg-age"
                  {...profileForm.register('age')}
                  type="number"
                  className="input"
                  placeholder={t('formLabels.agePh')}
                />
              </FormField>
              <FormField label={t('formLabels.gender')} htmlFor="patient-reg-gender" required className="flex-1">
                <select
                  id="patient-reg-gender"
                  {...profileForm.register('gender')}
                  className="input"
                  defaultValue=""
                >
                  <option value="" disabled>{t('formLabels.genderPh')}</option>
                  <option value="MALE">{t('profile.male')}</option>
                  <option value="FEMALE">{t('profile.female')}</option>
                  <option value="OTHER">{t('profile.other')}</option>
                </select>
              </FormField>
            </div>
            <div className="flex gap-2.5">
              <FormField label={t('formLabels.height')} htmlFor="patient-reg-height" className="flex-1">
                <input
                  id="patient-reg-height"
                  {...profileForm.register('heightCm')}
                  type="number"
                  className="input"
                  placeholder={t('formLabels.heightPh')}
                />
              </FormField>
              <FormField label={t('formLabels.weight')} htmlFor="patient-reg-weight" className="flex-1">
                <input
                  id="patient-reg-weight"
                  {...profileForm.register('weightKg')}
                  type="number"
                  className="input"
                  placeholder={t('formLabels.weightPh')}
                />
              </FormField>
            </div>
            <FormField label={t('formLabels.bloodGroup')} htmlFor="patient-reg-bloodGroup">
              <select
                id="patient-reg-bloodGroup"
                {...profileForm.register('bloodGroup')}
                className="input"
                defaultValue=""
              >
                <option value="" disabled>{t('formLabels.bloodGroupPh')}</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('formLabels.dateOfBirth')} htmlFor="patient-reg-dob">
              <input
                id="patient-reg-dob"
                {...extendedForm.register('dateOfBirth')}
                className="input"
                type="date"
                placeholder={t('formLabels.dateOfBirthPh')}
              />
            </FormField>
            <FormField label={t('formLabels.address')} htmlFor="patient-reg-address">
              <input
                id="patient-reg-address"
                {...extendedForm.register('address')}
                className="input"
                placeholder={t('formLabels.addressPh')}
              />
            </FormField>
            <FormField label={t('formLabels.emergencyContact')} htmlFor="patient-reg-emergency">
              <input
                id="patient-reg-emergency"
                {...extendedForm.register('emergencyContact')}
                className="input"
                placeholder={t('formLabels.emergencyContactPh')}
              />
            </FormField>
            <button type="submit" className="btn-primary">{t('common.next')}</button>
          </form>
        ) : (
          <MedicalHistoryForm
            submitLabel={loading ? t('common.loading') : t('patientReg.finish')}
            loading={loading}
            onSubmit={proceedToOtp}
          />
        )}
      </div>
    </Layout>
  )
}

const emptyDoctorDetails = {
  hospital: '',
  experienceYears: '',
  consultationFee: '',
  clinicAddress: '',
}

export const finalizeDoctorRegistrationData = (
  mobile: string,
  dispatch: ReturnType<typeof useAppDispatch>,
) => {
  const draft = readRegisterDraft()
  const password = readDoctorRegPassword()
  registerMobile(mobile, 'doctor')
  resolveDoctorIdForLogin(mobile)
  if (draft.email && password) {
    saveDoctorCredentials(draft.email, mobile, password)
  }
  setDocProfileComplete()
  setDoctorPendingPractice(false)
  clearDoctorRegPassword()
  setOtpVerified(false)
  dispatch(logout())
  useDoctorDashboardStore.getState().setCases([])
  useOnboardingStore.getState().setUserRole('doctor')
  dispatch(setRole('DOCTOR'))
}

export const goToLoginAfterDoctorRegistration = (navigate: ReturnType<typeof useNavigate>) => {
  removeStorage(storageKeys.registerDraft)
  clearRegistrationSession()
  navigate('/login', { replace: true, state: { registrationComplete: true } })
}

export const DoctorRegistrationPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const draft = readRegisterDraft()
  const mobile = draft.mobile ?? ''
  const showRegistrationSuccess = Boolean(
    (location.state as { showRegistrationSuccess?: boolean } | null)?.showRegistrationSuccess,
  )

  useEffect(() => {
    if (!showRegistrationSuccess) return
    const timer = window.setTimeout(() => {
      goToLoginAfterDoctorRegistration(navigate)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [showRegistrationSuccess, navigate])

  const detailsForm = useForm({
    resolver: zodResolver(doctorDetailsSchema),
    defaultValues: {
      hospital: draft.hospital ?? '',
      experienceYears: draft.experienceYears ?? '',
      consultationFee: draft.consultationFee ?? '',
      clinicAddress: draft.clinicAddress ?? '',
    },
  })

  const proceedToOtp = async (details: z.infer<typeof doctorDetailsSchema>) => {
    const phone = formatIndianPhone(mobile) ?? mobile
    const password = readDoctorRegPassword()
    if (!phone || !draft.fullName || !password || !draft.specialization || !draft.registrationNumber) {
      navigate('/login?tab=register', { replace: true })
      return
    }
    setLoading(true)
    try {
      const profile: DoctorProfileRecord = {
        fullName: draft.fullName ?? '',
        specialization: draft.specialization ?? '',
        registrationNumber: draft.registrationNumber ?? '',
        email: draft.email ?? '',
        hospital: details.hospital,
        experienceYears: details.experienceYears,
        consultationFee: details.consultationFee,
        clinicAddress: details.clinicAddress,
      }
      writeDoctorProfile(profile)
      writeRegisterDraft({
        ...draft,
        mobile: phone,
        hospital: details.hospital,
        experienceYears: details.experienceYears,
        consultationFee: details.consultationFee,
        clinicAddress: details.clinicAddress,
      })
      setDoctorPendingPractice(true)
      setFlowSession(storageKeys.pendingIsNewUser, 'true')
      persistLastMobile(phone)
      await registerDoctor({
        fullName: draft.fullName,
        phone,
        email: draft.email,
        password,
        specialization: draft.specialization,
        licenseNumber: draft.registrationNumber,
        clinicName: details.hospital,
        clinicAddress: details.clinicAddress,
        yearsOfExperience: Number(details.experienceYears) || undefined,
        consultationFee: Number(details.consultationFee) || undefined,
      })
      navigate('/otp', { replace: true })
    } catch {
      showToast(t('login.unableToProcess'))
    } finally {
      setLoading(false)
    }
  }

  if (!draft.fullName || !draft.specialization || !draft.registrationNumber || !draft.mobile) {
    return <Navigate to="/login?tab=register" replace />
  }

  const canAccessDoctorRegister =
    isDoctorPendingPractice() ||
    showRegistrationSuccess ||
    (Boolean(draft.fullName && draft.mobile && draft.specialization) && Boolean(readDoctorRegPassword()))

  if (!canAccessDoctorRegister) {
    return <Navigate to="/login?tab=register" replace />
  }

  if (showRegistrationSuccess) {
    return (
      <Layout hideNav>
        <div className="min-h-screen bg-[#F9FAFB]" />
        <RegistrationSuccessModal
          open
          isDoctor
          onGoToLogin={() => goToLoginAfterDoctorRegistration(navigate)}
        />
      </Layout>
    )
  }

  return (
    <Layout hideNav>
      <div className="min-h-screen bg-[#F9FAFB] pb-8">
        <div className="page-padding space-y-5 pt-4">
          <AuthFlowHeader
            title={t('doctorReg.title')}
            subtitle={t('doctorReg.subtitle')}
            onBack={() => navigate('/login?tab=register')}
            right={<RoleBadge role="doctor" />}
          />

          <form className="space-y-4" onSubmit={detailsForm.handleSubmit((values) => void proceedToOtp(values))}>
            <FormField
              label={t('formLabels.hospital')}
              htmlFor="doctor-reg-hospital"
              required
              hint={t('doctorReg.hospitalHint')}
            >
              <input
                id="doctor-reg-hospital"
                {...detailsForm.register('hospital')}
                className="input"
                placeholder={t('formLabels.hospitalPh')}
                autoComplete="organization"
              />
            </FormField>
            <FormField label={t('formLabels.experienceYears')} htmlFor="doctor-reg-experience" required>
              <input
                id="doctor-reg-experience"
                {...detailsForm.register('experienceYears')}
                className="input"
                inputMode="numeric"
                placeholder={t('formLabels.experienceYearsPh')}
              />
            </FormField>
            <FormField label={t('formLabels.consultationFee')} htmlFor="doctor-reg-fee" required>
              <input
                id="doctor-reg-fee"
                {...detailsForm.register('consultationFee')}
                className="input"
                placeholder={t('formLabels.consultationFeePh')}
              />
            </FormField>
            <FormField
              label={t('formLabels.clinicAddress')}
              htmlFor="doctor-reg-clinicAddress"
              required
              hint={t('doctorReg.clinicAddressHint')}
            >
              <input
                id="doctor-reg-clinicAddress"
                {...detailsForm.register('clinicAddress')}
                className="input"
                placeholder={t('formLabels.clinicAddressPh')}
                autoComplete="street-address"
              />
            </FormField>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <LoadingSpinner size={20} /> : t('doctorReg.continueToOtp')}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}

export const PatientMyProfilePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const profile = useAppSelector((state) => state.patient.profile)
  const extended = readPatientExtendedProfile()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  // Fetch fresh profile from backend on mount so fields don't show "Not provided"
  // after login on a new device or when localStorage was cleared
  useEffect(() => {
    getProfile()
      .then((fetchedProfile) => dispatch(setProfile(fetchedProfile)))
      .catch(() => {})
  }, [])

  const buildProfileValues = () => ({
    fullName: profile?.fullName ?? '',
    age: profile?.age ?? undefined,
    gender: (profile?.gender ?? '') as '' | Gender,
    heightCm: profile?.heightCm ?? undefined,
    weightKg: profile?.weightKg ?? undefined,
    bloodGroup: (profile?.bloodGroup ?? '') as '' | BloodGroup,
  })

  const buildExtendedValues = () => ({
    email: extended?.email ?? '',
    dateOfBirth: extended?.dateOfBirth ?? '',
    address: extended?.address ?? '',
    emergencyContact: extended?.emergencyContact ?? '',
  })

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: buildProfileValues(),
  })

  const extendedForm = useForm({
    resolver: zodResolver(extendedProfileSchema),
    defaultValues: buildExtendedValues(),
  })

  const resetFormsToSaved = () => {
    form.reset(buildProfileValues())
    extendedForm.reset(buildExtendedValues())
  }

  const hasUnsavedChanges = form.formState.isDirty || extendedForm.formState.isDirty
  const exitEditMode = () => {

    
    if (hasUnsavedChanges && !window.confirm(t('myProfile.discardChanges'))) {
      
      return false
    }
    resetFormsToSaved()
    setEditing(false)
    return true
  }

  const enterEditMode = () => {
    resetFormsToSaved()
    setEditing(true)
  }

  const handleEditToggle = () => {
    if (editing) {
      exitEditMode()
    } else {
      enterEditMode()
    }
  }

  const saveProfile = async () => {
    
    const profileValid = await form.trigger()
    const extendedValid = await extendedForm.trigger()
    if (!profileValid || !extendedValid) {
      return
    }

    setLoading(true)
    try {
      const values = form.getValues()
      const ext = extendedForm.getValues()
      const nextProfile = await updateProfile({
        id: profile?.id,
        ...values,
        gender: values.gender as Gender,
        bloodGroup: values.bloodGroup as BloodGroup,
      })
      dispatch(setProfile(nextProfile))

      
      writePatientExtendedProfile(ext as PatientExtendedProfile)
      form.reset(values)
      extendedForm.reset(ext)
      showToast(t('toast.profileUpdated'))
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const InfoRow = ({ label, value }: { label: string; value?: string | number }) => (
    <div className="flex justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">
        {value !== undefined && value !== '' ? value : t('myProfile.notProvided')}
      </span>
    </div>
  )

  const firstName = profile?.fullName?.split(' ')[0] ?? 'User'
  const initials = (profile?.fullName ?? 'U').split(/\s+/).filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Layout>
      <div className="bg-background pb-8">
        {/* Hero section */}
        <div className="rounded-b-[32px] bg-gradient-to-br from-primary to-primaryDark px-5 pb-7 pt-5 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (editing && !exitEditMode()) {
                  return
                }
                navigate('/home')
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-base font-bold text-white">{t('myProfile.title')}</h1>
            <button
              type="button"
              className={classNames(
                'flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm',
                editing ? 'bg-white/30 text-white' : 'bg-white/20 text-white',
              )}
              onClick={handleEditToggle}
              aria-label={t('myProfile.edit')}
              aria-pressed={editing}
            >
              <Pencil size={16} />
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-extrabold text-white backdrop-blur-sm ring-4 ring-white/30">
              {initials}
            </div>
            <p className="mt-3 text-lg font-bold text-white">{profile?.fullName ?? firstName}</p>
            <p className="text-sm text-white/70">{profile?.bloodGroup ? `Blood: ${profile.bloodGroup}` : t('myProfile.subtitle')}</p>
          </div>
        </div>

        <div className="page-padding pt-5">

        {editing ? (
          <form className="space-y-6" onSubmit={form.handleSubmit(() => void saveProfile())} noValidate>
            <div className="card space-y-4 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('myProfile.basicSection')}
              </p>
              <FormField
                label={t('formLabels.fullName')}
                htmlFor="my-profile-fullName"
                required
                error={form.formState.errors.fullName ? t('validation.fullName') : undefined}
              >
                <input
                  id="my-profile-fullName"
                  {...form.register('fullName')}
                  className="input"
                  placeholder={t('formLabels.fullNamePh')}
                />
              </FormField>
              <div className="flex gap-2.5">
                <FormField
                  label={t('formLabels.age')}
                  htmlFor="my-profile-age"
                  required
                  className="flex-1"
                  error={form.formState.errors.age ? t('validation.age') : undefined}
                >
                  <input
                    id="my-profile-age"
                    {...form.register('age')}
                    type="number"
                    min={1}
                    max={120}
                    className="input"
                    placeholder={t('formLabels.agePh')}
                  />
                </FormField>
                <FormField
                  label={t('formLabels.gender')}
                  htmlFor="my-profile-gender"
                  required
                  className="flex-1"
                  error={form.formState.errors.gender ? t('validation.gender') : undefined}
                >
                  <select id="my-profile-gender" {...form.register('gender')} className="input" defaultValue="">
                    <option value="" disabled>
                      {t('formLabels.genderPh')}
                    </option>
                    <option value="MALE">{t('profile.male')}</option>
                    <option value="FEMALE">{t('profile.female')}</option>
                    <option value="OTHER">{t('profile.other')}</option>
                  </select>
                </FormField>
              </div>
              <div className="flex gap-2.5">
                <FormField
                  label={t('formLabels.height')}
                  htmlFor="my-profile-height"
                  required
                  className="flex-1"
                  error={form.formState.errors.heightCm ? t('validation.height') : undefined}
                >
                  <input
                    id="my-profile-height"
                    {...form.register('heightCm')}
                    type="number"
                    min={50}
                    max={250}
                    className="input"
                    placeholder={t('formLabels.heightPh')}
                  />
                </FormField>
                <FormField
                  label={t('formLabels.weight')}
                  htmlFor="my-profile-weight"
                  required
                  className="flex-1"
                  error={form.formState.errors.weightKg ? t('validation.weight') : undefined}
                >
                  <input
                    id="my-profile-weight"
                    {...form.register('weightKg')}
                    type="number"
                    min={10}
                    max={250}
                    className="input"
                    placeholder={t('formLabels.weightPh')}
                  />
                </FormField>
              </div>
              <FormField
                label={t('formLabels.bloodGroup')}
                htmlFor="my-profile-bloodGroup"
                required
                error={form.formState.errors.bloodGroup ? t('validation.bloodGroup') : undefined}
              >
                <select id="my-profile-bloodGroup" {...form.register('bloodGroup')} className="input" defaultValue="">
                  <option value="" disabled>
                    {t('formLabels.bloodGroupPh')}
                  </option>
                  {(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="card space-y-4 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('myProfile.contactSection')}
              </p>
              <FormField
                label={t('patientReg.email')}
                htmlFor="my-profile-email"
                error={extendedForm.formState.errors.email ? t('validation.email') : undefined}
              >
                <input
                  id="my-profile-email"
                  {...extendedForm.register('email')}
                  className="input"
                  type="email"
                  placeholder={t('formLabels.emailPh')}
                />
              </FormField>
              <FormField label={t('patientReg.dob')} htmlFor="my-profile-dob">
                <input
                  id="my-profile-dob"
                  {...extendedForm.register('dateOfBirth')}
                  className="input"
                  type="date"
                />
              </FormField>
              <FormField label={t('patientReg.address')} htmlFor="my-profile-address">
                <input
                  id="my-profile-address"
                  {...extendedForm.register('address')}
                  className="input"
                  placeholder={t('formLabels.addressPh')}
                />
              </FormField>
              <FormField label={t('patientReg.emergency')} htmlFor="my-profile-emergency">
                <input
                  id="my-profile-emergency"
                  {...extendedForm.register('emergencyContact')}
                  className="input"
                  inputMode="numeric"
                  placeholder={t('formLabels.emergencyContactPh')}
                />
              </FormField>
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" disabled={loading} onClick={() => exitEditMode()}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? <LoadingSpinner size={20} /> : t('common.save')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="card mb-4 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('myProfile.basicSection')}</p>
              <InfoRow label={t('formLabels.fullName')} value={profile?.fullName} />
              <InfoRow label={t('formLabels.age')} value={profile?.age} />
              <InfoRow
                label={t('formLabels.gender')}
                value={
                  profile?.gender === 'MALE'
                    ? t('profile.male')
                    : profile?.gender === 'FEMALE'
                      ? t('profile.female')
                      : profile?.gender === 'OTHER'
                        ? t('profile.other')
                        : undefined
                }
              />
              <InfoRow label={t('formLabels.height')} value={profile?.heightCm ? `${profile.heightCm} cm` : undefined} />
              <InfoRow label={t('formLabels.weight')} value={profile?.weightKg ? `${profile.weightKg} kg` : undefined} />
              <InfoRow label={t('formLabels.bloodGroup')} value={profile?.bloodGroup} />
            </div>
            <div className="card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('myProfile.contactSection')}</p>
              <InfoRow label={t('patientReg.email')} value={extended?.email} />
              <InfoRow label={t('patientReg.dob')} value={extended?.dateOfBirth} />
              <InfoRow label={t('patientReg.address')} value={extended?.address} />
              <InfoRow label={t('patientReg.emergency')} value={extended?.emergencyContact} />
            </div>
          </>
        )}

        <button
          type="button"
          className="btn-secondary mt-6 flex w-full items-center justify-center gap-2"
          onClick={() => {
            dispatch(logout())
            navigate('/welcome')
          }}
        >
          <LogOut size={18} />
          {t('myProfile.logout')}
        </button>
        </div>{/* close page-padding */}
      </div>
    </Layout>
  )
}

export const NotificationsPage = ({ role: roleProp }: { role?: 'PATIENT' | 'DOCTOR' }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const authRole = useAppSelector((state) => state.auth.user?.role)
  const role = roleProp ?? (authRole === 'DOCTOR' ? 'DOCTOR' : 'PATIENT')
  const [items, setItems] = useState<AppNotification[]>(() => getNotificationsForRole(role))

  const refresh = () => setItems(getNotificationsForRole(role))
  const unreadCount = items.filter((item) => !item.isRead).length

  return (
    <Layout>
      <div className="page-padding bg-background pb-8">
        <AuthFlowHeader
          title={t('notifications.title')}
          onBack={() => navigate(role === 'DOCTOR' ? '/doctor-dashboard' : '/home')}
          right={
            unreadCount > 0 ? (
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => { markAllRead(role); refresh() }}>
                {t('notifications.markAllRead')}
              </button>
            ) : null
          }
        />
        {items.length ? (
          <div className="space-y-2.5">
            {items.map((item) => (
              <button
                key={item.notificationId}
                type="button"
                onClick={() => {
                  markNotificationRead(item.notificationId)
                  refresh()
                  if (item.route) navigate(item.route)
                }}
                className={classNames(
                  'w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all active:scale-[0.99]',
                  !item.isRead ? 'border-primary/25 shadow-[0_2px_12px_rgba(26,115,232,0.08)]' : 'border-border',
                )}
              >
                <div className={classNames(
                  'border-l-4 p-4',
                  !item.isRead ? 'border-primary' : 'border-transparent',
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {!item.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <p className="font-semibold text-foreground">{item.title}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
              <Bell size={40} className="text-primary/40" strokeWidth={1.5} />
            </div>
            <p className="font-medium text-foreground">{t('notifications.empty')}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
