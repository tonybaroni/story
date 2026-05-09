'use client'

import { useState } from 'react'
import type { SchoolResearch, SchoolSwimmer, RelayProjection } from '@/lib/types'

type Props = {
  schoolId: number
  schoolName: string
  initialResearch: SchoolResearch | null
  initialSwimmers: SchoolSwimmer[]
  initialProjections: RelayProjection[]
}

type LineupEntry = { swimmer_name: string; time_display: string; is_student?: boolean }
type LineupJson = { current: LineupEntry[]; with_student: LineupEntry[] }

const RELAY_ORDER = ['200 Medley Relay', '400 Medley Relay', '400 Free Relay', '800 Free Relay']

const EVENT_LABELS: Record<string, string> = {
  '50_back':  '50 Back',
  '100_back': '100 Back',
  '50_free':  '50 Free',
  '100_free': '100 Free',
  '200_free': '200 Free',
}

export default function ResearchSection({
  schoolId,
  schoolName,
  initialResearch,
  initialSwimmers,
  initialProjections,
}: Props) {
  const [research, setResearch] = useState<SchoolResearch | null>(initialResearch)
  const [swimmers, setSwimmers] = useState<SchoolSwimmer[]>(initialSwimmers)
  const [projections, setProjections] = useState<RelayProjection[]>(initialProjections)
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runResearch() {
    setIsResearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/schools/${schoolId}/research`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Research failed'); return }
      setResearch(data.research)
      setSwimmers(data.swimmers)
      setProjections(data.projections)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  const sortedProjections = [...projections].sort(
    (a, b) => RELAY_ORDER.indexOf(a.relay_name) - RELAY_ORDER.indexOf(b.relay_name)
  )

  const swimmersByEvent = swimmers.reduce<Record<string, SchoolSwimmer[]>>((acc, s) => {
    if (!acc[s.event]) acc[s.event] = []
    acc[s.event].push(s)
    return acc
  }, {})

  const researchedAt = research?.researched_at
    ? new Date(research.researched_at + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <section className="bg-white rounded-xl border p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-lg">AI Research</h2>
          {researchedAt && (
            <p className="text-xs text-gray-400 mt-0.5">Last updated {researchedAt}</p>
          )}
        </div>
        <button
          onClick={runResearch}
          disabled={isResearching}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          {isResearching ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Researching {schoolName}…
            </>
          ) : research ? 'Re-research' : 'Research This School'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {isResearching && (
        <div className="py-8 text-center text-gray-500 text-sm">
          Searching for coach info, roster times, and relay history…<br />
          <span className="text-xs text-gray-400">This takes 20–60 seconds</span>
        </div>
      )}

      {!isResearching && research && (
        <>
          {/* Fit Score */}
          {research.fit_score != null && (
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center min-w-12">
                <div className={`text-3xl font-bold ${research.fit_score >= 7 ? 'text-green-600' : research.fit_score >= 5 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {research.fit_score}/10
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Fit Score</div>
              </div>
              {research.fit_summary && (
                <p className="text-sm text-gray-700 leading-relaxed">{research.fit_summary}</p>
              )}
            </div>
          )}

          {/* Key facts grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Fact label="Coed Team" value={research.has_mens_team != null ? (research.has_mens_team ? 'Yes' : 'No') : '?'} positive={!!research.has_mens_team} />
            <Fact label="LCM Summer" value={research.has_lcm_summer != null ? (research.has_lcm_summer ? 'Yes' : 'No') : '?'} positive={!!research.has_lcm_summer} />
            <Fact label="Engineering" value={research.engineering_rank ?? '?'} positive={true} neutral />
            <Fact label="Head Coach" value={research.head_coach_name ?? '?'} positive={true} neutral />
          </div>

          {/* Coach LinkedIn */}
          {research.head_coach_linkedin && (
            <p className="text-sm">
              <a href={research.head_coach_linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Coach LinkedIn Profile
              </a>
            </p>
          )}

          {/* Engineering notes */}
          {research.engineering_notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Engineering Program</p>
              <p className="text-sm text-gray-700">{research.engineering_notes}</p>
            </div>
          )}

          {/* Alumni notes */}
          {research.alumni_notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">NorCal / Alumni Connection</p>
              <p className="text-sm text-gray-700">{research.alumni_notes}</p>
            </div>
          )}

          {/* NCAA Relay History */}
          {research.ncaa_relay_history && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">NCAA Relay History</p>
              <p className="text-sm text-gray-700">{research.ncaa_relay_history}</p>
            </div>
          )}
        </>
      )}

      {/* Relay Projections */}
      {!isResearching && sortedProjections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Relay Projections
            <span className="ml-2 normal-case font-normal text-gray-400">2026 NCAA D1 Women&apos;s qualifying standards</span>
          </p>
          <div className="space-y-3">
            {sortedProjections.map(proj => {
              let lineup: LineupJson | null = null
              try { lineup = proj.lineup_json ? JSON.parse(proj.lineup_json) : null } catch { /* ignore */ }
              return (
                <RelayCard key={proj.relay_name} proj={proj} lineup={lineup} />
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            NCAA cuts are 2026 D1 Women&apos;s qualifying standards — verify at ncaa.org before relying on these figures.
          </p>
        </div>
      )}

      {/* Roster Times */}
      {!isResearching && Object.keys(swimmersByEvent).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Roster Times</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(swimmersByEvent)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([event, swims]) => (
                <div key={event}>
                  <p className="text-xs font-medium text-gray-500 mb-1">{EVENT_LABELS[event] ?? event}</p>
                  <div className="space-y-1">
                    {swims.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{s.swimmer_name}</span>
                        <span className="font-mono text-gray-600">{s.time_display}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {!isResearching && !research && projections.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          Click &ldquo;Research This School&rdquo; to auto-fill coach info, roster times, and relay projections using AI web search.
        </p>
      )}
    </section>
  )
}

function Fact({ label, value, positive, neutral }: { label: string; value: string; positive: boolean; neutral?: boolean }) {
  const color = neutral ? 'text-gray-700' : positive ? 'text-green-700' : 'text-red-600'
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function RelayCard({ proj, lineup }: { proj: RelayProjection; lineup: LineupJson | null }) {
  const [showLineup, setShowLineup] = useState(false)

  const makesWithout = !!proj.makes_ncaa_without
  const makesWith = !!proj.makes_ncaa_with
  const parkerHelps = !makesWithout && makesWith
  const parkerInLineup = (proj.student_slot ?? -1) > 0

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium text-sm">{proj.relay_name}</p>
          <p className="text-xs text-gray-400">Cut: {proj.ncaa_cut_display ?? 'N/A'}</p>
        </div>
        <div className="flex gap-4 text-right text-sm">
          <div>
            <p className="text-xs text-gray-400">Without Parker</p>
            <p className={`font-mono font-semibold ${makesWithout ? 'text-green-700' : 'text-gray-700'}`}>
              {proj.current_total_display ?? 'N/A'}
            </p>
            {proj.current_total_display && proj.current_total_display !== 'N/A' && (
              <p className="text-xs">{makesWithout ? 'Makes cut' : 'Misses cut'}</p>
            )}
          </div>
          {parkerInLineup && (
            <div>
              <p className="text-xs text-gray-400">With Parker</p>
              <p className={`font-mono font-semibold ${makesWith ? 'text-green-700' : 'text-gray-700'}`}>
                {proj.with_student_total_display ?? 'N/A'}
              </p>
              {proj.with_student_total_display && proj.with_student_total_display !== 'N/A' && (
                <p className="text-xs">{makesWith ? 'Makes cut' : 'Misses cut'}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {parkerHelps && (
        <p className="mt-2 text-xs font-medium text-green-700 bg-green-50 rounded px-2 py-1 inline-block">
          Parker gets them to NCAAs
        </p>
      )}
      {parkerInLineup && !parkerHelps && makesWith && (
        <p className="mt-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 inline-block">
          Parker earns leg {proj.student_slot} ({proj.student_leg_stroke})
        </p>
      )}
      {parkerInLineup && !makesWith && (
        <p className="mt-2 text-xs text-gray-500">
          Parker earns leg {proj.student_slot} but team still misses cut
        </p>
      )}

      {lineup && (
        <button
          onClick={() => setShowLineup(v => !v)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          {showLineup ? 'Hide lineup' : 'Show projected lineup'}
        </button>
      )}

      {showLineup && lineup && (
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold text-gray-500 mb-1">Current Team</p>
            {lineup.current.map((leg, i) => (
              <p key={i} className="text-gray-700">
                {i + 1}. {leg.swimmer_name} <span className="font-mono">{leg.time_display}</span>
              </p>
            ))}
          </div>
          <div>
            <p className="font-semibold text-gray-500 mb-1">With Parker</p>
            {lineup.with_student.map((leg, i) => (
              <p key={i} className={leg.is_student ? 'text-blue-700 font-semibold' : 'text-gray-700'}>
                {i + 1}. {leg.swimmer_name} <span className="font-mono">{leg.time_display}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
