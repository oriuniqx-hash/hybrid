'use client'
import { sb } from './supabase/client'

const FALLBACK_ICE: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
let iceCache: { servers: RTCIceServer[]; relay: string | null; until: number } | null = null

/** ICE servers incl. short-lived TURN relay credentials from /api/turn (cached until near expiry). */
export async function getIce(): Promise<{ servers: RTCIceServer[]; relay: string | null }> {
  if (iceCache && iceCache.until > Date.now()) return iceCache
  try {
    const r = await fetch('/api/turn', { cache: 'no-store' })
    if (!r.ok) throw new Error(String(r.status))
    const j = await r.json()
    iceCache = { servers: j.iceServers?.length ? j.iceServers : FALLBACK_ICE, relay: j.relay ?? null, until: Date.now() + Math.max(60, (j.ttl ?? 3600) - 600) * 1000 }
  } catch {
    iceCache = { servers: FALLBACK_ICE, relay: null, until: Date.now() + 60_000 }
  }
  return iceCache
}
/** A stream counts as live only while the host keeps sending heartbeats. */
export const LIVE_FRESH_MS = 45_000
export const freshSince = () => new Date(Date.now() - LIVE_FRESH_MS).toISOString()

export async function liveChannel(streamId: string, key: string) {
  const s = sb()
  const { data } = await s.auth.getSession()
  if (data.session) s.realtime.setAuth(data.session.access_token)
  return s.channel('live-' + streamId, { config: { private: true, broadcast: { self: false, ack: false }, presence: { key } } })
}

/** Buffers ICE candidates that arrive before the remote description is set. */
export class Peer {
  pc: RTCPeerConnection
  private pending: RTCIceCandidateInit[] = []
  constructor(iceServers: RTCIceServer[] = FALLBACK_ICE) {
    // `?relay=only` forces TURN, simulating networks that block direct peer connections.
    const relayOnly = typeof location !== 'undefined' && new URLSearchParams(location.search).get('relay') === 'only'
    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle', iceTransportPolicy: relayOnly ? 'relay' : 'all' })
  }
  async setRemote(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(sdp)
    for (const c of this.pending.splice(0)) await this.pc.addIceCandidate(c).catch(() => {})
  }
  async addIce(c: RTCIceCandidateInit) {
    if (this.pc.remoteDescription) await this.pc.addIceCandidate(c).catch(() => {})
    else this.pending.push(c)
  }
  close() { try { this.pc.close() } catch {} }
}

export function pickRecorderMime() {
  const opts = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return typeof MediaRecorder !== 'undefined' ? opts.find(m => MediaRecorder.isTypeSupported(m)) || '' : ''
}

/** 'relay' when traffic goes through TURN, 'direct' for host/srflx pairs. */
export async function routeType(pc: RTCPeerConnection): Promise<'relay' | 'direct' | null> {
  try {
    const stats = await pc.getStats()
    let pair: any = null
    stats.forEach((r: any) => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId) })
    if (!pair) stats.forEach((r: any) => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r })
    if (!pair) return null
    const local = stats.get(pair.localCandidateId), remote = stats.get(pair.remoteCandidateId)
    return local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'relay' : 'direct'
  } catch { return null }
}
