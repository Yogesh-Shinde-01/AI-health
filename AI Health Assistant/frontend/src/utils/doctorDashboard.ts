import type { Consultation } from '@/types'
import type { CaseStatus } from '@/types/doctors'
import { formatDate } from '@/utils'

export type DoctorPatientsFilter = 'all' | 'pending' | 'reviewed' | 'today'

export type DoctorStatKey = 'pending' | 'reviewed' | 'today' | 'total'

export interface DoctorDashboardStats {
  pending: number
  reviewed: number
  today: number
  total: number
}

const PENDING_STATUSES: CaseStatus[] = ['PENDING_REVIEW', 'UNDER_REVIEW', 'NEED_MORE_INFO']
const REVIEWED_STATUSES: CaseStatus[] = ['PRESCRIPTION_READY', 'CLOSED']

export const isPendingCase = (item: Consultation): boolean => {
  if (item.caseStatus) {
    return PENDING_STATUSES.includes(item.caseStatus)
  }
  return item.status === 'PENDING'
}

export const isReviewedCase = (item: Consultation): boolean => {
  if (item.caseStatus) {
    return REVIEWED_STATUSES.includes(item.caseStatus)
  }
  return item.status === 'REVIEWED' || item.status === 'CLOSED'
}

export const isTodayCase = (item: Consultation): boolean =>
  new Date(item.createdAt).toDateString() === new Date().toDateString()

export const computeDoctorDashboardStats = (cases: Consultation[]): DoctorDashboardStats => {
  const pending = cases.filter(isPendingCase).length
  const reviewed = cases.filter(isReviewedCase).length
  const today = cases.filter(isTodayCase).length
  return {
    pending,
    reviewed,
    today,
    total: cases.length,
  }
}

export const sortCasesNewestFirst = (cases: Consultation[]): Consultation[] =>
  [...cases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const getPendingCases = (cases: Consultation[]): Consultation[] =>
  sortCasesNewestFirst(cases.filter(isPendingCase))

export const filterCasesByPatientsFilter = (
  cases: Consultation[],
  filter: DoctorPatientsFilter,
): Consultation[] => {
  switch (filter) {
    case 'pending':
      return cases.filter(isPendingCase)
    case 'reviewed':
      return cases.filter(isReviewedCase)
    case 'today':
      return cases.filter(isTodayCase)
    default:
      return cases
  }
}

/** Relative time for case cards (dashboard / patients). */
export const formatCaseRelativeTime = (value: string): string => {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  return formatDate(value)
}

export const formatLastUpdatedLabel = (date: Date | null): string => {
  if (!date) {
    return ''
  }
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  }
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}
