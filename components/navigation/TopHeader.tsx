'use client'

import Link from 'next/link'
import { Search, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'
import HybridLogo from '../brand/HybridLogo'
import SignOutButton from '../auth/SignOutButton'

const categories = ['FMCG', 'Commercial Video', 'Footwear DTC', 'Macro Videography', 'Packaging', 'Brand Strategy', '3D Motion', 'Luxury Apparel']

export default function TopHeader({ username, userId }: { username: string | null; userId: string }) {
  const [query, setQuery] = useState('')
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/75 backdrop-blur-xl">
      <div className="flex h-[76px] items-center gap-4 px-4 lg:pl-28 lg:pr-6">
        <Link href="/dashboard" className="flex min-w-fit items-center gap-3">
          <HybridLogo size={38} />
          <div className="hidden sm:block"><p className="text-sm font-black tracking-tight">HYBRID</p><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-white/35">by OriUniqx</p></div>
        </Link>
        <div className="mx-auto flex min-w-0 max-w-2xl flex-1 items-center rounded-2xl border border-white/10 bg-white/[.045] px-4 py-2.5 shadow-inner">
          <Search size={17} className="shrink-0 text-white/35" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search campaigns, creators, visual ideas..." className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/30" />
          <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-white/25 md:block">⌘ K</kbd>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[.035] p-1 xl:flex">
            {categories.slice(0, 3).map(c => <span key={c} className="rounded-full px-3 py-1.5 text-[10px] font-semibold text-white/45">{c}</span>)}
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/70">+{categories.length - 3}</span>
          </div>
          <Link href={'/dashboard/profile/' + userId} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#E60023] via-[#C13584] to-[#833AB4]"><UserRound size={15}/></span>
            <span className="hidden max-w-24 truncate text-xs font-bold sm:block">@{username || 'profile'}</span>
          </Link>
          <SignOutButton compact />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:pl-28 lg:pr-6 xl:hidden">{categories.map(c => <span key={c} className="whitespace-nowrap rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[10px] text-white/45">{c}</span>)}</div>
    </header>
  )
}