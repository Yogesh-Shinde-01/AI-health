import client from '@/services/apiClient'
import type { Prescription, PrescriptionPayload } from '@/types'
import { updateConsultationCaseStatus } from '@/services/consultationsService'
import {
  delay,
  generateId,
  getMockConsultations,
  getMockPrescriptions,
  readDoctorProfile,
  saveMockPrescriptions,
  setActivePrescriptionId,
} from '@/utils'
import {
  filterPrescriptionsForPatient,
  getCurrentPatientId,
} from '@/utils/userScope'
import { notifyPatientPrescriptionReady } from '@/utils/notifications'

export const getPrescription = async (id: string): Promise<Prescription> => {
  try {
    const response = await client.get<Prescription>(`/prescriptions/${id}`)
    return response.data
  } catch {
    await delay()
    const patientId = getCurrentPatientId()
    const pool = patientId
      ? filterPrescriptionsForPatient(getMockPrescriptions(), patientId)
      : getMockPrescriptions()
    const prescription = pool.find((item) => item.id === id)
    if (!prescription) {
      throw new Error('Prescription not found')
    }
    return prescription
  }
}

export const getPrescriptions = async (): Promise<Prescription[]> => {
  try {
    const response = await client.get<Prescription[]>('/prescriptions')
    return response.data
  } catch {
    await delay()
    const patientId = getCurrentPatientId()
    if (!patientId) {
      return []
    }
    return filterPrescriptionsForPatient(getMockPrescriptions(), patientId)
  }
}

export const createPrescription = async (data: PrescriptionPayload): Promise<Prescription> => {
  try {
    const response = await client.post<Prescription>('/prescriptions', data)
    return response.data
  } catch {
    await delay()
    const prescriptions = getMockPrescriptions()
    const consultation = getMockConsultations().find((item) => item.id === data.consultationId)
    const doctorProfile = readDoctorProfile()

    const prescription: Prescription = {
      id: generateId('prescription'),
      consultationId: data.consultationId,
      diagnosis: data.diagnosis,
      medicines: data.medicines,
      advice: data.advice,
      ors: data.ors,
      status: data.status ?? 'DRAFT',
      doctorName: doctorProfile?.fullName ? `Dr. ${doctorProfile.fullName}` : consultation?.doctorName ?? 'Doctor',
      qualification: doctorProfile?.specialization,
      registrationNumber: doctorProfile?.registrationNumber,
      patientName: consultation?.patientName ?? 'Patient',
      patientAge: consultation?.patientAge ?? 0,
      patientGender: consultation?.patientGender ?? 'OTHER',
      dateTime: data.dateTime ?? new Date().toISOString(),
    }

    prescriptions.unshift(prescription)
    saveMockPrescriptions(prescriptions)
    setActivePrescriptionId(prescription.id)
    return prescription
  }
}

export const updatePrescription = async (
  id: string,
  data: Partial<PrescriptionPayload>,
): Promise<Prescription> => {
  try {
    const response = await client.patch<Prescription>(`/prescriptions/${id}`, data)
    return response.data
  } catch {
    await delay()
    const prescriptions = getMockPrescriptions()
    const index = prescriptions.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('Prescription not found')
    }

    const current = prescriptions[index]
    const next: Prescription = {
      ...current,
      diagnosis: data.diagnosis ?? current.diagnosis,
      medicines: data.medicines ?? current.medicines,
      advice: data.advice ?? current.advice,
      ors: data.ors ?? current.ors,
      dateTime: data.dateTime ?? current.dateTime,
      status: data.status ?? current.status,
    }

    prescriptions[index] = next
    saveMockPrescriptions(prescriptions)
    return next
  }
}

export const approvePrescription = async (id: string): Promise<Prescription> => {
  try {
    const response = await client.patch<Prescription>(`/prescriptions/${id}/approve`)
    return response.data
  } catch {
    await delay()
    const updated = await updatePrescription(id, { status: 'APPROVED' })
    const prescriptions = getMockPrescriptions()
    const index = prescriptions.findIndex((item) => item.id === id)
    if (index >= 0) {
      prescriptions[index] = {
        ...updated,
        status: 'APPROVED',
        approvedAt: new Date().toISOString(),
      }
      saveMockPrescriptions(prescriptions)
      setActivePrescriptionId(id)
      const approved = prescriptions[index]
      const consultation = getMockConsultations().find((c) => c.id === approved.consultationId)
      if (consultation) {
        await updateConsultationCaseStatus(consultation.id, 'PRESCRIPTION_READY', {
          reviewedAt: new Date().toISOString(),
        })
        if (consultation.patientId) {
          notifyPatientPrescriptionReady({
            patientId: consultation.patientId,
            doctorName: consultation.doctorName ?? 'Doctor',
            caseId: consultation.id,
          })
        }
      }
      return approved
    }

    return updated
  }
}

export const downloadPdf = async (id: string): Promise<Blob> => {
  try {
    const response = await client.get<Blob>(`/prescriptions/${id}/pdf`, {
      responseType: 'blob',
    })
    return response.data
  } catch {
    await delay()
    const prescription = await getPrescription(id)
    const lines = [
      `Prescription ID: ${prescription.id}`,
      `Doctor: ${prescription.doctorName ?? ''}`,
      `Diagnosis: ${prescription.diagnosis}`,
      '',
      'Medicines:',
      ...prescription.medicines.map(
        (item) => `- ${item.name}: ${item.dosage}, ${item.frequency}, ${item.duration}`,
      ),
      '',
      `Advice: ${prescription.advice ?? ''}`,
    ]
    return new Blob([lines.join('\n')], { type: 'application/pdf' })
  }
}
