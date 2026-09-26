'use client'
import { useEffect, useState } from 'react'
import { Lock, Plus, Check } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { Modal, Spinner, toast } from '../ui'
import type { Board, Post } from '../../lib/types'

type B = Board & { sections: { id: string; name: string }[]; saved: boolean }

export default function SaveDialog({ post, open, onClose, onSaved }: { post: Post; open: boolean; onClose: () => void; onSaved?: (saved: boolean) => void }) {
  const me = useMe()
  const [boards, setBoards] = useState<B[] | null>(null)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const s = sb()
    const [{ data: own }, { data: collab }, { data: saved }] = await Promise.all([
      s.from('boards').select('*, sections:board_sections(id,name)').eq('user_id', me.id).order('updated_at', { ascending: false }),
      s.from('board_collaborators').select('board:boards(*, sections:board_sections(id,name))').eq('user_id', me.id),
      s.from('board_pins').select('board_id').eq('post_id', post.id),
    ])
    const savedSet = new Set((saved || []).map((r: any) => r.board_id))
    const all = [...(own || []), ...((collab || []).map((c: any) => c.board).filter(Boolean))]
    setBoards(all.map((b: any) => ({ ...b, saved: savedSet.has(b.id) })))
  }
  useEffect(() => { if (open) load() }, [open])

  async function toggle(b: B, sectionId: string | null = null) {
    setBusy(true)
    const s = sb()
    if (b.saved) {
      await s.from('board_pins').delete().eq('board_id', b.id).eq('post_id', post.id)
      toast('Removed from ' + b.name)
    } else {
      const { error } = await s.from('board_pins').insert({ board_id: b.id, post_id: post.id, section_id: sectionId, user_id: me.id })
      if (error) { toast(error.message); setBusy(false); return }
      await s.from('boards').update({ updated_at: new Date().toISOString(), cover_url: b.cover_url || post.thumbnail_url || post.media_url }).eq('id', b.id)
      toast('Saved to ' + b.name)
    }
    await load(); setBusy(false)
    onSaved?.(!b.saved)
  }

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    const s = sb()
    const { data, error } = await s.from('boards').insert({ user_id: me.id, name: name.trim(), is_private: secret, cover_url: post.thumbnail_url || post.media_url }).select('*').single()
    if (error || !data) { toast(error?.message || 'Could not create board'); setBusy(false); return }
    await s.from('board_pins').insert({ board_id: data.id, post_id: post.id, user_id: me.id })
    toast('Saved to ' + data.name)
    setName(''); setSecret(false); await load(); setBusy(false); onSaved?.(true)
  }

  return (
    <Modal open={open} onClose={onClose} title="Save to board">
      {!boards ? <div className="grid place-items-center py-10"><Spinner /></div> : (
        <div className="space-y-1">
          {boards.length === 0 && <p className="pb-2 text-sm text-muted">You don't have any boards yet. Create your first one below.</p>}
          {boards.map(b => (
            <div key={b.id}>
              <button disabled={busy} onClick={() => toggle(b)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface2">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface2">{b.cover_url && <img src={b.cover_url} alt="" className="h-full w-full object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate font-semibold">{b.name}{b.is_private && <Lock size={13} className="text-muted" />}</span>
                  {b.sections?.length > 0 && <span className="text-xs text-muted">{b.sections.length} sections</span>}
                </span>
                <span className={`btn ${b.saved ? 'bg-ink text-bg' : 'bg-accent text-accent-ink'}`}>{b.saved ? <><Check size={15} />Saved</> : 'Save'}</span>
              </button>
              {!b.saved && b.sections?.length > 0 && (
                <div className="mb-1 ml-16 flex flex-wrap gap-1.5">
                  {b.sections.map(sec => <button key={sec.id} disabled={busy} onClick={() => toggle(b, sec.id)} className="chip text-xs">→ {sec.name}</button>)}
                </div>
              )}
            </div>
          ))}
          <div className="mt-4 border-t border-line pt-4">
            <label className="label" htmlFor="nb">Create board</label>
            <div className="flex gap-2">
              <input id="nb" className="input" value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "Bedroom ideas"' onKeyDown={e => e.key === 'Enter' && create()} />
              <button disabled={busy || !name.trim()} onClick={create} className="btn-primary shrink-0"><Plus size={16} />Create</button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} className="accent-[rgb(var(--accent))]" />Keep this board secret</label>
          </div>
        </div>
      )}
    </Modal>
  )
}
