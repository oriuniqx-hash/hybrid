import { createSupabaseServerClient } from '../../../lib/supabase/server'

export default async function Analytics() {
  const supabase = await createSupabaseServerClient()
  const [{ data: posts }, { count: likes }, { count: comments }] = await Promise.all([
    supabase.from('posts').select('id,type'),
    supabase.from('likes').select('id', { count: 'exact', head: true }),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
  ])
  const rows = posts ?? []
  const reels = rows.filter(post => post.type === 'reel').length
  return <section>
    <h1 className="mb-2 text-4xl font-black">Analytics</h1>
    <p className="mb-6 text-white/50">Live totals from the HYBRID database.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Posts', rows.length],
        ['Likes', likes ?? 0],
        ['Comments', comments ?? 0],
        ['Reels', reels],
      ].map(([label, value]) => <div key={String(label)} className="rounded-3xl border border-bg-border bg-bg-card p-6"><p className="text-sm text-white/50">{label}</p><p className="mt-2 text-4xl font-black">{value}</p></div>)}
    </div>
  </section>
}