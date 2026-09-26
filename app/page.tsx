import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../lib/supabase/server'
import HomeClient from '../components/landing/HomeClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  )
}
