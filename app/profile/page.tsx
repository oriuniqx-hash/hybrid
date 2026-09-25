import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../lib/supabase/server'

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=true')
  redirect('/dashboard/profile/' + user.id)
}
