import { createSupabaseServerClient } from '../../../lib/supabase/server'
import PostCard from '../../../components/social/PostCard'

export default async function ReelsPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('posts').select('*,profiles(username,avatar_url)').eq('type', 'reel').order('created_at', { ascending: false }).limit(60)
  return <section><h1 className="mb-6 text-4xl font-black">Reels</h1><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{(data ?? []).map((post: any) => <PostCard key={post.id} post={post} />)}</div></section>
}