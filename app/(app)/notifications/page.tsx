'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { Avatar, Empty, Spinner } from '../../../components/ui'
import { displayName, timeAgo } from '../../../lib/format'

const TEXT: Record<string, string> = { like: 'liked your pin', comment: 'commented:', follow: 'started following you', follow_request: 'requested to follow you', save: 'saved your pin', mention: 'mentioned you:', message: 'sent you a message', report_resolved: 'Your report was reviewed', live: 'started a live video', remix: 'remixed your collage' }

export default function NotificationsPage() {
  const me = useMe()
  const [list, setList] = useState<any[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'follow' | 'comment'>('all')
  async function load() {
    const { data } = await sb().from('notifications').select('*, actor:profiles!notifications_actor_id_fkey(id,username,full_name,avatar_url), post:posts(id,media_url,thumbnail_url,type)').eq('user_id', me.id).neq('type', 'message').order('created_at', { ascending: false }).limit(100)
    setList(data || [])
    await sb().from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false).neq('type', 'message')
  }
  useEffect(() => {
    load()
    const s = sb(); const ch = s.channel('notif-page').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, load).subscribe()
    return () => { s.removeChannel(ch) }
  }, [])
  async function respond(n: any, accept: boolean) {
    const s = sb()
    if (accept) await s.from('follows').update({ status: 'accepted' }).eq('follower_id', n.actor_id).eq('following_id', me.id)
    else await s.from('follows').delete().eq('follower_id', n.actor_id).eq('following_id', me.id)
    await s.from('notifications').delete().eq('id', n.id); load()
  }
  const shown = (list || []).filter(n => filter === 'all' || (filter === 'follow' ? n.type.startsWith('follow') : ['comment', 'mention'].includes(n.type)))
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-3xl font-extrabold">Notifications</h1>
      <div className="mt-4 flex gap-2">{([['all', 'All'], ['comment', 'Comments & mentions'], ['follow', 'Follows']] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`chip ${filter === k ? 'chip-active' : ''}`}>{l}</button>)}</div>
      <div className="mt-4">
        {!list ? <div className="grid place-items-center py-10"><Spinner /></div> : shown.length === 0 ? <Empty icon={<Bell size={24} />} title="You're all caught up" body="Likes, comments, saves, mentions and new followers will show up here." /> :
          shown.map(n => (
            <div key={n.id} className={`flex items-center gap-3 rounded-2xl p-3 ${!n.read ? 'bg-accent/5' : ''}`}>
              <Link href={`/u/${n.actor?.username}`}><Avatar src={n.actor?.avatar_url} name={displayName(n.actor)} size={44} /></Link>
              <p className="min-w-0 flex-1 text-sm"><Link href={`/u/${n.actor?.username}`} className="font-semibold">{n.actor?.username}</Link> {TEXT[n.type]} {n.body && ['comment', 'mention'].includes(n.type) && <span className="text-muted">{n.body}</span>} <span className="text-xs text-faint">{timeAgo(n.created_at)}</span></p>
              {n.type === 'follow_request' ? (
                <div className="flex gap-1.5"><button onClick={() => respond(n, true)} className="btn-primary py-1.5">Confirm</button><button onClick={() => respond(n, false)} className="btn-ghost py-1.5">Delete</button></div>
              ) : n.type === 'live' ? <Link href={`/live/${n.body}`} className="btn-primary py-1.5">Watch</Link>
              : n.post && <Link href={n.post.type === 'reel' ? `/reels?id=${n.post.id}` : `/p/${n.post.id}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface2">{n.post.type === 'reel' ? <video src={n.post.media_url} muted className="h-full w-full object-cover" /> : <img src={n.post.thumbnail_url || n.post.media_url} alt="" className="h-full w-full object-cover" />}</Link>}
            </div>
          ))}
      </div>
    </div>
  )
}
