import type { RiskLevel } from '@/types'

interface RiskBadgeProps {
  level: RiskLevel
}

const levelStyles: Record<RiskLevel, string> = {
  LOW: 'bg-[#E8F5E9] text-[#1B5E20]',
  MEDIUM: 'bg-[#FFF3E0] text-[#E65100]',
  HIGH: 'bg-[#FFEBEE] text-[#B71C1C]',
}

const levelLabels: Record<RiskLevel, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

const RiskBadge = ({ level }: RiskBadgeProps) => (
  <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${levelStyles[level]}`}>
    {levelLabels[level]}
  </span>
)

export default RiskBadge
