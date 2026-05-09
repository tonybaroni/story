import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  const body = await req.json()
  db.prepare(`
    UPDATE activities SET date=?, time=?, activity_type=?, description=? WHERE id=?
  `).run(body.date, body.time ?? null, body.activity_type, body.description, Number(id))
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(Number(id))
  return NextResponse.json(activity)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  db.prepare('DELETE FROM activities WHERE id = ?').run(Number(id))
  return new NextResponse(null, { status: 204 })
}
