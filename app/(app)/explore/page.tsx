'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Camera, Clock, TrendingUp, X, Hash, Lock, Upload } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { CATEGORIES, POST_SELECT, slug, type Post } from '../../../lib/types'
import { colorDistance, probeMedia } from '../../../lib/media'
import { compact, displayName } from '../../../lib/format'
import Feed from '../../../components/social/Feed'
import FollowButton from '../../../components/social/FollowButton'
import { Avatar, Empty, Spinner } from '../../../components/ui'
import { BoardTile, ProductGrid } from '../../../components/social/Tiles'

const TABS = [['pins', 'Pins'], ['videos', 'Videos'], ['people', 'People'], ['boards', 'Boards'], ['products', 'Products']] as const
const SWATCHES = ['#d8453b', '#e88b3a', '#e9c94a', '#5aa35a', '#3a8ec2', '#6a4fb3', '#d86aa6', '#f2efe9', '#8a8580', '#1d1b19', '#a0764b', '#c9b89a']

export default function ExplorePage() {
  const params = useSearchParams()
  const router = useRouter()
  const me = useMe()
  const q = (params.get('q') || '').trim()
  const tab = (params.get('tab') as any) || 'pins'
  const sort = params.get('sort') || 'relevant'
  const visual = params.get('visual') === '1'
  const set = (k: string, v: string | null) => { const p = new URLSearchParams(params.toString()); v === null ? p.delete(k) : p.set(k, v); router.push('/explore?' + p.toString()) }

  useEffect(() => { if (q) sb().from('search_history').insert({ user_id: me.id, query: q }) }, [q])

  if (visual) return <VisualSearch likeId={params.get('like')} />
  if (!q && tab === 'pins') return <Discover />

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
      {q && <h1 className="font-display text-2xl font-extrabold">Results for “{q}”</h1>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TABS.map(([k, l]) => <button key={k} onClick={() => set('tab', k)} className={`chip ${tab === k ? 'chip-active' : ''}`}>{l}</button>)}
        {(tab === 'pins' || tab === 'videos') && (
          <select aria-label="Sort" value={sort} onChange={e => set('sort', e.target.value)} className="ml-auto rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
            <option value="relevant">Most relevant</option><option value="new">Newest</option><option value="saved">Most saved</option>
          </select>
        )}
      </div>
      <div className="mt-5">
        {(tab === 'pins' || tab === 'videos') && <PinResults q={q} video={tab === 'videos'} sort={sort} />}
        {tab === 'people' && <People q={q} />}
        {tab === 'boards' && <Boards q={q} />}
        {tab === 'products' && <Products q={q} />}
      </div>
    </div>
  )
}

function applySearch(qb: any, q: string) {
  if (!q) return qb
  const term = q.replace(/[,()]/g, ' ').trim()
  const tag = slug(term.replace(/^#/, ''))
  if (term.startsWith('#')) return qb.contains('tags', [tag])
  return qb.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%,tags.cs.{${tag}}`)
}

function PinResults({ q, video, sort }: { q: string; video: boolean; sort: string }) {
  const loader = useCallback(async (off: number, lim: number) => {
    let qb = sb().from('posts').select(POST_SELECT).in('type', video ? ['pin', 'reel'] : ['pin'])
    if (video) qb = qb.eq('media_type', 'video')
    qb = applySearch(qb, q)
    qb = sort === 'new' ? qb.order('publish_at', { ascending: false }) : sort === 'saved' ? qb.order('saves_count', { ascending: false }) : qb.order('saves_count', { ascending: false }).order('likes_count', { ascending: false }).order('publish_at', { ascending: false })
    const { data } = await qb.range(off, off + lim - 1)
    return (data || []) as Post[]
  }, [q, video, sort])
  return <Feed loader={loader} deps={[q, video, sort]} empty={<Empty title="No pins found" body={`Nothing matches “${q}” yet. Try a broader search or another topic.`} />} />
}

function People({ q }: { q: string }) {
  const me = useMe()
  const [list, setList] = useState<any[] | null>(null)
  useEffect(() => {
    (async () => {
      let qb = sb().from('profiles').select('id,username,full_name,avatar_url,bio,account_type').neq('id', me.id).limit(40)
      if (q) qb = qb.or(`username.ilike.%${q.replace(/^[@#]/, '')}%,full_name.ilike.%${q.replace(/^[@#]/, '')}%`)
      else qb = qb.order('created_at', { ascending: false })
      const { data } = await qb; setList(data || [])
    })()
  }, [q])
  if (!list) return <div className="grid place-items-center py-10"><Spinner /></div>
  if (!list.length) return <Empty title="No people found" body="Try a different name or username." />
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map(p => (
        <div key={p.id} className="card flex items-center gap-3 p-4">
          <Link href={`/u/${p.username}`}><Avatar src={p.avatar_url} name={displayName(p)} size={52} /></Link>
          <Link href={`/u/${p.username}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{displayName(p)}</p><p className="truncate text-sm text-muted">@{p.username}{p.account_type !== 'personal' && ` · ${p.account_type}`}</p></Link>
          <FollowButton userId={p.id} />
        </div>
      ))}
    </div>
  )
}

function Boards({ q }: { q: string }) {
  const [list, setList] = useState<any[] | null>(null)
  useEffect(() => {
    (async () => {
      let qb = sb().from('boards').select('*, owner:profiles!boards_user_id_fkey(username), pins:board_pins(count)').eq('is_private', false).limit(40)
      if (q) qb = qb.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      const { data } = await qb.order('updated_at', { ascending: false }); setList(data || [])
    })()
  }, [q])
  if (!list) return <div className="grid place-items-center py-10"><Spinner /></div>
  if (!list.length) return <Empty title="No boards found" />
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{list.map(b => <BoardTile key={b.id} b={b} />)}</div>
}

function Products({ q }: { q: string }) {
  const [list, setList] = useState<any[] | null>(null)
  useEffect(() => {
    (async () => {
      let qb = sb().from('products').select('*, post:posts(id,media_url,thumbnail_url,title)').limit(60).order('created_at', { ascending: false })
      if (q) qb = qb.or(`name.ilike.%${q}%,merchant.ilike.%${q}%`)
      const { data } = await qb; setList((data || []).filter((p: any) => p.post))
    })()
  }, [q])
  if (!list) return <div className="grid place-items-center py-10"><Spinner /></div>
  if (!list.length) return <Empty title="No products found" body="Creators and businesses can tag products when they publish a pin." />
  return <ProductGrid list={list} />
}

function Discover() {
  const me = useMe()
  const [tags, setTags] = useState<{ tag: string; uses: number }[]>([])
  const [searches, setSearches] = useState<{ query: string; searches: number }[]>([])
  const [recent, setRecent] = useState<{ id: number; query: string }[]>([])
  useEffect(() => {
    const s = sb()
    s.rpc('trending_tags', { days: 14, lim: 16 }).then(({ data }) => setTags(data || []))
    s.rpc('trending_searches', { days: 7, lim: 10 }).then(({ data }) => setSearches(data || []))
    s.from('search_history').select('id,query').eq('user_id', me.id).order('created_at', { ascending: false }).limit(30).then(({ data }) => {
      const seen = new Set<string>(); setRecent((data || []).filter((r: any) => !seen.has(r.query.toLowerCase()) && seen.add(r.query.toLowerCase())).slice(0, 8))
    })
  }, [])
  async function clearRecent() { await sb().from('search_history').delete().eq('user_id', me.id); setRecent([]) }
  const trending = useCallback(async (off: number, lim: number) => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data } = await sb().from('posts').select(POST_SELECT).eq('type', 'pin').gte('publish_at', since).order('saves_count', { ascending: false }).order('likes_count', { ascending: false }).order('publish_at', { ascending: false }).range(off, off + lim - 1)
    return (data || []) as Post[]
  }, [])
  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="font-display text-xl font-extrabold">Explore topics</h2>
          <div className="mt-3 flex flex-wrap gap-2">{CATEGORIES.map(c => <Link key={c} href={`/explore?q=${encodeURIComponent(c)}`} className="chip">{c}</Link>)}</div>
          {tags.length > 0 && <>
            <h3 className="mt-6 flex items-center gap-2 text-sm font-bold"><Hash size={15} />Trending tags</h3>
            <div className="mt-2 flex flex-wrap gap-2">{tags.map(t => <Link key={t.tag} href={`/explore?q=%23${t.tag}`} className="chip text-xs">#{t.tag} <span className="text-muted">{compact(t.uses)}</span></Link>)}</div>
          </>}
        </section>
        <aside className="space-y-5">
          <Link href="/explore?visual=1" className="card flex items-center gap-3 p-4 hover:bg-surface2"><span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white"><Camera size={20} /></span><span><span className="block font-semibold">Search with an image</span><span className="text-xs text-muted">Find pins with a matching look & colour</span></span></Link>
          {recent.length > 0 && <div><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold"><Clock size={15} />Recent searches</h3><button onClick={clearRecent} className="text-xs text-muted hover:text-ink">Clear</button></div>
            <div className="mt-2 flex flex-wrap gap-2">{recent.map(r => <Link key={r.id} href={`/explore?q=${encodeURIComponent(r.query)}`} className="chip text-xs">{r.query}</Link>)}</div></div>}
          {searches.length > 0 && <div><h3 className="flex items-center gap-2 text-sm font-bold"><TrendingUp size={15} />Trending searches</h3>
            <ol className="mt-2 space-y-1">{searches.map((s, i) => <li key={s.query}><Link href={`/explore?q=${encodeURIComponent(s.query)}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-surface2"><span className="w-4 text-muted">{i + 1}</span>{s.query}</Link></li>)}</ol></div>}
        </aside>
      </div>
      <h2 className="mb-4 mt-10 font-display text-xl font-extrabold">Trending now</h2>
      <Feed loader={trending} empty={<Empty title="Nothing trending yet" body="As people publish and save pins, the most popular ideas of the month appear here." action={{ href: '/create', label: 'Create a pin' }} />} />
    </div>
  )
}

function VisualSearch({ likeId }: { likeId: string | null }) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [seedTags, setSeedTags] = useState<string[]>([])
  const [results, setResults] = useState<Post[] | null>(null)

  useEffect(() => {
    if (!likeId) return
    sb().from('posts').select('media_url,thumbnail_url,dominant_color,tags').eq('id', likeId).maybeSingle().then(({ data }) => {
      if (!data) return
      setPreview(data.thumbnail_url || data.media_url); setColor(data.dominant_color); setSeedTags(data.tags || [])
    })
  }, [likeId])

  useEffect(() => {
    if (!color && !seedTags.length) return
    (async () => {
      setResults(null)
      const { data } = await sb().from('posts').select(POST_SELECT).eq('type', 'pin').not('dominant_color', 'is', null).order('publish_at', { ascending: false }).limit(400)
      const scored = (data || []).filter((p: any) => p.id !== likeId).map((p: any) => {
        const cd = color && p.dominant_color ? colorDistance(color, p.dominant_color) : 120
        const overlap = seedTags.length ? (p.tags || []).filter((t: string) => seedTags.includes(t)).length : 0
        return { p, score: cd - overlap * 25 }
      }).sort((a, b) => a.score - b.score).slice(0, 60).map(x => x.p)
      setResults(scored as Post[])
    })()
  }, [color, seedTags.join(',')])

  async function onFile(f?: File) {
    if (!f) return
    setPreview(URL.createObjectURL(f)); setSeedTags([])
    const pr = await probeMedia(f); setColor(pr.color)
  }

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-extrabold">Visual search</h1><button onClick={() => router.push('/explore')} className="icon-btn" aria-label="Close visual search"><X size={20} /></button></div>
      <p className="mt-1 text-sm text-muted">Start from an image to find pins with a similar colour palette and style tags.</p>
      <div className="mt-5 grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <label className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-line bg-surface2/50 text-center">
            {preview ? <img src={preview} alt="Search image" className="absolute inset-0 h-full w-full object-cover" /> : <><Upload size={30} className="text-muted" /><span className="mt-2 text-sm font-semibold">Upload an image</span></>}
            <input type="file" accept="image/*" className="sr-only" onChange={e => onFile(e.target.files?.[0])} />
          </label>
          <div><span className="label">Or pick a colour</span>
            <div className="flex flex-wrap gap-2">{SWATCHES.map(c => <button key={c} onClick={() => { setColor(c); setPreview(null); setSeedTags([]) }} aria-label={'Colour ' + c} className={`h-8 w-8 rounded-full border border-line ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`} style={{ background: c }} />)}</div>
          </div>
          {color && <p className="flex items-center gap-2 text-xs text-muted">Matching <span className="inline-block h-4 w-4 rounded-full border border-line" style={{ background: color }} />{color}{seedTags.length > 0 && ` + ${seedTags.length} tags`}</p>}
        </div>
        <div>
          {!color && !seedTags.length ? <Empty icon={<Camera size={24} />} title="Choose an image to start" body="Upload a photo, pick a colour, or tap “Visual search” on any pin." />
            : !results ? <div className="grid place-items-center py-16"><Spinner /></div>
            : !results.length ? <Empty title="No visual matches yet" body="Once more pins are published, similar ones will show up here." />
            : <div className="masonry">{results.map(p => <MiniPin key={p.id} p={p} />)}</div>}
        </div>
      </div>
    </div>
  )
}
function MiniPin({ p }: { p: Post }) {
  return <Link href={`/p/${p.id}`} className="block overflow-hidden rounded-2xl" style={{ background: p.dominant_color || undefined, aspectRatio: String(Math.min(Math.max(p.aspect_ratio, .5), 1.8)) }}>
    {p.media_type === 'video' ? <video src={p.media_url} muted className="h-full w-full object-cover" /> : <img src={p.thumbnail_url || p.media_url} alt={p.alt_text || p.title || ''} loading="lazy" className="h-full w-full object-cover" />}
  </Link>
}
