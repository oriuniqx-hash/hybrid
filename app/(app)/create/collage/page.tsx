'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp, Copy, FlipHorizontal, ImagePlus, Images, Loader2, Redo2, RotateCw, Trash2, Type, Undo2, X } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { uploadMedia } from '../../../../lib/media'
import { CATEGORIES, slug, type Board } from '../../../../lib/types'
import { hashtags, parseTags } from '../../../../lib/format'
import { Modal, Spinner, toast } from '../../../../components/ui'
import { exportCollage, FONTS, shapeCss, type Layer, type Shape, W, H } from '../../../../lib/collage'

const BGS = ['#f4f1ec', '#ffffff', '#111111', '#e9d8c4', '#f7d6d0', '#d7e3d4', '#d4dff0', '#f3e7a8', '#2b3a55', '#6b2d3c']
const uid = () => Math.random().toString(36).slice(2, 10)

export default function CollagePage() {
  const me = useMe()
  const router = useRouter()
  const params = useSearchParams()
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const [layers, setLayersRaw] = useState<Layer[]>([])
  const [bg, setBg] = useState(BGS[0])
  const [sel, setSel] = useState<string | null>(null)
  const [past, setPast] = useState<Layer[][]>([])
  const [future, setFuture] = useState<Layer[][]>([])
  const [picker, setPicker] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [remixOf, setRemixOf] = useState<string | null>(null)
  const [step, setStep] = useState<'edit' | 'details'>('edit')
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState(''); const [tags, setTags] = useState('')
  const [boards, setBoards] = useState<Board[]>([]); const [boardId, setBoardId] = useState('')
  const [busy, setBusy] = useState(false)

  const setLayers = useCallback((next: Layer[] | ((l: Layer[]) => Layer[]), record = true) => {
    setLayersRaw(prev => {
      const v = typeof next === 'function' ? (next as any)(prev) : next
      if (record) { setPast(p => [...p.slice(-40), prev]); setFuture([]) }
      return v
    })
  }, [])
  const undo = () => { if (!past.length) return; setFuture(f => [layers, ...f]); setLayersRaw(past[past.length - 1]); setPast(past.slice(0, -1)) }
  const redo = () => { if (!future.length) return; setPast(p => [...p, layers]); setLayersRaw(future[0]); setFuture(future.slice(1)) }

  useEffect(() => {
    const fit = () => { const el = stageRef.current?.parentElement; if (el) setScale(Math.min(el.clientWidth, 560) / W) }
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit)
  }, [step])
  useEffect(() => { sb().from('boards').select('*').eq('user_id', me.id).order('name').then(({ data }) => setBoards(data || [])) }, [me.id])
  useEffect(() => {
    const remix = params.get('remix'), add = params.get('add')
    ;(async () => {
      if (remix) {
        const { data } = await sb().from('collages').select('*').eq('post_id', remix).maybeSingle()
        if (data) { setLayersRaw(data.layers as Layer[]); setBg(data.background); setRemixOf(remix); toast('Remixing — make it yours') }
      }
      if (add) {
        const { data } = await sb().from('posts').select('id,media_url,thumbnail_url,aspect_ratio,media_type').eq('id', add).maybeSingle()
        if (data && data.media_type === 'image') addImage(data.media_url, data.aspect_ratio, data.id)
      }
    })()
  }, [])

  function addImage(src: string, aspect: number, postId?: string) {
    const w = aspect >= 1 ? 460 : 460 * aspect, h = aspect >= 1 ? 460 / aspect : 460
    const l: Layer = { id: uid(), kind: 'image', src, postId, x: W / 2 + (Math.random() - .5) * 160, y: H / 2 + (Math.random() - .5) * 200, w, h, rot: 0, shape: 'rect', opacity: 1, flip: false }
    setLayers(ls => [...ls, l]); setSel(l.id)
  }
  function addText() {
    const l: Layer = { id: uid(), kind: 'text', text: 'Your words', x: W / 2, y: H / 2, w: 0, h: 0, rot: 0, size: 72, color: bg === '#111111' || bg === '#2b3a55' || bg === '#6b2d3c' ? '#ffffff' : '#111111', font: 'display', highlight: null, opacity: 1, flip: false, shape: 'rect' }
    setLayers(ls => [...ls, l]); setSel(l.id)
  }
  async function upload(files: FileList | null) {
    if (!files) return
    for (const f of Array.from(files).slice(0, 10)) {
      if (!f.type.startsWith('image/')) { toast('Collages use photos'); continue }
      setUploading(n => n + 1)
      try {
        const aspect = await new Promise<number>(res => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight || 1); i.onerror = () => res(1); i.src = URL.createObjectURL(f) })
        const url = await uploadMedia(f, me.id); addImage(url, aspect)
      } catch (e: any) { toast(e.message) } finally { setUploading(n => n - 1) }
    }
  }

  const update = (id: string, patch: Partial<Layer>, record = true) => setLayers(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l), record)
  const selected = layers.find(l => l.id === sel) || null
  const move = (dir: 1 | -1) => setLayers(ls => { const i = ls.findIndex(l => l.id === sel); const j = i + dir; if (i < 0 || j < 0 || j >= ls.length) return ls; const c = [...ls]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const remove = () => { if (!sel) return; setLayers(ls => ls.filter(l => l.id !== sel)); setSel(null) }
  const duplicate = () => { if (!selected) return; const c = { ...selected, id: uid(), x: selected.x + 40, y: selected.y + 40 }; setLayers(ls => [...ls, c]); setSel(c.id) }

  // pointer interactions: move / scale / rotate
  function startDrag(e: React.PointerEvent, l: Layer, mode: 'move' | 'scale' | 'rotate') {
    e.stopPropagation(); e.preventDefault(); setSel(l.id)
    const rect = stageRef.current!.getBoundingClientRect()
    const toStage = (ev: PointerEvent | React.PointerEvent) => ({ x: (ev.clientX - rect.left) / scale, y: (ev.clientY - rect.top) / scale })
    const p0 = toStage(e), start = { ...l }
    const d0 = Math.hypot(p0.x - l.x, p0.y - l.y) || 1
    const a0 = Math.atan2(p0.y - l.y, p0.x - l.x) * 180 / Math.PI
    setPast(p => [...p.slice(-40), layers]); setFuture([])
    const onMove = (ev: PointerEvent) => {
      const p = toStage(ev)
      if (mode === 'move') update(l.id, { x: start.x + p.x - p0.x, y: start.y + p.y - p0.y }, false)
      else if (mode === 'scale') {
        const k = Math.max(0.1, Math.hypot(p.x - l.x, p.y - l.y) / d0)
        update(l.id, l.kind === 'text' ? { size: Math.max(14, Math.min(400, (start.size || 72) * k)) } : { w: Math.max(40, start.w * k), h: Math.max(40, start.h * k) }, false)
      } else {
        let r = start.rot + Math.atan2(p.y - l.y, p.x - l.x) * 180 / Math.PI - a0
        const snap = Math.round(r / 45) * 45; if (Math.abs(r - snap) < 4) r = snap
        update(l.id, { rot: r }, false)
      }
    }
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp)
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || step !== 'edit') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); remove() }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
      if (sel && e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 20 : 4; const s = layers.find(l => l.id === sel)!; update(sel, { x: s.x + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), y: s.y + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0) }) }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  async function next() {
    if (!layers.length) return toast('Add at least one photo or text')
    setBusy(true); setSel(null)
    try { const b = await exportCollage(layers, bg); setBlob(b); setPreview(URL.createObjectURL(b)); setStep('details') }
    catch { toast("One of the images doesn't allow editing. Remove it and try again.") }
    setBusy(false)
  }
  async function publish() {
    if (!blob) return
    setBusy(true)
    try {
      const url = await uploadMedia(new File([blob], 'collage.jpg', { type: 'image/jpeg' }), me.id)
      const allTags = Array.from(new Set(['collage', ...parseTags(tags), ...hashtags(description), ...(category ? [slug(category)] : [])]))
      const sources = Array.from(new Set(layers.map(l => l.postId).filter(Boolean))) as string[]
      const { data: post, error } = await sb().from('posts').insert({ user_id: me.id, type: 'pin', media_type: 'image', media_url: url, aspect_ratio: W / H, dominant_color: bg, title: title.trim() || null, description: description.trim() || null, tags: allTags, category: category || null, board_id: boardId || null, is_collage: true, alt_text: 'Collage' + (title ? ': ' + title : '') }).select('id').single()
      if (error || !post) throw error
      const { error: e2 } = await sb().from('collages').insert({ post_id: post.id, user_id: me.id, background: bg, layers, source_post_ids: sources, remixed_from: remixOf })
      if (e2) throw e2
      if (boardId) await sb().from('board_pins').insert({ board_id: boardId, post_id: post.id, user_id: me.id })
      toast('Collage published'); router.push('/p/' + post.id)
    } catch (e: any) { toast(e?.message || 'Could not publish'); setBusy(false) }
  }

  if (step === 'details') return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={() => setStep('edit')} className="btn-ghost">← Back to editing</button>
      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
        {preview && <img src={preview} alt="Collage preview" className="w-full rounded-3xl shadow-card" />}
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-extrabold">Publish collage</h1>
          <div><label className="label" htmlFor="ct">Title</label><input id="ct" className="input" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} /></div>
          <div><label className="label" htmlFor="cd">Description</label><textarea id="cd" className="input min-h-24" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell everyone about it · #hashtags work" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="cc">Topic</label><select id="cc" className="input" value={category} onChange={e => setCategory(e.target.value)}><option value="">Choose a topic</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="cb">Board</label><select id="cb" className="input" value={boardId} onChange={e => setBoardId(e.target.value)}><option value="">No board</option>{boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div><label className="label" htmlFor="ctag">Tags</label><input id="ctag" className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="summer, moodboard" /></div>
          {remixOf && <p className="text-sm text-muted">This will be credited as a remix of the original collage.</p>}
          <button disabled={busy} onClick={publish} className="btn-primary w-full py-3">{busy ? 'Publishing…' : 'Publish'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl font-extrabold">{remixOf ? 'Remix collage' : 'Collage'}</h1><p className="text-sm text-muted">Layer photos and pins, add words, then publish as a pin.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!past.length} className="icon-btn" aria-label="Undo"><Undo2 size={19} /></button>
          <button onClick={redo} disabled={!future.length} className="icon-btn" aria-label="Redo"><Redo2 size={19} /></button>
          <button onClick={next} disabled={busy || uploading > 0} className="btn-primary px-6">{busy ? 'Preparing…' : 'Next'}</button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex justify-center">
          <div className="w-full max-w-[560px]">
            <div ref={stageRef} onPointerDown={() => setSel(null)} className="relative mx-auto touch-none select-none overflow-hidden rounded-3xl shadow-card" style={{ width: W * scale, height: H * scale, background: bg }}>
              {layers.length === 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center p-10 text-center"><p className="text-sm" style={{ color: bg === '#111111' ? '#aaa' : '#777' }}>Add photos, pins or text to start your collage</p></div>}
              {layers.map(l => {
                const isSel = l.id === sel
                const style: React.CSSProperties = { left: l.x * scale, top: l.y * scale, transform: `translate(-50%,-50%) rotate(${l.rot}deg)`, opacity: l.opacity }
                return (
                  <div key={l.id} className="absolute" style={style} onPointerDown={e => startDrag(e, l, 'move')}>
                    {l.kind === 'image' ? (
                      <div style={{ width: l.w * scale, height: l.h * scale, ...shapeCss(l.shape, l.w * scale, l.h * scale), transform: l.flip ? 'scaleX(-1)' : undefined }} className="overflow-hidden">
                        <img src={l.src} crossOrigin="anonymous" alt="" draggable={false} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="whitespace-pre text-center leading-[1.1]" style={{ fontFamily: FONTS[l.font || 'display'].css, fontWeight: FONTS[l.font || 'display'].weight, fontSize: (l.size || 72) * scale, color: l.color, background: l.highlight || undefined, padding: l.highlight ? `${0.12 * (l.size || 72) * scale}px ${0.3 * (l.size || 72) * scale}px` : 0, borderRadius: l.highlight ? 0.2 * (l.size || 72) * scale : 0 }}>{l.text}</div>
                    )}
                    {isSel && <>
                      <span className="pointer-events-none absolute -inset-1 rounded-md border-2 border-accent" />
                      <button onPointerDown={e => startDrag(e, l, 'scale')} className="absolute -bottom-3 -right-3 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-accent shadow" aria-label="Resize" />
                      <button onPointerDown={e => startDrag(e, l, 'rotate')} className="absolute -top-10 left-1/2 grid h-7 w-7 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-ink text-bg shadow" aria-label="Rotate"><RotateCw size={13} /></button>
                    </>}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <label className="btn-ghost cursor-pointer">{uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}Upload<input type="file" accept="image/*" multiple className="sr-only" onChange={e => { upload(e.target.files); e.target.value = '' }} /></label>
              <button onClick={() => setPicker(true)} className="btn-ghost"><Images size={16} />From pins</button>
              <button onClick={addText} className="btn-ghost"><Type size={16} />Text</button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-4">
            <p className="label">Background</p>
            <div className="flex flex-wrap gap-2">{BGS.map(c => <button key={c} onClick={() => setBg(c)} style={{ background: c }} className={`h-8 w-8 rounded-full border border-line ${bg === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`} aria-label={'Background ' + c} />)}
              <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-line" style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }} aria-label="Custom colour"><input type="color" value={bg} onChange={e => setBg(e.target.value)} className="absolute inset-0 opacity-0" /></label></div>
          </div>

          {selected ? (
            <div className="card space-y-4 p-4">
              <div className="flex items-center justify-between"><p className="font-semibold">{selected.kind === 'text' ? 'Text' : 'Image'}</p><button onClick={() => setSel(null)} className="icon-btn" aria-label="Deselect"><X size={16} /></button></div>
              {selected.kind === 'text' ? <>
                <textarea className="input min-h-20" value={selected.text} onChange={e => update(selected.id, { text: e.target.value }, false)} onBlur={() => setPast(p => p)} />
                <div className="flex flex-wrap gap-1.5">{(Object.keys(FONTS) as (keyof typeof FONTS)[]).map(f => <button key={f} onClick={() => update(selected.id, { font: f })} className={`chip text-sm ${selected.font === f ? 'chip-active' : ''}`} style={{ fontFamily: FONTS[f].css }}>{FONTS[f].label}</button>)}</div>
                <div className="flex items-center gap-3"><label className="text-xs text-muted" htmlFor="tc">Colour</label><input id="tc" type="color" value={selected.color} onChange={e => update(selected.id, { color: e.target.value }, false)} className="h-8 w-10 rounded" />
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={!!selected.highlight} onChange={e => update(selected.id, { highlight: e.target.checked ? (selected.color === '#ffffff' ? '#111111' : '#ffffff') : null })} />Label background</label></div>
                {selected.highlight && <div className="flex items-center gap-3"><label className="text-xs text-muted" htmlFor="hc">Label colour</label><input id="hc" type="color" value={selected.highlight} onChange={e => update(selected.id, { highlight: e.target.value }, false)} className="h-8 w-10 rounded" /></div>}
                <div><label className="text-xs text-muted" htmlFor="ts">Size</label><input id="ts" type="range" min={14} max={300} value={selected.size} onChange={e => update(selected.id, { size: Number(e.target.value) }, false)} className="w-full accent-[rgb(var(--accent))]" /></div>
              </> : <>
                <div><p className="mb-1.5 text-xs text-muted">Shape</p><div className="grid grid-cols-4 gap-1.5">{(['rect', 'rounded', 'circle', 'arch'] as Shape[]).map(s => <button key={s} onClick={() => update(selected.id, { shape: s })} className={`grid h-12 place-items-center rounded-xl border ${selected.shape === s ? 'border-ink bg-surface2' : 'border-line'}`} aria-label={s}><span className="h-6 w-6 bg-ink/70" style={shapeCss(s, 24, 24)} /></button>)}</div></div>
                <button onClick={() => update(selected.id, { flip: !selected.flip })} className="btn-ghost w-full"><FlipHorizontal size={16} />Flip</button>
                {selected.kind === 'image' && <button onClick={() => update(selected.id, selected.h > selected.w ? { h: selected.w } : { w: selected.h })} className="btn-ghost w-full">Crop to square</button>}
              </>}
              <div><label className="text-xs text-muted" htmlFor="op">Opacity</label><input id="op" type="range" min={10} max={100} value={Math.round(selected.opacity * 100)} onChange={e => update(selected.id, { opacity: Number(e.target.value) / 100 }, false)} className="w-full accent-[rgb(var(--accent))]" /></div>
              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={() => move(1)} className="btn-ghost px-0" aria-label="Bring forward" title="Bring forward"><ArrowUp size={16} /></button>
                <button onClick={() => move(-1)} className="btn-ghost px-0" aria-label="Send backward" title="Send backward"><ArrowDown size={16} /></button>
                <button onClick={duplicate} className="btn-ghost px-0" aria-label="Duplicate" title="Duplicate"><Copy size={16} /></button>
                <button onClick={remove} className="btn-ghost px-0 text-accent" aria-label="Delete" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ) : (
            <div className="card p-4 text-sm text-muted">
              <p className="font-semibold text-ink">Tips</p>
              <ul className="mt-2 list-disc space-y-1 pl-4"><li>Drag to move, pull the pink dot to resize, spin with the top handle.</li><li>Arrow keys nudge; Delete removes; Ctrl/Cmd+Z undoes.</li><li>Pins you use are credited on the collage.</li></ul>
            </div>
          )}
          {layers.length > 0 && <div className="card p-4"><p className="label">Layers ({layers.length})</p><div className="space-y-1">{[...layers].reverse().map(l => <button key={l.id} onClick={() => setSel(l.id)} className={`flex w-full items-center gap-3 rounded-xl p-1.5 text-left text-sm ${l.id === sel ? 'bg-surface2' : 'hover:bg-surface2'}`}>{l.kind === 'image' ? <img src={l.src} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface2"><Type size={14} /></span>}<span className="truncate">{l.kind === 'text' ? l.text : l.postId ? 'Pin' : 'Photo'}</span></button>)}</div></div>}
        </aside>
      </div>
      {picker && <PinPicker onClose={() => setPicker(false)} onPick={p => { addImage(p.media_url, p.aspect_ratio, p.id); setPicker(false) }} />}
    </div>
  )
}

function PinPicker({ onClose, onPick }: { onClose: () => void; onPick: (p: any) => void }) {
  const me = useMe()
  const [tab, setTab] = useState<'saved' | 'mine' | 'search'>('saved')
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[] | null>(null)
  useEffect(() => {
    setList(null)
    const t = setTimeout(async () => {
      const s = sb(); const sel = 'id,media_url,aspect_ratio,title,media_type'
      if (tab === 'saved') { const { data } = await s.from('board_pins').select(`post:posts(${sel})`).eq('user_id', me.id).order('created_at', { ascending: false }).limit(60); setList((data || []).map((r: any) => r.post).filter((p: any) => p && p.media_type === 'image')) }
      else if (tab === 'mine') { const { data } = await s.from('posts').select(sel).eq('user_id', me.id).eq('type', 'pin').eq('media_type', 'image').order('created_at', { ascending: false }).limit(60); setList(data || []) }
      else { let qb = s.from('posts').select(sel).eq('type', 'pin').eq('media_type', 'image').order('saves_count', { ascending: false }).limit(60); if (q.trim()) qb = qb.or(`title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`); const { data } = await qb; setList(data || []) }
    }, tab === 'search' ? 250 : 0)
    return () => clearTimeout(t)
  }, [tab, q])
  return (
    <Modal open onClose={onClose} title="Add from pins" wide>
      <div className="mb-3 flex gap-2">{([['saved', 'Saved'], ['mine', 'Your pins'], ['search', 'Search all']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'chip-active' : ''}`}>{l}</button>)}</div>
      {tab === 'search' && <input autoFocus className="input mb-3" placeholder="Search pins" value={q} onChange={e => setQ(e.target.value)} />}
      {!list ? <div className="grid place-items-center py-10"><Spinner /></div> : !list.length ? <p className="py-10 text-center text-sm text-muted">{tab === 'saved' ? 'Pins you save to boards show up here.' : tab === 'mine' ? 'Your photo pins show up here.' : 'No pins found.'}</p> :
        <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">{list.map(p => <button key={p.id} onClick={() => onPick(p)} className="overflow-hidden rounded-xl bg-surface2 transition hover:opacity-80"><img src={p.media_url} alt={p.title || ''} className="aspect-square w-full object-cover" /></button>)}</div>}
    </Modal>
  )
}
