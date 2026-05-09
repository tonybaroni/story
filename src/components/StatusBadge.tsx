import { SchoolStatus } from '@/lib/types'

const config: Record<SchoolStatus, { label: string; className: string }> = {
  current:        { label: 'Current School',  className: 'bg-indigo-100 text-indigo-800' },
  interested:     { label: 'Interested',       className: 'bg-yellow-100 text-yellow-800' },
  contacted:      { label: 'Contacted',        className: 'bg-blue-100 text-blue-800' },
  offered:        { label: 'Offered',          className: 'bg-green-100 text-green-800' },
  visit_scheduled:{ label: 'Visit Scheduled',  className: 'bg-purple-100 text-purple-800' },
  committed:      { label: 'Committed',        className: 'bg-emerald-600 text-white' },
  declined:       { label: 'Declined',         className: 'bg-gray-200 text-gray-500' },
}

export default function StatusBadge({ status }: { status: SchoolStatus }) {
  const { label, className } = config[status]
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
