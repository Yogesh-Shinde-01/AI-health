import { CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface RegistrationSuccessModalProps {
  open: boolean
  isDoctor?: boolean
  onGoToLogin: () => void
}

const RegistrationSuccessModal = ({ open, isDoctor = false, onGoToLogin }: RegistrationSuccessModalProps) => {
  const { t } = useTranslation()

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm animate-bounce-in overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
        {/* Green gradient header stripe */}
        <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #34A853, #1e8c3c)' }} />

        <div className="px-6 pb-7 pt-6 text-center">
          {/* Animated success icon with glow ring */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-success/10" />
            <div className="absolute inset-[-8px] rounded-full bg-success/5" />
            <CheckCircle
              size={44}
              strokeWidth={2}
              className="relative animate-scale-in text-success"
            />
          </div>

          <h2 className="text-[22px] font-bold tracking-tight text-foreground">
            {t('registrationSuccess.title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {isDoctor ? t('registrationSuccess.subtitleDoctor') : t('registrationSuccess.subtitlePatient')}
          </p>
          <p className="mt-1 text-sm text-muted">{t('registrationSuccess.body')}</p>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={onGoToLogin}
          >
            {t('registrationSuccess.goToLogin')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegistrationSuccessModal
