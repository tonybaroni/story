'use client'

import { useEffect, useState, useCallback } from 'react'
import { parseTimeToSeconds } from '@/lib/swim-utils'
import type { Student } from '@/lib/types'

type TimeEntry = {
  time_display: string
  time_seconds: number
  source: string
  updated_at?: string
}

type Times = Record<string, TimeEntry>

const EVENTS = [
  { key: '50_back',  label: '50 Backstroke' },
  { key: '100_back', label: '100 Backstroke' },
  { key: '200_back', label: '200 Backstroke' },
  { key: '50_free',  label: '50 Freestyle' },
  { key: '100_free', label: '100 Freestyle' },
  { key: '200_free', label: '200 Freestyle' },
]

const GOALS_LABELS: Record<string, string> = {
  engineering:   'Engineering program',
  norcal_alumni: 'NorCal alumni network',
  lcm_summer:    'LCM summer training',
  coed_team:     'Coed swim team',
  ncaa_relay:    'NCAA relay contender',
  olympic_trials: 'Olympic Trials qualifier',
}

export default function StudentPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [times, setTimes] = useState<Times>({})
  const [editingTimes, setEditingTimes] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([
      fetch('/api/student'),
      fetch('/api/student/times'),
    ])
    if (sRes.ok) setStudent(await sRes.json())
    if (tRes.ok) {
      const rows: { event: string; time_display: string; time_seconds: number; source: string; updated_at: string }[] = await tRes.json()
      const map: Times = {}
      for (const r of rows) map[r.event] = { time_display: r.time_display, time_seconds: r.time_seconds, source: r.source, updated_at: r.updated_at }
      setTimes(map)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function startEdit() {
    const draft: Record<string, string> = {}
    for (const ev of EVENTS) draft[ev.key] = times[ev.key]?.time_display ?? ''
    setEditingTimes(draft)
    setIsEditing(true)
    setSaveMsg(null)
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditingTimes({})
  }

  async function saveEdit() {
    setIsSaving(true)
    const body: Record<string, { time_display: string; time_seconds: number; source: string }> = {}
    for (const ev of EVENTS) {
      const raw = editingTimes[ev.key]?.trim()
      if (!raw) continue
      const secs = parseTimeToSeconds(raw)
      if (!isNaN(secs) && secs > 0) {
        body[ev.key] = { time_display: raw, time_seconds: secs, source: 'manual' }
      }
    }
    const res = await fetch('/api/student/times', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      await loadData()
      setIsEditing(false)
      setSaveMsg('Times saved.')
      setTimeout(() => setSaveMsg(null), 3000)
    }
    setIsSaving(false)
  }

  async function fetchFromSwimCloud() {
    if (!student?.swimcloud_url) return
    setIsFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/student/fetch-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swimcloud_url: student.swimcloud_url }),
      })
      const data = await res.json()
      if (!res.ok) { setFetchError(data.error ?? 'Failed to fetch times'); return }

      // Merge fetched times into editing state (overwrite only found events)
      const draft: Record<string, string> = {}
      for (const ev of EVENTS) draft[ev.key] = times[ev.key]?.time_display ?? ''
      for (const [event, info] of Object.entries(data as Record<string, { time_display: string }>)) {
        draft[event] = info.time_display
      }
      setEditingTimes(draft)
      setIsEditing(true)
    } catch {
      setFetchError('Network error — please try again.')
    } finally {
      setIsFetching(false)
    }
  }

  const goals: Record<string, boolean> = student?.goals ? JSON.parse(student.goals) : {}

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{student?.name ?? 'Parker'}&apos;s Profile</h1>
        <p className="text-gray-500 mt-1">Personal bests · Goals · SwimCloud sync</p>
      </div>

      {/* Goals */}
      <section className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">Recruiting Goals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(GOALS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${goals[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {goals[key] ? '✓' : '–'}
              </span>
              <span className={goals[key] ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SwimCloud */}
      {student?.swimcloud_url && (
        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-2">SwimCloud Profile</h2>
          <a href={student.swimcloud_url} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm break-all">
            {student.swimcloud_url}
          </a>
        </section>
      )}

      {/* Times */}
      <section className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-lg">Best SCY Times</h2>
            <p className="text-xs text-gray-400 mt-0.5">Short course yards · personal bests used for relay projections</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isEditing && (
              <>
                <button
                  onClick={fetchFromSwimCloud}
                  disabled={isFetching || !student?.swimcloud_url}
                  className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition"
                >
                  {isFetching ? 'Fetching...' : 'Auto-fill from SwimCloud'}
                </button>
                <button
                  onClick={startEdit}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Edit Times
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isSaving ? 'Saving...' : 'Save Times'}
                </button>
              </>
            )}
          </div>
        </div>

        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {fetchError}
          </div>
        )}
        {saveMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {saveMsg}
          </div>
        )}

        <div className="divide-y">
          {EVENTS.map(ev => {
            const current = times[ev.key]
            return (
              <div key={ev.key} className="py-3 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700 w-36">{ev.label}</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingTimes[ev.key] ?? ''}
                    onChange={e => setEditingTimes(prev => ({ ...prev, [ev.key]: e.target.value }))}
                    placeholder="e.g. 58.45 or 1:02.10"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`font-mono text-sm ${current ? 'text-gray-900 font-semibold' : 'text-gray-300'}`}>
                      {current?.time_display ?? '—'}
                    </span>
                    {current && (
                      <span className="text-xs text-gray-400">{current.source}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Enter times as seconds (27.45) or minutes:seconds (1:02.34). These times are used to compute relay projections for each school.
        </p>
      </section>
    </div>
  )
}

