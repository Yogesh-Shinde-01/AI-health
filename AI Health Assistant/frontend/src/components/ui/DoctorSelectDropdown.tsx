import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DoctorFilterChip, MatchedDoctor } from '@/types/doctors'
import FormField from '@/components/forms/FormField'
import { classNames } from '@/utils'

interface DoctorSelectDropdownProps {
  doctors: MatchedDoctor[]
  specialization: string
  selected: MatchedDoctor | null
  onSelect: (doctor: MatchedDoctor) => void
  usedFallback?: boolean
  requestedSpecialization?: string
}

const DoctorSelectDropdown = ({
  doctors,
  specialization,
  selected,
  onSelect,
  usedFallback = false,
  requestedSpecialization,
}: DoctorSelectDropdownProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DoctorFilterChip>('all')

  const filtered = useMemo(() => {
    let list = [...doctors]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.hospital.toLowerCase().includes(q),
      )
    }
    if (filter === 'available') {
      list = list.filter((d) => d.availableToday)
    } else if (filter === 'topRated') {
      list = [...list].sort((a, b) => b.rating - a.rating)
    } else if (filter === 'lowestFee') {
      list = [...list].sort((a, b) => a.consultationFee - b.consultationFee)
    } else {
      list = [...list].sort((a, b) => {
        if (a.availableToday !== b.availableToday) return a.availableToday ? -1 : 1
        return b.rating - a.rating
      })
    }
    return list
  }, [doctors, filter, search])

  const chips: { key: DoctorFilterChip; label: string }[] = [
    { key: 'all', label: t('summary.doctorFilterAll') },
    { key: 'available', label: t('summary.doctorFilterAvailable') },
    { key: 'topRated', label: t('summary.doctorFilterTopRated') },
    { key: 'lowestFee', label: t('summary.doctorFilterLowestFee') },
  ]

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{t('summary.chooseDoctor')}</h3>
        <p className="text-sm text-muted">
          {t('summary.availableDoctorsSubtitle', { specialization })}
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          {t('summary.doctorCount', { count: doctors.length, specialization })}
        </p>
      </div>

      {usedFallback && requestedSpecialization ? (
        <p className="rounded-app bg-[#FFF3E0] px-3 py-2 text-xs text-[#E65100]">
          {t('summary.doctorFallback', { specialization: requestedSpecialization })}
        </p>
      ) : null}

      <FormField label={t('formLabels.selectDoctor')} htmlFor="summary-doctor-select" required>
      <div className="relative">
        <button
          id="summary-doctor-select"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={classNames(
            'flex w-full items-center gap-3 rounded-[12px] border-[1.5px] bg-white px-4 py-3.5 text-left transition',
            selected ? 'border-[#34A853]' : 'border-[#E5E7EB]',
          )}
        >
          {selected ? (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F0FE] text-sm font-bold text-[#1A73E8]">
                {selected.name.replace(/^Dr\.\s*/i, '').charAt(0)}
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground">{selected.name}</span>
              <Check size={20} className="text-[#34A853]" />
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-[#9CA3AF]">{t('summary.selectDoctorPlaceholder')}</span>
              <ChevronDown size={20} className="text-muted" />
            </>
          )}
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[320px] overflow-hidden rounded-[12px] border-[1.5px] border-[#E5E7EB] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <div className="border-b border-border p-3">
              <FormField label={t('formLabels.searchDoctor')} htmlFor="summary-doctor-search">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="summary-doctor-search"
                    name="search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-9"
                    placeholder={t('formLabels.searchDoctorPh')}
                  />
                </div>
              </FormField>
              <div className="mt-2 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilter(chip.key)}
                    className={classNames(
                      'rounded-[50px] border px-3 py-1 text-xs font-semibold',
                      filter === chip.key
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-[#374151]',
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[220px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">{t('summary.noDoctorsFound')}</p>
              ) : (
                filtered.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() => {
                      onSelect(doctor)
                      setOpen(false)
                    }}
                    className="mb-2 w-full rounded-app border border-transparent p-3 text-left transition hover:border-primary/20 hover:bg-[#F0F7FF]"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F0FE] text-sm font-bold text-[#1A73E8]">
                        {doctor.name.replace(/^Dr\.\s*/i, '').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground">{doctor.name}</p>
                          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-foreground">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            {doctor.rating}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{doctor.specialization}</p>
                        <p className="text-xs text-muted">{doctor.hospital}</p>
                        <p className="mt-1 text-xs text-muted">
                          {t('summary.doctorMeta', {
                            years: doctor.experience,
                            fee: doctor.consultationFee,
                          })}
                        </p>
                        <p
                          className={classNames(
                            'mt-1 flex items-center gap-1 text-xs font-medium',
                            doctor.availableToday ? 'text-[#1B5E20]' : 'text-muted',
                          )}
                        >
                          <span
                            className={classNames(
                              'h-2 w-2 rounded-full',
                              doctor.availableToday ? 'bg-[#34A853]' : 'bg-gray-400',
                            )}
                          />
                          {doctor.availableToday
                            ? t('summary.availableToday')
                            : t('summary.nextAvailable', { when: doctor.nextAvailable })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      </FormField>
    </div>
  )
}

export default DoctorSelectDropdown
