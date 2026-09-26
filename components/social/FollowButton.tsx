'use client'
import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'

export default function FollowButton({ userId, className = '', onChange }: { userId: string; className?: string; onChange?: (state: 'none' | 'accepted' | 'pending') => void }) {
  const me = useMe()
  const [state, setState] = useState<'loading' | 'none' | 'accepted' | 'pending'>('loading')
  useEffect(() => {
    sb().from('follows').select('status').eq('follower_id', me.id).eq('following_id', userId).maybeSingle().then(({ data }) => setState((data?.status as any) || 'none'))
  }, [userId])
  if (userId === me.id) return null
  async function toggle() {
    const s = sb()
    if (state === 'none') {
      const { data } = await s.from('follows').insert({ follower_id: me.id, following_id: userId }).select('status').single()
      const next = (data?.status as any) || 'accepted'; setState(next); onChange?.(next)
    } else {
      await s.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId); setState('none'); onChange?.('none')
    }
  }
  const label = state === 'accepted' ? 'Following' : state === 'pending' ? 'Requested' : 'Follow'
  return <button disabled={state === 'loading'} onClick={toggle} className={`${state === 'none' ? 'btn-primary' : 'btn-ghost'} ${className}`}>{label}</button>
}
