import { Pencil, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import FormField from '@/components/forms/FormField'
import type { PrescriptionFormValues } from '@/types'
import type { UseFormRegister } from 'react-hook-form'

interface MedicineRowProps {
  index: number
  onRemove: (index: number) => void
  register: UseFormRegister<PrescriptionFormValues>
  disabled?: boolean
  showEditToggle?: boolean
  isEditing?: boolean
  onToggleEdit?: (index: number) => void
}

const FREQUENCY_VALUES = [
  'Once daily',
  'Twice daily',
  'Thrice daily',
  'Every 4 hours',
  'SOS (as needed)',
  'Before meals',
  'After meals',
] as const

const MedicineRow = ({
  index,
  onRemove,
  register,
  disabled = false,
  showEditToggle = false,
  isEditing = true,
  onToggleEdit,
}: MedicineRowProps) => {
  const { t } = useTranslation()
  const rowDisabled = disabled && !isEditing

  return (
    <div className="card space-y-3 p-4">
      <div className="flex justify-end gap-2">
        {showEditToggle ? (
          <button
            type="button"
            onClick={() => onToggleEdit?.(index)}
            className="rounded-full border border-border p-2 text-slate-500"
          >
            <Pencil size={14} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-full border border-border p-2 text-danger"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('formLabels.medicineName')} htmlFor={`medicine-${index}-name`} required>
          <input
            id={`medicine-${index}-name`}
            {...register(`medicines.${index}.name`)}
            className="input"
            placeholder={t('formLabels.medicineNamePh')}
            disabled={rowDisabled}
          />
        </FormField>
        <FormField label={t('formLabels.dosage')} htmlFor={`medicine-${index}-dosage`} required>
          <input
            id={`medicine-${index}-dosage`}
            {...register(`medicines.${index}.dosage`)}
            className="input"
            placeholder={t('formLabels.dosagePh')}
            disabled={rowDisabled}
          />
        </FormField>
        <FormField label={t('formLabels.frequency')} htmlFor={`medicine-${index}-frequency`} required>
          <select
            id={`medicine-${index}-frequency`}
            {...register(`medicines.${index}.frequency`)}
            className="input"
            disabled={rowDisabled}
            defaultValue=""
          >
            <option value="" disabled>
              {t('formLabels.frequencyPh')}
            </option>
            {FREQUENCY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t('formLabels.duration')} htmlFor={`medicine-${index}-duration`} required>
          <input
            id={`medicine-${index}-duration`}
            {...register(`medicines.${index}.duration`)}
            className="input"
            placeholder={t('formLabels.durationPh')}
            disabled={rowDisabled}
          />
        </FormField>
      </div>
    </div>
  )
}

export default MedicineRow
