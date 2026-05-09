import getDb from '@/lib/db'
import { School, Stats, UpcomingCall } from '@/lib/types'
import StatsHeader from '@/components/StatsHeader'
import SchoolGrid from '@/components/SchoolGrid'
import UpcomingCalls from '@/components/UpcomingCalls'

export default function DashboardPage() {
  const db = getDb()

  const schools = db.prepare(
    'SELECT * FROM schools ORDER BY priority_tier ASC, updated_at DESC'
  ).all() as School[]

  const today = new Date().toISOString().slice(0, 10)

  const upcomingCalls = db.prepare(`
    SELECT
      a.id as activity_id,
      a.school_id,
      s.name as school_name,
      a.date,
      a.time,
      a.description
    FROM activities a
    JOIN schools s ON s.id = a.school_id
    WHERE a.activity_type = 'call_scheduled'
      AND a.date >= ?
    ORDER BY a.date ASC, a.time ASC
  `).all(today) as UpcomingCall[]

  const stats: Stats = {
    total: schools.length,
    offered: schools.filter(s => s.status === 'offered').length,
    a_list: schools.filter(s => s.priority_tier === 'A').length,
    upcoming_calls: upcomingCalls.length,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transfer Portal Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tracking recruiting activity — entered portal May 9, 2026</p>
      </div>
      <StatsHeader stats={stats} />
      <UpcomingCalls calls={upcomingCalls} />
      <h2 className="text-lg font-semibold mb-4 text-gray-800">All Schools</h2>
      <SchoolGrid schools={schools} />
    </div>
  )
}
