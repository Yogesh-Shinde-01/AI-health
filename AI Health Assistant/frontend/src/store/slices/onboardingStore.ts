import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Flow role from Welcome / OTP routing (separate from auth UserRole PATIENT | DOCTOR) */
export type AppUserRole = 'patient' | 'doctor'

interface OnboardingState {
  userRole: AppUserRole
  setUserRole: (role: AppUserRole) => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      userRole: 'patient',
      setUserRole: (userRole) => set({ userRole }),
    }),
    {
      name: 'ai-health-onboarding',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ userRole: state.userRole }),
    },
  ),
)
