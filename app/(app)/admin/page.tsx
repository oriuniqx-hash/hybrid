'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Shield, Users, Image as ImageIcon, Flag, LayoutGrid } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { Avatar, Empty, Spinner, toast } from '../../../components/ui'
import { displayName, timeAgo, compact } from '../../../lib/format'

export default function AdminPage() {
  const me = useMe()
  const [tab, setTab] = useState<'reports' | 'content' | 'users'>('reports')
  const [stats, setStats] = useState<Record<string, number>>({})
  const [reports, setReports] = useState<any[] | null>(null)
  const [posts, setPosts] = useState<any[] | null>(null)
  const [users, setUsers] = useState<any[] | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'open' | 'all'>('open')

  async function load() {
    const s = sb()
    const c = async (t: string, f?: (x: any) => any) => { let qb: any = s.from(t).select('*', { count: 'exact', head: true }); if (f) qb = f(qb); return (await qb).count || 0 }
    setStats({ users: await c('profiles'), pins: await c('posts', x => x.eq('type', 'pin')), reels: await c('posts', x => x.eq('type', 'reel')), boards: await c('boards'), open: await c('reports', x => x.eq('status', 'open')) })
    let rq = s.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username), user:profiles!reports_reported_user_id_fkey(id,username), post:posts(id,media_url,title,status,user_id)').order('created_at', { ascending: false }).limit(100)
    if (status === 'open') rq = rq.eq('status', 'open')
    setReports((await rq).data || [])
    setPosts((await s.from('posts').select('id,title,media_url,media_type,type,status,created_at,user_id,author:profiles!posts_user_id_fkey(username)').order('created_at', { ascending: false }).limit(60)).data || [])
    let uq = s.from('profiles').select('*').order('created_at', { ascending: false }).limit(60)
    if (q.trim()) uq = uq.or(`username.ilike.%${q.trim()}%,full_name.ilike.%${q.trim()}%`)
    setUsers((await uq).data || [])
  }
  useEffect(() => { if (me.role === 'admin') load() }, [status, q])
  if (me.role !== 'admin') return <Empty icon={<Shield size={24} />} title="Admins only" body="You don't have access to the moderation console." />

  async function resolve(r: any, action: 'dismiss' | 'remove') {
    const s = sb()
    if (action === 'remove' && r.post) await s.from('posts').update({ status: 'removed' }).eq('id', r.post.id)
    await s.from('reports').update({ status: action === 'remove' ? 'actioned' : 'dismissed' }).eq('id', r.id)
    toast(action === 'remove' ? 'Content removed' : 'Report dismissed'); load()
  }
  async function setPost(id: string, st: 'published' | 'removed') { await sb().from('posts').update({ status: st }).eq('id', id); toast(st === 'removed' ? 'Removed' : 'Restored'); load() }
  async function setRole(id: string, role: 'user' | 'admin') { const { error } = await sb().from('profiles').update({ role }).eq('id', id); if (error) toast(error.message); else { toast('Role updated'); load() } }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold"><Shield size={26} />Admin</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[[Users, 'Users', stats.users], [ImageIcon, 'Pins', stats.pins], [ImageIcon, 'Reels', stats.reels], [LayoutGrid, 'Boards', stats.boards], [Flag, 'Open reports', stats.open]].map(([I, l, v]: any) => <div key={l} className="card p-4"><p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><I size={14} />{l}</p><p className="mt-1 font-display text-2xl font-extrabold">{compact(v)}</p></div>)}
      </div>
      <nav className="mt-6 flex gap-6 border-b border-line">{([['reports', 'Reports'], ['content', 'Content'], ['users', 'Users']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`tab ${tab === k ? 'tab-active' : ''}`}>{l}</button>)}</nav>
      <div className="mt-5">
        {tab === 'reports' && (<>
          <div className="mb-3 flex gap-2"><button onClick={() => setStatus('open')} className={`chip ${status === 'open' ? 'chip-active' : ''}`}>Open</button><button onClick={() => setStatus('all')} className={`chip ${status === 'all' ? 'chip-active' : ''}`}>All</button></div>
          {!reports ? <Spinner /> : !reports.length ? <Empty title="No reports" body="Reports from users land here for review." /> : <div className="space-y-2">{reports.map(r => (
            <div key={r.id} className="card flex flex-wrap items-center gap-4 p-4">
              {r.post && <Link href={`/p/${r.post.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2"><img src={r.post.media_url} alt="" className="h-full w-full object-cover" /></Link>}
              <div className="min-w-0 flex-1"><p className="font-semibold">{r.reason}</p><p className="text-sm text-muted">{r.post ? `Pin “${r.post.title || 'untitled'}”` : `User @${r.user?.username}`} · reported by @{r.reporter?.username} · {timeAgo(r.created_at)}</p>{r.details && <p className="mt-1 text-sm">{r.details}</p>}</div>
              <span className="chip text-xs capitalize">{r.status}</span>
              {r.status === 'open' && <div className="flex gap-2"><button onClick={() => resolve(r, 'dismiss')} className="btn-ghost">Dismiss</button>{r.post && <button onClick={() => resolve(r, 'remove')} className="btn-primary">Remove content</button>}</div>}
            </div>))}</div>}
        </>)}
        {tab === 'content' && (!posts ? <Spinner /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{posts.map(p => (
          <div key={p.id} className="card overflow-hidden"><Link href={`/p/${p.id}`} className="block aspect-square bg-surface2">{p.media_type === 'video' ? <video src={p.media_url} muted className="h-full w-full object-cover" /> : <img src={p.media_url} alt="" className={`h-full w-full object-cover ${p.status === 'removed' ? 'opacity-30' : ''}`} />}</Link>
            <div className="p-2"><p className="truncate text-xs font-semibold">{p.title || p.type}</p><p className="truncate text-[11px] text-muted">@{p.author?.username} · {p.status}</p>
              {p.status === 'removed' ? <button onClick={() => setPost(p.id, 'published')} className="btn-ghost mt-1 w-full py-1 text-xs">Restore</button> : <button onClick={() => setPost(p.id, 'removed')} className="btn-ghost mt-1 w-full py-1 text-xs">Remove</button>}</div></div>))}</div>)}
        {tab === 'users' && (<>
          <input className="input mb-3 max-w-sm" placeholder="Search users" value={q} onChange={e => setQ(e.target.value)} />
          {!users ? <Spinner /> : <div className="divide-y divide-line">{users.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-3"><Avatar src={u.avatar_url} name={displayName(u)} size={40} /><Link href={`/u/${u.username}`} className="min-w-0 flex-1"><p className="truncate font-semibold">{displayName(u)}</p><p className="text-xs text-muted">@{u.username} · {u.account_type} · joined {timeAgo(u.created_at)} ago</p></Link>
              <span className="chip text-xs">{u.role}</span>{u.id !== me.id && <button onClick={() => setRole(u.id, u.role === 'admin' ? 'user' : 'admin')} className="btn-ghost py-1 text-xs">{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}</div>))}</div>}
        </>)}
      </div>
    </div>
  )
}
