import { useEffect, useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import CaseStatusBadge from '@/components/ui/CaseStatusBadge'
import FormField from '@/components/forms/FormField'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import RiskBadge from '@/components/ui/RiskBadge'
import Layout from '@/layouts/MainLayout'
import { useDoctorDashboardStore } from '@/store/slices/doctorDashboardStore'
import { classNames, formatDate, getMockPrescriptions } from '@/utils'
import {
  filterCasesByPatientsFilter,
  formatCaseRelativeTime,
  isReviewedCase,
  isTodayCase,
  sortCasesNewestFirst,
  type DoctorPatientsFilter,
} from '@/utils/doctorDashboard'

type PatientsTab = 'ALL' | 'PENDING' | 'REVIEWED'

const resolveFilterFromNavigation = (
  location: ReturnType<typeof useLocation>,
): { tab: PatientsTab; todayOnly: boolean } => {
  const stateFilter = (location.state as { filter?: DoctorPatientsFilter } | null)?.filter
  const paramFilter = new URLSearchParams(location.search).get('filter') as DoctorPatientsFilter | null
  const filter = stateFilter ?? paramFilter

  if (filter === 'pending') return { tab: 'PENDING', todayOnly: false }
  if (filter === 'reviewed') return { tab: 'REVIEWED', todayOnly: false }
  if (filter === 'today') return { tab: 'ALL', todayOnly: true }
  return { tab: 'ALL', todayOnly: false }
}

const DoctorPatientsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { cases, fetchCases, isLoading } = useDoctorDashboardStore()
  const [tab, setTab] = useState<PatientsTab>('ALL')
  const [todayOnly, setTodayOnly] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const resolved = resolveFilterFromNavigation(location)
    setTab(resolved.tab)
    setTodayOnly(resolved.todayOnly)
  }, [location.state, location.search])

  useEffect(() => {
    void fetchCases()
  }, [fetchCases, location.pathname])

  const tabFilter: DoctorPatientsFilter =
    tab === 'PENDING' ? 'pending' : tab === 'REVIEWED' ? 'reviewed' : 'all'

  const filtered = useMemo(() => {
    let list = filterCasesByPatientsFilter(cases, tabFilter)
    if (todayOnly) {
      list = list.filter(isTodayCase)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (item) =>
          (item.patientName?.toLowerCase().includes(q) ?? false) ||
          (item.patientId?.toLowerCase().includes(q) ?? false) ||
          item.id.toLowerCase().includes(q),
      )
    }
    return sortCasesNewestFirst(list)
  }, [cases, tabFilter, todayOnly, query])

  const initials = (name: string | undefined) => {
    const parts = (name ?? 'P').split(/\s+/).filter(Boolean)
    return `${parts[0]?.[0] ?? 'P'}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }

  const emptyMessage = () => {
    if (todayOnly) return t('doctorDashboard.noTodayCases')
    if (tab === 'REVIEWED') return t('doctorPatients.noReviewedCases')
    if (tab === 'PENDING') return t('doctorPatients.noPendingCases')
    return t('doctorPatients.noPatientsYet')
  }

  return (
    <Layout>
      <div className="page-padding space-y-5 bg-background pb-8">
        <h1 className="text-xl font-bold text-foreground">{t('doctorPatients.title')}</h1>

        {todayOnly ? (
          <span className="inline-flex rounded-full bg-[#F0F9FF] px-3 py-1 text-xs font-semibold text-[#075985]">
            {t('doctorPatients.filterToday')}
          </span>
        ) : null}

        <div className="grid grid-cols-3 gap-1 rounded-card border border-border bg-white p-1 shadow-card">
          {(['ALL', 'PENDING', 'REVIEWED'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key)
                setTodayOnly(false)
              }}
              className={classNames(
                'rounded-app py-2 text-xs font-semibold',
                tab === key && !todayOnly ? 'bg-primary text-white' : 'text-muted',
              )}
            >
              {key === 'ALL'
                ? t('doctorPatients.tabAll')
                : key === 'PENDING'
                  ? t('doctorPatients.tabPending')
                  : t('doctorPatients.tabReviewed')}
            </button>
          ))}
        </div>

        <FormField label={t('formLabels.searchPatients')} htmlFor="doctor-patients-search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="doctor-patients-search"
              name="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-10"
              placeholder={t('formLabels.searchPatientsPh')}
            />
          </div>
        </FormField>

        {isLoading && filtered.length === 0 ? <LoadingSpinner className="py-10" /> : null}

        <div className="space-y-3 pb-4">
          {filtered.map((item) => {
            const reviewed = isReviewedCase(item)
            return (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all hover:shadow-card-hover">
                <div className="flex gap-3 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primaryDark text-sm font-bold text-white shadow-sm">
                    {initials(item.patientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground">{item.patientName}</p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">{formatCaseRelativeTime(item.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted">
                      {item.patientAge} · {item.patientGender}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t('doctorPatients.lastVisit')}: {formatDate(item.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-foreground">
                      {item.possibleCause ?? item.aiSummary?.possibleCause ?? item.symptoms}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RiskBadge level={item.riskLevel ?? item.aiSummary?.riskLevel ?? 'MEDIUM'} />
                      {item.caseStatus ? <CaseStatusBadge status={item.caseStatus} /> : null}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-0 border-t border-border/60 sm:grid-cols-2">
                  <button
                    type="button"
                    className="py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 active:scale-[0.98]"
                    onClick={() => navigate(`/doctor-consultation/${item.id}`)}
                  >
                    {t('common.view')} →
                  </button>
                  {reviewed && item.caseStatus === 'PRESCRIPTION_READY' ? (
                    <div className="border-t border-border/60 sm:border-l sm:border-t-0">
                      <button
                        type="button"
                        className="w-full py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 active:scale-[0.98]"
                        onClick={() => {
                          const prescription = getMockPrescriptions().find((p) => p.consultationId === item.id)
                          if (prescription) {
                            navigate(`/edit-prescription/${prescription.id}`)
                          }
                        }}
                      >
                        {t('doctorPatients.viewPrescription')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {!isLoading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <Users size={36} className="mb-3 text-primary/40" />
            <p>{emptyMessage()}</p>
            {tab === 'REVIEWED' ? <p className="mt-1 text-sm">{t('doctorPatients.noReviewedCasesSub')}</p> : null}
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

export default DoctorPatientsPage
