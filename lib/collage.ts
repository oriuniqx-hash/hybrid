import type { CSSProperties } from 'react'

export const W = 900
export const H = 1200
export type Shape = 'rect' | 'rounded' | 'circle' | 'arch'
export type FontKey = 'display' | 'sans' | 'serif' | 'mono'
export type Layer = {
  id: string
  kind: 'image' | 'text'
  x: number; y: number; w: number; h: number; rot: number
  opacity: number; flip: boolean; shape: Shape
  src?: string; postId?: string
  text?: string; size?: number; color?: string; font?: FontKey; highlight?: string | null
}

export const FONTS: Record<FontKey, { label: string; css: string; weight: number }> = {
  display: { label: 'Bold', css: "'Cabinet Grotesk', sans-serif", weight: 800 },
  sans: { label: 'Clean', css: "'Satoshi', sans-serif", weight: 500 },
  serif: { label: 'Serif', css: "Georgia, 'Times New Roman', serif", weight: 400 },
  mono: { label: 'Mono', css: "ui-monospace, 'SFMono-Regular', Menlo, monospace", weight: 500 },
}

export function shapeCss(s: Shape, w: number, h: number): CSSProperties {
  if (s === 'rounded') return { borderRadius: Math.min(w, h) * 0.08 }
  if (s === 'circle') return { borderRadius: '50%' }
  if (s === 'arch') { const r = Math.min(w / 2, h); return { borderRadius: `${w / 2}px ${w / 2}px 0 0 / ${r}px ${r}px 0 0` } }
  return {}
}

function shapePath(ctx: CanvasRenderingContext2D, s: Shape, w: number, h: number) {
  const x = -w / 2, y = -h / 2
  ctx.beginPath()
  if (s === 'circle') ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
  else if (s === 'rounded') { const r = Math.min(w, h) * 0.08; ctx.roundRect(x, y, w, h, r) }
  else if (s === 'arch') { const r = Math.min(w / 2, h); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.ellipse(0, y + r, w / 2, r, 0, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath() }
  else ctx.rect(x, y, w, h)
}

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src
})

export async function exportCollage(layers: Layer[], bg: string, scale = 1.2): Promise<Blob> {
  const fonts = (document as any).fonts
  if (fonts) {
    const used = Array.from(new Set(layers.filter(l => l.kind === 'text').map(l => l.font || 'display'))) as FontKey[]
    await Promise.all(used.map(f => fonts.load(`${FONTS[f].weight} 72px ${FONTS[f].css}`).catch(() => null)))
    await fonts.ready
  }
  const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  for (const l of layers) {
    ctx.save(); ctx.globalAlpha = l.opacity; ctx.translate(l.x, l.y); ctx.rotate(l.rot * Math.PI / 180)
    if (l.kind === 'image' && l.src) {
      const img = await loadImg(l.src)
      if (l.flip) ctx.scale(-1, 1)
      shapePath(ctx, l.shape, l.w, l.h); ctx.clip()
      const ir = img.naturalWidth / img.naturalHeight, lr = l.w / l.h
      let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0
      if (ir > lr) { sw = sh * lr; sx = (img.naturalWidth - sw) / 2 } else { sh = sw / lr; sy = (img.naturalHeight - sh) / 2 }
      ctx.drawImage(img, sx, sy, sw, sh, -l.w / 2, -l.h / 2, l.w, l.h)
    } else if (l.kind === 'text' && l.text) {
      const f = FONTS[l.font || 'display'], size = l.size || 72
      ctx.font = `${f.weight} ${size}px ${f.css}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const lines = l.text.split('\n'), lh = size * 1.1
      const widest = Math.max(...lines.map(t => ctx.measureText(t).width))
      if (l.highlight) {
        const pw = widest + size * 0.6, ph = lines.length * lh + size * 0.24
        ctx.fillStyle = l.highlight; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, size * 0.2); ctx.fill()
      }
      ctx.fillStyle = l.color || '#111'
      lines.forEach((t, i) => ctx.fillText(t, 0, (i - (lines.length - 1) / 2) * lh))
    }
    ctx.restore()
  }
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('export failed')), 'image/jpeg', 0.9))
}
