'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Lock, MessageCircle, MoreHorizontal, Plus, Link as LinkIcon, Share, Clapperboard, Grid3x3, Bookmark, BadgeCheck, Ban, Flag, Play } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { POST_SELECT, type Post, type Profile } from '../../../../lib/types'
import { compact, displayName } from '../../../../lib/format'
import { Avatar, Empty, Modal, Spinner, toast } from '../../../../components/ui'
import FollowButton from '../../../../components/social/FollowButton'
import ReportDialog from '../../../../components/social/ReportDialog'
import Feed from '../../../../components/social/Feed'
import { BoardTile } from '../../../../components/social/Tiles'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const me = useMe()
  const router = useRouter()
  const [p, setP] = useState<Profile | null | undefined>(undefined)
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 })
  const [canSee, setCanSee] = useState(true)
  const [hasStory, setHasStory] = useState(false)
  const [highlights, setHighlights] = useState<any[]>([])
  const [tab, setTab] = useState<'created' | 'saved' | 'reels'>('created')
  const [list, setList] = useState<null | 'followers' | 'following'>(null)
  const [menu, setMenu] = useState(false)
  const [report, setReport] = useState(false)
  const [newBoard, setNewBoard] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    (async () => {
      const s = sb()
      const { data } = await s.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle()
      setP((data as Profile) || null); if (!data) return
      const [{ count: posts }, { count: followers }, { count: following }, { data: rel }, { data: st }, { data: hl }] = await Promise.all([
        s.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', data.id).in('type', ['pin', 'reel']),
        s.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', data.id).eq('status', 'accepted'),
        s.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', data.id).eq('status', 'accepted'),
        s.from('follows').select('status').eq('follower_id', me.id).eq('following_id', data.id).maybeSingle(),
        s.from('posts').select('id').eq('type', 'story').eq('user_id', data.id).gt('expires_at', new Date().toISOString()).limit(1),
        s.from('highlights').select('*, items:highlight_items(post_id)').eq('user_id', data.id).order('created_at'),
      ])
      setStats({ posts: posts || 0, followers: followers || 0, following: following || 0 })
      setCanSee(!data.is_private || data.id === me.id || rel?.status === 'accepted')
      setHasStory(!!st?.length); setHighlights(hl || [])
    })()
  }, [username, tick])

  const created = useCallback(async (off: number, lim: number) => {
    if (!p) return []
    const { data } = await sb().from('posts').select(POST_SELECT).eq('user_id', p.id).eq('type', 'pin').order('publish_at', { ascending: false }).range(off, off + lim - 1)
    return (data || []) as Post[]
  }, [p?.id])

  if (p === undefined) return <div className="grid h-[60vh] place-items-center"><Spinner size={28} /></div>
  if (p === null) return <Empty title="Profile not found" body={`There's no one called @${username} on Hybrid.`} action={{ href: '/explore?tab=people', label: 'Find people' }} />
  const own = p.id === me.id

  async function message() { router.push('/messages?to=' + p!.id) }
  async function block() {
    if (!confirm(`Block @${p!.username}? They won't be able to see your content or message you.`)) return
    await sb().from('follows').delete().or(`and(follower_id.eq.${me.id},following_id.eq.${p!.id}),and(follower_id.eq.${p!.id},following_id.eq.${me.id})`)
    await sb().from('blocks').insert({ blocker_id: me.id, blocked_id: p!.id }); toast('Blocked'); router.push('/home')
  }

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-8 sm:px-5">
      <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {hasStory ? <Link href={`/stories/${p.username}`} aria-label="View story"><Avatar src={p.avatar_url} name={displayName(p)} size={112} ring /></Link> : <Avatar src={p.avatar_url} name={displayName(p)} size={112} />}
        <h1 className="mt-4 flex items-center gap-1.5 font-display text-3xl font-extrabold">{displayName(p)}{p.account_type !== 'personal' && <BadgeCheck size={20} className="text-accent" aria-label={p.account_type} />}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">@{p.username}{p.is_private && <Lock size={12} />}{p.account_type !== 'personal' && <span className="capitalize">· {p.account_type}</span>}</p>
        {p.bio && <p className="mt-3 max-w-md whitespace-pre-line text-sm">{p.bio}</p>}
        {p.website && <a href={p.website.startsWith('http') ? p.website : 'https://' + p.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 flex items-center gap-1 text-sm font-semibold hover:underline"><LinkIcon size={13} />{p.website.replace(/^https?:\/\//, '')}</a>}
        <div className="mt-4 flex gap-6 text-sm">
          <span><b>{compact(stats.posts)}</b> <span className="text-muted">posts</span></span>
          <button onClick={() => canSee && setList('followers')}><b>{compact(stats.followers)}</b> <span className="text-muted">followers</span></button>
          <button onClick={() => canSee && setList('following')}><b>{compact(stats.following)}</b> <span className="text-muted">following</span></button>
        </div>
        <div className="mt-5 flex items-center gap-2">
          {own ? <>
            <Link href="/settings" className="btn-ghost px-5 py-2.5">Edit profile</Link>
            <button onClick={async () => { await navigator.clipboard.writeText(location.href); toast('Profile link copied') }} className="btn-ghost px-5 py-2.5"><Share size={15} />Share</button>
          </> : <>
            <FollowButton userId={p.id} className="px-6 py-2.5" onChange={() => setTick(tick + 1)} />
            <button onClick={message} className="btn-ghost px-5 py-2.5"><MessageCircle size={16} />Message</button>
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="icon-btn" aria-label="More"><MoreHorizontal size={20} /></button>
              {menu && <div className="absolute right-0 z-10 mt-1 w-44 rounded-2xl border border-line bg-surface p-1.5 text-left shadow-pop" onMouseLeave={() => setMenu(false)}>
                <button onClick={block} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Ban size={15} />Block</button>
                <button onClick={() => { setReport(true); setMenu(false) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Flag size={15} />Report</button>
              </div>}
            </div>
          </>}
        </div>
      </header>

      {canSee && (highlights.length > 0 || own) && (
        <div className="no-scrollbar mx-auto mt-8 flex max-w-3xl justify-center gap-5 overflow-x-auto">
          {highlights.map(h => <Link key={h.id} href={`/highlights/${h.id}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"><span className="h-16 w-16 overflow-hidden rounded-full border-2 border-line bg-surface2 p-0.5">{h.cover_url && <img src={h.cover_url} alt="" className="h-full w-full rounded-full object-cover" />}</span><span className="w-full truncate text-center text-xs">{h.title}</span></Link>)}
          {own && <Link href="/create?type=story" className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"><span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-line text-muted"><Plus size={22} /></span><span className="text-xs text-muted">New</span></Link>}
        </div>
      )}

      {!canSee ? (
        <Empty icon={<Lock size={24} />} title="This account is private" body="Follow this account to see their pins, Reels and boards." />
      ) : (
        <>
          <nav className="mt-8 flex justify-center gap-8 border-b border-line">
            {([['created', 'Created', Grid3x3], ['saved', 'Saved', Bookmark], ['reels', 'Reels', Clapperboard]] as const).map(([k, l, I]) => (
              <button key={k} onClick={() => setTab(k)} className={`tab flex items-center gap-1.5 ${tab === k ? 'tab-active' : ''}`}><I size={15} />{l}</button>
            ))}
          </nav>
          <div className="mt-6">
            {tab === 'created' && <Feed loader={created} deps={[p.id]} empty={<Empty title={own ? 'Share your first idea' : 'No pins yet'} body={own ? 'Pins you create will live here.' : undefined} action={own ? { href: '/create', label: 'Create a pin' } : undefined} />} />}
            {tab === 'saved' && <SavedBoards userId={p.id} own={own} onNew={() => setNewBoard(true)} key={tick} />}
            {tab === 'reels' && <ReelsGrid userId={p.id} own={own} />}
          </div>
        </>
      )}

      {list && <FollowList userId={p.id} kind={list} onClose={() => setList(null)} />}
      <ReportDialog userId={p.id} open={report} onClose={() => setReport(false)} />
      {newBoard && <NewBoard onClose={() => { setNewBoard(false); setTick(tick + 1) }} />}
    </div>
  )
}

function SavedBoards({ userId, own, onNew }: { userId: string; own: boolean; onNew: () => void }) {
  const [boards, setBoards] = useState<any[] | null>(null)
  useEffect(() => { sb().from('boards').select('*, pins:board_pins(count)').eq('user_id', userId).order('updated_at', { ascending: false }).then(({ data }) => setBoards(data || [])) }, [userId])
  if (!boards) return <div className="grid place-items-center py-10"><Spinner /></div>
  return (
    <div>
      {own && <div className="mb-4 flex justify-end"><button onClick={onNew} className="btn-ghost"><Plus size={16} />New board</button></div>}
      {boards.length === 0 ? <Empty title={own ? 'Organise ideas into boards' : 'No boards yet'} body={own ? 'Tap Save on any pin to add it to a board.' : undefined} />
        : <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{boards.map(b => <BoardTile key={b.id} b={b} />)}</div>}
    </div>
  )
}

function ReelsGrid({ userId, own }: { userId: string; own: boolean }) {
  const [reels, setReels] = useState<Post[] | null>(null)
  useEffect(() => { sb().from('posts').select('*').eq('user_id', userId).eq('type', 'reel').order('publish_at', { ascending: false }).then(({ data }) => setReels((data || []) as Post[])) }, [userId])
  if (!reels) return <div className="grid place-items-center py-10"><Spinner /></div>
  if (!reels.length) return <Empty icon={<Clapperboard size={24} />} title="No Reels yet" action={own ? { href: '/create?type=reel', label: 'Create a Reel' } : undefined} />
  return <div className="mx-auto grid max-w-4xl grid-cols-3 gap-1">{reels.map(r => (
    <Link key={r.id} href={`/reels?id=${r.id}`} className="relative aspect-[9/16] overflow-hidden bg-surface2">
      <video src={r.media_url} muted preload="metadata" className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold text-white drop-shadow"><Play size={12} fill="white" />{compact(r.views_count)}</span>
    </Link>))}</div>
}

function FollowList({ userId, kind, onClose }: { userId: string; kind: 'followers' | 'following'; onClose: () => void }) {
  const [people, setPeople] = useState<any[] | null>(null)
  useEffect(() => {
    const q = kind === 'followers'
      ? sb().from('follows').select('p:profiles!follows_follower_id_fkey(id,username,full_name,avatar_url)').eq('following_id', userId).eq('status', 'accepted')
      : sb().from('follows').select('p:profiles!follows_following_id_fkey(id,username,full_name,avatar_url)').eq('follower_id', userId).eq('status', 'accepted')
    q.then(({ data }) => setPeople((data || []).map((r: any) => r.p).filter(Boolean)))
  }, [userId, kind])
  return (
    <Modal open onClose={onClose} title={kind === 'followers' ? 'Followers' : 'Following'}>
      {!people ? <div className="grid place-items-center py-8"><Spinner /></div> : !people.length ? <p className="py-6 text-center text-sm text-muted">No one yet.</p> :
        <div className="space-y-1">{people.map(u => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface2">
            <Link href={`/u/${u.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3"><Avatar src={u.avatar_url} name={displayName(u)} size={40} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayName(u)}</span><span className="text-xs text-muted">@{u.username}</span></span></Link>
            <FollowButton userId={u.id} />
          </div>))}</div>}
    </Modal>
  )
}

function NewBoard({ onClose }: { onClose: () => void }) {
  const me = useMe()
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [secret, setSecret] = useState(false)
  async function create() {
    const { data, error } = await sb().from('boards').insert({ user_id: me.id, name: name.trim(), description: desc.trim() || null, is_private: secret }).select('id').single()
    if (error) return toast(error.message)
    toast('Board created'); onClose(); location.href = '/boards/' + data!.id
  }
  return (
    <Modal open onClose={onClose} title="Create board">
      <label className="label" htmlFor="bn">Name</label><input id="bn" className="input" value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "Places to go"' />
      <label className="label mt-4" htmlFor="bd">Description</label><textarea id="bd" className="input min-h-20" value={desc} onChange={e => setDesc(e.target.value)} />
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} className="accent-[rgb(var(--accent))]" />Keep this board secret</label>
      <button disabled={!name.trim()} onClick={create} className="btn-primary mt-5 w-full py-3">Create</button>
    </Modal>
  )
}
