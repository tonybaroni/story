import Link from 'next/link'
import { School } from '@/lib/types'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'

const scholarshipLabel: Record<string, string> = {
  full_ride: '🎓 Full Ride',
  partial: 'Partial Scholarship',
  none: 'No Scholarship',
  unknown: '',
}

export default function SchoolCard({ school }: { school: School }) {
  const isAList = school.priority_tier === 'A'
  return (
    <Link href={`/schools/${school.id}`}>
      <div className={`bg-white rounded-xl border hover:shadow-md transition p-5 cursor-pointer h-full flex flex-col gap-2 ${isAList ? 'border-rose-200 hover:border-rose-400' : 'hover:border-blue-300'}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight">{school.name}</h3>
          <PriorityBadge tier={school.priority_tier} />
        </div>
        {school.location && (
          <p className="text-xs text-gray-400">{school.location}{school.conference ? ` · ${school.conference}` : ''}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          <StatusBadge status={school.status} />
          {school.scholarship_type !== 'unknown' && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${school.scholarship_type === 'full_ride' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {scholarshipLabel[school.scholarship_type]}
            </span>
          )}
        </div>
        {school.coach_name && (
          <p className="text-xs text-gray-400">{school.coach_name}{school.coach_role ? ` · ${school.coach_role}` : ''}</p>
        )}
      </div>
    </Link>
  )
}
