import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import FormField from '@/components/forms/FormField'
import type { MedicalHistory } from '@/types'
import { classNames } from '@/utils'

interface MedicalHistoryFormProps {
  initial?: MedicalHistory | null
  submitLabel: string
  loading?: boolean
  onSubmit: (payload: MedicalHistory) => void | Promise<void>
}

const MedicalHistoryForm = ({ initial, submitLabel, loading = false, onSubmit }: MedicalHistoryFormProps) => {
  const { t } = useTranslation()
  const noneLabel = t('medicalHistory.diseases.none')
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>(() => {
    const diseases = initial?.chronicDiseases ?? []
    if (!diseases.length) {
      return [noneLabel]
    }
    return diseases
  })
  const [hasAllergies, setHasAllergies] = useState<'yes' | 'no'>(() =>
    initial?.allergies?.length ? 'yes' : 'no',
  )
  const { register, handleSubmit } = useForm<{ allergies: string; medicines: string }>({
    defaultValues: {
      allergies: initial?.allergies?.join(', ') ?? '',
      medicines: initial?.currentMedicines?.join(', ') ?? '',
    },
  })

  const diseaseOptions = [
    noneLabel,
    t('medicalHistory.diseases.diabetes'),
    t('medicalHistory.diseases.bp'),
    t('medicalHistory.diseases.thyroid'),
    t('medicalHistory.diseases.asthma'),
    t('medicalHistory.diseases.heart'),
    t('medicalHistory.diseases.other'),
  ]

  const toggleDisease = (value: string) => {
    if (value === noneLabel) {
      setSelectedDiseases([noneLabel])
      return
    }
    setSelectedDiseases((current) => {
      const withoutNone = current.filter((item) => item !== noneLabel)
      if (withoutNone.includes(value)) {
        const next = withoutNone.filter((item) => item !== value)
        return next.length > 0 ? next : [noneLabel]
      }
      return [...withoutNone, value]
    })
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (values) => {
        const payload: MedicalHistory = {
          chronicDiseases: selectedDiseases,
          allergies: hasAllergies === 'yes' && values.allergies.trim() ? [values.allergies.trim()] : [],
          currentMedicines: values.medicines.trim() ? [values.medicines.trim()] : [],
        }
        await onSubmit(payload)
      })}
    >
      <div className="space-y-3" role="group" aria-labelledby="medical-chronic-label">
        <p id="medical-chronic-label" className="form-label">
          {t('formLabels.chronicDiseases')}
        </p>
        <div className="flex flex-wrap gap-2">
          {diseaseOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleDisease(item)}
              className={classNames(
                'rounded-[50px] border px-4 py-2 text-sm font-semibold transition active:scale-[0.96]',
                selectedDiseases.includes(item)
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-[#374151]',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3" role="group" aria-labelledby="medical-allergies-label">
        <p id="medical-allergies-label" className="form-label">
          {t('formLabels.allergies')}
        </p>
        <div className="flex gap-2">
          {[
            { key: 'no' as const, label: t('common.no') },
            { key: 'yes' as const, label: t('common.yes') },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setHasAllergies(item.key)}
              className={classNames(
                'rounded-[50px] border px-4 py-2 text-sm font-semibold transition active:scale-[0.96]',
                hasAllergies === item.key
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-[#374151]',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {hasAllergies === 'yes' ? (
          <FormField label={t('formLabels.allergyDetails')} htmlFor="medical-allergies-detail">
            <input
              id="medical-allergies-detail"
              {...register('allergies')}
              className="input"
              placeholder={t('medicalHistory.allergyPlaceholder')}
            />
          </FormField>
        ) : null}
      </div>

      <FormField label={t('formLabels.currentMedicines')} htmlFor="medical-current-medicines">
        <input
          id="medical-current-medicines"
          {...register('medicines')}
          className="input"
          placeholder={t('medicalHistory.currentMedicinePlaceholder')}
        />
      </FormField>

      <button type="submit" className="btn-primary" disabled={loading}>
        {submitLabel}
      </button>
    </form>
  )
}

export default MedicalHistoryForm
