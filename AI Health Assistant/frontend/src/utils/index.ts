import i18n from '@/i18n/i18n'
import { formatIndianPhone } from '@/utils/phone'
import type {
  AiQuestion,
  AiSummary,
  Consultation,
  FollowUp,
  MedicalHistory,
  Prescription,
  RiskLevel,
  UserRole,
} from '@/types'

export const storageKeys = {
  token: 'token',
  authUser: 'ai-health-user',
  role: 'ai-health-role',
  language: 'ai-health-language',
  profile: 'ai-health-profile',
  medicalHistory: 'ai-health-medical-history',
  consultations: 'ai-health-consultations',
  prescriptions: 'ai-health-prescriptions',
  followUps: 'ai-health-followups',
  activePrescriptionId: 'ai-health-active-prescription',
  draftOtp: 'ai-health-draft-otp',
  lastMobile: 'ai-health-last-mobile',
  /** Doctor profile setup completed (persists across logout) */
  docProfileComplete: 'ai-health-doc-profile-complete',
  /** Saved doctor professional profile JSON */
  doctorProfile: 'ai-health-doctor-profile',
  registeredPatientMobiles: 'ai-health-registered-patient-mobiles',
  registeredDoctorMobiles: 'ai-health-registered-doctor-mobiles',
  otpVerified: 'ai-health-otp-verified',
  pendingIsNewUser: 'ai-health-pending-is-new-user',
  patientExtendedProfile: 'ai-health-patient-extended-profile',
  registerDraft: 'ai-health-register-draft',
  notifications: 'ai-health-notifications',
  caseMessages: 'ai-health-case-messages',
  patientAccounts: 'ai-health-patient-accounts',
  doctorAccounts: 'ai-health-doctor-accounts',
  otpSentAt: 'ai-health-otp-sent-at',
  registrationSuccessToast: 'ai-health-registration-success-toast',
  doctorCredentials: 'ai-health-doctor-credentials',
  patientCredentials: 'ai-health-patient-credentials',
  doctorRegAwaitingOtp: 'ai-health-doctor-reg-awaiting-otp',
  doctorRegPassword: 'ai-health-doctor-reg-password',
  patientRegPassword: 'ai-health-patient-reg-password',
  /** Doctor completed account OTP; practice info still required */
  doctorPendingPractice: 'ai-health-doctor-pending-practice',
  patientPendingRegistration: 'ai-health-patient-pending-registration',
  /** Patient account created; awaiting registration OTP on /otp */
  patientAwaitingOtp: 'ai-health-patient-awaiting-otp',
} as const

/** Survive tab refresh during multi-step registration / OTP */
const FLOW_PERSISTENT_KEYS = new Set<string>([
  storageKeys.lastMobile,
  storageKeys.patientPendingRegistration,
  storageKeys.patientAwaitingOtp,
  storageKeys.patientRegPassword,
  storageKeys.doctorPendingPractice,
  storageKeys.doctorRegPassword,
  storageKeys.doctorRegAwaitingOtp,
  storageKeys.otpSentAt,
  storageKeys.pendingIsNewUser,
])

export const setFlowSession = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.sessionStorage.setItem(key, value)
  if (FLOW_PERSISTENT_KEYS.has(key)) {
    window.localStorage.setItem(key, value)
  }
}

export const getFlowSession = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key)
}

export const removeFlowSession = (key: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.sessionStorage.removeItem(key)
  if (FLOW_PERSISTENT_KEYS.has(key)) {
    window.localStorage.removeItem(key)
  }
}

export const readLastMobile = (): string => {
  const stored = getFlowSession(storageKeys.lastMobile) ?? ''
  if (stored) {
    return stored
  }
  return readRegisterDraft().mobile ?? ''
}

export const persistLastMobile = (phone: string): void => {
  if (!phone || typeof window === 'undefined') {
    return
  }
  setFlowSession(storageKeys.lastMobile, phone)
}

export const classNames = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(' ')

export const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const writeStorage = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const removeStorage = (key: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(key)
}

export const delay = (ms = 400): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

export const generateId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`

export const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') {
    return 'mr'
  }
  return window.localStorage.getItem(storageKeys.language) ?? 'mr'
}

export const maskMobile = (mobile: string): string =>
  mobile.length < 6 ? mobile : `${mobile.slice(0, 3)} ${mobile.slice(3, 8)} ${mobile.slice(8)}`

export const formatDate = (value: string): string =>
  new Intl.DateTimeFormat(getInitialLanguage(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat(getInitialLanguage(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export const formatRelativeTime = (value: string): string => {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(diffMs / 60000))

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} hr ago`
  }

  const days = Math.round(hours / 24)
  return `${days} day ago`
}

export const languageOptions = [
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
] satisfies Array<{ code: string; label: string; nativeLabel: string }>

export const getMockAiQuestions = (): AiQuestion[] => [
  {
    question: i18n.t('aiQuestions.mock.fever.question'),
    options: [
      i18n.t('aiQuestions.mock.fever.options.0'),
      i18n.t('aiQuestions.mock.fever.options.1'),
      i18n.t('aiQuestions.mock.fever.options.2'),
    ],
  },
  {
    question: i18n.t('aiQuestions.mock.temperature.question'),
    options: [
      i18n.t('aiQuestions.mock.temperature.options.0'),
      i18n.t('aiQuestions.mock.temperature.options.1'),
      i18n.t('aiQuestions.mock.temperature.options.2'),
      i18n.t('aiQuestions.mock.temperature.options.3'),
      i18n.t('aiQuestions.mock.temperature.options.4'),
    ],
  },
  {
    question: i18n.t('aiQuestions.mock.duration.question'),
    options: [
      i18n.t('aiQuestions.mock.duration.options.0'),
      i18n.t('aiQuestions.mock.duration.options.1'),
      i18n.t('aiQuestions.mock.duration.options.2'),
      i18n.t('aiQuestions.mock.duration.options.3'),
    ],
  },
]

export const deriveRiskLevel = (text: string): RiskLevel => {
  const normalized = text.toLowerCase()
  if (
    normalized.includes('chest') ||
    normalized.includes('breath') ||
    normalized.includes('blood') ||
    normalized.includes('severe')
  ) {
    return 'HIGH'
  }

  if (
    normalized.includes('fever') ||
    normalized.includes('pain') ||
    normalized.includes('headache') ||
    normalized.includes('cold')
  ) {
    return 'MEDIUM'
  }

  return 'LOW'
}

export const buildAiSummary = (symptoms: string, aiAnswers: Record<string, string> = {}): AiSummary => {
  const normalized = symptoms.toLowerCase()
  const riskLevel = deriveRiskLevel(`${symptoms} ${Object.values(aiAnswers).join(' ')}`)

  let possibleCause = i18n.t('mock.causes.general')
  if (normalized.includes('fever')) {
    possibleCause = i18n.t('mock.causes.viralFever')
  } else if (normalized.includes('cold') || normalized.includes('cough')) {
    possibleCause = i18n.t('mock.causes.coldCough')
  } else if (normalized.includes('stomach')) {
    possibleCause = i18n.t('mock.causes.digestive')
  }

  const suggestedTests =
    riskLevel === 'HIGH'
      ? [i18n.t('mock.tests.cbc'), i18n.t('mock.tests.ecg'), i18n.t('mock.tests.physician')]
      : [i18n.t('mock.tests.rest'), i18n.t('mock.tests.temperature'), i18n.t('mock.tests.hydration')]

  return {
    possibleCause,
    riskLevel,
    suggestedTests,
    followUpQuestions: getMockAiQuestions(),
  }
}

export const getMockConsultations = (): Consultation[] =>
  readStorage<Consultation[]>(storageKeys.consultations, [])

export const saveMockConsultations = (items: Consultation[]): void => {
  writeStorage(storageKeys.consultations, items)
}

export const getMockPrescriptions = (): Prescription[] =>
  readStorage<Prescription[]>(storageKeys.prescriptions, [])

export const saveMockPrescriptions = (items: Prescription[]): void => {
  writeStorage(storageKeys.prescriptions, items)
}

export const getMockFollowUps = (): FollowUp[] =>
  readStorage<FollowUp[]>(storageKeys.followUps, [])

export const saveMockFollowUps = (items: FollowUp[]): void => {
  writeStorage(storageKeys.followUps, items)
}

export const getActivePrescriptionId = (): string | null =>
  readStorage<string | null>(storageKeys.activePrescriptionId, null)

export const setActivePrescriptionId = (id: string): void => {
  writeStorage(storageKeys.activePrescriptionId, id)
}

export const getPreferredUserRole = (): UserRole => {
  if (typeof window === 'undefined') {
    return 'PATIENT'
  }
  const stored = window.localStorage.getItem(storageKeys.role)
  return stored === 'DOCTOR' ? 'DOCTOR' : 'PATIENT'
}

export const isDocProfileComplete = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(storageKeys.docProfileComplete) === 'true'

export const setDocProfileComplete = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(storageKeys.docProfileComplete, 'true')
  }
}

export interface PatientExtendedProfile {
  email?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
}

export interface DoctorProfileRecord {
  fullName: string
  specialization: string
  registrationNumber: string
  hospital: string
  experienceYears: string
  consultationFee: string
  email?: string
  mobile?: string
  profilePictureUrl?: string
  clinicAddress?: string
  availableDays?: string[]
  consultationHoursFrom?: string
  consultationHoursTo?: string
}

const normalizeMobile = (mobile: string): string => formatIndianPhone(mobile) ?? mobile.replace(/\s/g, '')

export const getRegisteredMobiles = (role: 'patient' | 'doctor'): string[] =>
  readStorage<string[]>(
    role === 'doctor' ? storageKeys.registeredDoctorMobiles : storageKeys.registeredPatientMobiles,
    [],
  )

export const isMobileRegistered = (mobile: string, role: 'patient' | 'doctor'): boolean => {
  const normalized = normalizeMobile(mobile)
  return getRegisteredMobiles(role).some((m) => normalizeMobile(m) === normalized)
}

export const registerMobile = (mobile: string, role: 'patient' | 'doctor'): void => {
  const key = role === 'doctor' ? storageKeys.registeredDoctorMobiles : storageKeys.registeredPatientMobiles
  const list = getRegisteredMobiles(role)
  const normalized = normalizeMobile(mobile)
  if (!list.some((m) => normalizeMobile(m) === normalized)) {
    writeStorage(key, [...list, normalized])
  }
}

export const setOtpVerified = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  if (value) {
    window.sessionStorage.setItem(storageKeys.otpVerified, 'true')
  } else {
    window.sessionStorage.removeItem(storageKeys.otpVerified)
  }
}

export const isOtpVerified = (): boolean =>
  typeof window !== 'undefined' && window.sessionStorage.getItem(storageKeys.otpVerified) === 'true'

export const readPatientExtendedProfile = (): PatientExtendedProfile | null =>
  readStorage<PatientExtendedProfile | null>(storageKeys.patientExtendedProfile, null)

export const writePatientExtendedProfile = (data: PatientExtendedProfile): void => {
  writeStorage(storageKeys.patientExtendedProfile, data)
}

export const readDoctorProfile = (): DoctorProfileRecord | null =>
  readStorage<DoctorProfileRecord | null>(storageKeys.doctorProfile, null)

export const writeDoctorProfile = (profile: DoctorProfileRecord): void => {
  writeStorage(storageKeys.doctorProfile, profile)
}

/** Clears persisted doctor profile so a new registration starts blank. */
export const clearDoctorSession = (): void => {
  removeStorage(storageKeys.doctorProfile)
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(storageKeys.docProfileComplete)
  }
}

export interface RegisterDraft {
  fullName?: string
  mobile?: string
  email?: string
  specialization?: string
  registrationNumber?: string
  hospital?: string
  experienceYears?: string
  consultationFee?: string
  clinicAddress?: string
}

export interface DoctorCredentialRecord {
  email: string
  mobile: string
  /** @deprecated Legacy plaintext; new records use passwordHash */
  password?: string
  passwordHash?: string
  passwordSalt?: string
}

export interface PatientCredentialRecord {
  email: string
  mobile: string
  password?: string
  passwordHash?: string
  passwordSalt?: string
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export const readDoctorCredentials = (): DoctorCredentialRecord[] =>
  readStorage<DoctorCredentialRecord[]>(storageKeys.doctorCredentials, [])

export const saveDoctorCredentials = async (email: string, mobile: string, password: string): Promise<void> => {
  const { hashPasswordForStorage } = await import('@/services/loginValidation')
  const { passwordHash, passwordSalt } = await hashPasswordForStorage(password)
  const normalizedEmail = normalizeEmail(email)
  const normalizedMobile = normalizeMobile(mobile)
  const list = readDoctorCredentials().filter(
    (item) => normalizeEmail(item.email) !== normalizedEmail && normalizeMobile(item.mobile) !== normalizedMobile,
  )
  list.push({ email: normalizedEmail, mobile: normalizedMobile, passwordHash, passwordSalt })
  writeStorage(storageKeys.doctorCredentials, list)
}

export const readPatientCredentials = (): PatientCredentialRecord[] =>
  readStorage<PatientCredentialRecord[]>(storageKeys.patientCredentials, [])

export const savePatientCredentials = async (email: string, mobile: string, password: string): Promise<void> => {
  const { hashPasswordForStorage } = await import('@/services/loginValidation')
  const { passwordHash, passwordSalt } = await hashPasswordForStorage(password)
  const normalizedEmail = normalizeEmail(email)
  const normalizedMobile = normalizeMobile(mobile)
  const list = readPatientCredentials().filter(
    (item) =>
      normalizeEmail(item.email) !== normalizedEmail && normalizeMobile(item.mobile) !== normalizedMobile,
  )
  list.push({ email: normalizedEmail, mobile: normalizedMobile, passwordHash, passwordSalt })
  writeStorage(storageKeys.patientCredentials, list)
}

/** Resolves a registered doctor mobile for OTP login, or null if not registered. */
export const resolveDoctorMobileForLogin = (mobileInput: string): string | null => {
  const digits = mobileInput.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) {
    return null
  }
  const full = `+91${digits}`
  return isMobileRegistered(full, 'doctor') ? full : null
}

export const isDoctorRegistrationAwaitingOtp = (): boolean =>
  getFlowSession(storageKeys.doctorRegAwaitingOtp) === 'true'

export const setDoctorPendingPractice = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  if (value) {
    setFlowSession(storageKeys.doctorPendingPractice, 'true')
  } else {
    removeFlowSession(storageKeys.doctorPendingPractice)
  }
}

export const isDoctorPendingPractice = (): boolean =>
  getFlowSession(storageKeys.doctorPendingPractice) === 'true'

export const setPatientPendingRegistration = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  if (value) {
    setFlowSession(storageKeys.patientPendingRegistration, 'true')
  } else {
    removeFlowSession(storageKeys.patientPendingRegistration)
  }
}

export const isPatientPendingRegistration = (): boolean =>
  getFlowSession(storageKeys.patientPendingRegistration) === 'true'

export const setPatientAwaitingOtp = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  if (value) {
    setFlowSession(storageKeys.patientAwaitingOtp, 'true')
  } else {
    removeFlowSession(storageKeys.patientAwaitingOtp)
  }
}

export const isPatientAwaitingOtp = (): boolean => getFlowSession(storageKeys.patientAwaitingOtp) === 'true'

export const setDoctorRegistrationAwaitingOtp = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  if (value) {
    setFlowSession(storageKeys.doctorRegAwaitingOtp, 'true')
  } else {
    removeFlowSession(storageKeys.doctorRegAwaitingOtp)
  }
}

export const readDoctorRegPassword = (): string => getFlowSession(storageKeys.doctorRegPassword) ?? ''

export const writeDoctorRegPassword = (password: string): void => {
  if (password) {
    setFlowSession(storageKeys.doctorRegPassword, password)
  }
}

export const clearDoctorRegPassword = (): void => {
  removeFlowSession(storageKeys.doctorRegPassword)
}

export const readPatientRegPassword = (): string => getFlowSession(storageKeys.patientRegPassword) ?? ''

export const writePatientRegPassword = (password: string): void => {
  if (password) {
    setFlowSession(storageKeys.patientRegPassword, password)
  }
}

export const clearPatientRegPassword = (): void => {
  removeFlowSession(storageKeys.patientRegPassword)
}

export const clearPatientRegistrationFlow = (): void => {
  setPatientPendingRegistration(false)
  setPatientAwaitingOtp(false)
  clearPatientRegPassword()
  removeFlowSession(storageKeys.pendingIsNewUser)
}

export const readRegisterDraft = (): RegisterDraft =>
  readStorage<RegisterDraft>(storageKeys.registerDraft, {})

export const writeRegisterDraft = (data: RegisterDraft): void => {
  writeStorage(storageKeys.registerDraft, data)
}

export const getNowIso = (): string => new Date().toISOString()

const OTP_TTL_MS = 5 * 60 * 1000

export const markOtpSent = (): void => {
  if (typeof window !== 'undefined') {
    setFlowSession(storageKeys.otpSentAt, String(Date.now()))
  }
}

export const isOtpExpired = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  const sentAt = getFlowSession(storageKeys.otpSentAt)
  if (!sentAt) {
    return false
  }
  return Date.now() - Number(sentAt) > OTP_TTL_MS
}

/** Clears auth and registration session after new doctor completes signup. */
export const clearRegistrationSession = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  const preserveKeys = [
    storageKeys.language,
    storageKeys.doctorProfile,
    storageKeys.docProfileComplete,
    storageKeys.doctorCredentials,
    storageKeys.registeredDoctorMobiles,
    storageKeys.doctorAccounts,
  ] as const
  const preserved: Record<string, string> = {}
  for (const key of preserveKeys) {
    const value = window.localStorage.getItem(key)
    if (value) {
      preserved[key] = value
    }
  }
  const onboardingSession = window.sessionStorage.getItem('ai-health-onboarding')
  window.sessionStorage.clear()
  window.localStorage.clear()
  for (const [key, value] of Object.entries(preserved)) {
    window.localStorage.setItem(key, value)
  }
  if (onboardingSession) {
    window.sessionStorage.setItem('ai-health-onboarding', onboardingSession)
  }
  removeStorage(storageKeys.registerDraft)
}
