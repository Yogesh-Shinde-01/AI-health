import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User, UserRole } from '@/types'
import { useDoctorDashboardStore } from '@/store/slices/doctorDashboardStore'
import { readStorage, removeStorage, storageKeys, writeStorage } from '@/utils'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
}

const initialUser = readStorage<User | null>(storageKeys.authUser, null)
const initialToken = typeof window !== 'undefined' ? window.localStorage.getItem(storageKeys.token) : null
const initialRole =
  (typeof window !== 'undefined' ? window.localStorage.getItem(storageKeys.role) : null) as UserRole | null

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialToken),
  role: initialUser?.role ?? initialRole ?? null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.role = action.payload.user.role
      writeStorage(storageKeys.authUser, action.payload.user)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKeys.token, action.payload.token)
        window.localStorage.setItem(storageKeys.role, action.payload.user.role)
      }
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.role = null
      removeStorage(storageKeys.token)
      removeStorage(storageKeys.authUser)
      removeStorage(storageKeys.role)
      useDoctorDashboardStore.getState().setCases([])
    },
    setRole: (state, action: PayloadAction<UserRole>) => {
      state.role = action.payload
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKeys.role, action.payload)
      }
    },
  },
})

export const { setCredentials, logout, setRole } = authSlice.actions
export default authSlice.reducer
