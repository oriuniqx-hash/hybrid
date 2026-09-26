'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Edit3, Send, Users, Image as ImageIcon, MessageCircle, Plus } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { Avatar, Empty, Modal, Spinner, toast } from '../../../components/ui'
import { displayName, timeAgo } from '../../../lib/format'
import { uploadMedia } from '../../../lib/media'
import { activityLabel, isActive, useActivity } from '../../../lib/activity'

type Conv = { key: string; kind: 'dm' | 'group'; id: string; title: string; avatar: string | null; last: string; at: string; unread: number; username?: string }

export default function MessagesPage() {
  const me = useMe()
  const params = useSearchParams()
  const router = useRouter()
  const to = params.get('to'), group = params.get('group')
  const [convs, setConvs] = useState<Conv[] | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [newGroup, setNewGroup] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  async function loadConvs() {
    const s = sb()
    const [{ data: msgs }, { data: groups }] = await Promise.all([
      s.from('messages').select('id,sender_id,receiver_id,content,created_at,read_at,post_id').is('group_id', null).or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at', { ascending: false }).limit(500),
      s.from('chat_group_members').select('group:chat_groups(id,name,created_at)').eq('user_id', me.id),
    ])
    const map = new Map<string, Conv>()
    for (const m of msgs || []) {
      const other = m.sender_id === me.id ? m.receiver_id : m.sender_id
      const c = map.get(other) || { key: 'u' + other, kind: 'dm' as const, id: other, title: '', avatar: null, last: m.post_id ? 'Sent a pin' : m.content, at: m.created_at, unread: 0 }
      if (m.receiver_id === me.id && !m.read_at) c.unread++
      map.set(other, c)
    }
    const ids = Array.from(map.keys())
    if (ids.length) {
      const { data: ps } = await s.from('profiles').select('id,username,full_name,avatar_url').in('id', ids)
      for (const p of ps || []) { const c = map.get(p.id)!; c.title = displayName(p); c.avatar = p.avatar_url; c.username = p.username }
    }
    const gl: Conv[] = []
    for (const g of (groups || []).map((r: any) => r.group).filter(Boolean)) {
      const { data: last } = await s.from('messages').select('content,created_at').eq('group_id', g.id).order('created_at', { ascending: false }).limit(1)
      gl.push({ key: 'g' + g.id, kind: 'group', id: g.id, title: g.name, avatar: null, last: last?.[0]?.content || 'Group created', at: last?.[0]?.created_at || g.created_at, unread: 0 })
    }
    setConvs([...Array.from(map.values()), ...gl].sort((a, b) => b.at.localeCompare(a.at)))
  }
  async function loadNotes() {
    const s = sb()
    const { data: f } = await s.from('follows').select('following_id').eq('follower_id', me.id).eq('status', 'accepted')
    const since = new Date(Date.now() - 86400000).toISOString()
    const { data } = await s.from('profiles').select('id,username,avatar_url,note,note_at').in('id', [me.id, ...(f || []).map((r: any) => r.following_id)]).gt('note_at', since).not('note', 'is', null)
    setNotes(data || [])
  }
  useEffect(() => {
    loadConvs(); loadNotes()
    const s = sb(); const ch = s.channel('inbox-' + me.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadConvs()).subscribe()
    return () => { s.removeChannel(ch) }
  }, [])

  const active = to ? { kind: 'dm' as const, id: to } : group ? { kind: 'group' as const, id: group } : null
  const myNote = notes.find(n => n.id === me.id)
  const seen = useActivity([...(convs || []).filter(c => c.kind === 'dm').map(c => c.id), ...notes.map(n => n.id)])

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem-4rem)] max-w-6xl lg:h-[calc(100dvh-4rem)]">
      <aside className={`w-full shrink-0 flex-col border-r border-line md:flex md:w-[340px] ${active ? 'hidden' : 'flex'}`}>
        <div className="flex items-center justify-between p-4"><h1 className="font-display text-2xl font-extrabold">Messages</h1><button onClick={() => setNewGroup(true)} className="icon-btn" aria-label="New group"><Edit3 size={20} /></button></div>
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-3">
          <button onClick={() => setNoteOpen(true)} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <span className="relative"><Avatar src={me.avatar_url} name={me.username} size={56} /><span className="absolute -top-2 left-1/2 max-w-[80px] -translate-x-1/2 truncate rounded-xl bg-surface px-2 py-1 text-[10px] shadow-card">{myNote?.note || <Plus size={10} />}</span></span>
            <span className="text-[11px] text-muted">Your note</span>
          </button>
          {notes.filter(n => n.id !== me.id).map(n => (
            <Link key={n.id} href={`/messages?to=${n.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <span className="relative"><Avatar src={n.avatar_url} name={n.username} size={56} online={isActive(seen[n.id])} /><span className="absolute -top-2 left-1/2 max-w-[80px] -translate-x-1/2 truncate rounded-xl bg-surface px-2 py-1 text-[10px] shadow-card">{n.note}</span></span>
              <span className="w-full truncate text-center text-[11px]">{n.username}</span>
            </Link>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {!convs ? <div className="grid place-items-center py-10"><Spinner /></div> : convs.length === 0 ? <Empty icon={<MessageCircle size={24} />} title="No messages yet" body="Message someone from their profile, or share a pin with them." /> :
            convs.map(c => (
              <Link key={c.key} href={c.kind === 'dm' ? `/messages?to=${c.id}` : `/messages?group=${c.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 ${active?.id === c.id ? 'bg-surface2' : ''}`}>
                {c.kind === 'group' ? <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface2"><Users size={20} /></span> : <Avatar src={c.avatar} name={c.title} size={48} online={isActive(seen[c.id])} />}
                <span className="min-w-0 flex-1"><span className={`block truncate text-sm ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.title}</span><span className={`block truncate text-xs ${c.unread ? 'text-ink' : 'text-muted'}`}>{!c.unread && c.kind === 'dm' && activityLabel(seen[c.id]) ? <span data-activity>{activityLabel(seen[c.id])}</span> : <>{c.last} · {timeAgo(c.at)}</>}</span></span>
                {c.unread > 0 && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
              </Link>
            ))}
        </div>
      </aside>
      <section className={`min-w-0 flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
        {active ? <Chat key={active.id} kind={active.kind} id={active.id} onBack={() => router.push('/messages')} onSent={loadConvs} />
          : <div className="grid flex-1 place-items-center"><Empty icon={<Send size={24} />} title="Your messages" body="Send private messages, pins and photos to a friend or group." /></div>}
      </section>
      {newGroup && <NewGroup onClose={() => setNewGroup(false)} onCreated={id => { setNewGroup(false); loadConvs(); router.push('/messages?group=' + id) }} />}
      {noteOpen && <NoteDialog current={myNote?.note || ''} onClose={() => { setNoteOpen(false); loadNotes() }} />}
    </div>
  )
}

function Chat({ kind, id, onBack, onSent }: { kind: 'dm' | 'group'; id: string; onBack: () => void; onSent: () => void }) {
  const me = useMe()
  const [peer, setPeer] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[] | null>(null)
  const [text, setText] = useState('')
  const [members, setMembers] = useState<Record<string, any>>({})
  const end = useRef<HTMLDivElement>(null)
  const seen = useActivity(kind === 'dm' ? [id] : Object.keys(members).filter(u => u !== me.id))
  const activeCount = Object.values(seen).filter(isActive).length
  const sel = 'id,sender_id,receiver_id,content,created_at,read_at,post:posts(id,media_url,thumbnail_url,title,type)'

  async function load() {
    const s = sb()
    const q = kind === 'dm'
      ? s.from('messages').select(sel).is('group_id', null).or(`and(sender_id.eq.${me.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${me.id})`)
      : s.from('messages').select(sel).eq('group_id', id)
    const { data } = await q.order('created_at').limit(500)
    setMsgs(data || [])
    if (kind === 'dm') await s.from('messages').update({ read_at: new Date().toISOString() }).eq('receiver_id', me.id).eq('sender_id', id).is('read_at', null)
  }
  useEffect(() => {
    (async () => {
      const s = sb()
      if (kind === 'dm') { const { data } = await s.from('profiles').select('id,username,full_name,avatar_url').eq('id', id).maybeSingle(); setPeer(data) }
      else {
        const { data: g } = await s.from('chat_groups').select('*').eq('id', id).maybeSingle(); setPeer(g)
        const { data: ms } = await s.from('chat_group_members').select('user:profiles(id,username,avatar_url)').eq('group_id', id)
        setMembers(Object.fromEntries((ms || []).map((m: any) => [m.user.id, m.user])))
      }
      load()
    })()
    const s = sb(); const ch = s.channel('chat-' + id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p: any) => {
      const m = p.new
      if ((kind === 'group' && m.group_id === id) || (kind === 'dm' && !m.group_id && ((m.sender_id === id && m.receiver_id === me.id) || (m.sender_id === me.id && m.receiver_id === id)))) load()
    }).subscribe()
    return () => { s.removeChannel(ch) }
  }, [id])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])

  async function send(content: string, extra: Record<string, unknown> = {}) {
    const row: any = { sender_id: me.id, content, ...extra }
    if (kind === 'dm') row.receiver_id = id; else row.group_id = id
    const { error } = await sb().from('messages').insert(row)
    if (error) return toast(error.message.includes('row-level') ? "You can't message this account." : error.message)
    setText(''); load(); onSent()
  }
  async function sendPhoto(f?: File) {
    if (!f) return
    try { const url = await uploadMedia(f, me.id); await send('📷 ' + url) } catch (e: any) { toast(e.message) }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line p-3">
        <button onClick={onBack} className="icon-btn md:hidden" aria-label="Back"><ArrowLeft size={20} /></button>
        {kind === 'dm' ? peer && <Link href={`/u/${peer.username}`} className="flex items-center gap-3"><Avatar src={peer.avatar_url} name={displayName(peer)} size={40} online={isActive(seen[id])} /><span><span className="block font-semibold">{displayName(peer)}</span><span className="text-xs text-muted" data-activity-header>{activityLabel(seen[id]) || '@' + peer.username}</span></span></Link>
          : peer && <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-surface2"><Users size={18} /></span><span><span className="block font-semibold">{peer.name}</span><span className="text-xs text-muted">{Object.keys(members).length} members{activeCount > 0 && <> · <span className="text-ok">{activeCount} active now</span></>}</span></span></div>}
      </header>
      <div className="flex-1 space-y-2 overflow-auto p-4">
        {!msgs ? <Spinner /> : msgs.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hi 👋</p>}
        {msgs?.map((m, k) => {
          const mine = m.sender_id === me.id
          const photo = m.content.startsWith('📷 https://') ? m.content.slice(3) : null
          const who = kind === 'group' && !mine && members[m.sender_id]
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {who && (k === 0 || msgs[k - 1].sender_id !== m.sender_id) && <p className="mb-0.5 ml-3 text-[11px] text-muted">{who.username}</p>}
                {m.post && <Link href={m.post.type === 'reel' ? `/reels?id=${m.post.id}` : `/p/${m.post.id}`} className="mb-1 block w-48 overflow-hidden rounded-2xl border border-line bg-surface"><img src={m.post.thumbnail_url || m.post.media_url} alt="" className="aspect-[4/5] w-full object-cover" />{m.post.title && <p className="truncate p-2 text-xs font-semibold">{m.post.title}</p>}</Link>}
                {photo ? <a href={photo} target="_blank" rel="noreferrer"><img src={photo} alt="Shared photo" className="w-56 rounded-2xl" /></a>
                  : <p className={`whitespace-pre-wrap break-words rounded-3xl px-4 py-2 text-sm ${mine ? 'bg-accent text-accent-ink' : 'bg-surface2'}`}>{m.content}</p>}
                <p className={`mt-0.5 px-2 text-[10px] text-faint ${mine ? 'text-right' : ''}`}>{timeAgo(m.created_at)}{mine && kind === 'dm' && m.read_at && ' · Seen'}</p>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if (text.trim()) send(text.trim()) }} className="flex items-center gap-2 border-t border-line p-3">
        <label className="icon-btn cursor-pointer" aria-label="Send photo"><ImageIcon size={20} /><input type="file" accept="image/*" className="sr-only" onChange={e => sendPhoto(e.target.files?.[0])} /></label>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message…" className="input rounded-full" maxLength={2000} />
        <button disabled={!text.trim()} className="btn-primary shrink-0" aria-label="Send"><Send size={16} /></button>
      </form>
    </>
  )
}

function NewGroup({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const me = useMe()
  const [name, setName] = useState(''); const [q, setQ] = useState(''); const [res, setRes] = useState<any[]>([]); const [picked, setPicked] = useState<any[]>([])
  useEffect(() => { const t = setTimeout(async () => { if (!q.trim()) return setRes([]); const { data } = await sb().from('profiles').select('id,username,full_name,avatar_url').ilike('username', `%${q.trim()}%`).neq('id', me.id).limit(8); setRes(data || []) }, 200); return () => clearTimeout(t) }, [q])
  async function create() {
    const s = sb()
    const { data: g, error } = await s.from('chat_groups').insert({ name: name.trim(), created_by: me.id }).select('id').single()
    if (error || !g) return toast(error?.message || 'Could not create')
    await s.from('chat_group_members').insert([me, ...picked].map(u => ({ group_id: g.id, user_id: u.id })))
    await s.from('messages').insert({ sender_id: me.id, group_id: g.id, content: `${me.username} created the group` })
    onCreated(g.id)
  }
  return (
    <Modal open onClose={onClose} title="New group chat">
      <label className="label" htmlFor="gn">Group name</label><input id="gn" className="input" value={name} onChange={e => setName(e.target.value)} />
      <label className="label mt-4" htmlFor="gq">Add people</label><input id="gq" className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search username" />
      <div className="mt-2 flex flex-wrap gap-1.5">{picked.map(u => <button key={u.id} onClick={() => setPicked(picked.filter(x => x.id !== u.id))} className="chip chip-active text-xs">@{u.username} ×</button>)}</div>
      <div className="mt-2 space-y-1">{res.filter(u => !picked.some(p => p.id === u.id)).map(u => <button key={u.id} onClick={() => setPicked([...picked, u])} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface2"><Avatar src={u.avatar_url} name={displayName(u)} size={36} /><span className="text-sm font-semibold">@{u.username}</span></button>)}</div>
      <button disabled={!name.trim() || !picked.length} onClick={create} className="btn-primary mt-5 w-full py-3">Create group</button>
    </Modal>
  )
}

function NoteDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const me = useMe()
  const [note, setNote] = useState(current)
  async function save(clear = false) { await sb().from('profiles').update({ note: clear ? null : note.trim(), note_at: clear ? null : new Date().toISOString() }).eq('id', me.id); onClose() }
  return (
    <Modal open onClose={onClose} title="Share a note">
      <p className="mb-3 text-sm text-muted">Notes show to your followers at the top of Messages for 24 hours.</p>
      <input className="input" maxLength={60} value={note} onChange={e => setNote(e.target.value)} placeholder="What's on your mind?" />
      <div className="mt-4 flex gap-2">{current && <button onClick={() => save(true)} className="btn-ghost flex-1">Delete note</button>}<button disabled={!note.trim()} onClick={() => save()} className="btn-primary flex-1">Share</button></div>
    </Modal>
  )
}
