import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import PostCard from '../../../../components/social/PostCard'

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', params.id).maybeSingle()
  if (!profile) notFound()
  const { data: posts } = await supabase.from('posts').select('*,profiles(username,avatar_url)').eq('user_id', params.id).order('created_at', { ascending: false }).limit(60)
  return <section><div className="rounded-3xl border border-bg-border bg-bg-card p-6"><div className="flex items-center gap-5">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" /> : <div className="h-24 w-24 rounded-full bg-white/10" />}<div><h1 className="text-3xl font-black">@{profile.username || 'creator'}</h1><p className="text-white/60">{profile.full_name}</p><p className="mt-2 max-w-xl text-sm text-white/70">{profile.bio}</p></div></div></div><div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-4">{(posts || []).map((p: any) => <PostCard key={p.id} post={p} />)}</div></section>
}