'use client'

import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '../../lib/supabase/client'

export default function SignOutButton({ compact = false }: { compact?: boolean }) {
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut()
    window.location.href = '/'
  }
  return <button onClick={signOut} aria-label="Sign out" className={compact ? 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/45 hover:text-white' : 'rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white'}>{compact ? <LogOut size={17}/> : 'Sign out'}</button>
}