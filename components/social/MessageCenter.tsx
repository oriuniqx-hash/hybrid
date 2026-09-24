'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase/client'

type Profile = { id: string; username: string | null; avatar_url: string | null }
type Message = { id: string; sender_id: string; receiver_id: string; content: string; created_at: string | null }

export default function MessageCenter() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [me, setMe] = useState<string | null>(null)
  const [people, setPeople] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function init() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      if (!active) return
      setMe(auth.user.id)
      const { data } = await supabase.from('profiles').select('id,username,avatar_url').neq('id', auth.user.id).order('username').limit(100)
      setPeople((data as Profile[] | null) ?? [])
      setLoading(false)
    }
    void init()
    return () => { active = false }
  }, [supabase])

  async function loadConversation(otherId: string) {
    if (!me) return
    const { data } = await supabase.from('messages').select('id,sender_id,receiver_id,content,created_at').or('and(sender_id.eq.' + me + ',receiver_id.eq.' + otherId + '),and(sender_id.eq.' + otherId + ',receiver_id.eq.' + me + ')').order('created_at', { ascending: true })
    setMessages((data as Message[] | null) ?? [])
  }

  useEffect(() => {
    if (!me || !selected) return
    void loadConversation(selected.id)
    const channel = supabase
      .channel('dm-' + me + '-' + selected.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as Message
        if ((m.sender_id === me && m.receiver_id === selected.id) || (m.sender_id === selected.id && m.receiver_id === me)) {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [me, selected, supabase])

  async function sendMessage() {
    if (!me || !selected || !text.trim()) return
    const content = text.trim()
    setText('')
    const { error } = await supabase.from('messages').insert({ sender_id: me, receiver_id: selected.id, content })
    if (error) setText(content)
  }

  if (loading) return <p className="text-white/50">Loading messages…</p>

  return (
    <div className="grid min-h-[600px] overflow-hidden rounded-3xl border border-bg-border bg-bg-card md:grid-cols-[280px_1fr]">
      <aside className="border-b border-bg-border p-4 md:border-b-0 md:border-r">
        <h2 className="mb-4 font-bold">People</h2>
        <div className="space-y-2">{people.map(p => <button key={p.id} onClick={() => setSelected(p)} className={'flex w-full items-center gap-3 rounded-2xl p-3 text-left ' + (selected?.id === p.id ? 'bg-white/10' : 'hover:bg-white/5')}><div className="h-9 w-9 shrink-0 rounded-full bg-white/10">{p.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />}</div><span className="truncate">@{p.username || 'user'}</span></button>)}</div>
      </aside>
      <section className="flex min-h-[600px] flex-col">
        {!selected ? <div className="grid flex-1 place-items-center text-white/40">Select someone to start a conversation.</div> : <>
          <header className="border-b border-bg-border p-4 font-bold">@{selected.username || 'user'}</header>
          <div className="flex-1 space-y-3 overflow-auto p-4">{messages.map(m => <div key={m.id} className={'flex ' + (m.sender_id === me ? 'justify-end' : 'justify-start')}><div className={'max-w-[75%] rounded-2xl px-4 py-3 text-sm ' + (m.sender_id === me ? 'bg-gradient-primary text-white' : 'bg-white/5 text-white/80')}>{m.content}</div></div>)}</div>
          <div className="flex gap-2 border-t border-bg-border p-4"><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void sendMessage() }} placeholder="Message…" className="min-w-0 flex-1 rounded-full bg-white/5 px-4 py-3 outline-none" /><button onClick={sendMessage} disabled={!text.trim()} className="rounded-full bg-gradient-primary px-5 py-3 font-bold">Send</button></div>
        </>}
      </section>
    </div>
  )
}