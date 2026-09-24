import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../lib/supabase/server'
import Sidebar from '../../components/navigation/Sidebar'
import TopHeader from '../../components/navigation/TopHeader'
import Notifications from '../../components/social/Notifications'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=true')
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  return <main className="min-h-screen bg-[#05070c]">
    <Sidebar userId={user.id} />
    <TopHeader username={profile?.username || null} userId={user.id} />
    <div className="min-h-[calc(100vh-76px)] px-4 pb-16 pt-7 lg:pl-28 lg:pr-7">{children}</div>
    <Notifications />
  </main>
}