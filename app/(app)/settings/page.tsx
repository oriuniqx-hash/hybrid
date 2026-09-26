'use client'
import { useEffect, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { uploadMedia } from '../../../lib/media'
import { CATEGORIES, slug } from '../../../lib/types'
import { displayName } from '../../../lib/format'
import { Avatar, toast } from '../../../components/ui'

export default function SettingsPage() {
  const me = useMe()
  const [tab, setTab] = useState<'profile' | 'account' | 'privacy' | 'interests'>('profile')
  const [f, setF] = useState({ full_name: me.full_name || '', username: me.username, bio: me.bio || '', website: me.website || '', avatar_url: me.avatar_url, account_type: me.account_type, is_private: me.is_private, show_activity: me.show_activity ?? true })
  const [interests, setInterests] = useState<string[]>(me.interests || [])
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState('')
  const [blocked, setBlocked] = useState<any[]>([])
  const [close, setClose] = useState<any[]>([])
  const [q, setQ] = useState(''); const [res, setRes] = useState<any[]>([])

  async function loadPrivacy() {
    const s = sb()
    const [{ data: b }, { data: c }] = await Promise.all([
      s.from('blocks').select('p:profiles!blocks_blocked_id_fkey(id,username,full_name,avatar_url)').eq('blocker_id', me.id),
      s.from('close_friends').select('p:profiles!close_friends_friend_id_fkey(id,username,full_name,avatar_url)').eq('user_id', me.id),
    ])
    setBlocked((b || []).map((r: any) => r.p).filter(Boolean)); setClose((c || []).map((r: any) => r.p).filter(Boolean))
  }
  useEffect(() => { if (tab === 'privacy') loadPrivacy() }, [tab])
  useEffect(() => { const t = setTimeout(async () => { if (!q.trim()) return setRes([]); const { data } = await sb().from('profiles').select('id,username,full_name,avatar_url').ilike('username', `%${q.trim()}%`).neq('id', me.id).limit(6); setRes(data || []) }, 200); return () => clearTimeout(t) }, [q])

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true)
    const u = f.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(u)) { toast('Username must be 3–24 letters, numbers or _'); setBusy(false); return }
    const { error } = await sb().from('profiles').update({ ...f, username: u, full_name: f.full_name.trim() || null, bio: f.bio.trim() || null, website: f.website.trim() || null, updated_at: new Date().toISOString(), ...extra }).eq('id', me.id)
    setBusy(false)
    if (error) return toast(error.message.includes('duplicate') ? 'That username is taken' : error.message)
    toast('Saved'); setTimeout(() => location.reload(), 500)
  }
  async function avatar(file?: File) { if (!file) return; try { const url = await uploadMedia(file, me.id); setF({ ...f, avatar_url: url }) } catch (e: any) { toast(e.message) } }
  async function changePw() { if (pw.length < 6) return toast('Use at least 6 characters'); const { error } = await sb().auth.updateUser({ password: pw }); if (error) toast(error.message); else { toast('Password updated'); setPw('') } }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-3xl font-extrabold">Settings</h1>
      <nav className="mt-5 flex gap-6 overflow-x-auto border-b border-line">{([['profile', 'Edit profile'], ['account', 'Account'], ['privacy', 'Privacy & safety'], ['interests', 'Interests']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`tab whitespace-nowrap ${tab === k ? 'tab-active' : ''}`}>{l}</button>)}</nav>

      {tab === 'profile' && (
        <section className="mt-6 space-y-5">
          <label className="flex w-fit cursor-pointer items-center gap-4"><span className="relative"><Avatar src={f.avatar_url} name={displayName(me)} size={80} /><span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-ink text-bg"><Camera size={14} /></span></span><span className="text-sm font-semibold">Change photo</span><input type="file" accept="image/*" className="sr-only" onChange={e => avatar(e.target.files?.[0])} /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label className="label" htmlFor="fn">Name</label><input id="fn" className="input" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
            <div><label className="label" htmlFor="un">Username</label><input id="un" className="input" value={f.username} onChange={e => setF({ ...f, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })} /></div>
          </div>
          <div><label className="label" htmlFor="bio">Bio</label><textarea id="bio" className="input min-h-24" maxLength={160} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></div>
          <div><label className="label" htmlFor="web">Website</label><input id="web" className="input" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} placeholder="https://" /></div>
          <button disabled={busy} onClick={() => save()} className="btn-primary px-6 py-3">Save changes</button>
        </section>
      )}

      {tab === 'account' && (
        <section className="mt-6 space-y-6">
          <div><span className="label">Account type</span>
            <div className="grid gap-2 sm:grid-cols-3">{(['personal', 'creator', 'business'] as const).map(t => <button key={t} onClick={() => setF({ ...f, account_type: t })} className={`card p-4 text-left capitalize ${f.account_type === t ? 'border-ink ring-1 ring-ink' : ''}`}><span className="flex items-center justify-between font-semibold">{t}{f.account_type === t && <Check size={16} />}</span></button>)}</div>
            <p className="mt-2 text-xs text-muted">Creator and business accounts get the full analytics hub, audience insights and a verified-style badge on your profile.</p>
            <button disabled={busy} onClick={() => save()} className="btn-primary mt-3">Save</button>
          </div>
          <div className="border-t border-line pt-6"><label className="label" htmlFor="pw">Change password</label><div className="flex gap-2"><input id="pw" type="password" className="input" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" /><button onClick={changePw} className="btn-ghost shrink-0">Update</button></div></div>
          <div className="border-t border-line pt-6"><button onClick={async () => { await sb().auth.signOut(); location.href = '/' }} className="btn-outline">Log out</button></div>
        </section>
      )}

      {tab === 'privacy' && (
        <section className="mt-6 space-y-8">
          <label className="flex items-start justify-between gap-6"><span><span className="block font-semibold">Private account</span><span className="text-sm text-muted">Only approved followers can see your pins, Reels, boards and stories.</span></span>
            <input type="checkbox" checked={f.is_private} onChange={e => { setF({ ...f, is_private: e.target.checked }); }} className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" /></label>
          <label className="flex items-start justify-between gap-6"><span><span className="block font-semibold">Show activity status</span><span className="text-sm text-muted">People you follow and anyone you message can see when you're active or were recently active. When this is off, you won't see their activity status either.</span></span>
            <input type="checkbox" checked={f.show_activity} onChange={e => setF({ ...f, show_activity: e.target.checked })} className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" /></label>
          <button disabled={busy} onClick={() => save()} className="btn-primary">Save privacy</button>
          <div><h2 className="font-semibold">Close friends</h2><p className="text-sm text-muted">Share stories with just these people.</p>
            <input className="input mt-3" placeholder="Add by username" value={q} onChange={e => setQ(e.target.value)} />
            <div className="mt-1">{res.map(u => <button key={u.id} onClick={async () => { await sb().from('close_friends').upsert({ user_id: me.id, friend_id: u.id }); setQ(''); loadPrivacy() }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface2"><Avatar src={u.avatar_url} name={displayName(u)} size={32} /><span className="text-sm">@{u.username}</span><span className="ml-auto text-xs font-semibold text-ok">Add</span></button>)}</div>
            <div className="mt-2 space-y-1">{close.map(u => <div key={u.id} className="flex items-center gap-3 p-2"><Avatar src={u.avatar_url} name={displayName(u)} size={32} /><span className="flex-1 text-sm">@{u.username}</span><button onClick={async () => { await sb().from('close_friends').delete().eq('user_id', me.id).eq('friend_id', u.id); loadPrivacy() }} className="text-xs text-muted hover:text-accent">Remove</button></div>)}</div>
          </div>
          <div><h2 className="font-semibold">Blocked accounts</h2>
            {blocked.length === 0 ? <p className="mt-1 text-sm text-muted">You haven't blocked anyone.</p> : <div className="mt-2 space-y-1">{blocked.map(u => <div key={u.id} className="flex items-center gap-3 p-2"><Avatar src={u.avatar_url} name={displayName(u)} size={32} /><span className="flex-1 text-sm">@{u.username}</span><button onClick={async () => { await sb().from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', u.id); loadPrivacy() }} className="btn-ghost py-1 text-xs">Unblock</button></div>)}</div>}
          </div>
        </section>
      )}

      {tab === 'interests' && (
        <section className="mt-6">
          <p className="text-sm text-muted">Your home feed is tuned to these topics, plus everything you save and like.</p>
          <div className="mt-4 flex flex-wrap gap-2">{CATEGORIES.map(c => { const s = slug(c), on = interests.includes(s); return <button key={c} onClick={() => setInterests(on ? interests.filter(i => i !== s) : [...interests, s])} className={`chip ${on ? 'chip-active' : ''}`}>{on && <Check size={14} />}{c}</button> })}</div>
          <button disabled={busy} onClick={() => save({ interests })} className="btn-primary mt-6">Save interests</button>
        </section>
      )}
    </div>
  )
}
