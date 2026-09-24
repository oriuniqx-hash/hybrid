'use client'

import { createSupabaseBrowserClient } from '../../lib/supabase/client'

export default function SignOutButton() {
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut()
    window.location.href = '/'
  }

  return (
    <button onClick={signOut} className="rounded-full border border-bg-border px-4 py-2 text-sm">
      Sign out
    </button>
  )
}