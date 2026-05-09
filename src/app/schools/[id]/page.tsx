import { notFound } from 'next/navigation'
import Link from 'next/link'
import getDb from '@/lib/db'
import { School, Activity, SchoolResearch, SchoolSwimmer, RelayProjection } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import PriorityBadge from '@/components/PriorityBadge'
import ActivityLog from '@/components/ActivityLog'
import DeleteButton from '@/components/DeleteButton'
import ResearchSection from '@/components/ResearchSection'

const SCHOLARSHIP_LABELS: Record<string, string> = {
  full_ride: 'Full Ride',
  partial:   'Partial Scholarship',
  none:      'No Scholarship',
  unknown:   'Unknown / TBD',
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = getDb()

  const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(Number(id)) as School | undefined
  if (!school) notFound()

  const activities = db.prepare(
    'SELECT * FROM activities WHERE school_id = ? ORDER BY date DESC, time DESC, created_at DESC'
  ).all(Number(id)) as Activity[]

  const research = db.prepare('SELECT * FROM school_research WHERE school_id = ?').get(Number(id)) as SchoolResearch | undefined
  const swimmers = db.prepare(
    'SELECT * FROM school_swimmers WHERE school_id = ? ORDER BY event, time_seconds ASC'
  ).all(Number(id)) as SchoolSwimmer[]
  const projections = db.prepare(
    'SELECT * FROM relay_projections WHERE school_id = ? ORDER BY relay_name'
  ).all(Number(id)) as RelayProjection[]

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{school.name}</h1>
          <p className="text-gray-500 mt-1">
            {school.location}
            {school.conference ? ` · ${school.conference}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusBadge status={school.status} />
            <PriorityBadge tier={school.priority_tier} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/schools/${school.id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
          >
            Edit
          </Link>
          <DeleteButton schoolId={school.id} />
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Scholarship */}
        <section className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-lg mb-3">Scholarship</h2>
          <p className={`font-semibold ${school.scholarship_type === 'full_ride' ? 'text-green-700' : 'text-gray-700'}`}>
            {school.scholarship_type === 'full_ride' ? '🎓 ' : ''}{SCHOLARSHIP_LABELS[school.scholarship_type]}
          </p>
          {school.scholarship_details && (
            <p className="text-sm text-gray-600 mt-2">{school.scholarship_details}</p>
          )}
        </section>

        {/* Coach */}
        <section className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-lg mb-3">Coach Contact</h2>
          {school.coach_name ? (
            <div className="space-y-1">
              <p className="font-medium">
                {school.coach_name}
                {school.coach_role ? <span className="text-gray-400 font-normal"> · {school.coach_role}</span> : ''}
              </p>
              {school.coach_email && (
                <p className="text-sm">
                  <a href={`mailto:${school.coach_email}`} className="text-blue-600 hover:underline">
                    {school.coach_email}
                  </a>
                </p>
              )}
              {school.coach_phone && (
                <p className="text-sm text-gray-600">
                  <a href={`tel:${school.coach_phone}`} className="hover:underline">{school.coach_phone}</a>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No coach info yet — add it by editing this school, or use Research This School below.</p>
          )}
        </section>
      </div>

      {/* Notes */}
      {school.notes && (
        <section className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-lg mb-2">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{school.notes}</p>
        </section>
      )}

      {/* AI Research + Relay Projections */}
      <ResearchSection
        schoolId={school.id}
        schoolName={school.name}
        initialResearch={research ?? null}
        initialSwimmers={swimmers}
        initialProjections={projections}
      />

      {/* Activity Log */}
      <ActivityLog schoolId={school.id} initialActivities={activities} />
    </div>
  )
}
