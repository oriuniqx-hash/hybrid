'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Play, Share, ShoppingBag, Heart, Bookmark } from 'lucide-react'
import type { Post } from '../../lib/types'
import { Avatar } from '../ui'
import { compact, displayName } from '../../lib/format'
import SaveDialog from './SaveDialog'
import ShareDialog from './ShareDialog'

export default function PinCard({ post, hasProducts = false }: { post: Post; hasProducts?: boolean }) {
  const [save, setSave] = useState(false)
  const [share, setShare] = useState(false)
  const ratio = Math.min(Math.max(post.aspect_ratio || 1, 0.5), 1.8)
  const isVideo = post.media_type === 'video'
  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-2xl" style={{ background: post.dominant_color || 'rgb(var(--surface-2))', aspectRatio: String(ratio) }}>
        <Link href={`/p/${post.id}`} className="absolute inset-0" aria-label={post.title || 'Open pin'}>
          {isVideo
            ? <video src={post.media_url} poster={post.thumbnail_url || undefined} muted loop playsInline preload="metadata" className="h-full w-full object-cover"
                onMouseEnter={e => e.currentTarget.play().catch(() => {})} onMouseLeave={e => e.currentTarget.pause()} />
            : <img src={post.thumbnail_url || post.media_url} alt={post.alt_text || post.title || ''} loading="lazy" className="h-full w-full object-cover" />}
        </Link>
        {isVideo && <span className="pointer-events-none absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white"><Play size={13} fill="white" /></span>}
        {hasProducts && <span className="pointer-events-none absolute bottom-3 left-3 grid h-7 w-7 place-items-center rounded-full bg-white text-black shadow"><ShoppingBag size={14} /></span>}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
        <button onClick={() => setSave(true)} className="btn-primary absolute right-3 top-3 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100">Save</button>
        <button onClick={() => setShare(true)} aria-label="Share" className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-black opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"><Share size={15} /></button>
      </div>
      <div className="px-1 pt-2">
        {post.title && <Link href={`/p/${post.id}`} className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</Link>}
        <div className="mt-1.5 flex items-center gap-2">
          {post.author && (
            <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-1.5 text-xs text-muted hover:text-ink">
              <Avatar src={post.author.avatar_url} name={displayName(post.author)} size={22} />
              <span className="truncate">{displayName(post.author)}</span>
            </Link>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-faint">
            {post.likes_count > 0 && <span className="flex items-center gap-0.5"><Heart size={12} />{compact(post.likes_count)}</span>}
            {post.saves_count > 0 && <span className="flex items-center gap-0.5"><Bookmark size={12} />{compact(post.saves_count)}</span>}
          </span>
        </div>
      </div>
      {save && <SaveDialog post={post} open={save} onClose={() => setSave(false)} />}
      {share && <ShareDialog post={post} open={share} onClose={() => setShare(false)} />}
    </article>
  )
}
