import { useAppSelector } from '@/store'

export const useAuth = () => {
  const { user, token, isAuthenticated, role } = useAppSelector((state) => state.auth)
  return { user, token, isAuthenticated, role }
}
