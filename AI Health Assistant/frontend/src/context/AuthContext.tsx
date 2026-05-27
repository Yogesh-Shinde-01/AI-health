import type { PropsWithChildren } from 'react'

export const AuthProvider = ({ children }: PropsWithChildren) => <>{children}</>

export { useAuth } from '@/hooks/useAuth'
