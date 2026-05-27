import client from '@/services/apiClient'
import type { FollowUp, FollowUpPayload } from '@/types'
import { delay, generateId, getMockFollowUps, saveMockFollowUps } from '@/utils'

export const bookFollowUp = async (data: FollowUpPayload): Promise<FollowUp> => {
  try {
    const response = await client.post<FollowUp>('/follow-ups', data)
    return response.data
  } catch {
    await delay()
    const followUps = getMockFollowUps()
    const next: FollowUp = {
      id: generateId('followup'),
      doctorId: data.doctorId,
      scheduledAt: data.scheduledAt,
      notes: data.notes,
      status: 'CONFIRMED',
    }
    followUps.unshift(next)
    saveMockFollowUps(followUps)
    return next
  }
}

export const getMyFollowUps = async (): Promise<FollowUp[]> => {
  try {
    const response = await client.get<FollowUp[]>('/follow-ups/me')
    return response.data
  } catch {
    await delay()
    return getMockFollowUps()
  }
}
