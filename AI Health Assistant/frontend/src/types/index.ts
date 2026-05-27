export type UserRole = 'PATIENT' | 'DOCTOR'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type ConsultationStatus = 'PENDING' | 'REVIEWED' | 'CLOSED'

export type { CaseStatus, MatchedDoctor, AppNotification, NotificationType } from '@/types/doctors'
export type PrescriptionStatus = 'DRAFT' | 'APPROVED'
export type FollowUpStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface User {
  id: string
  mobile: string
  role: UserRole
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface Patient {
  id: string
  fullName: string
  age: number
  gender: Gender
  heightCm: number
  weightKg: number
  bloodGroup?: BloodGroup
}

export interface MedicalHistory {
  chronicDiseases: string[]
  allergies: string[]
  currentMedicines: string[]
}

export interface AiQuestion {
  question: string
  options: string[]
}

export interface AiSummary {
  possibleCause: string
  riskLevel: RiskLevel
  suggestedTests: string[]
  followUpQuestions: AiQuestion[]
}

export interface Consultation {
  id: string
  symptoms: string
  additionalNotes?: string
  aiAnswers?: Record<string, string>
  aiSummary?: AiSummary
  riskLevel?: RiskLevel
  status: ConsultationStatus
  createdAt: string
  patientId?: string
  patientName?: string
  patientAge?: number
  patientGender?: Gender
  doctorName?: string
  qualification?: string
  possibleCause?: string
  symptomList?: string[]
  medicalHistory?: MedicalHistory
  doctorId?: string
  recommendedSpecialization?: string
  caseStatus?: import('@/types/doctors').CaseStatus
  statusTimeline?: Array<{ status: import('@/types/doctors').CaseStatus; at: string }>
  reviewedAt?: string
}

export interface Medicine {
  name: string
  dosage: string
  frequency: string
  duration: string
}

export interface Prescription {
  id: string
  consultationId: string
  diagnosis: string
  medicines: Medicine[]
  advice?: string
  ors?: string
  status: PrescriptionStatus
  doctorName?: string
  approvedAt?: string
  qualification?: string
  registrationNumber?: string
  patientName?: string
  patientAge?: number
  patientGender?: Gender
  dateTime?: string
}

export interface FollowUp {
  id: string
  doctorId: string
  scheduledAt: string
  notes?: string
  status: FollowUpStatus
}

export interface LoginVerificationResponse {
  user: User
  token: string
  isNewUser: boolean
}

export interface SubmitConsultationPayload {
  consultationId?: string | null
  symptoms: string
  additionalNotes?: string
  aiAnswers?: Record<string, string>
  /** When set, mock API persists this risk instead of inferring from text only */
  riskLevel?: RiskLevel | null
  doctorId?: string
  recommendedSpecialization?: string
  patientId?: string
}

export interface ConsultationSubmissionResponse {
  consultationId: string
  aiQuestions: AiQuestion[]
  aiSummary: AiSummary
  riskLevel: RiskLevel
  consultation: Consultation
}

export interface PrescriptionPayload {
  consultationId: string
  diagnosis: string
  medicines: Medicine[]
  advice?: string
  ors?: string
  dateTime?: string
  status?: PrescriptionStatus
}

export interface PrescriptionFormValues {
  diagnosis: string
  medicines: Medicine[]
  advice: string
  ors: string
  dateTime: string
}

export interface FollowUpPayload {
  doctorId: string
  scheduledAt: string
  notes?: string
}

export interface LanguageOption {
  code: string
  label: string
  nativeLabel: string
}

export type {
  ChillsAnswer,
  FeverAnswer,
  FeverDuration,
  SymptomQuestionData,
  TemperatureBand,
} from '@/types/symptomFlow'
export { computeRiskFromSymptomData, initialSymptomQuestionData } from '@/types/symptomFlow'
