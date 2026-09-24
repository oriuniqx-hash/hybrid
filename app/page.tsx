'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, Bookmark, Clapperboard, Compass, Film, Heart, LayoutGrid, LogOut, Menu, MessageCircle, PlusCircle, Search, Send, Sparkles, User, X } from 'lucide-react'
import AuthModal from '../components/auth/AuthModal'
import PostCard from '../components/social/PostCard'
import HybridLogo from '../components/brand/HybridLogo'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type View = 'landing' | 'feed' | 'explore' | 'reels' | 'boards' | 'profile'
type Post = {
  id: string
  user_id: string
  media_url: string
  thumbnail_url: string | null
  type: string
  title: string | null
  description: string | null
  likes_count: number
  comments_count: number
  profiles?: { username: string | null; avatar_url: string | null } | null
}

const categories = ['all', 'fmcg', 'footwear', 'macro', 'packaging', 'luxury', 'tech']

export default function Home() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [view, setView] = useState<View>('landing')
  const [posts, setPosts] = useState<Post[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [authOpen, setAuthOpen] = useState(false)
  const [guestPrompt, setGuestPrompt] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function boot() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(currentUser)
      if (currentUser) {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
        setProfile(data)
        setView('feed')
      }
      await loadPosts()
      setLoading(false)
    }
    void boot()
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        setProfile(data)
        setView('feed')
      } else {
        setProfile(null)
        setView('landing')
      }
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [supabase])

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(80)
    setPosts((data as Post[] | null) ?? [])
  }

  const visiblePosts = posts.filter(post => {
    const text = [post.title, post.description, post.profiles?.username, post.type].filter(Boolean).join(' ').toLowerCase()
    const matchesQuery = !query.trim() || text.includes(query.toLowerCase())
    const matchesCategory = category === 'all' || text.includes(category)
    const matchesView = view === 'reels' ? post.type === 'reel' : true
    return matchesQuery && matchesCategory && matchesView
  })

  function restricted(action?: () => void) {
    if (!user) setGuestPrompt(true)
    else action?.()
  }

  async function signOut() {
    await supabase.auth.signOut()
    setView('landing')
  }

  function navigate(next: View) {
    setMenuOpen(false)
    if (next === 'feed' && !user) return setView('explore')
    setView(next)
  }

  return (
    <main className="min-h-screen bg-[#05070c] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05070c]/90 px-3 py-3 backdrop-blur-2xl lg:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(v => !v)} className="rounded-xl border border-white/10 bg-white/5 p-2 lg:hidden"><Menu size={19}/></button>
          <button onClick={() => setView(user ? 'feed' : 'landing')} className="flex items-center gap-3">
            <HybridLogo />
            <span className="hidden text-left sm:block"><b className="block text-lg font-black tracking-tight">HYBRID</b><small className="text-[9px] uppercase tracking-[.25em] text-white/40">by OriUniqx</small></span>
          </button>
          <div className="relative hidden min-w-0 flex-1 md:block md:max-w-xl lg:ml-8">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search commercial work, shoots, campaigns..." className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs outline-none transition focus:border-[#833AB4]/60"/>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setNotifications(v => !v)} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/55 hover:text-white"><Bell size={18}/></button>
            {user ? <button onClick={() => navigate('profile')} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3"><Avatar src={profile?.avatar_url}/><span className="hidden text-xs font-bold sm:block">@{profile?.username || user.email?.split('@')[0]}</span></button> : <button onClick={() => setAuthOpen(true)} className="rounded-full bg-gradient-to-r from-[#E60023] via-[#C13584] to-[#833AB4] px-4 py-2 text-xs font-bold shadow-lg">Sign In / Register</button>}
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar md:hidden">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs outline-none"/>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => <button key={cat} onClick={() => setCategory(cat)} className={'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition '+(category===cat?'border-white/20 bg-white/15 text-white':'border-white/10 bg-white/5 text-white/45 hover:text-white')}>{cat}</button>)}
        </div>
      </header>

      <aside className={'fixed left-0 top-[74px] z-30 h-[calc(100vh-74px)] w-20 border-r border-white/5 bg-[#05070c]/90 p-4 backdrop-blur-2xl lg:block '+(menuOpen?'block':'hidden')}>
        <div className="flex h-full flex-col items-center justify-between py-2">
          <div className="space-y-3">
            <NavButton label="Home Feed" active={view==='feed'} onClick={() => navigate('feed')}><LayoutGrid size={22}/></NavButton>
            <NavButton label="Discover Spectrum" active={view==='explore'} onClick={() => navigate('explore')}><Compass size={22}/></NavButton>
            <NavButton label="Commercial Reels" active={view==='reels'} onClick={() => navigate('reels')}><Clapperboard size={22}/></NavButton>
            <NavButton label="Create Ad Spec" accent onClick={() => restricted(() => { window.location.href='/dashboard/create' })}><PlusCircle size={23}/></NavButton>
            <NavButton label="Messages / Echoes" active={false} onClick={() => restricted(() => { window.location.href='/dashboard/messages' })}><Send size={22}/></NavButton>
            <NavButton label="Brand Spaces" active={view==='boards'} onClick={() => navigate('boards')}><LayoutGrid size={22}/></NavButton>
          </div>
          <NavButton label={user ? 'Profile' : 'Account'} active={view==='profile'} onClick={() => user ? navigate('profile') : setAuthOpen(true)}><User size={22}/></NavButton>
        </div>
      </aside>

      <div className="lg:pl-20">
        {view === 'landing' && !user ? <Landing onExplore={() => setView('explore')} onAuth={() => setAuthOpen(true)}/> :
         view === 'profile' ? <Profile profile={profile} posts={visiblePosts.filter(p => p.user_id === user?.id)} onCreate={() => restricted(() => { window.location.href='/dashboard/create' })} onSignOut={signOut}/> :
         view === 'boards' ? <Boards user={user} onAuth={() => setAuthOpen(true)}/> :
         <section className="mx-auto max-w-[1550px] px-4 py-8 lg:px-8">
           <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
             <div><p className="text-[10px] font-bold uppercase tracking-[.3em] text-[#E60023]">{view==='reels'?'Commercial Reels':view==='explore'?'Discover Spectrum':'Live Portfolio'}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{view==='reels'?'Motion that sells.':view==='explore'?'Explore the creative spectrum.':'The creative stream.'}</h1><p className="mt-2 max-w-2xl text-sm text-white/40">Real HYBRID community content, campaign references, and commercial storytelling.</p></div>
             <button onClick={() => restricted(() => { window.location.href='/dashboard/create' })} className="rounded-full bg-gradient-to-r from-[#E60023] via-[#C13584] to-[#833AB4] px-5 py-3 text-xs font-bold shadow-xl"><PlusCircle size={15} className="mr-2 inline"/>New Ad Spec</button>
           </div>
           {loading ? <div className="py-20 text-center text-sm text-white/35">Loading live creative stream…</div> :
             visiblePosts.length ? <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">{visiblePosts.map(post => <PostCard key={post.id} post={post} onGuestAction={() => setGuestPrompt(true)}/>)}</div> :
             <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.025] p-16 text-center"><Sparkles className="mx-auto mb-4 text-[#833AB4]"/><p className="text-sm text-white/45">No matching published work yet.</p></div>}
         </section>}
      </div>

      {notifications && <div className="fixed right-4 top-20 z-50 w-80 rounded-3xl border border-white/10 bg-[#0d111a]/95 p-5 shadow-2xl backdrop-blur-2xl"><div className="flex items-center justify-between"><b className="text-sm">Notifications</b><button onClick={() => setNotifications(false)}><X size={16}/></button></div><div className="mt-5 rounded-2xl border border-white/5 bg-white/5 p-4 text-xs text-white/55">You're all caught up. New likes, comments, and messages will appear here.</div></div>}

      {guestPrompt && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={() => setGuestPrompt(false)}><div onMouseDown={e=>e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d111a] p-7 text-center shadow-2xl"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#E60023]/15 text-[#ff5870]"><Bookmark size={21}/></div><h2 className="mt-4 text-xl font-black">Register to contribute</h2><p className="mt-2 text-xs leading-5 text-white/45">Explore freely. Sign in or register to save work, like posts, send Echoes, and publish commercial specs.</p><button onClick={() => {setGuestPrompt(false);setAuthOpen(true)}} className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#E60023] via-[#C13584] to-[#833AB4] py-3 text-xs font-bold">Sign In / Join HYBRID</button></div></div>}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)}/>}
    </main>
  )
}

function Landing({onExplore,onAuth}:{onExplore:()=>void;onAuth:()=>void}) {
 return <section className="relative overflow-hidden px-4 py-12 lg:px-12 lg:py-20"><div className="pointer-events-none absolute left-1/4 top-1/3 h-[420px] w-[420px] rounded-full bg-[#833AB4]/15 blur-[130px]"/><div className="pointer-events-none absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-[#E60023]/10 blur-[130px]"/><div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12"><div className="lg:col-span-7"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] text-white/60"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/>Commercial Discovery & Media Studio</div><h1 className="text-5xl font-black leading-[.95] tracking-tight sm:text-6xl lg:text-8xl">Pitch <span className="bg-gradient-to-r from-[#E60023] via-[#C13584] to-[#833AB4] bg-clip-text text-transparent">commercial work</span> that moves.</h1><p className="mt-7 max-w-2xl text-base leading-7 text-white/50">A visual workspace for creators, agencies, and brand teams to discover references, publish work, collaborate, and build campaign conversations.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={onAuth} className="rounded-full bg-gradient-to-r from-[#E60023] via-[#C13584] to-[#833AB4] px-7 py-3.5 text-sm font-bold">Register Studio</button><button onClick={onExplore} className="rounded-full border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold hover:bg-white/10">Explore Spectrum</button></div><div className="mt-12 grid max-w-xl grid-cols-3 gap-5 border-t border-white/10 pt-6"><Stat label="Live posts" value="Community data"/><Stat label="Realtime social" value="Enabled"/><Stat label="Studio tools" value="Connected"/></div></div><div className="lg:col-span-5"><div className="grid rotate-2 grid-cols-2 gap-4">{['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=700','https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=700','https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=700','https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=700'].map((src,i)=><div key={src} className={'overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-1.5 shadow-2xl transition hover:-translate-y-2 '+(i%2?'mt-10':'')}><img src={src} alt="Commercial creative" className="h-56 w-full rounded-[20px] object-cover"/></div>)}</div></div></div></section>
}
function Stat({label,value}:{label:string;value:string}){return <div><div className="text-lg font-black text-white">{value}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{label}</div></div>}
function Avatar({src}:{src?:string|null}){return <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/10">{src&&<img src={src} alt="" className="h-full w-full object-cover"/>}</div>}
function NavButton({children,onClick,label,active,accent}:{children:React.ReactNode;onClick:()=>void;label:string;active?:boolean;accent?:boolean}){return <div className="group relative"><button onClick={onClick} aria-label={label} className={'grid h-12 w-12 place-items-center rounded-2xl border transition '+(accent?'border-transparent bg-gradient-to-r from-[#E60023] via-[#C13584] to-[#833AB4] text-white shadow-lg shadow-[#E60023]/20':active?'border-white/10 bg-white/15 text-white':'border-transparent text-white/45 hover:border-white/10 hover:bg-white/10 hover:text-white')}>{children}</button><span className="pointer-events-none absolute left-14 top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-[#0d111a] px-3 py-2 text-[10px] font-bold shadow-xl group-hover:block">{label}</span></div>}
function Profile({profile,posts,onCreate,onSignOut}:{profile:any;posts:Post[];onCreate:()=>void;onSignOut:()=>void}){return <section className="mx-auto max-w-6xl px-4 py-10 lg:px-8"><div className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="flex flex-wrap items-center gap-5"><Avatar src={profile?.avatar_url}/><div className="flex-1"><h1 className="text-2xl font-black">@{profile?.username||'studio'}</h1><p className="mt-1 text-sm text-white/40">{profile?.full_name||'HYBRID creator profile'}</p></div><button onClick={onCreate} className="rounded-full bg-gradient-to-r from-[#E60023] to-[#833AB4] px-4 py-2 text-xs font-bold">Create</button><button onClick={onSignOut} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold"><LogOut size={13} className="mr-1 inline"/>Sign out</button></div></div><h2 className="mb-5 mt-8 text-xl font-black">Published work</h2><div className="columns-1 gap-5 sm:columns-2 lg:columns-3">{posts.map(p=><PostCard key={p.id} post={p} onGuestAction={() => onAuth()}/>)}</div></section>}
function Boards({user,onAuth}:{user:any;onAuth:()=>void}){return <section className="mx-auto max-w-6xl px-4 py-10 lg:px-8"><div className="rounded-3xl border border-white/10 bg-white/[.035] p-8"><p className="text-[10px] uppercase tracking-[.3em] text-[#10b981]">Brand Spaces</p><h1 className="mt-3 text-4xl font-black">Campaign boards.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/45">Organize commercial references and campaign work in the connected HYBRID workspace.</p>{user?<button onClick={()=>window.location.href='/dashboard'} className="mt-6 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold">Open workspace</button>:<button onClick={onAuth} className="mt-6 rounded-full bg-gradient-to-r from-[#E60023] to-[#833AB4] px-5 py-3 text-xs font-bold">Join to create a space</button>}</div></section>}
