import type { PropsWithChildren } from 'react'
import MobileShell from '@/components/layout/MobileShell'
import BottomNav from '@/components/layout/BottomNav'
import { useAuth } from '@/hooks/useAuth'

interface LayoutProps extends PropsWithChildren {
  hideNav?: boolean
}

const Layout = ({ children, hideNav = false }: LayoutProps) => {
  const { isAuthenticated } = useAuth()

  return (
    <MobileShell>
      <div className={isAuthenticated && !hideNav ? 'min-h-screen pb-20' : 'min-h-screen'}>{children}</div>
      {isAuthenticated && !hideNav ? <BottomNav /> : null}
    </MobileShell>
  )
}

export default Layout
