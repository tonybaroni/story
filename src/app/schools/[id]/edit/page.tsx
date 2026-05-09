import { notFound } from 'next/navigation'
import getDb from '@/lib/db'
import { School } from '@/lib/types'
import SchoolForm from '@/components/SchoolForm'

export default async function EditSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = getDb()
  const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(Number(id)) as School | undefined
  if (!school) notFound()

  return (
    <div>
      <SchoolForm initialData={school} schoolId={school.id} />
    </div>
  )
}
