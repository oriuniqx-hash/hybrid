'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Send, Bookmark, Volume2, VolumeX, Clapperboard, X, Music2 } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { POST_SELECT, type Post } from '../../../lib/types'
import { compact, displayName } from '../../../lib/format'
import { Avatar, Empty, Spinner } from '../../../components/ui'
import LikeButton from '../../../components/social/LikeButton'
import FollowButton from '../../../components/social/FollowButton'
import Comments from '../../../components/social/Comments'
import ShareDialog from '../../../components/social/ShareDialog'
import SaveDialog from '../../../components/social/SaveDialog'
import RichText from '../../../components/social/RichText'

export default function ReelsPage() {
  const params = useSearchParams()
  const startId = params.get('id')
  const [reels, setReels] = useState<Post[] | null>(null)
  const [muted, setMuted] = useState(true)
  const [more, setMore] = useState(true)

  async function load(off = 0) {
    const { data } = await sb().from('posts').select(POST_SELECT).eq('type', 'reel').order('publish_at', { ascending: false }).range(off, off + 9)
    let list = (data || []) as Post[]
    if (off === 0 && startId && !list.find(r => r.id === startId)) {
      const { data: one } = await sb().from('posts').select(POST_SELECT).eq('id', startId).maybeSingle()
      if (one) list = [one as Post, ...list]
    } else if (off === 0 && startId) list = [...list.filter(r => r.id === startId), ...list.filter(r => r.id !== startId)]
    setMore(list.length >= 10)
    setReels(prev => off === 0 ? list : [...(prev || []), ...list.filter(r => !(prev || []).some(p => p.id === r.id))])
  }
  useEffect(() => { load(0) }, [startId])

  return (
    <div className="relative h-[100dvh] bg-black">
      <Link href="/home" className="absolute left-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white lg:left-[92px]" aria-label="Back"><ArrowLeft size={22} /></Link>
      <button onClick={() => setMuted(!muted)} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white" aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
      {!reels ? <div className="grid h-full place-items-center"><Spinner size={28} /></div>
        : reels.length === 0 ? <div className="grid h-full place-items-center text-white"><div className="text-center"><Clapperboard size={40} className="mx-auto opacity-60" /><p className="mt-3 text-lg font-bold">No Reels yet</p><p className="mt-1 text-sm text-white/60">Share a short vertical video to start the Reels feed.</p><Link href="/create?type=reel" className="btn-primary mt-5">Create a Reel</Link></div></div>
        : (
          <div className="snap-reels no-scrollbar h-full overflow-y-scroll" onScroll={e => { const el = e.currentTarget; if (more && el.scrollTop + el.clientHeight * 2 > el.scrollHeight) { setMore(false); load(reels.length) } }}>
            {reels.map(r => <Reel key={r.id} r={r} muted={muted} />)}
          </div>
        )}
    </div>
  )
}

function Reel({ r, muted }: { r: Post; muted: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [comments, setComments] = useState(false)
  const [share, setShare] = useState(false)
  const [save, setSave] = useState(false)
  const [n, setN] = useState(r.comments_count)
  const viewed = useRef(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      const v = vid.current; if (!v) return
      if (e.isIntersecting) { v.play().catch(() => {}); if (!viewed.current) { viewed.current = true; sb().rpc('record_view', { p: r.id }) } }
      else v.pause()
    }, { threshold: 0.65 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [r.id])
  return (
    <section ref={ref} className="relative flex h-[100dvh] items-center justify-center">
      <div className="relative h-full w-full max-w-[min(100vw,calc(100dvh*9/16))]">
        <video ref={vid} src={r.media_url} loop playsInline muted={muted} className="h-full w-full object-cover" onClick={e => e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause()} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute bottom-6 left-4 right-20 text-white">
          <div className="flex items-center gap-2">
            <Link href={`/u/${r.author?.username}`} className="flex items-center gap-2"><Avatar src={r.author?.avatar_url} name={displayName(r.author)} size={34} /><span className="font-semibold">{r.author?.username}</span></Link>
            <FollowButton userId={r.user_id} className="!border !border-white/70 !bg-transparent !px-3 !py-1 !text-xs !text-white" />
          </div>
          {r.is_paid_partnership && <p className="mt-1 text-xs text-white/70">Paid partnership · {r.partner_brand}</p>}
          {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
          {r.description && <p className="mt-1 line-clamp-3 text-sm text-white/90"><RichText text={r.description} /></p>}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70"><Music2 size={12} />Original audio · {r.author?.username} · {compact(r.views_count)} views</p>
        </div>
        <div className="absolute bottom-6 right-3 flex flex-col items-center gap-5 text-white">
          <LikeButton postId={r.id} count={r.likes_count} vertical light />
          <button onClick={() => setComments(true)} className="flex flex-col items-center gap-1 text-xs font-semibold" aria-label="Comments"><MessageCircle size={30} />{compact(n)}</button>
          <button onClick={() => setShare(true)} className="flex flex-col items-center gap-1 text-xs font-semibold" aria-label="Share"><Send size={28} />{compact(r.shares_count)}</button>
          <button onClick={() => setSave(true)} className="flex flex-col items-center gap-1 text-xs font-semibold" aria-label="Save"><Bookmark size={28} />{compact(r.saves_count)}</button>
        </div>
      </div>
      {comments && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onMouseDown={e => e.target === e.currentTarget && setComments(false)}>
          <div className="max-h-[75vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-surface p-5 text-ink sm:rounded-3xl">
            <div className="mb-2 flex justify-end"><button onClick={() => setComments(false)} className="icon-btn" aria-label="Close"><X size={20} /></button></div>
            <Comments postId={r.id} ownerId={r.user_id} allow={r.allow_comments} onCount={setN} />
          </div>
        </div>
      )}
      {share && <ShareDialog post={r} open={share} onClose={() => setShare(false)} />}
      {save && <SaveDialog post={r} open={save} onClose={() => setSave(false)} />}
    </section>
  )
}
