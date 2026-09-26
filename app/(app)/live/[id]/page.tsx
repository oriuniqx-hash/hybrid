'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Heart, Radio, Volume2, VolumeX, Flag } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { freshSince, getIce, liveChannel, Peer, routeType } from '../../../../lib/live'
import { Avatar, Spinner } from '../../../../components/ui'
import { displayName } from '../../../../lib/format'
import FollowButton from '../../../../components/social/FollowButton'
import ReportDialog from '../../../../components/social/ReportDialog'
import LiveChat from '../../../../components/live/LiveChat'
import Hearts, { type HeartsHandle } from '../../../../components/live/Hearts'

export default function WatchLivePage() {
  const { id } = useParams<{ id: string }>()
  const me = useMe()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<Peer | null>(null)
  const chRef = useRef<any>(null)
  const hearts = useRef<HeartsHandle>(null)
  const [live, setLive] = useState<any | null | undefined>(undefined)
  const [state, setState] = useState<'connecting' | 'playing' | 'ended' | 'unavailable'>('connecting')
  const [viewers, setViewers] = useState(0)
  const [muted, setMuted] = useState(true)
  const [report, setReport] = useState(false)

  useEffect(() => {
    let alive = true, retry: any
    const early: RTCIceCandidateInit[] = []
    ;(async () => {
      const { data } = await sb().from('live_streams').select('*, host:profiles!live_streams_host_id_fkey(id,username,full_name,avatar_url)').eq('id', id).maybeSingle()
      if (!alive) return
      setLive(data || null)
      if (!data) return setState('unavailable')
      if (data.status !== 'live' || data.heartbeat_at < freshSince()) return setState('ended')
      if (data.host_id === me.id) return
      getIce()
      const ch = await liveChannel(id, me.id); chRef.current = ch
      const hello = () => ch.send({ type: 'broadcast', event: 'hello', payload: { from: me.id } })
      ch.on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
        if (payload.to !== me.id) return
        peerRef.current?.close(); peerRef.current = null
        const { servers } = await getIce()
        const peer = new Peer(servers); peerRef.current = peer
        early.splice(0).forEach(c => peer.addIce(c))
        peer.pc.ontrack = e => { if (videoRef.current && videoRef.current.srcObject !== e.streams[0]) { videoRef.current.srcObject = e.streams[0]; videoRef.current.play().catch(() => {}) } }
        peer.pc.onicecandidate = e => { if (e.candidate) ch.send({ type: 'broadcast', event: 'ice', payload: { to: 'host', from: me.id, c: e.candidate.toJSON() } }) }
        peer.pc.onconnectionstatechange = () => {
          const s = peer.pc.connectionState
          if (s === 'connected') { setState('playing'); routeType(peer.pc).then(t => { if (videoRef.current && t) videoRef.current.dataset.route = t }) }
          if (s === 'failed' || s === 'disconnected') { setState('connecting'); setTimeout(hello, 1500) }
        }
        await peer.setRemote(payload.sdp)
        const ans = await peer.pc.createAnswer(); await peer.pc.setLocalDescription(ans)
        ch.send({ type: 'broadcast', event: 'answer', payload: { from: me.id, to: 'host', sdp: peer.pc.localDescription } })
      })
        .on('broadcast', { event: 'ice' }, ({ payload }: any) => { if (payload.to !== me.id) return; if (peerRef.current) peerRef.current.addIce(payload.c); else early.push(payload.c) })
        .on('broadcast', { event: 'host-ready' }, hello)
        .on('broadcast', { event: 'heart' }, () => hearts.current?.burst())
        .on('broadcast', { event: 'end' }, () => { setState('ended'); peerRef.current?.close() })
        .on('presence', { event: 'sync' }, () => { const st = ch.presenceState(); setViewers(Object.keys(st).filter(k => k !== data.host_id).length) })
        .subscribe(async (status: string) => {
          if (status !== 'SUBSCRIBED') return
          await ch.track({ role: 'viewer' }); hello()
          // keep asking until the host answers (covers joins while the host reconnects)
          retry = setInterval(() => { if (peerRef.current?.pc.connectionState !== 'connected') hello() }, 5000)
        })
    })()
    return () => {
      alive = false; clearInterval(retry)
      chRef.current?.send({ type: 'broadcast', event: 'bye', payload: { from: me.id } })
      peerRef.current?.close()
      if (chRef.current) sb().removeChannel(chRef.current)
    }
  }, [id])

  // if the host's heartbeat stops (tab closed), show the stream as ended
  useEffect(() => {
    if (!live || state === 'ended') return
    const t = setInterval(async () => {
      const { data } = await sb().from('live_streams').select('status,heartbeat_at,replay_post_id').eq('id', id).maybeSingle()
      if (!data || data.status !== 'live' || data.heartbeat_at < freshSince()) { setState('ended'); setLive((l: any) => ({ ...l, ...data })) }
    }, 20000)
    return () => clearInterval(t)
  }, [live?.id, state])

  function heart() { hearts.current?.burst(); chRef.current?.send({ type: 'broadcast', event: 'heart', payload: {} }) }

  if (live === undefined) return <div className="fixed inset-0 z-50 grid place-items-center bg-black"><Spinner /></div>
  if (!live) return <div className="fixed inset-0 z-50 grid place-items-center bg-black px-6 text-center text-white"><div><p className="font-display text-2xl font-extrabold">This live video isn't available</p><Link href="/live" className="btn-primary mt-6">See who's live</Link></div></div>
  if (live.host_id === me.id && live.status === 'live') return <div className="fixed inset-0 z-50 grid place-items-center bg-black px-6 text-center text-white"><div><p className="font-display text-2xl font-extrabold">You're hosting this live video</p><p className="mt-2 text-white/70">Manage it from the tab where you went live.</p><Link href="/live" className="btn-primary mt-6">Back</Link></div></div>

  const host = live.host
  if (state === 'ended') return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black px-6 text-center text-white">
      <div>
        <Avatar src={host?.avatar_url} name={displayName(host)} size={80} />
        <h1 className="mt-4 font-display text-2xl font-extrabold">{host?.username}'s live video has ended</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {live.replay_post_id && <Link href={`/reels?id=${live.replay_post_id}`} className="btn-primary px-6 py-3">Watch replay</Link>}
          <Link href={`/u/${host?.username}`} className="btn rounded-full bg-white/15 px-6 py-3 text-white">View profile</Link>
          <Link href="/live" className="btn rounded-full bg-white/15 px-6 py-3 text-white">More live</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="absolute inset-0 h-full w-full object-contain sm:object-cover" />
      {state === 'connecting' && <div className="absolute inset-0 grid place-items-center"><div className="text-center"><Spinner /><p className="mt-3 text-sm text-white/70">Joining live video…</p></div></div>}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/75 to-transparent" />
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
        <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-black/40" aria-label="Back"><ArrowLeft size={20} /></button>
        <Link href={`/u/${host?.username}`} className="flex min-w-0 items-center gap-2"><Avatar src={host?.avatar_url} name={displayName(host)} size={36} ring /><span className="min-w-0"><span className="block truncate text-sm font-bold">{host?.username}</span>{live.title && <span className="block truncate text-xs text-white/75">{live.title}</span>}</span></Link>
        <span className="rounded-md bg-accent px-2 py-1 text-xs font-extrabold tracking-wider">LIVE</span>
        <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs"><Eye size={13} />{viewers}</span>
        <div className="ml-auto flex items-center gap-2">
          <FollowButton userId={live.host_id} />
          <button onClick={() => setReport(true)} className="grid h-10 w-10 place-items-center rounded-full bg-black/40" aria-label="Report"><Flag size={17} /></button>
        </div>
      </header>
      {muted && state === 'playing' && <button onClick={() => { setMuted(false); videoRef.current?.play() }} className="absolute left-1/2 top-24 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold"><VolumeX size={16} />Tap to unmute</button>}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <div className="h-[38vh] min-w-0 max-w-md flex-1"><LiveChat streamId={id} hostId={live.host_id} /></div>
        <div className="flex flex-col gap-3">
          {!muted && <button onClick={() => setMuted(true)} className="grid h-11 w-11 place-items-center rounded-full bg-white/15" aria-label="Mute"><Volume2 size={19} /></button>}
          <button onClick={heart} className="grid h-12 w-12 place-items-center rounded-full bg-white/15 active:scale-90" aria-label="Send a heart"><Heart size={22} fill="currentColor" className="text-accent" /></button>
        </div>
      </div>
      <Hearts ref={hearts} />
      <ReportDialog userId={live.host_id} open={report} onClose={() => setReport(false)} />
    </div>
  )
}
