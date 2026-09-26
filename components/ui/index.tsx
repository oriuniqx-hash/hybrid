'use client'
import { ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export function Avatar({ src, name, size = 40, ring = false, online = false }: { src?: string | null; name?: string | null; size?: number; ring?: boolean; online?: boolean }) {
  const initials = (name || '?').split(/[\s_]+/).map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const inner = src
    ? <img src={src} alt="" width={size} height={size} className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
    : <span className="grid h-full w-full place-items-center rounded-full bg-surface2 font-bold text-muted" style={{ fontSize: size * 0.36 }}>{initials}</span>
  const dot = online ? <span className="absolute bottom-0 right-0 rounded-full border-bg bg-ok" style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28), borderWidth: Math.max(2, size * 0.05) }} aria-label="Active now" role="img" /> : null
  if (!ring) return <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>{inner}{dot}</span>
  return (
    <span className="story-ring relative inline-block shrink-0 rounded-full p-[2.5px]" style={{ width: size + 6, height: size + 6 }}>
      <span className="block h-full w-full rounded-full bg-bg p-[2px]">{inner}</span>{dot}
    </span>
  )
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[90vh] w-full overflow-auto rounded-3xl bg-surface p-6 shadow-pop ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="font-display text-xl font-extrabold">{title}</h2>}
          <button onClick={onClose} className="icon-btn -mr-2 ml-auto" aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface2 text-muted">{icon}</div>}
      <h3 className="font-display text-lg font-extrabold">{title}</h3>
      {body && <p className="mt-1.5 text-sm text-muted">{body}</p>}
      {action && <Link href={action.href} className="btn-primary mt-5">{action.label}</Link>}
    </div>
  )
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <span className="inline-block animate-spin rounded-full border-2 border-line border-t-accent" style={{ width: size, height: size }} aria-label="Loading" />
}

export function GridSkeleton({ n = 10 }: { n?: number }) {
  const heights = [220, 300, 180, 260, 340, 200, 280, 240, 320, 190]
  return <div className="masonry">{Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: heights[i % heights.length] }} />)}</div>
}

export function toast(msg: string) {
  const el = document.createElement('div')
  el.textContent = msg
  el.className = 'fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg shadow-pop lg:bottom-8'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2200)
}
