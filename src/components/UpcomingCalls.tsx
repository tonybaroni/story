'use client'
import Link from 'next/link'
import { UpcomingCall } from '@/lib/types'

function formatDateTime(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (!time) return dateStr
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${dateStr} · ${hour}:${m.toString().padStart(2, '0')}${ampm}`
}

export default function UpcomingCalls({ calls }: { calls: UpcomingCall[] }) {
  if (calls.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>📞</span> Upcoming Calls
        </h2>
        <p className="text-sm text-gray-400 italic bg-white border rounded-xl p-4">
          No calls scheduled yet. Add a &quot;Scheduled Call&quot; activity on any school to track it here.
        </p>
      </section>
    )
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span>📞</span> Upcoming Calls
        <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
          {calls.length}
        </span>
      </h2>
      <div className="bg-white border rounded-xl divide-y">
        {calls.map(call => (
          <Link
            key={call.activity_id}
            href={`/schools/${call.school_id}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-purple-50 transition group"
          >
            <div>
              <span className="font-medium text-sm group-hover:text-purple-700 transition">
                {call.school_name}
              </span>
              {call.description && (
                <p className="text-xs text-gray-400 mt-0.5">{call.description}</p>
              )}
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full whitespace-nowrap ml-4">
              {formatDateTime(call.date, call.time)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
