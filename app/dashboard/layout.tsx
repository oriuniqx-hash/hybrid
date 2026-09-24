import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '../../lib/supabase/server'
import SignOutButton from '../../components/auth/SignOutButton'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=true')
  return (
    <main className="min-h-screen px-4 py-4">
      <nav className="glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3">
        <Link href="/dashboard" className="font-black">✦ HYBRID</Link>
        <div className="hidden gap-4 text-sm md:flex">
          <Link href="/dashboard">Home</Link><Link href="/dashboard/explore">Explore</Link><Link href="/dashboard/reels">Reels</Link><Link href="/dashboard/messages">Messages</Link><Link href="/dashboard/analytics">Analytics</Link>
        </div>
        <div className="flex items-center gap-2"><Link href="/dashboard/create" className="rounded-full bg-gradient-primary px-4 py-2 font-bold">+ Create</Link><SignOutButton /></div>
      </nav>
      <div className="mx-auto max-w-7xl py-8">{children}</div>
    </main>
  )
}