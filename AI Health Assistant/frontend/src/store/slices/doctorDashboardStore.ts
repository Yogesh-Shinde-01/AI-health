import { create } from 'zustand'
import { getDoctorConsultations } from '@/services/consultationsService'
import type { Consultation } from '@/types'
import {
  computeDoctorDashboardStats,
  getPendingCases,
  type DoctorDashboardStats,
} from '@/utils/doctorDashboard'

const emptyStats: DoctorDashboardStats = {
  pending: 0,
  reviewed: 0,
  today: 0,
  total: 0,
}

const deriveFromCases = (cases: Consultation[]) => ({
  cases,
  stats: computeDoctorDashboardStats(cases),
  pendingCases: getPendingCases(cases),
})

interface DoctorDashboardState {
  cases: Consultation[]
  stats: DoctorDashboardStats
  pendingCases: Consultation[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  fetchCases: () => Promise<void>
  upsertCase: (updated: Consultation) => void
  setCases: (cases: Consultation[]) => void
}

export const useDoctorDashboardStore = create<DoctorDashboardState>((set, get) => ({
  cases: [],
  stats: emptyStats,
  pendingCases: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchCases: async () => {
    const hasData = get().cases.length > 0
    set({ isLoading: !hasData, error: null })
    try {
      const cases = await getDoctorConsultations()
      set({
        ...deriveFromCases(cases),
        isLoading: false,
        lastUpdated: new Date(),
        error: null,
      })
    } catch {
      set({ isLoading: false, error: 'fetch_failed' })
    }
  },

  upsertCase: (updated) => {
    const existing = get().cases
    const nextCases = existing.some((c) => c.id === updated.id)
      ? existing.map((c) => (c.id === updated.id ? updated : c))
      : [updated, ...existing]
    set({
      ...deriveFromCases(nextCases),
      lastUpdated: new Date(),
    })
  },

  setCases: (cases) => {
    set({
      ...deriveFromCases(cases),
      lastUpdated: new Date(),
    })
  },
}))
