'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Clapperboard, Compass, Grid2X2, MessageSquare, PlusCircle, Search, UserRound, type LucideIcon } from 'lucide-react'
import HybridLogo from '../brand/HybridLogo'

type Item = { href: string; label: string; icon: LucideIcon }

const items: Item[] = [
  { href: '/dashboard', label: 'Home feed', icon: Grid2X2 },
  { href: '/dashboard/explore', label: 'Discover', icon: Compass },
  { href: '/dashboard/reels', label: 'Reels stream', icon: Clapperboard },
  { href: '/dashboard/messages', label: 'Echoes', icon: MessageSquare },
  { href: '/dashboard/create', label: 'Create', icon: PlusCircle },
]

export default function Sidebar({ userId }: { userId: string }) {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-20 flex-col items-center border-r border-white/10 bg-[#05070c]/80 py-5 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" aria-label="HYBRID home" className="mb-8 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_32px_rgba(193,53,132,.14)]">
        <HybridLogo size={38} />
      </Link>
      <nav className="flex flex-1 flex-col items-center justify-between py-3">
        <div className="flex flex-col gap-3">
          {items.slice(0, 3).map(({ href, label, icon: Icon }) => <NavButton key={href} href={href} label={label} icon={Icon} active={pathname === href || (href !== '/dashboard' && pathname.startsWith(href))} />)}
        </div>
        <div className="flex flex-col gap-3">
          {items.slice(3).map(({ href, label, icon: Icon }) => <NavButton key={href} href={href} label={label} icon={Icon} active={pathname.startsWith(href)} />)}
          <NavButton href="/dashboard/analytics" label="Analytics" icon={Search} active={pathname.startsWith('/dashboard/analytics')} />
          <NavButton href={'/dashboard/profile/' + userId} label="Profile" icon={UserRound} active={pathname.startsWith('/dashboard/profile')} />
        </div>
      </nav>
      <div className="relative mt-5">
        <NavButton href="/dashboard" label="Notifications" icon={Bell} active={false} disabled />
      </div>
    </aside>
  )
}

function NavButton({ href, label, icon: Icon, active, disabled = false }: { href: string; label: string; icon: LucideIcon; active: boolean; disabled?: boolean }) {
  const className = 'group relative grid h-12 w-12 place-items-center rounded-2xl border transition-all ' +
    (active ? 'border-white/20 bg-white/10 text-white shadow-[0_0_28px_rgba(193,53,132,.16)]' : 'border-transparent text-white/45 hover:border-white/10 hover:bg-white/5 hover:text-white')
  if (disabled) return <button aria-label={label} className={className}><Icon size={22} strokeWidth={1.8}/><span className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#11141c] px-2.5 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{label}</span></button>
  return <Link href={href} aria-label={label} className={className}><Icon size={22} strokeWidth={1.8}/><span className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#11141c] px-2.5 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{label}</span></Link>
}