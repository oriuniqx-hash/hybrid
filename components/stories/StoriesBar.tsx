'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { Avatar } from '../ui'
import type { Author } from '../../lib/types'
import { freshSince } from '../../lib/live'

export default function StoriesBar() {
  const me = useMe()
  const [users, setUsers] = useState<Author[] | null>(null)
  const [mine, setMine] = useState(false)
  const [lives, setLives] = useState<{ id: string; host: Author }[]>([])
  useEffect(() => {
    (async () => {
      const s = sb()
      const { data: f } = await s.from('follows').select('following_id').eq('follower_id', me.id).eq('status', 'accepted')
      const ids = [me.id, ...(f || []).map((r: any) => r.following_id)]
      const { data: lv } = await s.from('live_streams').select('id, host_id, host:profiles!live_streams_host_id_fkey(id,username,full_name,avatar_url)').eq('status', 'live').gt('heartbeat_at', freshSince()).in('host_id', ids.filter(i => i !== me.id)).order('started_at', { ascending: false })
      setLives((lv || []).filter((l: any) => l.host) as any)
      const { data } = await s.from('posts').select('user_id, created_at, author:profiles!posts_user_id_fkey(id,username,full_name,avatar_url)')
        .eq('type', 'story').in('user_id', ids).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
      const map = new Map<string, Author>()
      ;(data || []).forEach((r: any) => { if (r.author && !map.has(r.user_id)) map.set(r.user_id, r.author) })
      setMine(map.has(me.id)); map.delete(me.id)
      setUsers(Array.from(map.values()))
    })()
  }, [me.id])
  const queue = (users || []).map(u => u.username).join(',')
  return (
    <div className="no-scrollbar -mx-3 flex gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
      <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
        <div className="relative">
          <Link href={mine ? `/stories/${me.username}?queue=${queue}` : '/create?type=story'} aria-label={mine ? 'View your story' : 'Add to your story'}>
            <Avatar src={me.avatar_url} name={me.username} size={62} ring={mine} />
          </Link>
          <Link href="/create?type=story" className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border-2 border-bg bg-accent text-white" aria-label="Add story"><Plus size={14} strokeWidth={3} /></Link>
        </div>
        <span className="w-full truncate text-center text-xs text-muted">Your story</span>
      </div>
      {lives.map(l => (
        <Link key={l.id} href={`/live/${l.id}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5" aria-label={`${l.host.username} is live`}>
          <span className="relative rounded-full bg-gradient-to-tr from-accent to-[#ff8a3d] p-[2.5px]"><span className="block rounded-full border-2 border-bg"><Avatar src={l.host.avatar_url} name={l.host.full_name || l.host.username} size={58} /></span>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded border-2 border-bg bg-accent px-1.5 text-[10px] font-extrabold leading-4 text-white">LIVE</span></span>
          <span className="w-full truncate text-center text-xs">{l.host.username}</span>
        </Link>
      ))}
      {users === null && Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"><span className="skeleton h-[68px] w-[68px] rounded-full" /><span className="skeleton h-2.5 w-12 rounded" /></div>)}
      {users?.map((u, i) => (
        <Link key={u.id} href={`/stories/${u.username}?queue=${(users.slice(i + 1)).map(x => x.username).join(',')}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
          <Avatar src={u.avatar_url} name={u.full_name || u.username} size={62} ring />
          <span className="w-full truncate text-center text-xs">{u.username}</span>
        </Link>
      ))}
    </div>
  )
}
