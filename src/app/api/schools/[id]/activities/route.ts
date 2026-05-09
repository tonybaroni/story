import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  const activities = db.prepare(
    'SELECT * FROM activities WHERE school_id = ? ORDER BY date DESC, time DESC, created_at DESC'
  ).all(Number(id))
  return NextResponse.json(activities)
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  const body = await req.json()
  const result = db.prepare(`
    INSERT INTO activities (school_id, date, time, activity_type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    Number(id),
    body.date,
    body.time ?? null,
    body.activity_type ?? 'other',
    body.description ?? ''
  )
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid)
  db.prepare("UPDATE schools SET updated_at=datetime('now') WHERE id=?").run(Number(id))
  return NextResponse.json(activity, { status: 201 })
}
