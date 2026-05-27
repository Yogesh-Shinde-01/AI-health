import client from '@/services/apiClient'
import type { Gender, MedicalHistory, Patient } from '@/types'
import {
  delay,
  readStorage,
  storageKeys,
  writeStorage,
} from '@/utils'
import { getCurrentPatientId } from '@/utils/userScope'

const hasToken = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.localStorage.getItem(storageKeys.token))

const emptyMedicalHistory = (): MedicalHistory => ({
  chronicDiseases: [],
  allergies: [],
  currentMedicines: [],
})

const emptyPatientProfile = (patientId: string): Patient => ({
  id: patientId,
  fullName: '',
  age: 0,
  gender: 'OTHER' as Gender,
  heightCm: 0,
  weightKg: 0,
})

export const getProfile = async (): Promise<Patient> => {
  if (hasToken()) {
    try {
      const response = await client.get<Patient>('/patients/me')
      return response.data
    } catch {
      // fall through to local fallback
    }
  }
  await delay()
  const stored = readStorage<Patient | null>(storageKeys.profile, null)
  const patientId = getCurrentPatientId()
  const profile = stored ?? (patientId ? emptyPatientProfile(patientId) : emptyPatientProfile('patient'))
  if (!stored) {
    writeStorage(storageKeys.profile, profile)
  }
  return profile
}

export const updateProfile = async (data: Partial<Patient>): Promise<Patient> => {
  if (hasToken()) {
    try {
      const response = await client.put<Patient>('/patients/me', data)
      return response.data
    } catch {
      // fall through to local fallback
    }
  }
  await delay()
  const patientId = getCurrentPatientId() ?? data.id
  const current =
    readStorage<Patient | null>(storageKeys.profile, null) ??
    (patientId ? emptyPatientProfile(patientId) : emptyPatientProfile('patient'))
  const next = { ...current, ...data, id: data.id ?? current.id ?? patientId ?? 'patient' }
  writeStorage(storageKeys.profile, next)
  return next
}

export const getMedicalHistory = async (): Promise<MedicalHistory> => {
  if (hasToken()) {
    try {
      const response = await client.get<MedicalHistory>('/patients/me/medical-history')
      return response.data
    } catch {
      // fall through to local fallback
    }
  }
  await delay()
  const history = readStorage<MedicalHistory | null>(storageKeys.medicalHistory, null) ?? emptyMedicalHistory()
  if (!readStorage<MedicalHistory | null>(storageKeys.medicalHistory, null)) {
    writeStorage(storageKeys.medicalHistory, history)
  }
  return history
}

export const updateMedicalHistory = async (data: MedicalHistory): Promise<MedicalHistory> => {
  if (hasToken()) {
    try {
      const response = await client.put<MedicalHistory>('/patients/me/medical-history', data)
      return response.data
    } catch {
      // fall through to local fallback
    }
  }
  writeStorage(storageKeys.medicalHistory, data)
  return data
}
