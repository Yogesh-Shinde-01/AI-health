import client from '@/services/apiClient'
import type { CaseStatus } from '@/types/doctors'
import type {
  Consultation,
  ConsultationSubmissionResponse,
  SubmitConsultationPayload,
} from '@/types'
import { useDoctorDashboardStore } from '@/store/slices/doctorDashboardStore'
import { getPendingCases } from '@/utils/doctorDashboard'
import { notifyDoctorNewCase } from '@/utils/notifications'
import {
  buildAiSummary,
  delay,
  generateId,
  getMockConsultations,
  getMockAiQuestions,
  readStorage,
  saveMockConsultations,
  storageKeys,
} from '@/utils'
import {
  filterConsultationsForDoctor,
  filterConsultationsForPatient,
  getCurrentDoctorId,
  getCurrentPatientId,
} from '@/utils/userScope'
import type { Patient } from '@/types'

export const submitConsultation = async (
  data: SubmitConsultationPayload,
): Promise<ConsultationSubmissionResponse> => {
  try {
    const response = await client.post<ConsultationSubmissionResponse>('/consultations', data)
    return response.data
  } catch {
    await delay()
    const consultations = getMockConsultations()
    const aiSummary = buildAiSummary(data.symptoms, data.aiAnswers)
    const resolvedRisk = data.riskLevel ?? aiSummary.riskLevel
    const aiSummaryResolved = { ...aiSummary, riskLevel: resolvedRisk }
    const existingIndex = data.consultationId
      ? consultations.findIndex((item) => item.id === data.consultationId)
      : -1

    const profile =
      readStorage<Patient | null>(storageKeys.profile, null) ??
      ({
        id: getCurrentPatientId() ?? generateId('patient'),
        fullName: 'Patient',
        age: 0,
        gender: 'OTHER',
        heightCm: 0,
        weightKg: 0,
      } satisfies Patient)
    const submittedAt = new Date().toISOString()
    const nextConsultation: Consultation = {
      ...(existingIndex >= 0 ? consultations[existingIndex] : {}),
      id: existingIndex >= 0 ? consultations[existingIndex].id : generateId('consultation'),
      symptoms: data.symptoms,
      additionalNotes: data.additionalNotes,
      aiAnswers: data.aiAnswers,
      aiSummary: aiSummaryResolved,
      riskLevel: resolvedRisk,
      status: 'PENDING',
      caseStatus: 'PENDING_REVIEW',
      createdAt: existingIndex >= 0 ? consultations[existingIndex].createdAt : submittedAt,
      patientId: data.patientId ?? profile.id,
      patientName: profile.fullName,
      patientAge: profile.age,
      patientGender: profile.gender,
      doctorId: data.doctorId,
      doctorName: '',
      recommendedSpecialization: data.recommendedSpecialization,
      statusTimeline: [{ status: 'PENDING_REVIEW', at: submittedAt }],
      possibleCause: aiSummaryResolved.possibleCause,
      symptomList: data.symptoms
        .split(/[.,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
      medicalHistory: readStorage(storageKeys.medicalHistory, {
        chronicDiseases: [],
        allergies: [],
        currentMedicines: [],
      }),
    }

    if (existingIndex >= 0) {
      consultations[existingIndex] = nextConsultation
    } else {
      consultations.unshift(nextConsultation)
    }

    saveMockConsultations(consultations)
    useDoctorDashboardStore.getState().upsertCase(nextConsultation)

    if (data.doctorId) {
      notifyDoctorNewCase({
        doctorId: data.doctorId,
        patientName: profile.fullName,
        riskLevel: resolvedRisk,
        caseId: nextConsultation.id,
        symptomSnippet: data.symptoms.slice(0, 80),
      })
    }

    return {
      consultationId: nextConsultation.id,
      aiQuestions: getMockAiQuestions(),
      aiSummary: aiSummaryResolved,
      riskLevel: resolvedRisk,
      consultation: nextConsultation,
    }
  }
}

export const getConsultations = async (): Promise<Consultation[]> => {
  try {
    const response = await client.get<Consultation[]>('/consultations')
    return response.data
  } catch {
    await delay()
    const patientId = getCurrentPatientId()
    if (!patientId) {
      return []
    }
    return filterConsultationsForPatient(getMockConsultations(), patientId)
  }
}

export const getConsultation = async (id: string): Promise<Consultation> => {
  try {
    const response = await client.get<Consultation>(`/consultations/${id}`)
    return response.data
  } catch {
    await delay()
    const consultation = getMockConsultations().find((item) => item.id === id)
    if (!consultation) {
      throw new Error('Consultation not found')
    }
    return consultation
  }
}

export const getPendingConsultations = async (): Promise<Consultation[]> => {
  try {
    const response = await client.get<Consultation[]>('/consultations/pending')
    return response.data
  } catch {
    await delay()
    const doctorId = getCurrentDoctorId()
    if (!doctorId) {
      return []
    }
    const scoped = filterConsultationsForDoctor(getMockConsultations(), doctorId)
    return getPendingCases(scoped)
  }
}

/** All cases for the logged-in doctor (single source for dashboard stats). */
export const getDoctorConsultations = async (): Promise<Consultation[]> => {
  try {
    const response = await client.get<Consultation[]>('/consultations/doctor')
    return response.data
  } catch {
    await delay()
    const doctorId = getCurrentDoctorId()
    if (!doctorId) {
      return []
    }
    const scoped = filterConsultationsForDoctor(getMockConsultations(), doctorId)
    return [...scoped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}

export const updateConsultationCaseStatus = async (
  id: string,
  caseStatus: CaseStatus,
  extra?: Partial<Consultation>,
): Promise<Consultation> => {
  try {
    const response = await client.patch<Consultation>(`/consultations/${id}/status`, {
      caseStatus,
      ...extra,
    })
    return response.data
  } catch {
    await delay()
    const consultations = getMockConsultations()
    const index = consultations.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('Consultation not found')
    }
    const at = new Date().toISOString()
    const timeline = [...(consultations[index].statusTimeline ?? []), { status: caseStatus, at }]
    let status = consultations[index].status
    if (caseStatus === 'PRESCRIPTION_READY') {
      status = 'REVIEWED'
    }
    if (caseStatus === 'CLOSED') {
      status = 'CLOSED'
    }
    const next: Consultation = {
      ...consultations[index],
      ...extra,
      caseStatus,
      statusTimeline: timeline,
      status,
    }
    consultations[index] = next
    saveMockConsultations(consultations)
    useDoctorDashboardStore.getState().upsertCase(next)
    return next
  }
}
