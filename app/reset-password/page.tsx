'use client'
import { useState } from 'react'
import HybridLogo from '../../components/brand/HybridLogo'
import { sb } from '../../lib/supabase/client'

export default function ResetPassword() {
  const [pw, setPw] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const { error } = await sb().auth.updateUser({ password: pw })
    if (error) { setMsg(error.message); setBusy(false) } else location.href = '/home'
  }
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={save} className="w-full max-w-sm rounded-[2rem] bg-surface p-7 shadow-pop">
        <HybridLogo size={40} />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Choose a new password</h1>
        <input type="password" required minLength={6} value={pw} onChange={e => setPw(e.target.value)} className="input mt-5" placeholder="New password" autoComplete="new-password" />
        <button disabled={busy} className="btn-primary mt-4 w-full py-3">Save password</button>
        {msg && <p className="mt-3 text-sm text-accent">{msg}</p>}
      </form>
    </main>
  )
}
