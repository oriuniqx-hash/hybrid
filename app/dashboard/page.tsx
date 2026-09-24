import { createSupabaseServerClient } from '../../lib/supabase/server'
import PostCard from '../../components/social/PostCard'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('posts').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(60)
  if (error) console.error('Dashboard posts fetch error:', error)
  return <section>
    <p className="text-xs font-bold tracking-[0.25em] text-accent-lime">FOR YOU</p>
    <h1 className="mt-2 text-4xl font-black">The canvas</h1>
    <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-4">{(data ?? []).map((post: any) => <PostCard key={post.id} post={post} />)}</div>
    {!data?.length && <div className="mt-8 rounded-3xl border border-bg-border bg-bg-card p-10 text-center text-white/50">No posts yet. Create the first one.</div>}
  </section>
}