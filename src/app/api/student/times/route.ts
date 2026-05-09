import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

export async function GET() {
  const db = getDb()
  const times = db.prepare(
    'SELECT * FROM student_times WHERE student_id = 1 ORDER BY event'
  ).all()
  return NextResponse.json(times)
}

export async function PUT(req: NextRequest) {
  const db = getDb()
  const body = await req.json() as Record<string, { time_display: string; time_seconds: number; source?: string }>

  const upsert = db.prepare(`
    INSERT INTO student_times (student_id, event, time_display, time_seconds, source, updated_at)
    VALUES (1, @event, @time_display, @time_seconds, @source, datetime('now'))
    ON CONFLICT(student_id, event) DO UPDATE SET
      time_display = excluded.time_display,
      time_seconds = excluded.time_seconds,
      source       = excluded.source,
      updated_at   = datetime('now')
  `)

  const saveAll = db.transaction(() => {
    for (const [event, data] of Object.entries(body)) {
      if (data.time_display && data.time_seconds) {
        upsert.run({
          event,
          time_display: data.time_display,
          time_seconds: data.time_seconds,
          source: data.source ?? 'manual',
        })
      }
    }
  })
  saveAll()

  const times = db.prepare(
    'SELECT * FROM student_times WHERE student_id = 1 ORDER BY event'
  ).all()
  return NextResponse.json(times)
}
