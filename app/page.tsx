'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Heart, LogIn, MessageCircle, Plus, Search, Sparkles, UserRound } from 'lucide-react'
import AuthModal from '../components/auth/AuthModal'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type Post = {
  id: string
  media_url: string
  thumbnail_url: string | null
  type: string
  title: string | null
  description: string | null
  likes_count: number
  comments_count: number
  aspect_ratio: number | null
  profiles?: { username: string; avatar_url: string | null } | null
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [user, setUser] = useState<any>(null)
  const [query, setQuery] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    async function load() {
      const [{ data: postsData }, { data: sessionData }] = await Promise.all([
        supabase.from('posts').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(60),
        supabase.auth.getSession(),
      ])
      setPosts((postsData as Post[]) || [])
      setUser(sessionData.session?.user || null)
      setLoading(false)
    }
    load()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => data.subscription.unsubscribe()
  }, [])

  const filtered = posts.filter((post) =>
    !query ||
    (post.title || '').toLowerCase().includes(query.toLowerCase()) ||
    (post.description || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 px-4 pt-4">
        <nav className="glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-black">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-black"><Sparkles size={15} /></span>
            HYBRID
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-bg-border bg-bg-card px-4 py-2 md:flex">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the visual commons" className="w-64 bg-transparent text-sm outline-none" />
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/dashboard" className="hidden rounded-full border border-bg-border px-4 py-2 text-sm sm:block">Dashboard</Link>
                <Link href="/dashboard/create" className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold"><Plus size={15} className="mr-1 inline" />Create</Link>
              </>
            ) : (
              <>
                <button onClick={() => setAuthOpen(true)} className="rounded-full px-3 py-2 text-sm"><LogIn size={15} className="mr-1 inline" />Sign in</button>
                <button onClick={() => setAuthOpen(true)} className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold">Sign up</button>
              </>
            )}
          </div>
        </nav>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-14 pt-20">
        <p className="text-xs font-bold tracking-[0.28em] text-accent-lime">THE VISUAL COMMONS</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-tight md:text-8xl">Ideas look better when <span className="gradient-text">collide.</span></h1>
        <p className="mt-6 max-w-2xl text-lg text-white/60">Discover visual work, publish your own posts, save ideas, and connect with creators.</p>
        {!user && <button onClick={() => setAuthOpen(true)} className="mt-8 rounded-full bg-white px-6 py-3 font-bold text-black">Start creating <ArrowRight size={17} className="ml-1 inline" /></button>}
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[0.2em] text-white/40">LIVE DATA</p><h2 className="mt-1 text-2xl font-black">Latest work</h2></div>{user && <Link href="/dashboard/explore" className="text-sm text-white/60 hover:text-white">Explore all →</Link>}</div>
        {loading ? <div className="py-20 text-center text-white/50">Loading posts…</div> : filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-bg-border px-6 py-20 text-center"><p className="text-lg font-bold">No published posts yet.</p><p className="mt-2 text-sm text-white/50">Sign up to publish the first piece to HYBRID.</p>{!user && <button onClick={() => setAuthOpen(true)} className="mt-5 rounded-full bg-gradient-primary px-5 py-2 font-bold">Create account</button>}</div> : <div className="masonry">{filtered.map((post) => <article key={post.id} className="mb-4 overflow-hidden rounded-3xl bg-bg-card shadow-sm"><img src={post.thumbnail_url || post.media_url} alt={post.title || 'HYBRID post'} className="block w-full object-cover" style={{ aspectRatio: post.aspect_ratio || 1 }} /><div className="p-4"><div className="mb-3 flex items-center gap-2 text-sm"><span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><UserRound size={15} /></span><span>@{post.profiles?.username || 'creator'}</span></div><h3 className="font-bold">{post.title || 'Untitled'}</h3>{post.description && <p className="mt-1 text-sm text-white/60">{post.description}</p>}<div className="mt-4 flex items-center gap-4 text-sm text-white/50"><span><Heart size={16} className="mr-1 inline" />{post.likes_count || 0}</span><span><MessageCircle size={16} className="mr-1 inline" />{post.comments_count || 0}</span></div></div></article>)}</div>}
      </section>
      <footer className="border-t border-bg-border px-5 py-8 text-center text-xs text-white/40">HYBRID · real posts, real creators, real communities.</footer>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </main>
  )
}