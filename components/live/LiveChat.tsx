'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { Avatar, toast } from '../ui'

type Msg = { id: string; body: string; user_id: string; created_at: string; user?: { username: string; avatar_url: string | null } }

export default function LiveChat({ streamId, hostId, ended = false }: { streamId: string; hostId: string; ended?: boolean }) {
  const me = useMe()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const people = useRef(new Map<string, any>())

  async function withUser(m: Msg): Promise<Msg> {
    if (!people.current.has(m.user_id)) {
      const { data } = await sb().from('profiles').select('username,avatar_url').eq('id', m.user_id).maybeSingle()
      people.current.set(m.user_id, data)
    }
    return { ...m, user: people.current.get(m.user_id) }
  }
  useEffect(() => {
    const s = sb()
    s.from('live_messages').select('*, user:profiles(username,avatar_url)').eq('stream_id', streamId).order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => { (data || []).forEach((m: any) => people.current.set(m.user_id, m.user)); setMsgs((data || []).reverse()) })
    const ch = s.channel('live-chat-' + streamId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `stream_id=eq.${streamId}` }, async (p: any) => { const m = await withUser(p.new); setMsgs(ms => ms.some(x => x.id === m.id) ? ms : [...ms.slice(-150), m]) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'live_messages' }, (p: any) => setMsgs(ms => ms.filter(x => x.id !== p.old.id)))
      .subscribe()
    return () => { s.removeChannel(ch) }
  }, [streamId])
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }) }, [msgs.length])

  async function send(e: React.FormEvent) {
    e.preventDefault(); const body = text.trim(); if (!body) return
    setText('')
    const { error } = await sb().from('live_messages').insert({ stream_id: streamId, user_id: me.id, body })
    if (error) toast('Could not send comment')
  }
  async function del(id: string) { await sb().from('live_messages').delete().eq('id', id); setMsgs(ms => ms.filter(x => x.id !== id)) }

  return (
    <div className="flex h-full flex-col">
      <div ref={box} className="no-scrollbar flex-1 space-y-2 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_18%)]">
        {msgs.map(m => (
          <div key={m.id} className="group flex items-start gap-2 text-sm text-white">
            <Avatar src={m.user?.avatar_url} name={m.user?.username || '?'} size={26} />
            <p className="min-w-0 flex-1 [text-shadow:0_1px_2px_rgba(0,0,0,.6)]"><span className="mr-1.5 font-bold">{m.user?.username}{m.user_id === hostId && <span className="ml-1 rounded bg-accent px-1 text-[10px]">HOST</span>}</span>{m.body}</p>
            {(me.id === hostId || m.user_id === me.id) && <button onClick={() => del(m.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Remove comment"><X size={14} /></button>}
          </div>
        ))}
      </div>
      {!ended && <form onSubmit={send} className="mt-2 flex items-center gap-2">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={300} placeholder="Add a comment…" className="h-11 flex-1 rounded-full border border-white/30 bg-black/30 px-4 text-sm text-white placeholder:text-white/60 focus:border-white/70 focus:outline-none" />
        <button disabled={!text.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white disabled:opacity-40" aria-label="Send comment"><Send size={17} /></button>
      </form>}
    </div>
  )
}
