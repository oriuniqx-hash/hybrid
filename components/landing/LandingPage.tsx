'use client'

import Link from 'next/link'

const pins = [
  {
    title: 'Kinetic Athletic Footwear Commercial',
    badge: 'Client: Footwear DTC Launch',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
    height: 'h-80',
    stat: '1.2M views · +4.8% CTR',
  },
  {
    title: 'Sparkling Citrus Apple Soda Commercial',
    badge: 'Client: Sidral Mundet',
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=600',
    height: 'h-96',
    stat: '890K views · +3.9% CTR',
  },
  {
    title: 'Fresh Fruit Nectar Macro Lighting Shoot',
    badge: 'Client: Grupo Jumex',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600',
    height: 'h-72',
    stat: '2.4M views · +5.2% CTR',
  },
  {
    title: 'Chocolate Crunch Cookie Ad Spec',
    badge: 'Client: Chokis Ad Campaign',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=600',
    height: 'h-80',
    stat: '1.8M views · +4.1% CTR',
  },
  {
    title: 'Minimalist Luxury Watch Macro Shoot',
    badge: 'OriUniqx Campaign Spec',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
    height: 'h-64',
    stat: '950K views · +4.5% CTR',
  },
  {
    title: 'Acoustic Noise-Canceling Headphones Spot',
    clientBadge: 'Client: Tech & Audio Motion',
    badge: 'Client: Tech & Audio Motion',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    height: 'h-72',
    stat: '1.1M views · +3.8% CTR',
  },
]

const features = [
  {
    title: 'FMCG & Beverage Ads',
    desc: 'Tailored commercial specs for beverage brands, packaged snacks, organic foods, and packaged consumer goods.',
    accent: 'text-fmcg-green border-fmcg-green/30 bg-fmcg-green/10',
  },
  {
    title: 'Macro Videography',
    desc: 'Ultra-slow motion liquid splashes, high-speed camera rigs, and studio lighting blueprints for high-impact visual ads.',
    accent: 'text-accent-rose border-accent-rose/30 bg-accent-rose/10',
  },
  {
    title: 'Footwear DTC Launch',
    desc: '360-degree sneaker showcases, athletic lifestyle commercial reels, and direct conversion landing page videos.',
    accent: 'text-accent-violet border-accent-violet/30 bg-accent-violet/10',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-obsidian text-slate-100">
      <header className="sticky top-0 z-40 w-full glass px-4 lg:px-8 py-3 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-black text-xl tracking-tight text-white">✦ Hybrid</span>
          <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 uppercase">
            Pro Studio
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-200"
          >
            Guest Explorer
          </Link>
          <Link
            href="/?auth=true"
            className="text-xs font-bold px-5 py-2 rounded-full brand-gradient-bg hover:opacity-95 transition text-white shadow-lg"
          >
            Sign In / Register Studio
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden py-16 lg:py-24 px-4 lg:px-12 border-b border-white/5">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-accent-violet/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-accent-rose/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>FMCG, Footwear &amp; Macro Videography Ad Platform</span>
              <span className="text-slate-500">•</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ori-gold to-accent-rose font-bold">
                OriUniqx Engine
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none text-white">
              Pitch High-Converting <span className="brand-gradient-text">Commercial Video Ads</span> &amp; Studio
              Shoots.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
              Hybrid is engineered for agency strategists, macro videographers, and brand creative directors pitching
              high-velocity campaigns for top FMCG, footwear DTC, and beverage clients.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/?auth=true"
                className="px-8 py-4 rounded-full brand-gradient-bg font-bold text-sm text-white shadow-xl hover:scale-105 transition duration-200"
              >
                Register Studio / Pitch Work
              </Link>
              <Link
                href="/explore"
                className="px-8 py-4 rounded-full bg-white/5 border border-white/10 font-semibold text-sm text-slate-200 hover:bg-white/10 transition"
              >
                Explore Ad Spectrum
              </Link>
            </div>

            <div className="pt-8 grid grid-cols-3 gap-6 border-t border-white/10 max-w-lg mx-auto lg:mx-0">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white">12.4M+</div>
                <div className="text-xs text-slate-400 mt-1">Tracked Impressions</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white">4.2x</div>
                <div className="text-xs text-slate-400 mt-1">Avg CTR Conversion Lift</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white">850+</div>
                <div className="text-xs text-slate-400 mt-1">Commercial Pitch Specs</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {pins.slice(0, 4).map((pin) => (
              <Link
                key={pin.title}
                href="/?auth=true"
                className="glass-card p-2.5 rounded-3xl overflow-hidden shadow-2xl border border-white/10 hover:border-accent-rose/40 transition block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pin.image} className={`rounded-2xl w-full ${pin.height} object-cover`} alt={pin.title} />
                <div className="p-2 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-accent-rose tracking-wider">{pin.badge}</span>
                  <h4 className="text-xs font-bold text-white truncate">{pin.title}</h4>
                  <div className="text-[10px] text-slate-400">{pin.stat}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 lg:px-12 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-violet">
            Commercial Production • Studio Lighting • Brand Licensing
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">Accelerate Your Commercial Campaign Workflow</h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Publish commercial shoot storyboards, macro video specs, and high-velocity DTC ad concepts directly to
            brand strategy teams.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-8 rounded-3xl space-y-4 border border-white/10 transition group">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${f.accent}`}>
                <span className="text-xl">✦</span>
              </div>
              <h3 className="text-xl font-bold text-white">{f.title}</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {pins.map((pin) => (
            <Link
              key={pin.title}
              href="/?auth=true"
              className="glass-card rounded-3xl overflow-hidden group relative border border-white/10 hover:border-accent-rose/50 transition block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pin.image} className={`w-full ${pin.height} object-cover group-hover:scale-105 transition duration-500`} alt={pin.title} />
              <div className="absolute top-3 left-3">
                <span className="text-[9px] uppercase font-bold px-2.5 py-1 rounded-full bg-obsidian/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                  {pin.badge}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                <h4 className="text-xs font-bold text-white truncate">{pin.title}</h4>
                <div className="text-[10px] text-slate-300">{pin.stat}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
