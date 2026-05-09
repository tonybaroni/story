import { PriorityTier } from '@/lib/types'

const config: Record<PriorityTier, { label: string; className: string }> = {
  A: { label: 'A List', className: 'bg-rose-100 text-rose-700 border border-rose-200' },
  B: { label: 'B List', className: 'bg-orange-100 text-orange-700 border border-orange-200' },
  C: { label: 'C List', className: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

export default function PriorityBadge({ tier }: { tier: PriorityTier }) {
  const { label, className } = config[tier]
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
