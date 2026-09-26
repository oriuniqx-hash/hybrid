'use client'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { X, Send, Trash2, Eye, Star, Pause, Play } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { Avatar, toast } from '../../../../components/ui'
import { POST_SELECT, type Post } from '../../../../lib/types'
import { timeAgo } from '../../../../lib/format'

export default function StoryViewer() {
  const { username } = useParams<{ username: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const me = useMe()
  const [stories, setStories] = useState<Post[] | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reply, setReply] = useState('')
  const [views, setViews] = useState<number | null>(null)
  const [dur, setDur] = useState(5)
  const vid = useRef<HTMLVideoElement>(null)
  const queue = (params.get('queue') || '').split(',').filter(Boolean)

  useEffect(() => {
    (async () => {
      const s = sb()
      const { data: u } = await s.from('profiles').select('id').eq('username', username).maybeSingle()
      if (!u) return setStories([])
      const { data } = await s.from('posts').select(POST_SELECT).eq('type', 'story').eq('user_id', u.id).gt('expires_at', new Date().toISOString()).order('created_at')
      setStories((data || []) as Post[]); setI(0)
    })()
  }, [username])

  const cur = stories?.[i]
  useEffect(() => {
    if (!cur) return
    sb().rpc('record_view', { p: cur.id })
    if (cur.user_id === me.id) sb().from('post_views').select('id', { count: 'exact', head: true }).eq('post_id', cur.id).then(({ count }) => setViews(count || 0))
    setDur(cur.media_type === 'video' ? 15 : 5)
  }, [cur?.id])

  function next() {
    if (!stories) return
    if (i < stories.length - 1) setI(i + 1)
    else if (queue.length) router.replace(`/stories/${queue[0]}?queue=${queue.slice(1).join(',')}`)
    else router.push('/home')
  }
  function prev() { if (i > 0) setI(i - 1) }

  useEffect(() => {
    if (!cur || paused) return
    if (cur.media_type === 'video') return
    const t = setTimeout(next, dur * 1000)
    return () => clearTimeout(t)
  }, [cur?.id, paused, dur])
  useEffect(() => { const v = vid.current; if (!v) return; paused ? v.pause() : v.play().catch(() => {}) }, [paused, cur?.id])

  async function sendReply() {
    if (!cur || !reply.trim()) return
    const { error } = await sb().from('messages').insert({ sender_id: me.id, receiver_id: cur.user_id, post_id: cur.id, content: 'Replied to your story: ' + reply.trim() })
    if (error) return toast(error.message)
    setReply(''); toast('Reply sent')
  }
  async function remove() {
    if (!cur || !confirm('Delete this story?')) return
    await sb().from('posts').delete().eq('id', cur.id)
    const rest = stories!.filter(s => s.id !== cur.id); setStories(rest)
    if (!rest.length) router.push('/home'); else setI(Math.min(i, rest.length - 1))
  }
  async function highlight() {
    if (!cur) return
    const title = prompt('Add to highlight — name it (existing name adds to that highlight):')
    if (!title?.trim()) return
    const s = sb()
    let { data: h } = await s.from('highlights').select('id').eq('user_id', me.id).eq('title', title.trim()).maybeSingle()
    if (!h) { const r = await s.from('highlights').insert({ user_id: me.id, title: title.trim(), cover_url: cur.thumbnail_url || cur.media_url }).select('id').single(); h = r.data }
    if (h) { await s.from('highlight_items').upsert({ highlight_id: h.id, post_id: cur.id }); toast('Added to ' + title.trim()) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
      <Link href="/home" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close"><X size={24} /></Link>
      {stories && stories.length === 0 && <div className="text-center"><p className="text-lg font-semibold">No active stories</p><Link href="/home" className="mt-4 inline-block text-sm underline">Back home</Link></div>}
      {cur && (
        <div className="relative h-full max-h-[92vh] w-full max-w-[420px] overflow-hidden bg-neutral-900 sm:rounded-2xl">
          <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
            {stories!.map((s, k) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded bg-white/30">
                <span className="block h-full bg-white" style={k < i ? { width: '100%' } : k === i ? { animation: `story ${dur}s linear forwards`, animationPlayState: paused ? 'paused' : 'running' } : { width: 0 }} key={cur.id + k} />
              </span>
            ))}
          </div>
          <div className="absolute inset-x-3 top-6 z-10 flex items-center gap-2">
            <Link href={`/u/${cur.author?.username}`} className="flex items-center gap-2"><Avatar src={cur.author?.avatar_url} name={cur.author?.username} size={32} /><span className="text-sm font-semibold">{cur.author?.username}</span></Link>
            <span className="text-xs text-white/60">{timeAgo(cur.created_at)}</span>
            {cur.audience === 'close_friends' && <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold">Close friends</span>}
            <button onClick={() => setPaused(!paused)} className="ml-auto grid h-8 w-8 place-items-center" aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
          </div>
          {cur.media_type === 'video'
            ? <video ref={vid} key={cur.id} src={cur.media_url} autoPlay playsInline className="h-full w-full object-contain" onEnded={next} onLoadedMetadata={e => setDur(Math.max(1, e.currentTarget.duration))} />
            : <img key={cur.id} src={cur.media_url} alt={cur.alt_text || ''} className="h-full w-full object-contain" />}
          {cur.description && <p className="absolute inset-x-6 bottom-24 text-center text-lg font-semibold drop-shadow">{cur.description}</p>}
          <button className="absolute inset-y-16 left-0 w-1/3" onClick={prev} aria-label="Previous" />
          <button className="absolute inset-y-16 right-0 w-2/3" onClick={next} aria-label="Next" />
          <div className="absolute inset-x-3 bottom-4 z-10">
            {cur.user_id === me.id ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm"><Eye size={16} />{views ?? '…'} views</span>
                <button onClick={highlight} className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm"><Star size={15} />Highlight</button>
                <button onClick={remove} className="grid h-9 w-9 place-items-center rounded-full bg-white/15" aria-label="Delete story"><Trash2 size={16} /></button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); sendReply() }} className="flex gap-2">
                <input value={reply} onChange={e => setReply(e.target.value)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} placeholder={`Reply to ${cur.author?.username}…`} className="h-11 flex-1 rounded-full border border-white/40 bg-transparent px-4 text-sm outline-none placeholder:text-white/60" />
                <button className="grid h-11 w-11 place-items-center" aria-label="Send reply"><Send size={20} /></button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
