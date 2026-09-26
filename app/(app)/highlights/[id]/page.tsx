'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { sb } from '../../../../lib/supabase/client'
import { useMe } from '../../../../lib/useMe'
import { Avatar } from '../../../../components/ui'

export default function HighlightViewer() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const me = useMe()
  const [h, setH] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [i, setI] = useState(0)
  useEffect(() => {
    (async () => {
      const { data } = await sb().from('highlights').select('*, owner:profiles(username,avatar_url), items:highlight_items(post:posts(id,media_url,media_type,description,created_at))').eq('id', id).maybeSingle()
      setH(data); setItems(((data?.items || []) as any[]).map(x => x.post).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at)))
    })()
  }, [id])
  const cur = items[i]
  useEffect(() => { if (!cur || cur.media_type === 'video') return; const t = setTimeout(() => i < items.length - 1 ? setI(i + 1) : router.back(), 5000); return () => clearTimeout(t) }, [i, cur?.id])
  async function del() { if (!confirm('Delete this highlight?')) return; await sb().from('highlights').delete().eq('id', id); router.push('/u/' + me.username) }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black text-white">
      <button onClick={() => router.back()} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close"><X size={24} /></button>
      {h && !items.length && <p>This highlight is empty.</p>}
      {cur && (
        <div className="relative h-full max-h-[92vh] w-full max-w-[420px] overflow-hidden bg-neutral-900 sm:rounded-2xl">
          <div className="absolute inset-x-3 top-3 z-10 flex gap-1">{items.map((_, k) => <span key={k} className={`h-0.5 flex-1 rounded ${k <= i ? 'bg-white' : 'bg-white/30'}`} />)}</div>
          <div className="absolute inset-x-3 top-6 z-10 flex items-center gap-2"><Link href={`/u/${h.owner?.username}`} className="flex items-center gap-2"><Avatar src={h.owner?.avatar_url} name={h.owner?.username} size={30} /><span className="text-sm font-semibold">{h.title}</span></Link>
            {h.user_id === me.id && <button onClick={del} className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-white/15" aria-label="Delete highlight"><Trash2 size={15} /></button>}</div>
          {cur.media_type === 'video' ? <video key={cur.id} src={cur.media_url} autoPlay playsInline className="h-full w-full object-contain" onEnded={() => i < items.length - 1 ? setI(i + 1) : router.back()} /> : <img key={cur.id} src={cur.media_url} alt="" className="h-full w-full object-contain" />}
          {cur.description && <p className="absolute inset-x-6 bottom-12 text-center text-lg font-semibold drop-shadow">{cur.description}</p>}
          <button className="absolute inset-y-16 left-0 w-1/3" onClick={() => i > 0 && setI(i - 1)} aria-label="Previous" />
          <button className="absolute inset-y-16 right-0 w-2/3" onClick={() => i < items.length - 1 ? setI(i + 1) : router.back()} aria-label="Next" />
        </div>
      )}
    </div>
  )
}
