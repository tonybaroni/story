'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { School, SchoolStatus, PriorityTier, ScholarshipType } from '@/lib/types'

interface SchoolFormProps {
  initialData?: Partial<School>
  schoolId?: number
}

const STATUS_OPTIONS: { value: SchoolStatus; label: string }[] = [
  { value: 'current',         label: 'Current School' },
  { value: 'interested',      label: 'Interested' },
  { value: 'contacted',       label: 'Contacted' },
  { value: 'offered',         label: 'Offered' },
  { value: 'visit_scheduled', label: 'Visit Scheduled' },
  { value: 'committed',       label: 'Committed' },
  { value: 'declined',        label: 'Declined' },
]

export default function SchoolForm({ initialData, schoolId }: SchoolFormProps) {
  const router = useRouter()
  const isEdit = !!schoolId

  const [form, setForm] = useState({
    name:                initialData?.name ?? '',
    location:            initialData?.location ?? '',
    conference:          initialData?.conference ?? '',
    status:              (initialData?.status ?? 'interested') as SchoolStatus,
    priority_tier:       (initialData?.priority_tier ?? 'C') as PriorityTier,
    scholarship_type:    (initialData?.scholarship_type ?? 'unknown') as ScholarshipType,
    scholarship_details: initialData?.scholarship_details ?? '',
    coach_name:          initialData?.coach_name ?? '',
    coach_role:          initialData?.coach_role ?? '',
    coach_email:         initialData?.coach_email ?? '',
    coach_phone:         initialData?.coach_phone ?? '',
    notes:               initialData?.notes ?? '',
  })

  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const url = isEdit ? `/api/schools/${schoolId}` : '/api/schools'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        conference: form.conference || null,
        scholarship_details: form.scholarship_details || null,
        coach_name: form.coach_name || null,
        coach_role: form.coach_role || null,
        coach_email: form.coach_email || null,
        coach_phone: form.coach_phone || null,
        notes: form.notes || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/schools/${data.id}`)
      router.refresh()
    } else {
      setSaving(false)
    }
  }

  function textField(label: string, key: keyof typeof form, type = 'text', placeholder = '') {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <input
          type={type}
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </label>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit School' : 'Add School'}</h1>
      </div>

      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">School Info</h2>
        {textField('School Name *', 'name', 'text', 'e.g. Rice University')}
        {textField('Location', 'location', 'text', 'e.g. Houston, TX')}
        {textField('Conference', 'conference', 'text', 'e.g. AAC')}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as SchoolStatus }))}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Priority Tier</span>
            <select
              value={form.priority_tier}
              onChange={e => setForm(f => ({ ...f, priority_tier: e.target.value as PriorityTier }))}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="A">A List</option>
              <option value="B">B List</option>
              <option value="C">C List</option>
            </select>
          </label>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Scholarship</h2>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Scholarship Type</span>
          <select
            value={form.scholarship_type}
            onChange={e => setForm(f => ({ ...f, scholarship_type: e.target.value as ScholarshipType }))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="unknown">Unknown</option>
            <option value="full_ride">Full Ride</option>
            <option value="partial">Partial</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Scholarship Details</span>
          <textarea
            value={form.scholarship_details}
            onChange={e => setForm(f => ({ ...f, scholarship_details: e.target.value }))}
            rows={2}
            placeholder="e.g. Full ride + all expenses. Includes housing, books, and meals."
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </label>
      </section>

      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Coach Contact</h2>
        {textField('Coach Name', 'coach_name', 'text', 'e.g. Jane Smith')}
        {textField('Coach Role', 'coach_role', 'text', 'e.g. Head Coach')}
        {textField('Coach Email', 'coach_email', 'email', 'coach@university.edu')}
        {textField('Coach Phone', 'coach_phone', 'tel', 'e.g. 555-555-5555')}
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Notes</h2>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={4}
          placeholder="Impressions, questions to ask, things to remember..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add School'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border px-6 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
