'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Lock, MoreHorizontal, Plus, Share, UserPlus, Pencil, Trash2, Sparkles, X, FolderInput } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { POST_SELECT, type Post } from '../../../../lib/types'
import { displayName } from '../../../../lib/format'
import { Avatar, Empty, Modal, Spinner, toast } from '../../../../components/ui'
import Feed from '../../../../components/social/Feed'
import PinCard from '../../../../components/social/PinCard'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const me = useMe()
  const router = useRouter()
  const [board, setBoard] = useState<any | null | undefined>(undefined)
  const [sections, setSections] = useState<any[]>([])
  const [collabs, setCollabs] = useState<any[]>([])
  const [pins, setPins] = useState<{ post: Post; section_id: string | null }[] | null>(null)
  const [section, setSection] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [invite, setInvite] = useState(false)
  const [menu, setMenu] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    (async () => {
      const s = sb()
      const { data } = await s.from('boards').select('*, owner:profiles!boards_user_id_fkey(id,username,full_name,avatar_url)').eq('id', id).maybeSingle()
      setBoard(data || null); if (!data) return
      const [{ data: sec }, { data: col }, { data: bp }] = await Promise.all([
        s.from('board_sections').select('*').eq('board_id', id).order('position'),
        s.from('board_collaborators').select('user:profiles(id,username,full_name,avatar_url)').eq('board_id', id),
        s.from('board_pins').select('section_id, created_at, post:posts(' + POST_SELECT + ')').eq('board_id', id).order('created_at', { ascending: false }),
      ])
      setSections(sec || []); setCollabs((col || []).map((c: any) => c.user).filter(Boolean))
      setPins((bp || []).filter((r: any) => r.post).map((r: any) => ({ post: r.post, section_id: r.section_id })))
    })()
  }, [id, tick])

  const editor = board && (board.user_id === me.id || collabs.some(c => c.id === me.id))
  const tags = Array.from(new Set((pins || []).flatMap(p => p.post.tags || []))).slice(0, 12)
  const ideas = useCallback(async (off: number, lim: number) => {
    if (!tags.length) return []
    const have = (pins || []).map(p => p.post.id)
    const { data } = await sb().from('posts').select(POST_SELECT).eq('type', 'pin').overlaps('tags', tags).order('saves_count', { ascending: false }).range(off, off + lim + have.length - 1)
    return ((data || []) as Post[]).filter(p => !have.includes(p.id)).slice(0, lim)
  }, [tags.join(','), pins?.length])

  if (board === undefined) return <div className="grid h-[60vh] place-items-center"><Spinner size={28} /></div>
  if (board === null) return <Empty title="Board not found" body="It may be secret or deleted." action={{ href: '/home', label: 'Back home' }} />

  async function addSection() {
    const name = prompt('Section name'); if (!name?.trim()) return
    await sb().from('board_sections').insert({ board_id: id, name: name.trim(), position: sections.length }); setTick(tick + 1)
  }
  async function delSection(sid: string) { if (!confirm('Delete this section? Pins stay on the board.')) return; await sb().from('board_sections').delete().eq('id', sid); setSection(null); setTick(tick + 1) }
  async function removePin(pid: string) { await sb().from('board_pins').delete().eq('board_id', id).eq('post_id', pid); setTick(tick + 1) }
  async function movePin(pid: string, sid: string | null) { await sb().from('board_pins').update({ section_id: sid }).eq('board_id', id).eq('post_id', pid); setTick(tick + 1); toast('Moved') }
  async function del() { if (!confirm('Delete this board? Pins stay on Hybrid.')) return; await sb().from('boards').delete().eq('id', id); router.push('/u/' + me.username) }

  const shown = (pins || []).filter(p => !section || p.section_id === section)
  return (
    <div className="mx-auto max-w-[1600px] px-3 py-8 sm:px-5">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="flex items-center justify-center gap-2 font-display text-4xl font-extrabold">{board.name}{board.is_private && <Lock size={20} className="text-muted" />}</h1>
        {board.description && <p className="mt-2 text-sm text-muted">{board.description}</p>}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="flex -space-x-2">
            <Link href={`/u/${board.owner?.username}`} className="rounded-full ring-2 ring-bg"><Avatar src={board.owner?.avatar_url} name={displayName(board.owner)} size={34} /></Link>
            {collabs.map(c => <Link key={c.id} href={`/u/${c.username}`} className="rounded-full ring-2 ring-bg"><Avatar src={c.avatar_url} name={displayName(c)} size={34} /></Link>)}
          </div>
          {board.user_id === me.id && <button onClick={() => setInvite(true)} className="icon-btn bg-surface2" aria-label="Invite collaborators"><UserPlus size={17} /></button>}
        </div>
        <p className="mt-3 text-sm text-muted">{pins?.length ?? 0} pins · {sections.length} sections</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={async () => { await navigator.clipboard.writeText(location.href); toast('Board link copied') }} className="btn-ghost"><Share size={15} />Share</button>
          {editor && <button onClick={addSection} className="btn-ghost"><Plus size={15} />Section</button>}
          {board.user_id === me.id && <div className="relative">
            <button onClick={() => setMenu(!menu)} className="icon-btn" aria-label="Board options"><MoreHorizontal size={20} /></button>
            {menu && <div className="absolute right-0 z-10 mt-1 w-44 rounded-2xl border border-line bg-surface p-1.5 text-left shadow-pop" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => { setEdit(true); setMenu(false) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Pencil size={15} />Edit board</button>
              <button onClick={del} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-accent hover:bg-surface2"><Trash2 size={15} />Delete</button>
            </div>}
          </div>}
        </div>
      </header>

      {sections.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button onClick={() => setSection(null)} className={`chip ${!section ? 'chip-active' : ''}`}>All pins</button>
          {sections.map(s => <span key={s.id} className={`chip ${section === s.id ? 'chip-active' : ''}`}><button onClick={() => setSection(s.id)}>{s.name} <span className="opacity-60">{(pins || []).filter(p => p.section_id === s.id).length}</span></button>{editor && section === s.id && <button onClick={() => delSection(s.id)} aria-label="Delete section"><X size={13} /></button>}</span>)}
        </div>
      )}

      <div className="mt-8">
        {!pins ? <Spinner /> : shown.length === 0 ? <Empty title="No pins here yet" body="Save pins from your feed or search to fill this board." action={{ href: '/explore', label: 'Find ideas' }} /> : (
          <div className="masonry">{shown.map(({ post, section_id }) => (
            <div key={post.id} className="relative">
              <PinCard post={post} />
              {editor && (
                <div className="mt-1 flex gap-1 px-1">
                  {sections.length > 0 && <select aria-label="Move to section" value={section_id || ''} onChange={e => movePin(post.id, e.target.value || null)} className="min-w-0 flex-1 rounded-full border border-line bg-surface px-2 py-1 text-xs"><option value="">No section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                  <button onClick={() => removePin(post.id)} className="rounded-full px-2 py-1 text-xs text-muted hover:bg-surface2 hover:text-accent">Remove</button>
                </div>
              )}
            </div>
          ))}</div>
        )}
      </div>

      {tags.length > 0 && <>
        <h2 className="mb-4 mt-14 flex items-center justify-center gap-2 font-display text-xl font-extrabold"><Sparkles size={18} className="text-accent" />More ideas for this board</h2>
        <Feed loader={ideas} deps={[tags.join(',')]} empty={<p className="py-6 text-center text-sm text-muted">We'll suggest ideas here as more related pins are published.</p>} />
      </>}

      {edit && <EditBoard board={board} onClose={() => { setEdit(false); setTick(tick + 1) }} />}
      {invite && <Invite boardId={id} onClose={() => { setInvite(false); setTick(tick + 1) }} existing={collabs} />}
    </div>
  )
}

function EditBoard({ board, onClose }: { board: any; onClose: () => void }) {
  const [name, setName] = useState(board.name); const [desc, setDesc] = useState(board.description || ''); const [secret, setSecret] = useState(board.is_private)
  async function save() { const { error } = await sb().from('boards').update({ name: name.trim(), description: desc.trim() || null, is_private: secret, updated_at: new Date().toISOString() }).eq('id', board.id); if (error) toast(error.message); else onClose() }
  return (
    <Modal open onClose={onClose} title="Edit board">
      <label className="label" htmlFor="en">Name</label><input id="en" className="input" value={name} onChange={e => setName(e.target.value)} />
      <label className="label mt-4" htmlFor="ed">Description</label><textarea id="ed" className="input min-h-20" value={desc} onChange={e => setDesc(e.target.value)} />
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} className="accent-[rgb(var(--accent))]" />Keep this board secret</label>
      <button onClick={save} disabled={!name.trim()} className="btn-primary mt-5 w-full py-3">Save</button>
    </Modal>
  )
}

function Invite({ boardId, onClose, existing }: { boardId: string; onClose: () => void; existing: any[] }) {
  const me = useMe()
  const [q, setQ] = useState(''); const [res, setRes] = useState<any[]>([])
  useEffect(() => { const t = setTimeout(async () => { if (!q.trim()) return setRes([]); const { data } = await sb().from('profiles').select('id,username,full_name,avatar_url').ilike('username', `%${q.trim()}%`).neq('id', me.id).limit(8); setRes(data || []) }, 200); return () => clearTimeout(t) }, [q])
  async function add(u: any) { const { error } = await sb().from('board_collaborators').insert({ board_id: boardId, user_id: u.id }); if (error) toast(error.message); else toast('@' + u.username + ' can now add pins') }
  async function removeC(u: any) { await sb().from('board_collaborators').delete().eq('board_id', boardId).eq('user_id', u.id); onClose() }
  return (
    <Modal open onClose={onClose} title="Collaborators">
      {existing.map(u => <div key={u.id} className="flex items-center gap-3 p-2"><Avatar src={u.avatar_url} name={displayName(u)} size={36} /><span className="flex-1 text-sm font-semibold">@{u.username}</span><button onClick={() => removeC(u)} className="text-xs text-muted hover:text-accent">Remove</button></div>)}
      <input className="input mt-3" placeholder="Search by username" value={q} onChange={e => setQ(e.target.value)} />
      <div className="mt-2 space-y-1">{res.map(u => <div key={u.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface2"><Avatar src={u.avatar_url} name={displayName(u)} size={36} /><span className="flex-1 text-sm font-semibold">@{u.username}</span><button onClick={() => add(u)} className="btn-primary py-1.5 text-xs"><FolderInput size={13} />Invite</button></div>)}</div>
    </Modal>
  )
}
