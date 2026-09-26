import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../lib/supabase/server'
import HomeClient from '../components/landing/HomeClient'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/home')
  const { data: pins } = await supabase.from('posts').select('id,title,media_url,thumbnail_url,media_type,aspect_ratio,dominant_color').eq('type', 'pin').order('saves_count', { ascending: false }).order('publish_at', { ascending: false }).limit(24)
  const { count: people } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  return <Suspense fallback={null}><HomeClient pins={pins || []} people={people || 0} /></Suspense>
}
