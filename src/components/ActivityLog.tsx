'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ActivityType } from '@/lib/types'

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call:           '📞',
  call_scheduled: '📅',
  email:          '📧',
  visit:          '🏫',
  offer:          '🎉',
  portal:         '🌀',
  other:          '📝',
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call:           'Call',
  call_scheduled: 'Scheduled Call',
  email:          'Email',
  visit:          'Visit',
  offer:          'Offer',
  portal:         'Portal',
  other:          'Other',
}

function formatDate(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!time) return dateStr
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${dateStr} at ${hour}:${m.toString().padStart(2, '0')}${ampm}`
}

function showTimeField(type: ActivityType) {
  return type === 'call_scheduled' || type === 'call' || type === 'visit'
}

interface ActivityFormState {
  date: string
  time: string
  activity_type: ActivityType
  description: string
}

function ActivityEntryForm({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: ActivityFormState
  onSave: (form: ActivityFormState) => Promise<void>
  onCancel: () => void
  saveLabel: string
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Type</span>
          <select
            value={form.activity_type}
            onChange={e => setForm(f => ({ ...f, activity_type: e.target.value as ActivityType }))}
            className="border rounded-lg px-2 py-1.5 bg-white"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map(t => (
              <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Date</span>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="border rounded-lg px-2 py-1.5"
          />
        </label>
      </div>
      {showTimeField(form.activity_type) && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">Time (optional)</span>
          <input
            type="time"
            step="60"
            value={form.time}
            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            className="border rounded-lg px-2 py-1.5 w-40"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">Notes</span>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="What happened? What did you discuss?"
          className="border rounded-lg px-2 py-1.5 resize-none w-full"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !form.description.trim()}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border px-4 py-1.5 rounded-lg text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ActivityLog({
  schoolId,
  initialActivities,
}: {
  schoolId: number
  initialActivities: Activity[]
}) {
  const router = useRouter()
  const [activities, setActivities] = useState(initialActivities)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const blankForm: ActivityFormState = {
    date: new Date().toISOString().slice(0, 10),
    time: '',
    activity_type: 'other',
    description: '',
  }

  async function handleAdd(form: ActivityFormState) {
    const res = await fetch(`/api/schools/${schoolId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, time: form.time || null }),
    })
    if (res.ok) {
      const newActivity = await res.json()
      setActivities(prev => [newActivity, ...prev])
      setAdding(false)
      router.refresh()
    }
  }

  async function handleEdit(activityId: number, form: ActivityFormState) {
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, time: form.time || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setActivities(prev => prev.map(a => a.id === activityId ? updated : a))
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDelete(activityId: number) {
    if (!confirm('Delete this activity entry?')) return
    await fetch(`/api/activities/${activityId}`, { method: 'DELETE' })
    setActivities(prev => prev.filter(a => a.id !== activityId))
    router.refresh()
  }

  return (
    <section className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Activity Log</h2>
        <button
          onClick={() => { setAdding(a => !a); setEditingId(null) }}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          {adding ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {adding && (
        <div className="mb-5">
          <ActivityEntryForm
            initial={blankForm}
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            saveLabel="Save Entry"
          />
        </div>
      )}

      {activities.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No activity logged yet.</p>
      ) : (
        <ul className="space-y-4">
          {activities.map(a => (
            <li key={a.id}>
              {editingId === a.id ? (
                <ActivityEntryForm
                  initial={{
                    date: a.date,
                    time: a.time ?? '',
                    activity_type: a.activity_type,
                    description: a.description,
                  }}
                  onSave={form => handleEdit(a.id, form)}
                  onCancel={() => setEditingId(null)}
                  saveLabel="Save Changes"
                />
              ) : (
                <div className="flex gap-3 items-start">
                  <span className="text-lg mt-0.5 shrink-0">{ACTIVITY_ICONS[a.activity_type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${a.activity_type === 'call_scheduled' ? 'text-purple-600' : 'text-gray-500'}`}>
                        {ACTIVITY_LABELS[a.activity_type]}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(a.date, a.time)}</span>
                    </div>
                    {a.description && (
                      <p className="text-sm text-gray-700 mt-0.5">{a.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingId(a.id); setAdding(false) }}
                      className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
