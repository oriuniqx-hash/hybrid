'use client'
import { useEffect, useMemo, useState } from 'react'
import { sb } from './supabase/client'

/** Someone counts as "Active now" if the app pinged within this window. */
export const ACTIVE_MS = 2.5 * 60 * 1000
export const HEARTBEAT_MS = 45 * 1000

export function isActive(lastSeen?: string | null) {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < ACTIVE_MS
}

/** Instagram-style label; null when older than a week or unknown. */
export function activityLabel(lastSeen?: string | null): string | null {
  if (!lastSeen) return null
  const ms = Date.now() - new Date(lastSeen).getTime()
  if (ms < ACTIVE_MS) return 'Active now'
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (m < 60) return `Active ${m}m ago`
  if (h < 24) return `Active ${h}h ago`
  if (d === 1) return 'Active yesterday'
  if (d < 7) return `Active ${d}d ago`
  return null
}

/** Last-seen times for the given users (only those you're allowed to see). Refreshes every 30s. */
export function useActivity(ids: (string | null | undefined)[]) {
  const key = useMemo(() => Array.from(new Set(ids.filter(Boolean) as string[])).sort().join(','), [ids])
  const [map, setMap] = useState<Record<string, string>>({})
  const [, tick] = useState(0)
  useEffect(() => {
    if (!key) { setMap({}); return }
    let alive = true
    const load = async () => {
      const { data } = await sb().rpc('activity_status', { ids: key.split(',') })
      if (alive) setMap(Object.fromEntries((data || []).map((r: any) => [r.user_id, r.last_seen_at])))
    }
    load()
    const t = setInterval(() => { load(); tick(n => n + 1) }, 30000)
    const vis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', vis)
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', vis) }
  }, [key])
  return map
}

/** Marks the current user active while the app is open and visible. */
export function useHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const beat = () => { if (document.visibilityState === 'visible') sb().rpc('touch_activity').then(() => {}) }
    beat()
    const t = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)
    window.addEventListener('focus', beat)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', beat); window.removeEventListener('focus', beat) }
  }, [enabled])
}
