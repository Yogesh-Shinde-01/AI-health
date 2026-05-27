import client from '@/services/apiClient'
import { delay, readDoctorProfile, writeDoctorProfile, type DoctorProfileRecord } from '@/utils'
import type { MatchedDoctor } from '@/types/doctors'

export interface DoctorProfileUpdateInput {
  fullName: string
  mobile: string
  email: string
  profilePictureUrl: string
  specialization: string
  hospital: string
  consultationFee: string
}

interface BackendDoctorListItem {
  id: string
  fullName: string
  specialization: string
  clinicName: string | null
  consultationFee: number | null
  rating: number | null
  yearsOfExperience: number | null
  availability: boolean
}

const mapToMatchedDoctor = (d: BackendDoctorListItem): MatchedDoctor => ({
  id: d.id,
  name: d.fullName,
  specialization: d.specialization,
  hospital: d.clinicName ?? '',
  experience: d.yearsOfExperience ?? 0,
  consultationFee: d.consultationFee ?? 0,
  rating: d.rating ?? 0,
  availableToday: d.availability,
  nextAvailable: d.availability ? 'Today' : 'Soon',
})

/** Fetch the authenticated doctor's own profile from the backend. */
export const getDoctorProfile = async (): Promise<DoctorProfileRecord | null> => {
  try {
    const response = await client.get<DoctorProfileRecord>('/doctor/profile')
    return response.data
  } catch {
    return null
  }
}

/** Fetch doctors filtered by specialization from the backend. Falls back to General Physician if none found. */
export const getDoctorsBySpecialization = async (
  specialization: string,
): Promise<{ doctors: MatchedDoctor[]; usedFallback: boolean; effectiveSpecialization: string }> => {
  try {
    const response = await client.get<{ success: boolean; data: BackendDoctorListItem[] }>('/doctors', {
      params: { specialization },
    })
    let doctors = (response.data.data ?? []).map(mapToMatchedDoctor)
    let effective = specialization
    let usedFallback = false

    if (doctors.length === 0 && specialization !== 'General Physician') {
      const fallback = await client.get<{ success: boolean; data: BackendDoctorListItem[] }>('/doctors', {
        params: { specialization: 'General Physician' },
      })
      doctors = (fallback.data.data ?? []).map(mapToMatchedDoctor)
      effective = 'General Physician'
      usedFallback = true
    }

    return { doctors, usedFallback, effectiveSpecialization: effective }
  } catch {
    return { doctors: [], usedFallback: false, effectiveSpecialization: specialization }
  }
}

/** Fetch the public list of available doctors (for patient-side doctor selection). */
export const getDoctors = async (): Promise<Array<{ id: string; name: string }>> => {
  try {
    const response = await client.get<{ success: boolean; data: Array<{ id: string; fullName: string }> }>('/doctors')
    return (response.data.data ?? []).map((d) => ({ id: d.id, name: d.fullName }))
  } catch {
    return []
  }
}

export const updateDoctorProfile = async (data: DoctorProfileUpdateInput): Promise<DoctorProfileRecord> => {
  try {
    const response = await client.patch<DoctorProfileRecord>('/doctor/update-profile', data)
    writeDoctorProfile(response.data)
    return response.data
  } catch {
    await delay()
    const current = readDoctorProfile()
    const next: DoctorProfileRecord = {
      fullName: data.fullName,
      specialization: data.specialization,
      registrationNumber: current?.registrationNumber ?? '',
      hospital: data.hospital,
      experienceYears: current?.experienceYears ?? '',
      consultationFee: data.consultationFee,
      email: data.email,
      mobile: data.mobile,
      profilePictureUrl: data.profilePictureUrl,
      clinicAddress: current?.clinicAddress,
      availableDays: current?.availableDays,
      consultationHoursFrom: current?.consultationHoursFrom,
      consultationHoursTo: current?.consultationHoursTo,
    }
    writeDoctorProfile(next)
    return next
  }
}
