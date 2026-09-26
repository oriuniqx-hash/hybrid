'use client'
import { useState } from 'react'
import { Check, Camera } from 'lucide-react'
import HybridLogo from '../../components/brand/HybridLogo'
import { Avatar } from '../../components/ui'
import { sb } from '../../lib/supabase/client'
import { uploadMedia } from '../../lib/media'
import { CATEGORIES, slug } from '../../lib/types'

export default function Onboarding({ profile }: { profile: any }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url || null)
  const [type, setType] = useState<'personal' | 'creator' | 'business'>(profile?.account_type || 'personal')
  const [picked, setPicked] = useState<string[]>(CATEGORIES.filter(c => (profile?.interests || []).includes(slug(c))))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function pickAvatar(f?: File) {
    if (!f) return
    setBusy(true)
    try { setAvatar(await uploadMedia(f, profile.id)) } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  async function finish() {
    setBusy(true); setErr('')
    const u = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(u)) { setErr('Username must be 3–24 characters: letters, numbers, underscore.'); setStep(0); setBusy(false); return }
    const { error } = await sb().from('profiles').update({ full_name: name.trim() || null, username: u, bio: bio.trim() || null, avatar_url: avatar, account_type: type, interests: picked.map(slug), onboarded: true, updated_at: new Date().toISOString() }).eq('id', profile.id)
    if (error) { setErr(error.message.includes('duplicate') ? 'That username is taken.' : error.message); setStep(0); setBusy(false); return }
    window.location.href = '/home'
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-10">
      <HybridLogo withWord />
      <div className="mt-8 flex gap-1.5">{[0, 1, 2].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} />)}</div>

      {step === 0 && (
        <section className="mt-8">
          <h1 className="font-display text-3xl font-extrabold">Set up your profile</h1>
          <p className="mt-1 text-muted">This is how people will find you on Hybrid.</p>
          <label className="mt-6 flex w-fit cursor-pointer items-center gap-4">
            <span className="relative"><Avatar src={avatar} name={name || username} size={84} /><span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-ink text-bg"><Camera size={15} /></span></span>
            <span className="text-sm font-semibold">{busy ? 'Uploading…' : 'Add a photo'}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={e => pickAvatar(e.target.files?.[0])} />
          </label>
          <div className="mt-6 space-y-4">
            <div><label className="label" htmlFor="n">Name</label><input id="n" className="input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="label" htmlFor="u">Username</label><input id="u" className="input" value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())} maxLength={24} /></div>
            <div><label className="label" htmlFor="b">Bio</label><textarea id="b" className="input min-h-20" value={bio} onChange={e => setBio(e.target.value)} maxLength={160} /></div>
          </div>
          {err && <p className="mt-4 text-sm text-accent">{err}</p>}
          <button disabled={busy} onClick={() => setStep(1)} className="btn-primary mt-8 w-full py-3">Continue</button>
        </section>
      )}

      {step === 1 && (
        <section className="mt-8">
          <h1 className="font-display text-3xl font-extrabold">How will you use Hybrid?</h1>
          <p className="mt-1 text-muted">You can switch any time in Settings.</p>
          <div className="mt-6 space-y-3">
            {([
              ['personal', 'Personal', 'Discover ideas, save pins to boards, follow friends and creators.'],
              ['creator', 'Creator', 'Publish pins, Reels and Stories. Get analytics, audience insights and trends.'],
              ['business', 'Business', 'Showcase products with shoppable pins, analytics and a business profile.'],
            ] as const).map(([v, t, d]) => (
              <button key={v} onClick={() => setType(v)} className={`card flex w-full items-start gap-4 p-4 text-left transition ${type === v ? 'border-ink ring-1 ring-ink' : 'hover:bg-surface2'}`}>
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${type === v ? 'border-ink bg-ink text-bg' : 'border-line'}`}>{type === v && <Check size={12} />}</span>
                <span><span className="block font-bold">{t}</span><span className="text-sm text-muted">{d}</span></span>
              </button>
            ))}
          </div>
          <div className="mt-8 flex gap-3"><button onClick={() => setStep(0)} className="btn-ghost flex-1 py-3">Back</button><button onClick={() => setStep(2)} className="btn-primary flex-1 py-3">Continue</button></div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8">
          <h1 className="font-display text-3xl font-extrabold">What are you into?</h1>
          <p className="mt-1 text-muted">Pick at least 3. We use these to personalise your home feed.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map(c => {
              const on = picked.includes(c)
              return <button key={c} onClick={() => setPicked(on ? picked.filter(p => p !== c) : [...picked, c])} className={`chip ${on ? 'chip-active' : ''}`}>{on && <Check size={14} />}{c}</button>
            })}
          </div>
          {err && <p className="mt-4 text-sm text-accent">{err}</p>}
          <div className="mt-8 flex gap-3"><button onClick={() => setStep(1)} className="btn-ghost flex-1 py-3">Back</button><button disabled={picked.length < 3 || busy} onClick={finish} className="btn-primary flex-1 py-3">{busy ? 'Saving…' : 'Start exploring'}</button></div>
        </section>
      )}
    </main>
  )
}
