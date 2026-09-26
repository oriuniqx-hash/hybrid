'use client'
import { useEffect, useState } from 'react'
import { Link2, Send, Share2 } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { Avatar, Modal, toast } from '../ui'
import type { Author, Post } from '../../lib/types'
import { displayName } from '../../lib/format'

export default function ShareDialog({ post, open, onClose }: { post: Post; open: boolean; onClose: () => void }) {
  const me = useMe()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Author[]>([])
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const url = typeof window !== 'undefined' ? `${window.location.origin}/p/${post.id}` : ''

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const s = sb()
      if (q.trim()) {
        const { data } = await s.from('profiles').select('id,username,full_name,avatar_url').or(`username.ilike.%${q.trim()}%,full_name.ilike.%${q.trim()}%`).neq('id', me.id).limit(8)
        setPeople(data || [])
      } else {
        const { data } = await s.from('follows').select('p:profiles!follows_following_id_fkey(id,username,full_name,avatar_url)').eq('follower_id', me.id).limit(12)
        setPeople((data || []).map((r: any) => r.p).filter(Boolean))
      }
    }, 200)
    return () => clearTimeout(t)
  }, [q, open])

  async function send(p: Author) {
    const { error } = await sb().from('messages').insert({ sender_id: me.id, receiver_id: p.id, post_id: post.id, content: note.trim() || 'Shared a pin' })
    if (error) return toast(error.message)
    await sb().rpc('record_share', { p: post.id })
    setSent(new Set([...sent, p.id])); toast('Sent to ' + displayName(p))
  }
  async function copy() { await navigator.clipboard.writeText(url); await sb().rpc('record_share', { p: post.id }); toast('Link copied') }
  async function native() { try { await navigator.share({ title: post.title || 'Hybrid', url }); await sb().rpc('record_share', { p: post.id }) } catch {} }

  return (
    <Modal open={open} onClose={onClose} title="Share">
      <div className="mb-5 flex gap-3">
        <button onClick={copy} className="btn-ghost flex-1"><Link2 size={16} />Copy link</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button onClick={native} className="btn-ghost flex-1"><Share2 size={16} />More</button>}
      </div>
      <label className="label" htmlFor="shq">Send in Hybrid</label>
      <input id="shq" className="input" placeholder="Search people" value={q} onChange={e => setQ(e.target.value)} />
      <input className="input mt-2" placeholder="Add a message (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <div className="mt-3 max-h-72 space-y-1 overflow-auto">
        {people.length === 0 && <p className="py-6 text-center text-sm text-muted">{q ? 'No people found.' : 'Follow people to share with them quickly, or search above.'}</p>}
        {people.map(p => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface2">
            <Avatar src={p.avatar_url} name={displayName(p)} size={40} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{displayName(p)}</p><p className="truncate text-xs text-muted">@{p.username}</p></div>
            <button onClick={() => send(p)} disabled={sent.has(p.id)} className={sent.has(p.id) ? 'btn-ghost' : 'btn-primary'}>{sent.has(p.id) ? 'Sent' : <><Send size={14} />Send</>}</button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
