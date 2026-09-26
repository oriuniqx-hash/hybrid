'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Bookmark, Clapperboard, MessageCircle, ShoppingBag, BarChart3, Sparkles } from 'lucide-react'
import AuthModal from '../auth/AuthModal'
import HybridLogo from '../brand/HybridLogo'

type Pin = { id: string; title: string | null; media_url: string; thumbnail_url: string | null; media_type: string; aspect_ratio: number; dominant_color: string | null }

const FEATURES = [
  [Search, 'Discover & visual search', 'Search ideas by keyword, #tag or image. Find more like what you love.'],
  [Bookmark, 'Save to boards', 'Organise pins into boards and sections. Keep them secret or invite collaborators.'],
  [Clapperboard, 'Reels & Stories', 'Post short videos and 24-hour stories, then keep the best as Highlights.'],
  [MessageCircle, 'Follow & message', 'Follow people, comment, react, and share pins in private or group chats.'],
  [ShoppingBag, 'Shoppable pins', 'Tag products with prices and links so people can shop straight from inspiration.'],
  [BarChart3, 'Creator & business tools', 'Analytics, audience insights, trends and scheduling for your content.'],
] as const

export default function HomeClient({ pins, people }: { pins: Pin[]; people: number }) {
  const router = useRouter()
  const params = useSearchParams()
  const showAuth = params.get('auth') === 'true'
  const open = (mode?: 'signup') => router.push('/?auth=true' + (mode ? '&mode=signup' : ''))
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <HybridLogo withWord />
          <div className="flex gap-2"><button onClick={() => open()} className="btn-ghost">Log in</button><button onClick={() => open('signup')} className="btn-primary">Sign up</button></div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent"><Sparkles size={13} />Discovery meets social</p>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">Find your next idea.<br />Share it with your people.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">Hybrid blends visual discovery with a social network — search and save ideas to boards, post Reels and Stories, follow creators and shop what inspires you.</p>
          <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => open('signup')} className="btn-primary px-7 py-3.5 text-base">Create free account</button><button onClick={() => open()} className="btn-ghost px-7 py-3.5 text-base">I already have one</button></div>
          {people > 0 && <p className="mt-6 text-sm text-muted">{people.toLocaleString('en-IN')} {people === 1 ? 'person has' : 'people have'} joined so far.</p>}
        </div>
        <div className="relative h-[460px] overflow-hidden rounded-[2rem] bg-surface2">
          {pins.length > 0 ? (
            <div className="columns-3 gap-3 p-3">{pins.slice(0, 12).map(p => (
              <div key={p.id} className="mb-3 overflow-hidden rounded-2xl" style={{ background: p.dominant_color || undefined, aspectRatio: String(Math.min(Math.max(p.aspect_ratio, .6), 1.4)) }}>
                {p.media_type === 'video' ? <video src={p.media_url} muted autoPlay loop playsInline className="h-full w-full object-cover" /> : <img src={p.thumbnail_url || p.media_url} alt={p.title || ''} className="h-full w-full object-cover" />}
              </div>))}</div>
          ) : (
            <div className="grid h-full place-items-center p-10 text-center">
              <div><HybridLogo size={64} /><p className="mt-5 font-display text-2xl font-extrabold">Be one of the first creators</p><p className="mt-2 text-sm text-muted">The feed fills up with real pins as people publish. Yours could be the first one here.</p></div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([I, t, d]) => (
            <div key={t} className="card p-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><I size={20} /></span><h3 className="mt-4 font-display text-lg font-extrabold">{t}</h3><p className="mt-1.5 text-sm text-muted">{d}</p></div>
          ))}
        </div>
      </section>
      <footer className="border-t border-line py-8 text-center text-xs text-muted">© {new Date().getFullYear()} Hybrid by Oriuniqx</footer>
      {showAuth && <AuthModal onClose={() => router.replace('/')} />}
    </div>
  )
}
