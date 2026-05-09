import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import getDb from '@/lib/db'
import { parseTimeToSeconds, computeFreeRelay, computeMedleyRelay } from '@/lib/swim-utils'
import type { NcaaRelayCut } from '@/lib/types'

const client = new Anthropic()

type SchoolRow = {
  id: number
  name: string
  location: string
  conference: string | null
}

type StudentTimeRow = {
  event: string
  time_display: string
  time_seconds: number
}

type SwimmerData = {
  swimmer_name: string
  event: string
  time_display: string
  time_seconds?: number
}

type ResearchResult = {
  head_coach_name?: string
  head_coach_linkedin?: string
  engineering_rank?: string
  engineering_notes?: string
  alumni_notes?: string
  has_mens_team?: boolean
  has_lcm_summer?: boolean
  ncaa_relay_history?: string
  fit_score?: number
  fit_summary?: string
  swimmers?: SwimmerData[]
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const schoolId = Number(id)
  const db = getDb()

  const research = db.prepare('SELECT * FROM school_research WHERE school_id = ?').get(schoolId)
  const swimmers = db.prepare(
    'SELECT * FROM school_swimmers WHERE school_id = ? ORDER BY event, time_seconds ASC'
  ).all(schoolId)
  const projections = db.prepare(
    'SELECT * FROM relay_projections WHERE school_id = ? ORDER BY relay_name'
  ).all(schoolId)

  return NextResponse.json({ research, swimmers, projections })
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const schoolId = Number(id)
  const db = getDb()

  const school = db.prepare('SELECT id, name, location, conference FROM schools WHERE id = ?').get(schoolId) as SchoolRow | undefined
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const studentTimesRaw = db.prepare(
    'SELECT event, time_display, time_seconds FROM student_times WHERE student_id = 1'
  ).all() as StudentTimeRow[]
  const studentTimes: Record<string, { time_display: string; time_seconds: number }> = {}
  for (const row of studentTimesRaw) {
    studentTimes[row.event] = { time_display: row.time_display, time_seconds: row.time_seconds }
  }

  const cuts = db.prepare(
    'SELECT * FROM ncaa_relay_cuts WHERE sport = ? AND gender = ? AND division = ? AND season_year = ?'
  ).all('swimming', 'women', 'D1', 2026) as NcaaRelayCut[]

  const prompt = buildResearchPrompt(school)
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20260209' as any, name: 'web_search' }],
    messages,
  })

  let iterations = 0
  while (response.stop_reason === 'pause_turn' && iterations < 5) {
    iterations++
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20260209' as any, name: 'web_search' }],
      messages,
    })
  }

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse research data' }, { status: 500 })
  }

  let result: ResearchResult
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in AI response' }, { status: 500 })
  }

  // Persist research
  db.prepare(`
    INSERT INTO school_research
      (school_id, head_coach_name, head_coach_linkedin, engineering_rank, engineering_notes,
       alumni_notes, has_mens_team, has_lcm_summer, ncaa_relay_history, fit_score, fit_summary, researched_at)
    VALUES
      (@school_id, @head_coach_name, @head_coach_linkedin, @engineering_rank, @engineering_notes,
       @alumni_notes, @has_mens_team, @has_lcm_summer, @ncaa_relay_history, @fit_score, @fit_summary, datetime('now'))
    ON CONFLICT(school_id) DO UPDATE SET
      head_coach_name     = excluded.head_coach_name,
      head_coach_linkedin = excluded.head_coach_linkedin,
      engineering_rank    = excluded.engineering_rank,
      engineering_notes   = excluded.engineering_notes,
      alumni_notes        = excluded.alumni_notes,
      has_mens_team       = excluded.has_mens_team,
      has_lcm_summer      = excluded.has_lcm_summer,
      ncaa_relay_history  = excluded.ncaa_relay_history,
      fit_score           = excluded.fit_score,
      fit_summary         = excluded.fit_summary,
      researched_at       = datetime('now')
  `).run({
    school_id: schoolId,
    head_coach_name: result.head_coach_name ?? null,
    head_coach_linkedin: result.head_coach_linkedin ?? null,
    engineering_rank: result.engineering_rank ?? null,
    engineering_notes: result.engineering_notes ?? null,
    alumni_notes: result.alumni_notes ?? null,
    has_mens_team: result.has_mens_team != null ? (result.has_mens_team ? 1 : 0) : null,
    has_lcm_summer: result.has_lcm_summer != null ? (result.has_lcm_summer ? 1 : 0) : null,
    ncaa_relay_history: result.ncaa_relay_history ?? null,
    fit_score: result.fit_score ?? null,
    fit_summary: result.fit_summary ?? null,
  })

  // Persist swimmers — clear old rows and insert fresh
  if (result.swimmers && result.swimmers.length > 0) {
    db.prepare('DELETE FROM school_swimmers WHERE school_id = ?').run(schoolId)
    const insertSwimmer = db.prepare(`
      INSERT INTO school_swimmers (school_id, swimmer_name, event, time_display, time_seconds, researched_at)
      VALUES (@school_id, @swimmer_name, @event, @time_display, @time_seconds, datetime('now'))
    `)
    const insertAll = db.transaction(() => {
      for (const s of result.swimmers!) {
        const time_seconds = s.time_seconds ?? (s.time_display ? parseTimeToSeconds(s.time_display) : null)
        insertSwimmer.run({
          school_id: schoolId,
          swimmer_name: s.swimmer_name,
          event: s.event,
          time_display: s.time_display,
          time_seconds,
        })
      }
    })
    insertAll()
  }

  // Compute and persist relay projections
  const swimmerRows = db.prepare(
    'SELECT swimmer_name, event, time_seconds, time_display FROM school_swimmers WHERE school_id = ?'
  ).all(schoolId) as { swimmer_name: string; event: string; time_seconds: number | null; time_display: string | null }[]

  const cutMap = Object.fromEntries(cuts.map(c => [c.relay_name, { cut_display: c.cut_display, cut_seconds: c.cut_seconds }]))

  const relayResults = [
    computeFreeRelay('400 Free Relay', '100_free', 'free',
      cutMap['400 Free Relay'] ?? { cut_display: 'N/A', cut_seconds: 9999 },
      swimmerRows, studentTimes['100_free'] ?? null),
    computeFreeRelay('800 Free Relay', '200_free', 'free',
      cutMap['800 Free Relay'] ?? { cut_display: 'N/A', cut_seconds: 9999 },
      swimmerRows, studentTimes['200_free'] ?? null),
    computeMedleyRelay('200 Medley Relay', 50,
      cutMap['200 Medley Relay'] ?? { cut_display: 'N/A', cut_seconds: 9999 },
      swimmerRows, studentTimes),
    computeMedleyRelay('400 Medley Relay', 100,
      cutMap['400 Medley Relay'] ?? { cut_display: 'N/A', cut_seconds: 9999 },
      swimmerRows, studentTimes),
  ]

  const upsertRelay = db.prepare(`
    INSERT INTO relay_projections
      (school_id, relay_name, ncaa_cut_display, ncaa_cut_seconds,
       current_total_display, current_total_seconds,
       with_student_total_display, with_student_total_seconds,
       makes_ncaa_without, makes_ncaa_with, student_slot, student_leg_stroke,
       lineup_json, researched_at)
    VALUES
      (@school_id, @relay_name, @ncaa_cut_display, @ncaa_cut_seconds,
       @current_total_display, @current_total_seconds,
       @with_student_total_display, @with_student_total_seconds,
       @makes_ncaa_without, @makes_ncaa_with, @student_slot, @student_leg_stroke,
       @lineup_json, datetime('now'))
    ON CONFLICT(school_id, relay_name) DO UPDATE SET
      ncaa_cut_display          = excluded.ncaa_cut_display,
      ncaa_cut_seconds          = excluded.ncaa_cut_seconds,
      current_total_display     = excluded.current_total_display,
      current_total_seconds     = excluded.current_total_seconds,
      with_student_total_display = excluded.with_student_total_display,
      with_student_total_seconds = excluded.with_student_total_seconds,
      makes_ncaa_without        = excluded.makes_ncaa_without,
      makes_ncaa_with           = excluded.makes_ncaa_with,
      student_slot              = excluded.student_slot,
      student_leg_stroke        = excluded.student_leg_stroke,
      lineup_json               = excluded.lineup_json,
      researched_at             = datetime('now')
  `)

  const saveRelays = db.transaction(() => {
    for (const r of relayResults) {
      upsertRelay.run({
        school_id: schoolId,
        relay_name: r.relay_name,
        ncaa_cut_display: r.ncaa_cut_display,
        ncaa_cut_seconds: r.ncaa_cut_seconds,
        current_total_display: r.current_total_display,
        current_total_seconds: r.current_total_seconds,
        with_student_total_display: r.with_student_total_display,
        with_student_total_seconds: r.with_student_total_seconds,
        makes_ncaa_without: r.makes_ncaa_without ? 1 : 0,
        makes_ncaa_with: r.makes_ncaa_with ? 1 : 0,
        student_slot: r.student_slot,
        student_leg_stroke: r.student_leg_stroke,
        lineup_json: JSON.stringify({
          current: r.current_lineup,
          with_student: r.with_student_lineup,
        }),
      })
    }
  })
  saveRelays()

  const research = db.prepare('SELECT * FROM school_research WHERE school_id = ?').get(schoolId)
  const swimmers = db.prepare(
    'SELECT * FROM school_swimmers WHERE school_id = ? ORDER BY event, time_seconds ASC'
  ).all(schoolId)
  const projections = db.prepare(
    'SELECT * FROM relay_projections WHERE school_id = ? ORDER BY relay_name'
  ).all(schoolId)

  return NextResponse.json({ research, swimmers, projections })
}

function buildResearchPrompt(school: SchoolRow): string {
  return `Research the following college swim program for an NCAA transfer portal athlete (women's swimmer, backstroke/freestyle specialist):

School: ${school.name}
Location: ${school.location}${school.conference ? `\nConference: ${school.conference}` : ''}

Please search for and provide:
1. Head coach name and their LinkedIn URL (if findable)
2. Engineering program academic ranking (US News or similar)
3. Whether they have a men's swim team (coed program) — yes or no
4. Whether they offer LCM (long course meters) summer training
5. Top roster swimmers with their best SCY times for these specific events: 50 backstroke, 100 backstroke, 50 freestyle, 100 freestyle, 200 freestyle — look on SwimCloud or athletic department roster pages. List up to 5 swimmers per event.
6. Recent NCAA championship relay appearances (last 2-3 years)
7. Any NorCal alumni connection (California connections in coaching staff or notable alumni)
8. A fit score from 1-10 for a backstroke/freestyle swimmer who wants engineering + coed team + LCM training + NCAA relay opportunity
9. A brief fit summary (2-3 sentences)

Return ONLY a JSON object with no other text:
{
  "head_coach_name": "Coach Name or null",
  "head_coach_linkedin": "https://linkedin.com/in/... or null",
  "engineering_rank": "#42 US News 2025 or null",
  "engineering_notes": "Brief note about program or null",
  "alumni_notes": "NorCal or California connections or null",
  "has_mens_team": true or false,
  "has_lcm_summer": true or false,
  "ncaa_relay_history": "Brief history or null",
  "fit_score": 7,
  "fit_summary": "2-3 sentence summary",
  "swimmers": [
    { "swimmer_name": "Jane Smith", "event": "100_back", "time_display": "55.43" },
    { "swimmer_name": "Jane Smith", "event": "50_back", "time_display": "26.12" },
    { "swimmer_name": "Alex Johnson", "event": "100_free", "time_display": "49.88" }
  ]
}

Event keys must use exactly: 50_back, 100_back, 50_free, 100_free, 200_free
Times under 60 seconds: "27.45", times 60+ seconds: "1:52.34" format.`
}

