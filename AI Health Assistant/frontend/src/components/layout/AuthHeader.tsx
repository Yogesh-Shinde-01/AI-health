import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

const AuthHeader = ({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) => (
  <div className="mb-6 flex items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="rounded-full border border-border p-2">
          <ArrowLeft size={18} />
        </button>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
    </div>
    {right}
  </div>
)

export default AuthHeader
