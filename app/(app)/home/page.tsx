'use client'
import { useCallback, useState } from 'react'
import { Sparkles, Users } from 'lucide-react'
import StoriesBar from '../../../components/stories/StoriesBar'
import Feed from '../../../components/social/Feed'
import { Empty } from '../../../components/ui'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { POST_SELECT, type Post } from '../../../lib/types'

export default function HomePage() {
  const me = useMe()
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou')

  const forYou = useCallback(async (off: number, lim: number) => {
    const s = sb()
    const { data: ranked } = await s.rpc('feed_for_you', { lim, off })
    const ids = (ranked || []).map((p: any) => p.id)
    if (!ids.length) return []
    const { data } = await s.from('posts').select(POST_SELECT).in('id', ids)
    const byId = new Map((data || []).map((p: any) => [p.id, p]))
    return ids.map((id: string) => byId.get(id)).filter(Boolean) as Post[]
  }, [])

  const following = useCallback(async (off: number, lim: number) => {
    const s = sb()
    const { data: f } = await s.from('follows').select('following_id').eq('follower_id', me.id).eq('status', 'accepted')
    const ids = (f || []).map((r: any) => r.following_id)
    if (!ids.length) return []
    const { data } = await s.from('posts').select(POST_SELECT).in('user_id', ids).in('type', ['pin', 'reel']).order('publish_at', { ascending: false }).range(off, off + lim - 1)
    return (data || []) as Post[]
  }, [me.id])

  return (
    <div className="mx-auto max-w-[1600px] px-3 pt-5 sm:px-5">
      <StoriesBar />
      <div className="mt-4 flex items-center gap-6 border-b border-line">
        <button onClick={() => setTab('foryou')} className={`tab ${tab === 'foryou' ? 'tab-active' : ''}`}>For you</button>
        <button onClick={() => setTab('following')} className={`tab ${tab === 'following' ? 'tab-active' : ''}`}>Following</button>
      </div>
      <div className="mt-5">
        {tab === 'foryou'
          ? <Feed key="fy" loader={forYou} empty={<Empty icon={<Sparkles size={24} />} title="Your feed is just getting started" body="No one has published pins yet. Be the first — create a pin and it will appear here for everyone." action={{ href: '/create', label: 'Create a pin' }} />} />
          : <Feed key="fo" loader={following} empty={<Empty icon={<Users size={24} />} title="Follow people to fill this feed" body="Posts from people and creators you follow will show up here, newest first." action={{ href: '/explore?tab=people', label: 'Find people' }} />} />}
      </div>
    </div>
  )
}
