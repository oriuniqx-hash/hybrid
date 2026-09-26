import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../lib/supabase/server'
import Onboarding from './Onboarding'

export const dynamic = 'force-dynamic'
export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=true')
  let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile) {
    const base = (user.user_metadata?.username || user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16)
    const { data } = await supabase.from('profiles').upsert({ id: user.id, username: base + '_' + user.id.slice(0, 5), full_name: user.user_metadata?.full_name || null, avatar_url: user.user_metadata?.avatar_url || null }).select('*').single()
    profile = data
  }
  if (profile?.onboarded) redirect('/home')
  return <Onboarding profile={profile} />
}
