'use client'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ schoolId }: { schoolId: number }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Remove this school from your tracker? This cannot be undone.')) return
    await fetch(`/api/schools/${schoolId}`, { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
    >
      Remove
    </button>
  )
}
