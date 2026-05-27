import type { AppNotification, NotificationType } from '@/types/doctors'
import { generateId, readStorage, storageKeys, writeStorage } from '@/utils'

const readNotifications = (): AppNotification[] =>
  readStorage<AppNotification[]>(storageKeys.notifications, [])

const saveNotifications = (items: AppNotification[]): void => {
  writeStorage(storageKeys.notifications, items)
}

export const getNotificationsForRole = (role: 'PATIENT' | 'DOCTOR'): AppNotification[] =>
  readNotifications()
    .filter((n) => n.receiverRole === role)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const getUnreadCount = (role: 'PATIENT' | 'DOCTOR'): number =>
  getNotificationsForRole(role).filter((n) => !n.isRead).length

export const pushNotification = (
  payload: Omit<AppNotification, 'notificationId' | 'isRead' | 'createdAt'> & {
    notificationId?: string
    isRead?: boolean
    createdAt?: string
  },
): AppNotification => {
  const item: AppNotification = {
    notificationId: payload.notificationId ?? generateId('notif'),
    type: payload.type,
    caseId: payload.caseId,
    senderId: payload.senderId,
    receiverId: payload.receiverId,
    receiverRole: payload.receiverRole,
    title: payload.title,
    body: payload.body,
    isRead: payload.isRead ?? false,
    createdAt: payload.createdAt ?? new Date().toISOString(),
    route: payload.route,
  }
  saveNotifications([item, ...readNotifications()])
  return item
}

export const markAllRead = (role: 'PATIENT' | 'DOCTOR'): void => {
  const all = readNotifications().map((n) =>
    n.receiverRole === role ? { ...n, isRead: true } : n,
  )
  saveNotifications(all)
}

export const markNotificationRead = (notificationId: string): void => {
  saveNotifications(
    readNotifications().map((n) =>
      n.notificationId === notificationId ? { ...n, isRead: true } : n,
    ),
  )
}

export const notifyDoctorNewCase = (params: {
  doctorId: string
  patientName: string
  riskLevel: string
  caseId: string
  symptomSnippet: string
}): void => {
  pushNotification({
    type: 'DOCTOR_NEW_CASE',
    caseId: params.caseId,
    receiverId: params.doctorId,
    receiverRole: 'DOCTOR',
    title: 'New Patient Review Request',
    body: `${params.patientName} has submitted symptoms for your review. Risk: ${params.riskLevel}`,
    route: `/doctor-consultation/${params.caseId}`,
  })
}

export const notifyPatientPrescriptionReady = (params: {
  patientId: string
  doctorName: string
  caseId: string
}): void => {
  pushNotification({
    type: 'PATIENT_PRESCRIPTION_READY',
    caseId: params.caseId,
    receiverId: params.patientId,
    receiverRole: 'PATIENT',
    title: 'Your Prescription is Ready!',
    body: `${params.doctorName} has reviewed your case and created a prescription for you.`,
    route: '/my-prescription',
  })
}

export const notifyPatientNeedMoreInfo = (params: {
  patientId: string
  doctorName: string
  message: string
  caseId: string
}): void => {
  const snippet = params.message.length > 60 ? `${params.message.slice(0, 60)}...` : params.message
  pushNotification({
    type: 'DOCTOR_NEED_INFO',
    caseId: params.caseId,
    receiverId: params.patientId,
    receiverRole: 'PATIENT',
    title: 'Doctor needs more information',
    body: `${params.doctorName}: ${snippet}`,
    route: `/case-message/${params.caseId}`,
  })
}

export const notifyDoctorPatientReply = (params: {
  doctorId: string
  patientName: string
  message: string
  caseId: string
}): void => {
  const snippet = params.message.length > 60 ? `${params.message.slice(0, 60)}...` : params.message
  pushNotification({
    type: 'PATIENT_DOCTOR_MESSAGE',
    caseId: params.caseId,
    receiverId: params.doctorId,
    receiverRole: 'DOCTOR',
    title: 'Patient replied to your query',
    body: `${params.patientName}: ${snippet}`,
    route: `/doctor-consultation/${params.caseId}`,
  })
}

export type { NotificationType }
