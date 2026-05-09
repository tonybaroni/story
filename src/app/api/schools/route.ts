import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

export async function GET() {
  const db = getDb()
  const schools = db.prepare(
    'SELECT * FROM schools ORDER BY priority_tier ASC, updated_at DESC'
  ).all()
  return NextResponse.json(schools)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const result = db.prepare(`
    INSERT INTO schools
      (name, location, conference, status, priority_tier, scholarship_type,
       scholarship_details, coach_name, coach_role, coach_email, coach_phone, notes)
    VALUES
      (@name, @location, @conference, @status, @priority_tier, @scholarship_type,
       @scholarship_details, @coach_name, @coach_role, @coach_email, @coach_phone, @notes)
  `).run({
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
  const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(school, { status: 201 })
}
