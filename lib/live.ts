'use client'
import { sb } from './supabase/client'

export const ICE: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }],
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
  constructor() { this.pc = new RTCPeerConnection(ICE) }
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
