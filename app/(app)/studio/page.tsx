'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Eye, Heart, Bookmark, MessageCircle, Send, Users, CalendarClock, Trash2, TrendingUp, Hash, Handshake, BarChart3 } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { Empty, Spinner, toast } from '../../../components/ui'
import { compact, timeAgo } from '../../../lib/format'
import type { Post } from '../../../lib/types'

const RANGES = [7, 30, 90]

export default function StudioPage() {
  const me = useMe()
  const [days, setDays] = useState(30)
  const [tab, setTab] = useState<'overview' | 'content' | 'audience' | 'trends'>('overview')
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [views, setViews] = useState<{ post_id: string; created_at: string }[]>([])
  const [followers, setFollowers] = useState<{ created_at: string; follower_id: string }[]>([])
  const [interests, setInterests] = useState<[string, number][]>([])
  const [trendTags, setTrendTags] = useState<any[]>([])
  const [trendSearch, setTrendSearch] = useState<any[]>([])

  async function load() {
    const s = sb()
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const { data: ps } = await s.from('posts').select('*').eq('user_id', me.id).neq('type', 'story').order('publish_at', { ascending: false })
    setPosts((ps || []) as Post[])
    const ids = (ps || []).map((p: any) => p.id)
    if (ids.length) { const { data: v } = await s.from('post_views').select('post_id,created_at').in('post_id', ids).gte('created_at', since).limit(10000); setViews(v || []) } else setViews([])
    const { data: f } = await s.from('follows').select('created_at,follower_id').eq('following_id', me.id).eq('status', 'accepted')
    setFollowers(f || [])
    if (f?.length) {
      const { data: fp } = await s.from('profiles').select('interests').in('id', f.map((x: any) => x.follower_id).slice(0, 500))
      const counts: Record<string, number> = {}
      ;(fp || []).forEach((p: any) => (p.interests || []).forEach((i: string) => counts[i] = (counts[i] || 0) + 1))
      setInterests(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8))
    }
    s.rpc('trending_tags', { days: 7, lim: 15 }).then(({ data }) => setTrendTags(data || []))
    s.rpc('trending_searches', { days: 7, lim: 15 }).then(({ data }) => setTrendSearch(data || []))
  }
  useEffect(() => { load() }, [days])

  const now = Date.now()
  const published = (posts || []).filter(p => new Date(p.publish_at).getTime() <= now)
  const scheduled = (posts || []).filter(p => new Date(p.publish_at).getTime() > now)
  const totals = useMemo(() => published.reduce((a, p) => ({ views: a.views + p.views_count, likes: a.likes + p.likes_count, saves: a.saves + p.saves_count, comments: a.comments + p.comments_count, shares: a.shares + p.shares_count }), { views: 0, likes: 0, saves: 0, comments: 0, shares: 0 }), [posts])
  const engagement = totals.views ? ((totals.likes + totals.saves + totals.comments + totals.shares) / totals.views) * 100 : 0

  const series = useMemo(() => {
    const buckets = Array.from({ length: days }, (_, i) => { const d = new Date(now - (days - 1 - i) * 86400000); return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), v: 0, f: 0 } })
    const idx = new Map(buckets.map((b, i) => [b.key, i]))
    views.forEach(v => { const i = idx.get(v.created_at.slice(0, 10)); if (i !== undefined) buckets[i].v++ })
    followers.forEach(f => { const i = idx.get(f.created_at.slice(0, 10)); if (i !== undefined) buckets[i].f++ })
    return buckets
  }, [views, followers, days])
  const newFollowers = series.reduce((a, b) => a + b.f, 0)
  const top = [...published].sort((a, b) => (b.saves_count * 3 + b.likes_count * 2 + b.views_count * .1) - (a.saves_count * 3 + a.likes_count * 2 + a.views_count * .1)).slice(0, 10)

  async function del(id: string) { if (!confirm('Delete this post?')) return; await sb().from('posts').delete().eq('id', id); toast('Deleted'); load() }
  async function publishNow(id: string) { await sb().from('posts').update({ publish_at: new Date().toISOString() }).eq('id', id); toast('Published'); load() }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold">{me.account_type === 'business' ? 'Business hub' : 'Creator studio'}</h1><p className="mt-1 text-sm text-muted">Real-time performance of your pins and Reels.</p></div>
        <div className="flex gap-1 rounded-full bg-surface2 p-1">{RANGES.map(r => <button key={r} onClick={() => setDays(r)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${days === r ? 'bg-surface shadow-card' : 'text-muted'}`}>{r}d</button>)}</div>
      </div>
      <nav className="mt-6 flex gap-6 border-b border-line">{([['overview', 'Overview'], ['content', 'Content'], ['audience', 'Audience'], ['trends', 'Trends']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`tab ${tab === k ? 'tab-active' : ''}`}>{l}</button>)}</nav>

      {!posts ? <div className="grid place-items-center py-16"><Spinner /></div> : (
        <div className="mt-6">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[[Eye, 'Impressions', totals.views], [Heart, 'Likes', totals.likes], [Bookmark, 'Saves', totals.saves], [MessageCircle, 'Comments', totals.comments], [Send, 'Shares', totals.shares], [Users, 'Followers', followers.length]].map(([I, l, v]: any) => (
                  <div key={l} className="card p-4"><p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><I size={14} />{l}</p><p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{compact(v)}</p></div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="card p-4"><p className="text-xs font-semibold text-muted">Engagement rate</p><p className="mt-1 font-display text-2xl font-extrabold">{engagement.toFixed(1)}%</p><p className="text-xs text-muted">(likes + saves + comments + shares) ÷ impressions</p></div>
                <div className="card p-4"><p className="text-xs font-semibold text-muted">New followers · last {days} days</p><p className="mt-1 font-display text-2xl font-extrabold">+{compact(newFollowers)}</p></div>
              </div>
              <div className="card mt-3 p-5">
                <h2 className="flex items-center gap-2 font-bold"><BarChart3 size={17} />Impressions per day</h2>
                <Bars data={series.map(s => ({ label: s.label, v: s.v }))} />
              </div>
              <div className="card mt-3 p-5">
                <h2 className="font-bold">Top content</h2>
                {top.length === 0 ? <Empty title="No published content yet" action={{ href: '/create', label: 'Create your first pin' }} /> : <ContentTable rows={top} onDelete={del} />}
              </div>
            </>
          )}
          {tab === 'content' && (
            <>
              <div className="card p-5">
                <h2 className="flex items-center gap-2 font-bold"><CalendarClock size={17} />Scheduled ({scheduled.length})</h2>
                {scheduled.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing scheduled. Use Advanced settings → Schedule when creating a pin.</p> :
                  <div className="mt-3 divide-y divide-line">{scheduled.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-3"><Thumb p={p} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title || 'Untitled'}</p><p className="text-xs text-muted">Goes live {new Date(p.publish_at).toLocaleString('en-IN')}</p></div>
                      <button onClick={() => publishNow(p.id)} className="btn-ghost py-1.5 text-xs">Publish now</button><button onClick={() => del(p.id)} className="icon-btn" aria-label="Delete"><Trash2 size={16} /></button></div>))}</div>}
              </div>
              <div className="card mt-3 p-5"><h2 className="font-bold">All content ({published.length})</h2>{published.length ? <ContentTable rows={published} onDelete={del} /> : <p className="mt-2 text-sm text-muted">No published content yet.</p>}</div>
              <div className="card mt-3 p-5">
                <h2 className="flex items-center gap-2 font-bold"><Handshake size={17} />Brand partnerships</h2>
                {published.filter(p => p.is_paid_partnership).length === 0 ? <p className="mt-2 text-sm text-muted">Mark a pin as a paid partnership in Advanced settings to label it and track it here.</p>
                  : <ContentTable rows={published.filter(p => p.is_paid_partnership)} onDelete={del} brand />}
              </div>
            </>
          )}
          {tab === 'audience' && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="card p-5"><h2 className="font-bold">Follower growth</h2><p className="text-xs text-muted">{followers.length} total followers</p><Bars data={series.map(s => ({ label: s.label, v: s.f }))} /></div>
              <div className="card p-5"><h2 className="font-bold">What your audience is into</h2>
                {interests.length === 0 ? <p className="mt-2 text-sm text-muted">As people follow you, their top interests appear here.</p> :
                  <div className="mt-3 space-y-2.5">{interests.map(([k, n]) => <div key={k}><div className="flex justify-between text-sm"><span className="capitalize">{k.replace(/-/g, ' ')}</span><span className="text-muted">{Math.round(n / followers.length * 100)}%</span></div><div className="mt-1 h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-accent" style={{ width: `${n / followers.length * 100}%` }} /></div></div>)}</div>}
              </div>
              <div className="card p-5 lg:col-span-2"><h2 className="font-bold">Content mix</h2>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">{(['pin', 'reel'] as const).map(t => { const r = published.filter(p => p.type === t); return <div key={t} className="rounded-2xl bg-surface2 p-4"><p className="text-xs font-semibold uppercase text-muted">{t}s</p><p className="font-display text-2xl font-extrabold">{r.length}</p><p className="text-xs text-muted">{compact(r.reduce((a, p) => a + p.views_count, 0))} impressions</p></div> })}
                  <div className="rounded-2xl bg-surface2 p-4"><p className="text-xs font-semibold uppercase text-muted">Video pins</p><p className="font-display text-2xl font-extrabold">{published.filter(p => p.type === 'pin' && p.media_type === 'video').length}</p></div></div>
              </div>
            </div>
          )}
          {tab === 'trends' && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="card p-5"><h2 className="flex items-center gap-2 font-bold"><TrendingUp size={17} />Top searches this week</h2>
                {trendSearch.length === 0 ? <p className="mt-2 text-sm text-muted">Search trends appear as people search on Hybrid.</p> : <ol className="mt-3 space-y-1.5">{trendSearch.map((t, i) => <li key={t.query} className="flex items-center gap-3 text-sm"><span className="w-5 text-muted">{i + 1}</span><Link href={`/explore?q=${encodeURIComponent(t.query)}`} className="flex-1 hover:underline">{t.query}</Link><span className="text-muted">{compact(t.searches)}</span></li>)}</ol>}</div>
              <div className="card p-5"><h2 className="flex items-center gap-2 font-bold"><Hash size={17} />Rising tags this week</h2>
                {trendTags.length === 0 ? <p className="mt-2 text-sm text-muted">Tag trends appear as people publish pins.</p> : <ol className="mt-3 space-y-1.5">{trendTags.map((t, i) => <li key={t.tag} className="flex items-center gap-3 text-sm"><span className="w-5 text-muted">{i + 1}</span><Link href={`/explore?q=%23${t.tag}`} className="flex-1 hover:underline">#{t.tag}</Link><span className="text-muted">{compact(t.uses)} pins</span></li>)}</ol>}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Bars({ data }: { data: { label: string; v: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.v))
  const total = data.reduce((a, d) => a + d.v, 0)
  if (!total) return <p className="py-10 text-center text-sm text-muted">No activity in this period yet.</p>
  return (
    <div className="mt-4">
      <div className="flex h-40 items-end gap-[2px]">{data.map(d => <div key={d.label} className="group relative flex-1"><div className="rounded-t bg-accent/80 transition group-hover:bg-accent" style={{ height: `${(d.v / max) * 150}px`, minHeight: d.v ? 2 : 0 }} /><span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] text-bg group-hover:block">{d.label}: {d.v}</span></div>)}</div>
      <div className="mt-1 flex justify-between text-[10px] text-faint"><span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
    </div>
  )
}
function Thumb({ p }: { p: Post }) {
  return <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface2">{p.media_type === 'video' ? <video src={p.media_url} muted className="h-full w-full object-cover" /> : <img src={p.thumbnail_url || p.media_url} alt="" className="h-full w-full object-cover" />}</span>
}
function ContentTable({ rows, onDelete, brand = false }: { rows: Post[]; onDelete: (id: string) => void; brand?: boolean }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr className="text-left text-xs text-muted"><th className="py-2 font-semibold">Post</th>{brand && <th className="font-semibold">Brand</th>}<th className="font-semibold">Type</th><th className="text-right font-semibold">Impr.</th><th className="text-right font-semibold">Likes</th><th className="text-right font-semibold">Saves</th><th className="text-right font-semibold">Comm.</th><th className="text-right font-semibold">Shares</th><th /></tr></thead>
        <tbody className="divide-y divide-line">{rows.map(p => (
          <tr key={p.id}><td className="py-2"><Link href={p.type === 'reel' ? `/reels?id=${p.id}` : `/p/${p.id}`} className="flex items-center gap-3"><Thumb p={p} /><span className="min-w-0"><span className="block max-w-[220px] truncate font-semibold">{p.title || 'Untitled'}</span><span className="text-xs text-muted">{timeAgo(p.publish_at)} ago</span></span></Link></td>
            {brand && <td>{p.partner_brand}</td>}<td className="capitalize">{p.type}</td>
            <td className="text-right tabular-nums">{compact(p.views_count)}</td><td className="text-right tabular-nums">{compact(p.likes_count)}</td><td className="text-right tabular-nums">{compact(p.saves_count)}</td><td className="text-right tabular-nums">{compact(p.comments_count)}</td><td className="text-right tabular-nums">{compact(p.shares_count)}</td>
            <td className="text-right"><button onClick={() => onDelete(p.id)} className="icon-btn" aria-label="Delete"><Trash2 size={15} /></button></td></tr>))}</tbody>
      </table>
    </div>
  )
}
