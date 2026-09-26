'use client'
import { createSupabaseBrowserClient } from './supabase/client'

export type Probed = { aspect: number; color: string | null; kind: 'image' | 'video' }

export async function probeMedia(file: File): Promise<Probed> {
  const kind = file.type.startsWith('video/') ? 'video' : 'image'
  const url = URL.createObjectURL(file)
  try {
    if (kind === 'image') {
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
      return { kind, aspect: img.naturalWidth / img.naturalHeight || 1, color: averageColor(img, img.naturalWidth, img.naturalHeight) }
    }
    const v = document.createElement('video')
    v.muted = true; v.preload = 'metadata'; v.src = url
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej })
    return { kind, aspect: v.videoWidth / v.videoHeight || 9 / 16, color: averageColor(v, v.videoWidth, v.videoHeight) }
  } catch {
    return { kind, aspect: kind === 'video' ? 9 / 16 : 1, color: null }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function averageColor(src: CanvasImageSource, w: number, h: number) {
  try {
    const c = document.createElement('canvas'); c.width = 24; c.height = Math.max(1, Math.round(24 * h / Math.max(1, w)))
    const ctx = c.getContext('2d'); if (!ctx) return null
    ctx.drawImage(src, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
    const hex = (x: number) => Math.round(x / n).toString(16).padStart(2, '0')
    return '#' + hex(r) + hex(g) + hex(b)
  } catch { return null }
}

export function colorDistance(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b)
  return Math.sqrt((r1 - r2) ** 2 * 0.3 + (g1 - g2) ** 2 * 0.59 + (b1 - b2) ** 2 * 0.11)
}

export async function uploadMedia(file: File, userId: string) {
  const supabase = createSupabaseBrowserClient()
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  const path = `${userId}/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
