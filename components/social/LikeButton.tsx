'use client'
import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import { useMe } from '../../lib/useMe'
import { compact } from '../../lib/format'

export default function LikeButton({ postId, count, vertical = false, light = false }: { postId: string; count: number; vertical?: boolean; light?: boolean }) {
  const me = useMe()
  const [liked, setLiked] = useState(false)
  const [n, setN] = useState(count)
  useEffect(() => { setN(count) }, [count])
  useEffect(() => { sb().from('likes').select('id').eq('post_id', postId).eq('user_id', me.id).maybeSingle().then(({ data }) => setLiked(!!data)) }, [postId])
  async function toggle() {
    const s = sb()
    if (liked) { setLiked(false); setN(n - 1); await s.from('likes').delete().eq('post_id', postId).eq('user_id', me.id) }
    else { setLiked(true); setN(n + 1); await s.from('likes').insert({ post_id: postId, user_id: me.id }) }
  }
  return (
    <button onClick={toggle} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className={`flex items-center gap-1.5 ${vertical ? 'flex-col text-xs font-semibold' : 'rounded-full px-2 py-2 text-sm font-semibold hover:bg-surface2'} ${light ? 'text-white' : ''}`}>
      <Heart size={vertical ? 30 : 22} className={liked ? 'fill-accent text-accent' : ''} />
      <span>{compact(n)}</span>
    </button>
  )
}
