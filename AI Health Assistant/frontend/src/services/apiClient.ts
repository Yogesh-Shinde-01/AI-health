import axios from 'axios'
import { API_URL } from '@/config/env'
import { removeStorage, storageKeys } from '@/utils'

const client = axios.create({
  baseURL: API_URL,
})

client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(storageKeys.token)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

const REGISTRATION_PATHS = ['/patient-register', '/doctor-register', '/otp']

client.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const isRegistrationPath = REGISTRATION_PATHS.some(
        (p) => currentPath === p || currentPath.startsWith(p + '/'),
      )
      if (!isRegistrationPath) {
        removeStorage(storageKeys.token)
        removeStorage(storageKeys.authUser)
        if (currentPath !== '/login') {
          window.location.assign('/login')
        }
      }
    }

    return Promise.reject(error)
  },
)

export default client
