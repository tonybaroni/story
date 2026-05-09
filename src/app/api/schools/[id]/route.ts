import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(Number(id))
  if (!school) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const activities = db.prepare(
    'SELECT * FROM activities WHERE school_id = ? ORDER BY date DESC, time DESC, created_at DESC'
  ).all(Number(id))
  return NextResponse.json({ ...school, activities })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  const body = await req.json()
  db.prepare(`
    UPDATE schools SET
      name=@name, location=@location, conference=@conference,
      status=@status, priority_tier=@priority_tier,
      scholarship_type=@scholarship_type, scholarship_details=@scholarship_details,
      coach_name=@coach_name, coach_role=@coach_role,
      coach_email=@coach_email, coach_phone=@coach_phone,
      notes=@notes, updated_at=datetime('now')
    WHERE id=@id
  `).run({
    id: Number(id),
    name: body.name,
    location: body.location ?? '',
    conference: body.conference ?? null,
    status: body.status ?? 'interested',
    priority_tier: body.priority_tier ?? 'C',
    scholarship_type: body.scholarship_type ?? 'unknown',
    scholarship_details: body.scholarship_details ?? null,
    coach_name: body.coach_name ?? null,
    coach_role: body.coach_role ?? null,
    coach_email: body.coach_email ?? null,
    coach_phone: body.coach_phone ?? null,
    notes: body.notes ?? null,
  })
  const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(Number(id))
  return NextResponse.json(school)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  db.prepare('DELETE FROM schools WHERE id = ?').run(Number(id))
  return new NextResponse(null, { status: 204 })
}
