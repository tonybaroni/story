'use client'
import { useState } from 'react'
import { School, SchoolStatus, PriorityTier } from '@/lib/types'
import SchoolCard from './SchoolCard'

const STATUS_OPTIONS: { value: SchoolStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'current', label: 'Current School' },
  { value: 'offered', label: 'Offered' },
  { value: 'interested', label: 'Interested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'visit_scheduled', label: 'Visit Scheduled' },
  { value: 'committed', label: 'Committed' },
  { value: 'declined', label: 'Declined' },
]

const TIER_OPTIONS: { value: PriorityTier | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tiers' },
  { value: 'A', label: 'A List' },
  { value: 'B', label: 'B List' },
  { value: 'C', label: 'C List' },
]

export default function SchoolGrid({ schools }: { schools: School[] }) {
  const [filterStatus, setFilterStatus] = useState<SchoolStatus | 'all'>('all')
  const [filterTier, setFilterTier] = useState<PriorityTier | 'all'>('all')

  const filtered = schools.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    if (filterTier !== 'all' && s.priority_tier !== filterTier) return false
    return true
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as SchoolStatus | 'all')}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterTier}
          onChange={e => setFilterTier(e.target.value as PriorityTier | 'all')}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {TIER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">
          {filtered.length} school{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-16 bg-white rounded-xl border">
          No schools match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(school => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      )}
    </div>
  )
}
