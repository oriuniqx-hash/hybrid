'use client'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export function BoardTile({ b }: { b: any }) {
  return (
    <Link href={`/boards/${b.id}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-surface2">{b.cover_url && <img src={b.cover_url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />}</div>
      <p className="mt-2 flex items-center gap-1.5 truncate font-semibold">{b.name}{b.is_private && <Lock size={13} className="text-muted" />}</p>
      <p className="text-xs text-muted">{b.pins?.[0]?.count ?? 0} pins{b.owner ? ` · @${b.owner.username}` : ''}</p>
    </Link>
  )
}

export function ProductGrid({ list }: { list: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {list.map(p => (
        <div key={p.id} className="group">
          <Link href={`/p/${p.post.id}`} className="block aspect-square overflow-hidden rounded-2xl bg-surface2"><img src={p.post.thumbnail_url || p.post.media_url} alt="" className="h-full w-full object-cover" /></Link>
          <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{p.merchant || 'Shop'}</span>
            {p.price != null && <span className="font-bold text-ink">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency || 'INR', maximumFractionDigits: 0 }).format(p.price)}</span>}
          </div>
          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer nofollow sponsored" className="btn-outline mt-2 w-full py-1.5 text-xs">Visit site</a>}
        </div>
      ))}
    </div>
  )
}

