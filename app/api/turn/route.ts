import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

const STUN: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
const TTL = 6 * 60 * 60 // 6h — longer than any expected live session

/**
 * Returns ICE servers for WebRTC. Mints short-lived Cloudflare Realtime TURN
 * credentials when CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN are set;
 * otherwise falls back to a static TURN_URLS/TURN_USERNAME/TURN_CREDENTIAL
 * config, and finally to STUN-only.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (keyId && token) {
    try {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL, customIdentifier: user.id.replace(/-/g, '') }),
        cache: 'no-store',
      })
      if (r.ok) {
        const j = await r.json() as { iceServers: RTCIceServer[] }
        // Browsers block port 53; drop those URLs so ICE doesn't wait on a timeout.
        const iceServers = j.iceServers.map(s => ({ ...s, urls: ([] as string[]).concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length)
        return NextResponse.json({ iceServers, relay: 'cloudflare', ttl: TTL }, { headers: { 'Cache-Control': 'private, no-store' } })
      }
      console.error('TURN credential request failed', r.status, (await r.text()).slice(0, 200))
    } catch (e) {
      console.error('TURN credential request error', e)
    }
  }

  const urls = process.env.TURN_URLS?.split(',').map(s => s.trim()).filter(Boolean)
  if (urls?.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    return NextResponse.json({ iceServers: [...STUN, { urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }], relay: 'static', ttl: 3600 }, { headers: { 'Cache-Control': 'private, no-store' } })
  }
  return NextResponse.json({ iceServers: STUN, relay: null, ttl: 3600 }, { headers: { 'Cache-Control': 'private, no-store' } })
}
