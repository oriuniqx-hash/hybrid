'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { Avatar, toast } from '../ui'
import { displayName, timeAgo } from '../../lib/format'
import RichText from './RichText'

type C = { id: string; content: string; created_at: string; user_id: string; parent_id: string | null; author: any }

export default function Comments({ postId, ownerId, allow, onCount }: { postId: string; ownerId: string; allow: boolean; onCount?: (n: number) => void }) {
  const me = useMe()
  const [list, setList] = useState<C[]>([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<C | null>(null)

  async function load() {
    const { data } = await sb().from('comments').select('*, author:profiles!comments_user_id_fkey(id,username,full_name,avatar_url)').eq('post_id', postId).order('created_at')
    setList((data || []) as C[]); onCount?.((data || []).length)
  }
  useEffect(() => {
    load()
    const s = sb(); const ch = s.channel('c-' + postId).on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, load).subscribe()
    return () => { s.removeChannel(ch) }
  }, [postId])

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim()) return
    const { error } = await sb().from('comments').insert({ post_id: postId, user_id: me.id, content: text.trim(), parent_id: replyTo?.id || null })
    if (error) return toast(error.message)
    setText(''); setReplyTo(null); load()
  }
  async function del(id: string) { await sb().from('comments').delete().eq('id', id); load() }

  const roots = list.filter(c => !c.parent_id)
  const kids = (id: string) => list.filter(c => c.parent_id === id)
  const Row = ({ c, child = false }: { c: C; child?: boolean }) => (
    <div className={`flex gap-2.5 ${child ? 'ml-10 mt-3' : 'mt-4'}`}>
      <Link href={`/u/${c.author?.username}`}><Avatar src={c.author?.avatar_url} name={displayName(c.author)} size={child ? 26 : 32} /></Link>
      <div className="min-w-0 flex-1 text-sm">
        <p><Link href={`/u/${c.author?.username}`} className="mr-1.5 font-semibold">{c.author?.username}</Link><RichText text={c.content} /></p>
        <div className="mt-1 flex gap-3 text-xs text-muted">
          <span>{timeAgo(c.created_at)}</span>
          {allow && <button onClick={() => { setReplyTo(c.parent_id ? list.find(x => x.id === c.parent_id)! : c); setText('@' + c.author?.username + ' ') }} className="font-semibold hover:text-ink">Reply</button>}
          {(c.user_id === me.id || ownerId === me.id) && <button onClick={() => del(c.id)} className="hover:text-accent" aria-label="Delete comment"><Trash2 size={12} /></button>}
        </div>
      </div>
    </div>
  )
  return (
    <div>
      <h3 className="font-bold">{list.length ? `${list.length} comment${list.length > 1 ? 's' : ''}` : 'Comments'}</h3>
      {list.length === 0 && <p className="mt-2 text-sm text-muted">{allow ? 'No comments yet. Start the conversation.' : 'Comments are turned off.'}</p>}
      {roots.map(c => <div key={c.id}><Row c={c} />{kids(c.id).map(k => <Row key={k.id} c={k} child />)}</div>)}
      {allow && (
        <form onSubmit={send} className="mt-5">
          {replyTo && <p className="mb-1.5 text-xs text-muted">Replying to @{replyTo.author?.username} · <button type="button" onClick={() => { setReplyTo(null); setText('') }} className="underline">cancel</button></p>}
          <div className="flex items-center gap-2">
            <Avatar src={me.avatar_url} name={me.username} size={32} />
            <input className="input rounded-full" placeholder="Add a comment" value={text} onChange={e => setText(e.target.value)} maxLength={1000} />
            <button disabled={!text.trim()} className="btn-primary shrink-0">Post</button>
          </div>
        </form>
      )}
    </div>
  )
}
