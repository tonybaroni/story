import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const db = getDb()
  db.prepare('DELETE FROM activities WHERE id = ?').run(Number(id))
  return new NextResponse(null, { status: 204 })
}
