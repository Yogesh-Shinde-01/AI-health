import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Pill,
  Search,
  Stethoscope,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import RiskBadge from '@/components/ui/RiskBadge'
import Layout from '@/layouts/MainLayout'
import { useDoctorDashboardStore } from '@/store/slices/doctorDashboardStore'
import { classNames, readDoctorProfile, writeDoctorProfile } from '@/utils'
import { getDoctorProfile } from '@/services/doctorsService'
import {
  formatCaseRelativeTime,
  formatLastUpdatedLabel,
  type DoctorPatientsFilter,
  type DoctorStatKey,
} from '@/utils/doctorDashboard'
import { getUnreadCount } from '@/utils/notifications'

const STAT_CARD_STYLES: Record<
  DoctorStatKey,
  { gradient: string; labelColor: string; countColor: string; border: string; activeBorder: string; glow: string }
> = {
  pending: {
    gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    labelColor: '#92400E',
    countColor: '#D97706',
    border: '#FDE68A',
    activeBorder: '#F59E0B',
    glow: 'rgba(245,158,11,0.18)',
  },
  reviewed: {
    gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    labelColor: '#065F46',
    countColor: '#059669',
    border: '#A7F3D0',
    activeBorder: '#10B981',
    glow: 'rgba(16,185,129,0.18)',
  },
  today: {
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    labelColor: '#1E40AF',
    countColor: '#2563EB',
    border: '#BFDBFE',
    activeBorder: '#3B82F6',
    glow: 'rgba(59,130,246,0.18)',
  },
  total: {
    gradient: 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)',
    labelColor: '#374151',
    countColor: '#1A73E8',
    border: '#E0E7FF',
    activeBorder: '#818CF8',
    glow: 'rgba(129,140,248,0.18)',
  },
}

const DoctorDashboardPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [docProfile, setDocProfile] = useState(() => readDoctorProfile())
  const pendingSectionRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)

  const { stats, pendingCases, isLoading, error, lastUpdated, fetchCases } = useDoctorDashboardStore()
  const [doctorNotificationCount, setDoctorNotificationCount] = useState(0)
  const [activeStat, setActiveStat] = useState<DoctorStatKey | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchCases()
    setRefreshing(false)
    setDoctorNotificationCount(getUnreadCount('DOCTOR'))
  }, [fetchCases])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 30000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, location.pathname])

  useEffect(() => {
    getDoctorProfile().then((fetched) => {
      if (fetched) {
        writeDoctorProfile(fetched)
        setDocProfile(fetched)
      }
    }).catch(() => {})
  }, [])

  const displayName = docProfile?.fullName?.replace(/^Dr\.?\s*/i, '') ?? ''
  const hour = new Date().getHours()
  const greetKey =
    hour < 12 ? 'doctorDashboard.greetMorning' : hour < 17 ? 'doctorDashboard.greetAfternoon' : 'doctorDashboard.greetEvening'

  const statEntries: Array<{ key: DoctorStatKey; label: string; count: number }> = [
    { key: 'pending', label: t('doctorDashboard.statsPending'), count: stats.pending },
    { key: 'reviewed', label: t('doctorDashboard.statsReviewed'), count: stats.reviewed },
    { key: 'today', label: t('doctorDashboard.statsToday'), count: stats.today },
    { key: 'total', label: t('doctorDashboard.statsTotal'), count: stats.total },
  ]

  const handleStatTap = (key: DoctorStatKey) => {
    setActiveStat(key)
    if (key === 'pending') {
      pendingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const filterMap: Record<Exclude<DoctorStatKey, 'pending'>, DoctorPatientsFilter> = {
      reviewed: 'reviewed',
      today: 'today',
      total: 'all',
    }
    navigate('/doctor-patients', { state: { filter: filterMap[key as Exclude<DoctorStatKey, 'pending'>] } })
  }

  return (
    <Layout>
      <div
        ref={scrollRef}
        className="page-padding max-h-[calc(100vh-5rem)] space-y-5 overflow-y-auto bg-background pb-8"
        onTouchStart={(e) => {
          if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
            touchStartY.current = e.touches[0]?.clientY ?? 0
          }
        }}
        onTouchEnd={(e) => {
          if (!scrollRef.current || scrollRef.current.scrollTop > 0) {
            return
          }
          const pullDistance = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current
          if (pullDistance > 72 && !refreshing) {
            void refresh()
          }
        }}
      >
        {refreshing ? (
          <div className="flex justify-center py-1">
            <LoadingSpinner size={22} />
          </div>
        ) : null}

        <div className="-mx-4 -mt-5 mb-1 rounded-b-[28px] bg-gradient-to-br from-[#1557B0] to-[#0D47A1] px-5 pb-6 pt-5 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Stethoscope size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {displayName ? t(greetKey, { name: displayName }) : <span className="animate-pulse opacity-60">···</span>}
                </h1>
                <p className="text-sm text-white/70">
                  {docProfile?.specialization ?? <span className="animate-pulse opacity-60">···</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all active:scale-[0.94]"
              aria-label={t('doctorDashboard.notifications')}
              onClick={() => {
                setDoctorNotificationCount(0)
                navigate('/doctor-notifications')
              }}
            >
              <Bell size={20} />
              {doctorNotificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-0.5 text-[9px] font-bold text-white">
                  {doctorNotificationCount > 9 ? '9+' : doctorNotificationCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-app border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{t('doctorDashboard.loadError')}</span>
            <button type="button" className="font-semibold underline" onClick={() => void refresh()}>
              {t('doctorDashboard.retry')}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-4 gap-2">
          {isLoading && !lastUpdated
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[76px] animate-pulse rounded-xl bg-slate-200" />
              ))
            : statEntries.map(({ key, label, count }) => {
                const style = STAT_CARD_STYLES[key]
                const isActive = activeStat === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleStatTap(key)}
                    className="cursor-pointer rounded-2xl p-3 text-center transition-all duration-200 active:scale-[0.94]"
                    style={{
                      background: style.gradient,
                      border: `1.5px solid ${isActive ? style.activeBorder : style.border}`,
                      boxShadow: isActive ? `0 4px 16px ${style.glow}` : '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: style.labelColor }}>
                      {label}
                    </p>
                    <p className="mt-1 text-[26px] font-extrabold leading-tight" style={{ color: style.countColor }}>
                      {count}
                    </p>
                  </button>
                )
              })}
        </div>

        {lastUpdated ? (
          <p className="text-center text-[11px] text-[#9CA3AF]">
            {t('doctorDashboard.lastUpdated', { time: formatLastUpdatedLabel(lastUpdated) })}
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">{t('doctorDashboard.quickActions')}</p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { icon: Search, label: t('doctorDashboard.actionFindPatient'), path: '/doctor-patients' },
                { icon: Pill, label: t('doctorDashboard.actionWriteRx'), path: '/doctor-patients' },
                {
                  icon: AlertTriangle,
                  label: t('doctorDashboard.actionEmergency'),
                  onClick: () => window.alert(t('home.emergencyAlert')),
                },
                { icon: Calendar, label: t('doctorDashboard.actionSchedule'), path: '/doctor-calendar' },
              ] as const
            ).map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if ('onClick' in item && item.onClick) {
                      item.onClick()
                      return
                    }
                    if ('path' in item && item.path) {
                      navigate(item.path)
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-3 text-center shadow-sm transition-all active:scale-[0.96] hover:shadow"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-semibold leading-tight text-foreground">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div ref={pendingSectionRef}>
          <h2 className="mb-3 text-base font-semibold text-foreground">{t('doctorDashboard.pendingReviewsTitle')}</h2>
          {isLoading && pendingCases.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-app bg-slate-200" />
              ))}
            </div>
          ) : null}
          {!isLoading && pendingCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-app border border-dashed border-border py-12 text-center">
              <CheckCircle2 size={48} className="mb-3 text-[#22C55E]" strokeWidth={1.5} />
              <p className="font-semibold text-foreground">{t('doctorDashboard.allCaughtUp')}</p>
              <p className="mt-1 text-sm text-muted">{t('doctorDashboard.allCaughtUpSub')}</p>
            </div>
          ) : null}
          <div className="space-y-3">
            {pendingCases.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all duration-200 hover:shadow-card-hover">
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primaryDark text-sm font-bold text-white shadow-sm">
                    {(item.patientName?.trim().charAt(0) ?? 'P').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-bold text-foreground">{item.patientName}</p>
                        <p className="text-xs text-muted">
                          {item.patientAge} · {item.patientGender}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">
                        {formatCaseRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-[13px] text-muted">
                      {item.symptoms || item.possibleCause || item.aiSummary?.possibleCause}
                    </p>
                    <div className="mt-2">
                      <RiskBadge level={item.riskLevel ?? item.aiSummary?.riskLevel ?? 'MEDIUM'} />
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60">
                  <button
                    type="button"
                    className="w-full bg-gradient-to-r from-primary/5 to-primary/10 py-2.5 text-sm font-semibold text-primary transition-all hover:from-primary/10 hover:to-primary/15 active:scale-[0.98]"
                    onClick={() => navigate(`/doctor-consultation/${item.id}`)}
                  >
                    {t('doctorDashboard.view')} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DoctorDashboardPage
