'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase/client'

type Post = {
  id: string
  user_id: string
  media_url: string
  thumbnail_url: string | null
  type: string
  title: string | null
  description: string | null
  likes_count: number
  comments_count: number
  profiles?: { username: string | null; avatar_url: string | null } | null
}

type Comment = {
  id: string
  content: string
  user_id: string
  created_at: string | null
  profiles?: { username: string | null } | null
}

export default function PostCard({ post }: { post: Post }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(post.likes_count || 0)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [busy, setBusy] = useState(false)

  async function refreshSocial() {
    const [{ data: session }, { count: likeCount }, { data: commentRows }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      supabase.from('comments').select('id,content,user_id,created_at,profiles(username)').eq('post_id', post.id).order('created_at', { ascending: true }),
    ])
    const id = session.user?.id ?? null
    setUserId(id)
    setLikes(likeCount ?? 0)
    setComments((commentRows as Comment[] | null) ?? [])
    if (id) {
      const { data: ownLike } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', id).maybeSingle()
      setLiked(Boolean(ownLike))
    }
  }

  useEffect(() => {
    void refreshSocial()
    const channel = supabase
      .channel('post-social-' + post.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: 'post_id=eq.' + post.id }, () => void refreshSocial())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: 'post_id=eq.' + post.id }, () => void refreshSocial())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [post.id, supabase])

  async function toggleLike() {
    if (!userId || busy) return
    setBusy(true)
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', userId)
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: userId })
    }
    await refreshSocial()
    setBusy(false)
  }

  async function addComment() {
    if (!userId || !commentText.trim() || busy) return
    setBusy(true)
    const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: userId, content: commentText.trim() })
    if (!error) setCommentText('')
    await refreshSocial()
    setBusy(false)
  }

  return (
    <article className="mb-4 break-inside-avoid overflow-hidden rounded-3xl border border-bg-border bg-bg-card">
      {post.type === 'reel' ? (
        <video controls playsInline poster={post.thumbnail_url || undefined} src={post.media_url} className="w-full object-cover" />
      ) : (
        <img src={post.thumbnail_url || post.media_url} alt={post.title || 'HYBRID post'} className="w-full object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-white/10" />}
          <div><p className="font-bold">@{post.profiles?.username || 'creator'}</p><p className="text-xs text-white/40">{post.title || 'Untitled'}</p></div>
        </div>
        {post.description && <p className="mt-3 text-sm text-white/70">{post.description}</p>}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={toggleLike} disabled={!userId || busy} className={'rounded-full px-3 py-2 text-sm font-bold ' + (liked ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-white/70')}>♥ {likes}</button>
          <button onClick={() => setShowComments(v => !v)} className="rounded-full bg-white/5 px-3 py-2 text-sm font-bold text-white/70">💬 {comments.length}</button>
        </div>
        {showComments && (
          <div className="mt-4 border-t border-bg-border pt-4">
            <div className="max-h-56 space-y-3 overflow-auto">
              {comments.length === 0 ? <p className="text-sm text-white/40">No comments yet.</p> : comments.map(c => (
                <div key={c.id} className="text-sm"><b>@{c.profiles?.username || 'user'}</b> <span className="text-white/70">{c.content}</span></div>
              ))}
            </div>
            {userId && <div className="mt-3 flex gap-2"><input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void addComment() }} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-full bg-white/5 px-4 py-2 text-sm outline-none" /><button onClick={addComment} disabled={busy || !commentText.trim()} className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold">Post</button></div>}
          </div>
        )}
      </div>
    </article>
  )
}