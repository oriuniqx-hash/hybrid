'use client'

import { FormEvent, useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase/client'

type Mode = 'signin' | 'signup'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    const supabase = createSupabaseBrowserClient()

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      })

      if (error) {
        setMessage(error.message)
      } else if (data.session) {
        window.location.href = '/dashboard'
      } else {
        setMessage('Account created. Check your email to confirm your account, then sign in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        window.location.href = '/dashboard'
      }
    }

    setBusy(false)
  }

  async function magicLink() {
    if (!email) {
      setMessage('Enter your email first.')
      return
    }

    setBusy(true)
    setMessage('')
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    setMessage(error?.message || 'Check your email for the sign-in link.')
    setBusy(false)
  }

  async function oauth(provider: 'google' | 'github') {
    setBusy(true)
    setMessage('')
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-md rounded-3xl p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-accent-lime">HYBRID</p>
            <h2 className="mt-2 text-3xl font-black">
              {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {mode === 'signin' ? 'Sign in and continue exploring.' : 'Join the visual commons.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-bg-border px-3 py-1 text-xl" aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'signup' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border border-bg-border bg-bg-base p-3 outline-none"
              placeholder="Your name"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-bg-border bg-bg-base p-3 outline-none"
            placeholder="you@example.com"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full rounded-2xl border border-bg-border bg-bg-base p-3 outline-none"
            placeholder="Password (6+ characters)"
          />
          <button disabled={busy} className="w-full rounded-2xl bg-gradient-primary p-3 font-bold disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button disabled={busy} onClick={magicLink} className="mt-3 w-full rounded-2xl border border-bg-border p-3 text-sm">
          Email me a magic sign-in link
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => oauth('google')} className="rounded-2xl border border-bg-border p-3 text-sm">Continue with Google</button>
          <button disabled={busy} onClick={() => oauth('github')} className="rounded-2xl border border-bg-border p-3 text-sm">Continue with GitHub</button>
        </div>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}
          className="mt-5 w-full text-sm text-white/60 hover:text-white"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>

        {message && <p className="mt-4 rounded-2xl border border-bg-border p-3 text-sm text-accent-lime">{message}</p>}
      </div>
    </div>
  )
}