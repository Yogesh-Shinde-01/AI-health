import { useTranslation } from 'react-i18next'
import type { CaseStatus } from '@/types/doctors'
import { classNames } from '@/utils'

const styles: Record<CaseStatus, string> = {
  PENDING_REVIEW: 'bg-[#FFF3E0] text-[#E65100]',
  UNDER_REVIEW: 'bg-[#E8F0FE] text-[#1A73E8]',
  NEED_MORE_INFO: 'bg-[#F3E5F5] text-[#6A1B9A]',
  PRESCRIPTION_READY: 'bg-[#E8F5E9] text-[#1B5E20]',
  CLOSED: 'bg-[#F3F4F6] text-[#6B7280]',
}

interface CaseStatusBadgeProps {
  status: CaseStatus
  className?: string
}

const CaseStatusBadge = ({ status, className }: CaseStatusBadgeProps) => {
  const { t } = useTranslation()
  return (
    <span
      className={classNames(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
        styles[status],
        className,
      )}
    >
      {t(`caseStatus.${status}`)}
    </span>
  )
}

export default CaseStatusBadge
