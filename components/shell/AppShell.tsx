'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { Home, Compass, Clapperboard, PlusSquare, MessageCircle, Bell, ShoppingBag, BarChart3, Shield, Settings, Search, Camera, Moon, Sun, LogOut } from 'lucide-react'
import HybridLogo from '../brand/HybridLogo'
import { Avatar } from '../ui'
import { MeContext } from '../../lib/useMe'
import type { Profile } from '../../lib/types'
import { sb } from '../../lib/supabase/client'
import { displayName } from '../../lib/format'

export default function AppShell({ me, children }: { me: Profile; children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [unread, setUnread] = useState({ n: 0, m: 0 })
  const [dark, setDark] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  useEffect(() => { setQ(params.get('q') || '') }, [params])

  useEffect(() => {
    const s = sb()
    const refresh = async () => {
      const [{ count: n }, { count: m }] = await Promise.all([
        s.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', me.id).eq('read', false).neq('type', 'message'),
        s.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', me.id).is('read_at', null),
      ])
      setUnread({ n: n || 0, m: m || 0 })
    }
    refresh()
    const ch = s.channel('shell-' + me.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${me.id}` }, refresh)
      .subscribe()
    return () => { s.removeChannel(ch) }
  }, [me.id, path])

  function toggleTheme() {
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('hybrid-theme', next ? 'dark' : 'light')
  }
  async function signOut() { await sb().auth.signOut(); window.location.href = '/' }
  function search(e: React.FormEvent) { e.preventDefault(); if (q.trim()) router.push('/explore?q=' + encodeURIComponent(q.trim())) }

  const isBusiness = me.account_type !== 'personal'
  const nav = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/reels', label: 'Reels', icon: Clapperboard },
    { href: '/create', label: 'Create', icon: PlusSquare },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/messages', label: 'Messages', icon: MessageCircle, badge: unread.m },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: unread.n },
    { href: '/studio', label: isBusiness ? 'Business hub' : 'Creator studio', icon: BarChart3 },
    ...(me.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]
  const active = (h: string) => path === h || path.startsWith(h + '/')
  const immersive = path.startsWith('/reels') || path.startsWith('/stories')

  return (
    <MeContext.Provider value={me}>
      <div className="min-h-screen">
        {/* Desktop rail */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center gap-1 border-r border-line bg-surface py-4 lg:flex">
          <Link href="/home" className="mb-4" aria-label="Hybrid home"><HybridLogo size={34} /></Link>
          {nav.map(n => (
            <Link key={n.href} href={n.href} title={n.label} aria-label={n.label}
              className={`relative grid h-12 w-12 place-items-center rounded-2xl transition ${active(n.href) ? 'bg-ink text-bg' : 'text-ink/75 hover:bg-surface2 hover:text-ink'}`}>
              <n.icon size={22} strokeWidth={active(n.href) ? 2.4 : 1.9} />
              {!!n.badge && <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{n.badge > 9 ? '9+' : n.badge}</span>}
            </Link>
          ))}
          <div className="mt-auto flex flex-col items-center gap-1">
            <button onClick={toggleTheme} className="icon-btn" aria-label="Toggle theme">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
            <Link href="/settings" className="icon-btn" aria-label="Settings"><Settings size={20} /></Link>
            <Link href={`/u/${me.username}`} aria-label="Your profile" className="mt-1"><Avatar src={me.avatar_url} name={displayName(me)} size={36} /></Link>
          </div>
        </aside>

        {/* Top bar */}
        {!immersive && (
          <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur lg:pl-[76px]">
            <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
              <Link href="/home" className="lg:hidden" aria-label="Hybrid home"><HybridLogo size={30} /></Link>
              <form onSubmit={search} className="relative flex-1">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ideas, people, #tags, products" aria-label="Search"
                  className="h-11 w-full rounded-full border border-transparent bg-surface2 pl-11 pr-12 text-sm outline-none transition focus:border-accent focus:bg-surface" />
                <Link href="/explore?visual=1" title="Search with an image" aria-label="Search with an image" className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"><Camera size={17} /></Link>
              </form>
              <Link href="/notifications" className="icon-btn relative lg:hidden" aria-label="Notifications"><Bell size={21} />{!!unread.n && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />}</Link>
              <Link href="/messages" className="icon-btn relative lg:hidden" aria-label="Messages"><MessageCircle size={21} />{!!unread.m && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />}</Link>
              <div className="relative hidden lg:block">
                <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-surface2" aria-label="Account menu">
                  <Avatar src={me.avatar_url} name={displayName(me)} size={32} /><span className="text-sm font-semibold">{me.username}</span>
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-surface p-2 shadow-pop" onMouseLeave={() => setMenu(false)}>
                    <p className="px-3 pb-2 pt-1 text-xs text-muted">Signed in as @{me.username} · {me.account_type}</p>
                    <Link href={`/u/${me.username}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-surface2">Your profile</Link>
                    <Link href="/settings" className="block rounded-xl px-3 py-2 text-sm hover:bg-surface2">Settings & privacy</Link>
                    <Link href="/studio" className="block rounded-xl px-3 py-2 text-sm hover:bg-surface2">Analytics</Link>
                    <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface2"><LogOut size={15} />Log out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={`lg:pl-[76px] ${immersive ? '' : 'pb-24 lg:pb-10'}`}>{children}</main>

        {/* Mobile tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-surface/95 backdrop-blur lg:hidden" aria-label="Primary">
          {[nav[0], nav[1], nav[3], nav[2]].map(n => (
            <Link key={n.href} href={n.href} aria-label={n.label} className={`grid h-11 w-11 place-items-center rounded-xl ${active(n.href) ? 'text-ink' : 'text-muted'}`}>
              <n.icon size={24} strokeWidth={active(n.href) ? 2.4 : 1.8} />
            </Link>
          ))}
          <Link href={`/u/${me.username}`} aria-label="Profile" className={`rounded-full ${active('/u/' + me.username) ? 'ring-2 ring-ink' : ''}`}><Avatar src={me.avatar_url} name={displayName(me)} size={28} /></Link>
        </nav>
      </div>
    </MeContext.Provider>
  )
}
