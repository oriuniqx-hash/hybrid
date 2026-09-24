import { createSupabaseServerClient } from '../../lib/supabase/server'
import PostCard from '../../components/social/PostCard'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('posts').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(60)
  if (error) console.error('Dashboard posts fetch error:', error)
  return <section className="mx-auto max-w-[1500px]">
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#E60023]">Flow / Live portfolio</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">The creative stream.</h1><p className="mt-2 max-w-2xl text-sm text-white/40">A social feed for visual work, campaign references, and commercial storytelling.</p></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-xs text-white/45"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]"/>Live community data</div>
    </div>
    <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">{(data ?? []).map((post: any) => <PostCard key={post.id} post={post} />)}</div>
    {!data?.length && <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.025] p-16 text-center text-white/40">No published work yet. Create the first piece.</div>}
  </section>