export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60); if (m < 60) return m + 'm'
  const h = Math.floor(m / 60); if (h < 24) return h + 'h'
  const d = Math.floor(h / 24); if (d < 7) return d + 'd'
  const w = Math.floor(d / 7); if (w < 52) return w + 'w'
  return Math.floor(d / 365) + 'y'
}
export function compact(n: number | null | undefined) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)
}
export function parseTags(input: string) {
  return Array.from(new Set(input.split(/[\s,#]+/).map(t => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(t => t.length > 1))).slice(0, 20)
}
export function hashtags(text: string) {
  return Array.from(new Set((text.match(/#([\p{L}0-9_]+)/gu) || []).map(t => t.slice(1).toLowerCase())))
}
export function displayName(p?: { full_name: string | null; username: string } | null) {
  return p?.full_name || p?.username || 'Unknown'
}
