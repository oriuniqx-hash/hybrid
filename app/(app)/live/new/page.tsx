'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Mic, MicOff, Radio, SwitchCamera, Video, VideoOff, Heart } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { uploadMedia } from '../../../../lib/media'
import { getIce, liveChannel, Peer, pickRecorderMime } from '../../../../lib/live'
import { toast } from '../../../../components/ui'
import LiveChat from '../../../../components/live/LiveChat'
import Hearts, { type HeartsHandle } from '../../../../components/live/Hearts'

const MAX_REPLAY_BYTES = 48 * 1024 * 1024

export default function GoLivePage() {
  const me = useMe()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peers = useRef(new Map<string, Peer>())
  const chRef = useRef<any>(null)
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; bytes: number; timer: any } | null>(null)
  const hearts = useRef<HeartsHandle>(null)
  const [phase, setPhase] = useState<'setup' | 'starting' | 'live' | 'ending' | 'ended'>('setup')
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('')
  const [saveReplay, setSaveReplay] = useState(true)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [cams, setCams] = useState<MediaDeviceInfo[]>([])
  const [camIdx, setCamIdx] = useState(0)
  const [streamId, setStreamId] = useState<string | null>(null)
  const [viewers, setViewers] = useState(0)
  const [peak, setPeak] = useState(0)
  const [heartCount, setHeartCount] = useState(0)
  const [started, setStarted] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [replayId, setReplayId] = useState<string | null>(null)

  async function openCamera(deviceId?: string) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } })
      const old = streamRef.current
      if (old) {
        // swap the video track for every connected viewer without renegotiating
        const nv = s.getVideoTracks()[0]
        peers.current.forEach(p => p.pc.getSenders().find(x => x.track?.kind === 'video')?.replaceTrack(nv))
        old.getVideoTracks().forEach(t => { old.removeTrack(t); t.stop() }); old.addTrack(nv)
        s.getAudioTracks().forEach(t => t.stop())
        nv.enabled = cam
      } else {
        streamRef.current = s
      }
      if (videoRef.current) videoRef.current.srcObject = streamRef.current
      const all = await navigator.mediaDevices.enumerateDevices(); setCams(all.filter(d => d.kind === 'videoinput'))
      setErr('')
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? 'Allow camera and microphone access in your browser to go live.' : e?.name === 'NotFoundError' ? 'No camera or microphone was found on this device.' : 'Could not start your camera.')
    }
  }
  useEffect(() => { openCamera(); return () => { cleanup(false) } }, [])
  useEffect(() => { if (phase !== 'live') return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [phase])

  function toggleMic() { const v = !mic; setMic(v); streamRef.current?.getAudioTracks().forEach(t => t.enabled = v) }
  function toggleCam() { const v = !cam; setCam(v); streamRef.current?.getVideoTracks().forEach(t => t.enabled = v) }
  async function flip() { if (cams.length < 2) return; const i = (camIdx + 1) % cams.length; setCamIdx(i); await openCamera(cams[i].deviceId) }

  async function offerTo(viewerId: string) {
    const stream = streamRef.current; const ch = chRef.current; if (!stream || !ch) return
    peers.current.get(viewerId)?.close()
    const { servers } = await getIce()
    const peer = new Peer(servers); peers.current.set(viewerId, peer)
    stream.getTracks().forEach(t => peer.pc.addTrack(t, stream))
    peer.pc.onicecandidate = e => { if (e.candidate) ch.send({ type: 'broadcast', event: 'ice', payload: { to: viewerId, from: 'host', c: e.candidate.toJSON() } }) }
    peer.pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(peer.pc.connectionState)) { peer.close(); peers.current.delete(viewerId) } }
    const offer = await peer.pc.createOffer(); await peer.pc.setLocalDescription(offer)
    ch.send({ type: 'broadcast', event: 'offer', payload: { to: viewerId, sdp: peer.pc.localDescription } })
  }

  function startRecording() {
    const stream = streamRef.current; const v = videoRef.current; if (!stream || !v) return
    const mime = pickRecorderMime(); if (!mime) return
    // Record from a canvas so switching cameras mid-stream doesn't break the recording.
    const canvas = document.createElement('canvas'); canvas.width = v.videoWidth || 1280; canvas.height = v.videoHeight || 720
    const ctx = canvas.getContext('2d')!
    const timer = setInterval(() => { try { ctx.drawImage(v, 0, 0, canvas.width, canvas.height) } catch {} }, 1000 / 24)
    const rs = canvas.captureStream(24); stream.getAudioTracks().forEach(t => rs.addTrack(t))
    const rec = new MediaRecorder(rs, { mimeType: mime, videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 })
    const state = { rec, chunks: [] as Blob[], bytes: 0, timer }
    rec.ondataavailable = e => { if (e.data.size && state.bytes + e.data.size <= MAX_REPLAY_BYTES) { state.chunks.push(e.data); state.bytes += e.data.size } }
    rec.start(2000); recRef.current = state
  }
  function stopRecording(): Promise<Blob | null> {
    const r = recRef.current; if (!r) return Promise.resolve(null)
    return new Promise(res => { r.rec.onstop = () => { clearInterval(r.timer); res(r.chunks.length ? new Blob(r.chunks, { type: r.rec.mimeType }) : null) }; try { r.rec.stop() } catch { res(null) } })
  }

  async function goLive() {
    if (!streamRef.current) return toast('Your camera is not ready yet')
    setPhase('starting')
    getIce() // warm the relay credentials before the first viewer joins
    const { data: row, error } = await sb().from('live_streams').insert({ host_id: me.id, title: title.trim() || null }).select('id').single()
    if (error || !row) { toast(error?.message || 'Could not go live'); setPhase('setup'); return }
    const ch = await liveChannel(row.id, me.id)
    chRef.current = ch
    ch.on('broadcast', { event: 'hello' }, ({ payload }: any) => payload?.from && offerTo(payload.from))
      .on('broadcast', { event: 'answer' }, ({ payload }: any) => peers.current.get(payload.from)?.setRemote(payload.sdp))
      .on('broadcast', { event: 'ice' }, ({ payload }: any) => { if (payload.to === 'host') peers.current.get(payload.from)?.addIce(payload.c) })
      .on('broadcast', { event: 'bye' }, ({ payload }: any) => { peers.current.get(payload.from)?.close(); peers.current.delete(payload.from) })
      .on('broadcast', { event: 'heart' }, () => { hearts.current?.burst(); setHeartCount(n => n + 1) })
      .on('presence', { event: 'sync' }, () => { const n = Object.keys(ch.presenceState()).filter(k => k !== me.id).length; setViewers(n); setPeak(p => Math.max(p, n)) })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') { await ch.track({ role: 'host' }); ch.send({ type: 'broadcast', event: 'host-ready', payload: {} }) }
        if (status === 'CHANNEL_ERROR') toast('Live connection problem — retrying')
      })
    setStreamId(row.id); setStarted(Date.now()); setPhase('live')
    if (saveReplay) startRecording()
  }

  // heartbeat so the stream only shows as live while this tab is open
  useEffect(() => {
    if (phase !== 'live' || !streamId) return
    const beat = () => sb().from('live_streams').update({ heartbeat_at: new Date().toISOString(), peak_viewers: peak }).eq('id', streamId).then(() => {})
    beat(); const t = setInterval(beat, 15000); return () => clearInterval(t)
  }, [phase, streamId, peak])

  function cleanup(stopCamera = true) {
    chRef.current?.send({ type: 'broadcast', event: 'end', payload: {} })
    peers.current.forEach(p => p.close()); peers.current.clear()
    if (chRef.current) { sb().removeChannel(chRef.current); chRef.current = null }
    if (stopCamera || true) streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function end() {
    if (!streamId) return
    setPhase('ending')
    const blob = await stopRecording()
    cleanup()
    await sb().from('live_streams').update({ status: 'ended', ended_at: new Date().toISOString(), peak_viewers: peak }).eq('id', streamId)
    if (blob && saveReplay && Date.now() - started > 5000) {
      try {
        const url = await uploadMedia(new File([blob], 'live-replay.webm', { type: blob.type }), me.id)
        const v = videoRef.current
        const { data: post } = await sb().from('posts').insert({ user_id: me.id, type: 'reel', media_type: 'video', media_url: url, aspect_ratio: v && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9, title: title.trim() ? 'Live: ' + title.trim() : 'Live replay', description: `Replay of my live video${title.trim() ? ' — ' + title.trim() : ''} #live`, tags: ['live'] }).select('id').single()
        if (post) { await sb().from('live_streams').update({ replay_post_id: post.id }).eq('id', streamId); setReplayId(post.id) }
      } catch (e: any) { toast('Replay could not be saved: ' + (e?.message || 'upload failed')) }
    }
    setPhase('ended')
  }

  // end the stream if the host navigates away
  useEffect(() => {
    if (phase !== 'live' || !streamId) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h)
  }, [phase, streamId])
  useEffect(() => () => { if (streamId && phase === 'live') sb().from('live_streams').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', streamId).then(() => {}) }, [streamId, phase])

  const dur = Math.max(0, Math.floor((now - started) / 1000))
  const mmss = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`

  if (phase === 'ended') return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black px-6 text-center text-white">
      <div>
        <Radio size={40} className="mx-auto text-accent" />
        <h1 className="mt-4 font-display text-3xl font-extrabold">Your live video has ended</h1>
        <p className="mt-2 text-white/70">{mmss} · peak {peak} viewer{peak === 1 ? '' : 's'} · {heartCount} hearts</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {replayId && <Link href={`/reels?id=${replayId}`} className="btn-primary px-6 py-3">Watch replay</Link>}
          <Link href="/home" className="btn rounded-full bg-white/15 px-6 py-3 text-white">Done</Link>
        </div>
        {saveReplay && !replayId && <p className="mt-4 text-xs text-white/50">No replay was saved (streams under 5 seconds are skipped).</p>}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
      {!cam && <div className="absolute inset-0 grid place-items-center bg-neutral-900"><VideoOff size={48} className="text-white/40" /></div>}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/75 to-transparent" />

      <header className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
        {phase === 'setup' ? <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-black/40" aria-label="Back"><ArrowLeft size={20} /></button> : null}
        {phase === 'live' && <>
          <span className="rounded-md bg-accent px-2 py-1 text-xs font-extrabold tracking-wider">LIVE</span>
          <span className="rounded-md bg-black/50 px-2 py-1 text-xs tabular-nums">{mmss}</span>
          <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs"><Eye size={13} />{viewers}</span>
          <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs"><Heart size={13} />{heartCount}</span>
        </>}
        <div className="ml-auto flex gap-2">
          <button onClick={toggleMic} className="grid h-10 w-10 place-items-center rounded-full bg-black/40" aria-label={mic ? 'Mute microphone' : 'Unmute microphone'}>{mic ? <Mic size={19} /> : <MicOff size={19} className="text-accent" />}</button>
          <button onClick={toggleCam} className="grid h-10 w-10 place-items-center rounded-full bg-black/40" aria-label={cam ? 'Turn camera off' : 'Turn camera on'}>{cam ? <Video size={19} /> : <VideoOff size={19} className="text-accent" />}</button>
          {cams.length > 1 && <button onClick={flip} className="grid h-10 w-10 place-items-center rounded-full bg-black/40" aria-label="Switch camera"><SwitchCamera size={19} /></button>}
        </div>
      </header>

      {phase === 'setup' || phase === 'starting' ? (
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md space-y-4 p-6">
          {err && <p className="rounded-2xl bg-black/60 p-3 text-center text-sm">{err} <button onClick={() => openCamera()} className="ml-1 font-bold underline">Try again</button></p>}
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Add a title (optional)" className="h-12 w-full rounded-full border border-white/30 bg-black/40 px-5 text-white placeholder:text-white/60 focus:border-white/70 focus:outline-none" />
          <label className="flex items-center justify-center gap-2 text-sm text-white/85"><input type="checkbox" checked={saveReplay} onChange={e => setSaveReplay(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />Save replay as a Reel when I end</label>
          <button disabled={!!err || phase === 'starting'} onClick={goLive} className="flex h-16 w-full items-center justify-center gap-2 rounded-full bg-accent text-lg font-extrabold disabled:opacity-50"><Radio size={22} />{phase === 'starting' ? 'Starting…' : 'Go live'}</button>
          <p className="text-center text-xs text-white/60">Your followers get notified. Live works best for audiences up to about 20 viewers.</p>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4">
          <div className="h-[38vh] min-w-0 max-w-md flex-1">{streamId && <LiveChat streamId={streamId} hostId={me.id} />}</div>
          <button disabled={phase === 'ending'} onClick={end} className="mb-0.5 h-11 shrink-0 rounded-full bg-white px-5 text-sm font-bold text-black">{phase === 'ending' ? (saveReplay ? 'Saving replay…' : 'Ending…') : 'End'}</button>
        </div>
      )}
      <Hearts ref={hearts} />
    </div>
  )
}
