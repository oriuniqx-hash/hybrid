'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Eye, Radio, PlayCircle } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { freshSince } from '../../../lib/live'
import { Avatar, Empty, Spinner } from '../../../components/ui'
import { displayName, timeAgo } from '../../../lib/format'

export default function LiveListPage() {
  const [live, setLive] = useState<any[] | null>(null)
  const [past, setPast] = useState<any[]>([])
  async function load() {
    const s = sb(); const sel = '*, host:profiles!live_streams_host_id_fkey(id,username,full_name,avatar_url), replay:posts!live_streams_replay_post_id_fkey(id,media_url)'
    const [{ data: l }, { data: p }] = await Promise.all([
      s.from('live_streams').select(sel).eq('status', 'live').gt('heartbeat_at', freshSince()).order('started_at', { ascending: false }).limit(60),
      s.from('live_streams').select(sel).eq('status', 'ended').not('replay_post_id', 'is', null).order('ended_at', { ascending: false }).limit(24),
    ])
    setLive(l || []); setPast(p || [])
  }
  useEffect(() => {
    load()
    const s = sb(); const ch = s.channel('live-list').on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, load).subscribe()
    const t = setInterval(load, 30000)
    return () => { s.removeChannel(ch); clearInterval(t) }
  }, [])
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold">Live</h1><p className="mt-1 text-sm text-muted">Watch people broadcasting right now, or go live yourself.</p></div>
        <Link href="/live/new" className="btn-primary px-6 py-3"><Radio size={18} />Go live</Link>
      </div>
      <h2 className="mt-8 flex items-center gap-2 font-bold"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />Live now</h2>
      {!live ? <div className="grid place-items-center py-12"><Spinner /></div> : live.length === 0 ? <Empty icon={<Radio size={24} />} title="Nobody is live right now" body="When people you can see start a live video, it shows up here and in the stories bar." action={{ href: '/live/new', label: 'Start a live video' }} /> :
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{live.map(l => (
          <Link key={l.id} href={`/live/${l.id}`} className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-accent/80 to-ink">
            <div className="absolute inset-0 grid place-items-center"><Avatar src={l.host?.avatar_url} name={displayName(l.host)} size={84} ring /></div>
            <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-0.5 text-xs font-extrabold tracking-wider text-white">LIVE</span>
            {l.peak_viewers > 0 && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white"><Eye size={12} />{l.peak_viewers}</span>}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white"><p className="truncate font-bold">{l.host?.username}</p><p className="truncate text-xs text-white/80">{l.title || `Started ${timeAgo(l.started_at)} ago`}</p></div>
          </Link>))}</div>}
      {past.length > 0 && <>
        <h2 className="mt-10 font-bold">Recent replays</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{past.map(l => (
          <Link key={l.id} href={`/reels?id=${l.replay_post_id}`} className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-surface2">
            {l.replay?.media_url && <video src={l.replay.media_url + '#t=1'} muted preload="metadata" className="h-full w-full object-cover" />}
            <PlayCircle size={40} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white"><p className="truncate font-bold">{l.host?.username}</p><p className="truncate text-xs text-white/80">{l.title || 'Live replay'} · {timeAgo(l.ended_at)} ago</p></div>
          </Link>))}</div>
      </>}
    </div>
  )
}
