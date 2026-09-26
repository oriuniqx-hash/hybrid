'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ImagePlus, Link2, Plus, Trash2, X, Clapperboard, CircleDashed, LayoutGrid, CalendarClock, ShoppingBag, Layers, Radio } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { useMe } from '../../../lib/useMe'
import { probeMedia, uploadMedia, type Probed } from '../../../lib/media'
import { CATEGORIES, slug, type Board } from '../../../lib/types'
import { hashtags, parseTags } from '../../../lib/format'
import { toast } from '../../../components/ui'

type Kind = 'pin' | 'reel' | 'story'
type Item = { file?: File; url: string; probe: Probed }
type Product = { name: string; price: string; url: string; merchant: string }

export default function CreatePage() {
  const me = useMe()
  const router = useRouter()
  const params = useSearchParams()
  const [kind, setKind] = useState<Kind>((params.get('type') as Kind) || 'pin')
  const [items, setItems] = useState<Item[]>([])
  const [fromUrl, setFromUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [alt, setAlt] = useState('')
  const [location, setLocation] = useState('')
  const [boardId, setBoardId] = useState('')
  const [boards, setBoards] = useState<Board[]>([])
  const [allowComments, setAllowComments] = useState(true)
  const [partner, setPartner] = useState('')
  const [schedule, setSchedule] = useState('')
  const [audience, setAudience] = useState<'public' | 'close_friends'>('public')
  const [products, setProducts] = useState<Product[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  useEffect(() => { sb().from('boards').select('*').eq('user_id', me.id).order('name').then(({ data }) => setBoards(data || [])) }, [me.id])
  useEffect(() => { setItems([]) }, [kind])

  const accept = kind === 'reel' ? 'video/*' : 'image/*,video/*'
  const multi = kind === 'pin'

  async function addFiles(list: FileList | null) {
    if (!list) return
    const files = Array.from(list).slice(0, multi ? 10 - items.length : 1)
    const next: Item[] = []
    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) { toast(f.name + ' is larger than 50 MB'); continue }
      if (kind === 'reel' && !f.type.startsWith('video/')) { toast('Reels must be videos'); continue }
      next.push({ file: f, url: URL.createObjectURL(f), probe: await probeMedia(f) })
    }
    setItems(multi ? [...items, ...next] : next)
  }
  async function addUrl() {
    const u = fromUrl.trim(); if (!/^https?:\/\//.test(u)) return toast('Enter an image URL starting with https://')
    const probe = await new Promise<Probed>(res => { const i = new Image(); i.onload = () => res({ kind: 'image', aspect: i.naturalWidth / i.naturalHeight || 1, color: null }); i.onerror = () => res({ kind: 'image', aspect: 1, color: null }); i.src = u })
    setItems(multi ? [...items, { url: u, probe }] : [{ url: u, probe }]); if (!link) setLink(u); setFromUrl('')
  }

  const allTags = useMemo(() => Array.from(new Set([...parseTags(tags), ...hashtags(description), ...(category ? [slug(category)] : [])])), [tags, description, category])

  async function publish() {
    if (!items.length) return toast('Add a photo or video first')
    setBusy(true)
    try {
      const urls: string[] = []
      for (const [k, it] of items.entries()) {
        setProgress(`Uploading ${k + 1} of ${items.length}…`)
        urls.push(it.file ? await uploadMedia(it.file, me.id) : it.url)
      }
      setProgress('Publishing…')
      const first = items[0]
      const isStory = kind === 'story'
      const row = {
        user_id: me.id, type: kind, media_url: urls[0], media_type: first.probe.kind,
        aspect_ratio: first.probe.aspect, dominant_color: first.probe.color,
        title: isStory ? null : title.trim() || null, description: description.trim() || null,
        source_url: link.trim() || null, tags: allTags, category: category || null, alt_text: alt.trim() || null,
        location: location.trim() || null, board_id: boardId || null, allow_comments: allowComments,
        is_paid_partnership: !!partner.trim(), partner_brand: partner.trim() || null,
        publish_at: schedule ? new Date(schedule).toISOString() : new Date().toISOString(),
        expires_at: isStory ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null,
        audience: isStory ? audience : 'public',
      }
      const { data: post, error } = await sb().from('posts').insert(row).select('id').single()
      if (error || !post) throw error || new Error('Could not publish')
      if (urls.length > 1) await sb().from('post_media').insert(urls.map((u, k) => ({ post_id: post.id, url: u, media_type: items[k].probe.kind, aspect_ratio: items[k].probe.aspect, position: k })))
      const prods = products.filter(p => p.name.trim())
      if (prods.length) await sb().from('products').insert(prods.map(p => ({ post_id: post.id, user_id: me.id, name: p.name.trim(), price: p.price ? Number(p.price) : null, url: p.url.trim() || null, merchant: p.merchant.trim() || null })))
      if (boardId) await sb().from('board_pins').insert({ board_id: boardId, post_id: post.id, user_id: me.id })
      toast(schedule ? 'Scheduled' : 'Published')
      router.push(isStory ? `/stories/${me.username}` : kind === 'reel' ? '/reels?id=' + post.id : '/p/' + post.id)
    } catch (e: any) {
      toast(e?.message || 'Something went wrong'); setBusy(false); setProgress('')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold">Create</h1>
        <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface2 p-1">
          {([['pin', 'Pin / Post', LayoutGrid], ['reel', 'Reel', Clapperboard], ['story', 'Story', CircleDashed]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setKind(k)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${kind === k ? 'bg-surface shadow-card' : 'text-muted'}`}><I size={16} />{l}</button>
          ))}
          <Link href="/create/collage" className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink"><Layers size={16} />Collage</Link>
          <Link href="/live/new" className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink"><Radio size={16} />Go live</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div>
          {items.length === 0 ? (
            <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-surface2/50 p-6 text-center transition hover:border-accent"
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
              <ImagePlus size={36} className="text-muted" />
              <span className="mt-3 font-semibold">{kind === 'reel' ? 'Choose a vertical video' : multi ? 'Choose photos or videos' : 'Choose a photo or video'}</span>
              <span className="mt-1 text-xs text-muted">Drag & drop or click · up to 50 MB{multi ? ' · up to 10 for a carousel' : ''}</span>
              <input type="file" accept={accept} multiple={multi} className="sr-only" onChange={e => addFiles(e.target.files)} />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-3xl bg-surface2" style={{ aspectRatio: String(Math.max(items[0].probe.aspect, 0.56)) }}>
                {items[0].probe.kind === 'video' ? <video src={items[0].url} controls className="h-full w-full object-cover" /> : <img src={items[0].url} alt="" className="h-full w-full object-cover" />}
                <button onClick={() => setItems(items.slice(1))} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove"><X size={18} /></button>
              </div>
              {multi && (
                <div className="flex gap-2 overflow-x-auto">
                  {items.map((it, k) => (
                    <div key={k} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2">
                      {it.probe.kind === 'video' ? <video src={it.url} className="h-full w-full object-cover" /> : <img src={it.url} alt="" className="h-full w-full object-cover" />}
                      <button onClick={() => setItems(items.filter((_, j) => j !== k))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove"><X size={12} /></button>
                    </div>
                  ))}
                  {items.length < 10 && <label className="grid h-16 w-16 shrink-0 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line"><Plus size={18} /><input type="file" accept={accept} multiple className="sr-only" onChange={e => addFiles(e.target.files)} /></label>}
                </div>
              )}
            </div>
          )}
          {kind === 'pin' && (
            <div className="mt-4">
              <label className="label" htmlFor="fu">Or save from a URL</label>
              <div className="flex gap-2"><input id="fu" className="input" placeholder="https://…/image.jpg" value={fromUrl} onChange={e => setFromUrl(e.target.value)} /><button onClick={addUrl} className="btn-ghost shrink-0"><Link2 size={15} />Add</button></div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {kind !== 'story' && <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a title" /></div>}
          <div><label className="label" htmlFor="d">{kind === 'story' ? 'Text on story' : 'Description / caption'}</label><textarea id="d" className="input min-h-28" maxLength={2200} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell everyone what it's about. Use #hashtags and @mentions." /></div>
          {kind !== 'story' && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className="label" htmlFor="l">Destination link</label><input id="l" className="input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://" /></div>
                <div><label className="label" htmlFor="c">Category</label><select id="c" className="input" value={category} onChange={e => setCategory(e.target.value)}><option value="">Choose a topic</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="label" htmlFor="tg">Tags</label><input id="tg" className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="minimal, bedroom, oak" /></div>
                <div><label className="label" htmlFor="b">Save to board</label><select id="b" className="input" value={boardId} onChange={e => setBoardId(e.target.value)}><option value="">No board</option>{boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><label className="label" htmlFor="a">Alt text</label><input id="a" className="input" value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe the image for screen readers" /></div>
                <div><label className="label" htmlFor="lo">Location</label><input id="lo" className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Add a place" /></div>
              </div>
              {allTags.length > 0 && <div className="flex flex-wrap gap-1.5">{allTags.map(t => <span key={t} className="chip text-xs">#{t}</span>)}</div>}

              <details className="card p-4" open={products.length > 0}>
                <summary className="flex cursor-pointer items-center gap-2 font-semibold"><ShoppingBag size={17} />Tag products <span className="text-xs font-normal text-muted">make this pin shoppable</span></summary>
                <div className="mt-4 space-y-3">
                  {products.map((p, k) => (
                    <div key={k} className="grid gap-2 sm:grid-cols-[1fr_110px_1fr_auto]">
                      <input className="input" placeholder="Product name" value={p.name} onChange={e => setProducts(products.map((x, j) => j === k ? { ...x, name: e.target.value } : x))} />
                      <input className="input" placeholder="Price ₹" inputMode="decimal" value={p.price} onChange={e => setProducts(products.map((x, j) => j === k ? { ...x, price: e.target.value.replace(/[^0-9.]/g, '') } : x))} />
                      <input className="input" placeholder="Product URL" value={p.url} onChange={e => setProducts(products.map((x, j) => j === k ? { ...x, url: e.target.value } : x))} />
                      <button onClick={() => setProducts(products.filter((_, j) => j !== k))} className="icon-btn" aria-label="Remove product"><Trash2 size={16} /></button>
                      <input className="input sm:col-span-3" placeholder="Merchant / store (optional)" value={p.merchant} onChange={e => setProducts(products.map((x, j) => j === k ? { ...x, merchant: e.target.value } : x))} />
                    </div>
                  ))}
                  <button onClick={() => setProducts([...products, { name: '', price: '', url: '', merchant: '' }])} className="btn-ghost"><Plus size={15} />Add product</button>
                </div>
              </details>

              <details className="card p-4">
                <summary className="cursor-pointer font-semibold">Advanced settings</summary>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center justify-between gap-4 text-sm"><span>Allow comments</span><input type="checkbox" checked={allowComments} onChange={e => setAllowComments(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" /></label>
                  <div><label className="label" htmlFor="pp">Paid partnership with brand</label><input id="pp" className="input" value={partner} onChange={e => setPartner(e.target.value)} placeholder="Brand name (adds a 'Paid partnership' label)" /></div>
                  <div><label className="label flex items-center gap-1.5" htmlFor="sc"><CalendarClock size={13} />Schedule</label><input id="sc" type="datetime-local" className="input" value={schedule} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setSchedule(e.target.value)} /><p className="mt-1 text-xs text-muted">Leave empty to publish now.</p></div>
                </div>
              </details>
            </>
          )}
          {kind === 'story' && (
            <div><span className="label">Audience</span>
              <div className="flex gap-2">
                <button onClick={() => setAudience('public')} className={`chip ${audience === 'public' ? 'chip-active' : ''}`}>Everyone</button>
                <button onClick={() => setAudience('close_friends')} className={`chip ${audience === 'close_friends' ? 'bg-ok text-white hover:bg-ok' : ''}`}>Close friends</button>
              </div>
              <p className="mt-2 text-xs text-muted">Stories disappear after 24 hours. Save them to a Highlight to keep them on your profile.</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
            {progress && <span className="text-sm text-muted">{progress}</span>}
            <button disabled={busy || !items.length} onClick={publish} className="btn-primary px-6 py-3">{schedule ? 'Schedule' : kind === 'story' ? 'Share to story' : 'Publish'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
