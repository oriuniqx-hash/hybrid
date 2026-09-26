'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Share, ShoppingBag, MapPin, Eye, Bookmark, Flag, Trash2, Link2, Search, Shuffle, Layers } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { POST_SELECT, type Post } from '../../../../lib/types'
import { compact, displayName, timeAgo } from '../../../../lib/format'
import { Avatar, Empty, Spinner, toast } from '../../../../components/ui'
import FollowButton from '../../../../components/social/FollowButton'
import LikeButton from '../../../../components/social/LikeButton'
import Comments from '../../../../components/social/Comments'
import SaveDialog from '../../../../components/social/SaveDialog'
import ShareDialog from '../../../../components/social/ShareDialog'
import ReportDialog from '../../../../components/social/ReportDialog'
import RichText from '../../../../components/social/RichText'
import Feed from '../../../../components/social/Feed'

export default function PinPage() {
  const { id } = useParams<{ id: string }>()
  const me = useMe()
  const router = useRouter()
  const [post, setPost] = useState<Post | null | undefined>(undefined)
  const [media, setMedia] = useState<{ url: string; media_type: string }[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [slide, setSlide] = useState(0)
  const [followers, setFollowers] = useState(0)
  const [save, setSave] = useState(false)
  const [share, setShare] = useState(false)
  const [report, setReport] = useState(false)
  const [menu, setMenu] = useState(false)
  const [collage, setCollage] = useState<{ sources: any[]; remixOf: any | null; remixes: number } | null>(null)

  useEffect(() => {
    (async () => {
      const s = sb()
      const { data } = await s.from('posts').select(POST_SELECT).eq('id', id).maybeSingle()
      setPost((data as Post) || null); setSlide(0)
      if (!data) return
      s.rpc('record_view', { p: id })
      const [{ data: m }, { data: pr }, { count }] = await Promise.all([
        s.from('post_media').select('url,media_type').eq('post_id', id).order('position'),
        s.from('products').select('*').eq('post_id', id),
        s.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', data.user_id).eq('status', 'accepted'),
      ])
      setMedia(m && m.length ? m : [{ url: data.media_url, media_type: data.media_type }])
      setProducts(pr || []); setFollowers(count || 0)
      if (data.is_collage) {
        const { data: c } = await s.from('collages').select('source_post_ids, remixed_from').eq('post_id', id).maybeSingle()
        const ids = [...(c?.source_post_ids || []), ...(c?.remixed_from ? [c.remixed_from] : [])]
        const { data: src } = ids.length ? await s.from('posts').select('id,media_url,title,author:profiles!posts_user_id_fkey(username)').in('id', ids) : { data: [] as any[] }
        const { count: rc } = await s.from('collages').select('post_id', { count: 'exact', head: true }).eq('remixed_from', id)
        setCollage({ sources: (src || []).filter((x: any) => x.id !== c?.remixed_from), remixOf: (src || []).find((x: any) => x.id === c?.remixed_from) || null, remixes: rc || 0 })
      } else setCollage(null)
    })()
  }, [id])

  const related = useCallback(async (off: number, lim: number) => {
    if (!post) return []
    const s = sb()
    let q = s.from('posts').select(POST_SELECT).eq('type', 'pin').neq('id', post.id)
    if (post.tags?.length) q = q.overlaps('tags', post.tags)
    else if (post.category) q = q.eq('category', post.category)
    const { data } = await q.order('saves_count', { ascending: false }).order('created_at', { ascending: false }).range(off, off + lim - 1)
    return (data || []) as Post[]
  }, [post?.id])

  if (post === undefined) return <div className="grid h-[60vh] place-items-center"><Spinner size={28} /></div>
  if (post === null) return <Empty title="This pin isn't available" body="It may have been deleted, or it belongs to a private account." action={{ href: '/home', label: 'Back home' }} />

  const cur = media[slide] || { url: post.media_url, media_type: post.media_type }
  async function remove() {
    if (!confirm('Delete this pin permanently?')) return
    await sb().from('posts').delete().eq('id', post!.id); toast('Deleted'); router.push('/u/' + me.username)
  }

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
      <button onClick={() => router.back()} className="icon-btn mb-2" aria-label="Back"><ArrowLeft size={22} /></button>
      <article className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-surface shadow-card md:grid-cols-2">
        <div className="relative bg-surface2" style={{ background: post.dominant_color || undefined }}>
          {cur.media_type === 'video'
            ? <video key={cur.url} src={cur.url} controls autoPlay muted loop playsInline className="h-full max-h-[80vh] w-full object-contain" />
            : <img src={cur.url} alt={post.alt_text || post.title || ''} className="h-full max-h-[80vh] w-full object-contain" />}
          {media.length > 1 && (
            <>
              {slide > 0 && <button onClick={() => setSlide(slide - 1)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow" aria-label="Previous"><ChevronLeft size={20} /></button>}
              {slide < media.length - 1 && <button onClick={() => setSlide(slide + 1)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow" aria-label="Next"><ChevronRight size={20} /></button>}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">{media.map((_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === slide ? 'bg-white' : 'bg-white/50'}`} />)}</div>
            </>
          )}
          {cur.media_type === 'image' && <Link href={`/explore?visual=1&like=${post.id}`} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-black shadow"><Search size={14} />Visual search</Link>}
        </div>

        <div className="flex flex-col p-5 sm:p-7">
          <div className="flex items-center gap-1">
            <LikeButton postId={post.id} count={post.likes_count} />
            <button onClick={() => setShare(true)} className="icon-btn" aria-label="Share"><Share size={20} /></button>
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="icon-btn" aria-label="More options"><MoreHorizontal size={22} /></button>
              {menu && (
                <div className="absolute left-0 z-10 mt-1 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-pop" onMouseLeave={() => setMenu(false)}>
                  <button onClick={async () => { await navigator.clipboard.writeText(location.href); toast('Link copied'); setMenu(false) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Link2 size={15} />Copy link</button>
                  {post.user_id === me.id
                    ? <button onClick={remove} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-accent hover:bg-surface2"><Trash2 size={15} />Delete</button>
                    : <button onClick={() => { setReport(true); setMenu(false) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Flag size={15} />Report</button>}
                </div>
              )}
            </div>
            {post.is_collage ? <Link href={`/create/collage?remix=${post.id}`} className="btn-ghost ml-auto py-3"><Shuffle size={16} />Remix</Link>
              : post.media_type === 'image' && post.type === 'pin' && <Link href={`/create/collage?add=${post.id}`} className="btn-ghost ml-auto hidden py-3 sm:inline-flex" title="Use in a collage"><Layers size={16} />Collage</Link>}
            <button onClick={() => setSave(true)} className={`btn-primary px-5 py-3 ${post.is_collage || (post.media_type === 'image' && post.type === 'pin') ? 'sm:ml-0 ml-auto' : 'ml-auto'}`}>Save</button>
          </div>

          {post.source_url && <a href={post.source_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 flex w-fit items-center gap-1.5 truncate text-sm font-semibold underline-offset-2 hover:underline"><ExternalLink size={14} />{new URL(post.source_url).hostname.replace('www.', '')}</a>}
          {post.is_paid_partnership && <p className="mt-3 text-xs text-muted">Paid partnership with <span className="font-semibold text-ink">{post.partner_brand}</span></p>}
          {post.title && <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{post.title}</h1>}
          {post.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed"><RichText text={post.description} /></p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{timeAgo(post.publish_at)} ago</span>
            {post.location && <span className="flex items-center gap-1"><MapPin size={12} />{post.location}</span>}
            <span className="flex items-center gap-1"><Eye size={12} />{compact(post.views_count)} views</span>
            <span className="flex items-center gap-1"><Bookmark size={12} />{compact(post.saves_count)} saves</span>
          </div>
          {!!post.tags?.length && <div className="mt-3 flex flex-wrap gap-1.5">{post.tags.slice(0, 10).map(t => <Link key={t} href={`/explore?q=%23${t}`} className="chip text-xs">#{t}</Link>)}</div>}

          {collage && (
            <section className="mt-5 rounded-2xl bg-surface2 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Layers size={16} />Collage{collage.remixes > 0 && <span className="font-normal text-muted">· {collage.remixes} remix{collage.remixes === 1 ? '' : 'es'}</span>}</h2>
              {collage.remixOf && <p className="mt-2 text-sm">Remixed from <Link href={`/p/${collage.remixOf.id}`} className="font-semibold hover:underline">{collage.remixOf.title || 'a collage'}</Link> by @{collage.remixOf.author?.username}</p>}
              {collage.sources.length > 0 && <><p className="mt-2 text-xs text-muted">Made with these pins</p><div className="mt-2 flex gap-2 overflow-x-auto">{collage.sources.map(sp => <Link key={sp.id} href={`/p/${sp.id}`} title={sp.title || ''} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface"><img src={sp.media_url} alt={sp.title || ''} className="h-full w-full object-cover" /></Link>)}</div></>}
            </section>
          )}

          {products.length > 0 && (
            <section className="mt-5 rounded-2xl bg-surface2 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold"><ShoppingBag size={16} />Shop this pin</h2>
              <div className="mt-3 space-y-2">
                {products.map(p => (
                  <a key={p.id} href={p.url || '#'} target="_blank" rel="noopener noreferrer nofollow sponsored" className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 hover:shadow-card">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.name}</span>{p.merchant && <span className="text-xs text-muted">{p.merchant}</span>}</span>
                    <span className="flex shrink-0 items-center gap-2 text-sm font-bold">{p.price != null && new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency || 'INR' }).format(p.price)}{p.url && <ExternalLink size={14} />}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {post.author && (
            <div className="mt-6 flex items-center gap-3">
              <Link href={`/u/${post.author.username}`}><Avatar src={post.author.avatar_url} name={displayName(post.author)} size={44} /></Link>
              <div className="min-w-0 flex-1"><Link href={`/u/${post.author.username}`} className="block truncate font-semibold">{displayName(post.author)}</Link><p className="text-xs text-muted">{compact(followers)} followers</p></div>
              <FollowButton userId={post.user_id} />
            </div>
          )}
          <div className="mt-6 border-t border-line pt-5"><Comments postId={post.id} ownerId={post.user_id} allow={post.allow_comments} /></div>
        </div>
      </article>

      <h2 className="mb-4 mt-12 text-center font-display text-xl font-extrabold">More like this</h2>
      <Feed loader={related} deps={[post.id]} empty={<p className="py-8 text-center text-sm text-muted">No similar pins yet.</p>} />

      {save && <SaveDialog post={post} open={save} onClose={() => setSave(false)} />}
      {share && <ShareDialog post={post} open={share} onClose={() => setShare(false)} />}
      <ReportDialog postId={post.id} open={report} onClose={() => setReport(false)} />
    </div>
  )
}
