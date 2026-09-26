import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

const STUN: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
const TTL = 6 * 60 * 60 // 6h — longer than any expected live session

/**
 * Returns ICE servers (STUN + TURN relays) for WebRTC. Every configured provider is
 * included, so the browser can use whichever relay the viewer's network allows:
 *  - Cloudflare Realtime TURN   CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN
 *  - Metered (free, ports 80/443 + TLS)   METERED_DOMAIN (e.g. hybrid.metered.live) + METERED_API_KEY
 *  - Static credentials, e.g. ExpressTURN (free, port 3478)
 *        TURN_URLS (comma list; a bare host expands to UDP+TCP on 3478) + TURN_USERNAME + TURN_CREDENTIAL
 *  - Shared-secret TURN (coturn use-auth-secret)   TURN_SHARED_HOST + TURN_SHARED_SECRET
 * With nothing configured it returns STUN only (direct connections).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const results = await Promise.all([cloudflare(user.id), metered()])
  const relays: RTCIceServer[] = results.flatMap(r => r?.servers || [])
  const providers = results.filter(Boolean).map(r => r!.name)
  let ttl = Math.min(...results.filter(Boolean).map(r => r!.ttl), TTL)

  const urls = process.env.TURN_URLS?.split(',').map(s => s.trim()).filter(Boolean)
  if (urls?.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    const full = urls.flatMap(u => /^turns?:/.test(u) ? [u] : [`turn:${u}:3478?transport=udp`, `turn:${u}:3478?transport=tcp`])
    relays.unshift({ urls: full, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL })
    providers.unshift('static')
  }

  const host = process.env.TURN_SHARED_HOST, secret = process.env.TURN_SHARED_SECRET
  if (host && secret) {
    const username = `${Math.floor(Date.now() / 1000) + TTL}:${user.id.replace(/-/g, '').slice(0, 16)}`
    const credential = createHmac('sha1', secret).update(username).digest('base64')
    relays.push({ urls: [`turn:${host}:3478`, `turn:${host}:3478?transport=tcp`, `turns:${host}:443?transport=tcp`], username, credential })
    providers.push('shared-secret')
  }

  if (!relays.length) ttl = 3600
  // STUN entries from providers are redundant with ours; keep only TURN URLs from them.
  const turnOnly = relays.map(s => ({ ...s, urls: ([] as string[]).concat(s.urls).filter(u => /^turns?:/.test(u) && !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length)
  return NextResponse.json({ iceServers: [...STUN, ...turnOnly], relay: providers.join('+') || null, ttl }, { headers: { 'Cache-Control': 'private, no-store' } })
}

type Result = { name: string; servers: RTCIceServer[]; ttl: number } | null

async function cloudflare(uid: string): Promise<Result> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID, token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (!keyId || !token) return null
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: 'POST', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL, customIdentifier: uid.replace(/-/g, '') }),
    })
    if (!r.ok) { console.error('Cloudflare TURN failed', r.status); return null }
    return { name: 'cloudflare', servers: (await r.json()).iceServers, ttl: TTL }
  } catch (e) { console.error('Cloudflare TURN error', e); return null }
}

async function metered(): Promise<Result> {
  const domain = process.env.METERED_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/.*$/, ''), key = process.env.METERED_API_KEY
  if (!domain || !key) return null
  try {
    const r = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`, { cache: 'no-store' })
    if (!r.ok) { console.error('Metered TURN failed', r.status); return null }
    const servers = await r.json()
    return Array.isArray(servers) && servers.length ? { name: 'metered', servers, ttl: 3600 } : null
  } catch (e) { console.error('Metered TURN error', e); return null }
}
