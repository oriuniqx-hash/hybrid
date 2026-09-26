'use client'
import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { sb } from '../../lib/supabase/client'
import HybridLogo from '../brand/HybridLogo'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('error')) setMessage(p.get('error')!)
    if (p.get('mode') === 'signup') setMode('signup')
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    const s = sb()
    if (mode === 'signup') {
      const { data, error } = await s.auth.signUp({ email, password, options: { data: { full_name: name, username: username.trim().toLowerCase() }, emailRedirectTo: location.origin + '/auth/callback?next=/onboarding' } })
      if (error) setMessage(error.message)
      else if (data.user && data.user.identities?.length === 0) { setMessage('An account with this email already exists. Please log in.'); setMode('signin') }
      else if (data.session) { location.href = '/onboarding'; return }
      else setMessage('Check your email to confirm your account, then log in.')
    } else if (mode === 'signin') {
      const { error } = await s.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
      else { location.href = '/home'; return }
    } else {
      const { error } = await s.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/auth/callback?next=/reset-password' })
      setMessage(error ? error.message : 'If that email has an account, a reset link is on its way.')
    }
    setBusy(false)
  }
  async function google() {
    setBusy(true)
    const { error } = await sb().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/auth/callback?next=/home' } })
    if (error) { setMessage(error.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="Log in or sign up" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[420px] rounded-[2rem] bg-surface p-7 shadow-pop">
        <div className="flex justify-end"><button onClick={onClose} className="icon-btn -mr-2 -mt-2" aria-label="Close"><X size={20} /></button></div>
        <div className="-mt-4 flex flex-col items-center text-center">
          <HybridLogo size={44} />
          <h2 className="mt-3 font-display text-2xl font-extrabold">{mode === 'signup' ? 'Welcome to Hybrid' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2>
          <p className="mt-1 text-sm text-muted">{mode === 'signup' ? 'Find new ideas to try and share' : mode === 'forgot' ? "We'll email you a reset link" : 'Log in to see more'}</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'signup' && <>
            <input value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Your name" autoComplete="name" />
            <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} required minLength={3} maxLength={24} className="input" placeholder="Username" autoComplete="username" />
          </>}
          <input value={email} onChange={e => setEmail(e.target.value)} required type="email" autoComplete="email" className="input" placeholder="Email" />
          {mode !== 'forgot' && <input value={password} onChange={e => setPassword(e.target.value)} required minLength={6} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="input" placeholder="Password (6+ characters)" />}
          {mode === 'signin' && <button type="button" onClick={() => { setMode('forgot'); setMessage('') }} className="text-xs font-semibold text-muted hover:text-ink">Forgot your password?</button>}
          <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : mode === 'signup' ? 'Continue' : 'Send reset link'}</button>
        </form>
        {mode !== 'forgot' && <>
          <div className="my-4 flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
          <button disabled={busy} onClick={google} className="btn-outline w-full py-3">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
        </>}
        {message && <p className="mt-4 rounded-2xl bg-surface2 p-3 text-center text-sm">{message}</p>}
        <p className="mt-5 text-center text-sm text-muted">
          {mode === 'signin' ? <>Not on Hybrid yet? <button onClick={() => { setMode('signup'); setMessage('') }} className="font-bold text-ink">Sign up</button></>
            : <>Already a member? <button onClick={() => { setMode('signin'); setMessage('') }} className="font-bold text-ink">Log in</button></>}
        </p>
      </div>
    </div>
  )
}
