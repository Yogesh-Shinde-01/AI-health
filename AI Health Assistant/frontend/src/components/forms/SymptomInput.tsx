import { useEffect, useRef, useState } from 'react'
import { Keyboard, Mic } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import FormField from '@/components/forms/FormField'
import { classNames } from '@/utils'

interface SymptomInputProps {
  onSubmit: (text: string) => void
  submitLabel?: string
  defaultValue?: string
  showSubmit?: boolean
  onValueChange?: (text: string) => void
}

interface FormValues {
  text: string
}

const SymptomInput = ({
  onSubmit,
  submitLabel,
  defaultValue = '',
  showSubmit = true,
  onValueChange,
}: SymptomInputProps) => {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'voice' | 'type'>('voice')
  const { transcript, isListening, startListening, stopListening, isSupported, error } = useVoiceInput()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { handleSubmit, register, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      text: defaultValue,
    },
  })

  const value = watch('text')

  useEffect(() => {
    if (transcript) {
      setValue('text', transcript)
    }
  }, [setValue, transcript])

  useEffect(() => {
    onValueChange?.(value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [onValueChange, value])

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values.text.trim()))} className="space-y-4">
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('voice')}
          className={classNames(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
            tab === 'voice' ? 'bg-white text-primary shadow-sm' : 'text-slate-500',
          )}
        >
          <Mic size={16} />
          {t('forms.voiceInput')}
        </button>
        <button
          type="button"
          onClick={() => setTab('type')}
          className={classNames(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
            tab === 'type' ? 'bg-white text-primary shadow-sm' : 'text-slate-500',
          )}
        >
          <Keyboard size={16} />
          {t('forms.typeInput')}
        </button>
      </div>

      {tab === 'voice' ? (
        <div className="card space-y-4 p-5 text-center">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            {isListening ? <span className="absolute h-24 w-24 animate-ping rounded-full bg-primary/20" /> : null}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white"
            >
              <Mic size={28} />
            </button>
          </div>
          <p className="text-sm font-medium text-slate-700">
            {isListening ? t('forms.stopListening') : t('forms.startListening')}
          </p>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            {value || t('forms.transcriptPlaceholder')}
          </div>
          {!isSupported || error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      ) : (
        <FormField label={t('formLabels.symptoms')} htmlFor="symptom-input-text" required>
          <textarea
            id="symptom-input-text"
            {...register('text')}
            ref={(element) => {
              register('text').ref(element)
              textareaRef.current = element
            }}
            rows={5}
            className="textarea overflow-hidden"
            placeholder={t('formLabels.symptomsPh')}
          />
        </FormField>
      )}

      {showSubmit ? (
        <button type="submit" className="btn-primary" disabled={!value.trim()}>
          {submitLabel ?? t('common.submit')}
        </button>
      ) : null}
    </form>
  )
}

export default SymptomInput
