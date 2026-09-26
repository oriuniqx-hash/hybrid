import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseServerClient } from '../../lib/supabase/server'
import AppShell from '../../components/shell/AppShell'
import type { Profile } from '../../lib/types'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=true')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile) redirect('/onboarding')
  if (!profile.onboarded) redirect('/onboarding')
  return <Suspense fallback={null}><AppShell me={profile as Profile}>{children}</AppShell></Suspense>
}
