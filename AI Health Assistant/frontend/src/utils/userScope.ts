import type { Consultation, Patient, Prescription, User } from '@/types'
import {
  generateId,
  getMockConsultations,
  getMockPrescriptions,
  isMobileRegistered,
  readStorage,
  removeStorage,
  storageKeys,
  writeStorage,
} from '@/utils'

export interface PatientAccountRecord {
  mobile: string
  patientId: string
  createdAt: string
}

export interface DoctorAccountRecord {
  mobile: string
  doctorId: string
  createdAt: string
}

import { formatIndianPhone } from '@/utils/phone'

const normalizeMobile = (mobile: string): string => formatIndianPhone(mobile) ?? mobile.replace(/\s/g, '')

const readPatientAccounts = (): PatientAccountRecord[] =>
  readStorage<PatientAccountRecord[]>(storageKeys.patientAccounts, [])

const readDoctorAccounts = (): DoctorAccountRecord[] =>
  readStorage<DoctorAccountRecord[]>(storageKeys.doctorAccounts, [])

export const findPatientAccount = (mobile: string): PatientAccountRecord | undefined => {
  const normalized = normalizeMobile(mobile)
  return readPatientAccounts().find((item) => normalizeMobile(item.mobile) === normalized)
}

export const findDoctorAccount = (mobile: string): DoctorAccountRecord | undefined => {
  const normalized = normalizeMobile(mobile)
  return readDoctorAccounts().find((item) => normalizeMobile(item.mobile) === normalized)
}

/** Creates a fresh patient account for first-time registration. */
export const registerPatientAccount = (mobile: string): string => {
  const normalized = normalizeMobile(mobile)
  const patientId = generateId('patient')
  const accounts = readPatientAccounts().filter((item) => normalizeMobile(item.mobile) !== normalized)
  accounts.push({ mobile: normalized, patientId, createdAt: new Date().toISOString() })
  writeStorage(storageKeys.patientAccounts, accounts)
  removeStorage(storageKeys.activePrescriptionId)
  return patientId
}

const linkPatientAccount = (mobile: string, patientId: string): string => {
  const normalized = normalizeMobile(mobile)
  const accounts = readPatientAccounts().filter((item) => normalizeMobile(item.mobile) !== normalized)
  accounts.push({ mobile: normalized, patientId, createdAt: new Date().toISOString() })
  writeStorage(storageKeys.patientAccounts, accounts)
  return patientId
}

const linkDoctorAccount = (mobile: string, doctorId: string): string => {
  const normalized = normalizeMobile(mobile)
  const accounts = readDoctorAccounts().filter((item) => normalizeMobile(item.mobile) !== normalized)
  accounts.push({ mobile: normalized, doctorId, createdAt: new Date().toISOString() })
  writeStorage(storageKeys.doctorAccounts, accounts)
  return doctorId
}

/** Resolves stable patient id for login (creates account only if missing). */
export const resolvePatientIdForLogin = (mobile: string): string => {
  const existing = findPatientAccount(mobile)
  if (existing) {
    return existing.patientId
  }
  const profile = readStorage<Patient | null>(storageKeys.profile, null)
  if (profile?.id && isMobileRegistered(mobile, 'patient')) {
    return linkPatientAccount(mobile, profile.id)
  }
  return registerPatientAccount(mobile)
}

/** Creates or returns doctor account id for registration / login. */
export const resolveDoctorIdForLogin = (mobile: string): string => {
  const existing = findDoctorAccount(mobile)
  if (existing) {
    return existing.doctorId
  }
  return linkDoctorAccount(mobile, generateId('doctor'))
}

export const getAuthUserFromStorage = (): User | null =>
  readStorage<User | null>(storageKeys.authUser, null)

export const getCurrentPatientId = (): string | null => {
  const user = getAuthUserFromStorage()
  return user?.role === 'PATIENT' ? user.id : null
}

export const getCurrentDoctorId = (): string | null => {
  const user = getAuthUserFromStorage()
  return user?.role === 'DOCTOR' ? user.id : null
}

export const isNewPatientAccount = (mobile: string): boolean => {
  const account = findPatientAccount(mobile)
  if (!account) {
    return true
  }
  const patientId = account.patientId
  const hasConsultations = getMockConsultations().some((item) => item.patientId === patientId)
  const consultationIds = new Set(
    getMockConsultations()
      .filter((item) => item.patientId === patientId)
      .map((item) => item.id),
  )
  const hasPrescriptions = getMockPrescriptions().some(
    (item) => item.consultationId && consultationIds.has(item.consultationId),
  )
  return !hasConsultations && !hasPrescriptions
}

export const filterConsultationsForPatient = (
  items: Consultation[],
  patientId: string,
): Consultation[] => items.filter((item) => item.patientId === patientId)

export const filterConsultationsForDoctor = (
  items: Consultation[],
  doctorId: string,
): Consultation[] => items.filter((item) => item.doctorId === doctorId)

export const filterPrescriptionsForPatient = (
  items: Prescription[],
  patientId: string,
): Prescription[] => {
  const consultationIds = new Set(
    filterConsultationsForPatient(getMockConsultations(), patientId).map((item) => item.id),
  )
  return items.filter((item) => consultationIds.has(item.consultationId))
}

export const isDoctorOnlyPath = (pathname: string): boolean =>
  pathname.startsWith('/doctor-') ||
  pathname.startsWith('/create-prescription') ||
  pathname.startsWith('/edit-prescription') ||
  pathname === '/prescription-approved'
