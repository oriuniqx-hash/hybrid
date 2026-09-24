import { createSupabaseServerClient } from '../../../lib/supabase/server'
import PostCard from '../../../components/social/PostCard'

export default async function ExplorePage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('posts').select('*,profiles(username,avatar_url)').order('likes_count', { ascending: false }).order('created_at', { ascending: false }).limit(60)
  return <section><h1 className="mb-6 text-4xl font-black">Explore</h1><div className="columns-1 gap-4 sm:columns-2 lg:columns-4">{(data ?? []).map((post: any) => <PostCard key={post.id} post={post} />)}</div></section>
}