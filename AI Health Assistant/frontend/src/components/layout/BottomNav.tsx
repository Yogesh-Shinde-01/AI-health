import { Calendar, FileText, History, Home, User, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { classNames } from '@/utils'

const BottomNav = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { role } = useAuth()

  if (role === 'DOCTOR') {
    const doctorItems = [
      {
        key: 'dashboard',
        label: t('bottomNav.dashboard'),
        icon: Home,
        to: '/doctor-dashboard',
        active: pathname === '/doctor-dashboard',
      },
      {
        key: 'patients',
        label: t('bottomNav.patients'),
        icon: Users,
        to: '/doctor-patients',
        active: pathname.startsWith('/doctor-patients'),
      },
      {
        key: 'calendar',
        label: t('bottomNav.calendar'),
        icon: Calendar,
        to: '/doctor-calendar',
        active: pathname.startsWith('/doctor-calendar'),
      },
      {
        key: 'profile',
        label: t('bottomNav.profile'),
        icon: User,
        to: '/doctor-profile',
        active: pathname.startsWith('/doctor-profile'),
      },
    ]

    return (
      <nav className="fixed bottom-0 left-1/2 z-20 flex h-16 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md">
        {doctorItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.to)}
              className={classNames(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-all duration-200',
                item.active ? 'text-primary' : 'text-muted',
              )}
            >
              {item.active && (
                <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-gradient-to-r from-primary to-primaryDark" />
              )}
              <div className={classNames(
                'flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200',
                item.active ? 'bg-primary/10' : '',
              )}>
                <Icon size={20} strokeWidth={item.active ? 2.5 : 1.75} />
              </div>
              <span className={item.active ? 'font-semibold' : ''}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  const items = [
    {
      key: 'home',
      label: t('bottomNav.home'),
      icon: Home,
      to: '/home',
      active: pathname.startsWith('/home'),
    },
    {
      key: 'history',
      label: t('bottomNav.history'),
      icon: History,
      to: '/history',
      active: pathname.startsWith('/history') || pathname.startsWith('/follow-up'),
    },
    {
      key: 'prescription',
      label: t('bottomNav.prescription'),
      icon: FileText,
      to: '/my-prescription',
      active:
        pathname.startsWith('/my-prescription') ||
        pathname.startsWith('/pdf-share'),
    },
    {
      key: 'profile',
      label: t('bottomNav.profile'),
      icon: User,
      to: '/my-profile',
      active: pathname.startsWith('/my-profile') || pathname.startsWith('/medical-history'),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex h-16 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.to)}
            className={classNames(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-all duration-200',
              item.active ? 'text-primary' : 'text-muted',
            )}
          >
            {item.active && (
              <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-gradient-to-r from-primary to-primaryDark" />
            )}
            <div className={classNames(
              'flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200',
              item.active ? 'bg-primary/10' : '',
            )}>
              <Icon size={20} strokeWidth={item.active ? 2.5 : 1.75} />
            </div>
            <span className={item.active ? 'font-semibold' : ''}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
