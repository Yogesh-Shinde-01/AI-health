import type { ReactNode } from 'react'
import { classNames } from '@/utils'

interface FormFieldProps {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className,
  children,
}: FormFieldProps) => (
  <div className={classNames('form-group', className)}>
    <label htmlFor={htmlFor} className="form-label">
      {label}
      {required ? <span className="text-danger"> *</span> : null}
    </label>
    {children}
    {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    {hint && !error ? <p className="mt-1 text-xs text-[#9CA3AF]">{hint}</p> : null}
  </div>
)

export default FormField
