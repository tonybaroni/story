import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

export async function GET() {
  const db = getDb()
  const student = db.prepare('SELECT * FROM students WHERE id = 1').get()
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(student)
}

export async function PUT(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  db.prepare(`
    UPDATE students SET
      name = @name,
      swimcloud_url = @swimcloud_url,
      goals = @goals,
      updated_at = datetime('now')
    WHERE id = 1
  `).run({
    name: body.name ?? 'Parker',
    swimcloud_url: body.swimcloud_url ?? null,
    goals: body.goals ? JSON.stringify(body.goals) : null,
  })
  const student = db.prepare('SELECT * FROM students WHERE id = 1').get()
  return NextResponse.json(student)
}
