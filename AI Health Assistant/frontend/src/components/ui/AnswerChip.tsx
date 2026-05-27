import type { ReactNode } from 'react'

export interface AnswerChipProps {
  label: ReactNode
  selected: boolean
  onPress: () => void
}

export function AnswerChip({ label, selected, onPress }: AnswerChipProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'rounded-[50px] px-[18px] py-[10px] text-[13px] font-semibold transition-all duration-200 active:scale-[0.96]',
        selected
          ? 'border border-[#1A73E8] bg-[#1A73E8] text-white'
          : 'border border-[#E5E7EB] bg-white text-[#374151]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
