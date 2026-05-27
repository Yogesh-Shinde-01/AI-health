export interface MatchedDoctor {
  id: string
  name: string
  specialization: string
  hospital: string
  experience: number
  consultationFee: number
  rating: number
  availableToday: boolean
  nextAvailable: string
  mobile?: string
}

export type DoctorFilterChip = 'all' | 'available' | 'topRated' | 'lowestFee'

export type CaseStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'NEED_MORE_INFO'
  | 'PRESCRIPTION_READY'
  | 'CLOSED'

export type NotificationType =
  | 'DOCTOR_NEW_CASE'
  | 'PATIENT_PRESCRIPTION_READY'
  | 'DOCTOR_NEED_INFO'
  | 'PATIENT_DOCTOR_MESSAGE'
  | 'PATIENT_UNDER_REVIEW'

export interface AppNotification {
  notificationId: string
  type: NotificationType
  caseId?: string
  senderId?: string
  receiverId: string
  receiverRole: 'PATIENT' | 'DOCTOR'
  title: string
  body: string
  isRead: boolean
  createdAt: string
  route?: string
}
