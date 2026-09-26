'use client'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { Post } from '../../lib/types'
import { sb } from '../../lib/supabase/client'
import PinCard from './PinCard'
import { Empty, GridSkeleton, Spinner } from '../ui'

export type Loader = (offset: number, limit: number) => Promise<Post[]>

export default function Feed({ loader, deps = [], empty, pageSize = 30 }: { loader: Loader; deps?: unknown[]; empty?: ReactNode; pageSize?: number }) {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productIds, setProductIds] = useState<Set<string>>(new Set())
  const sentinel = useRef<HTMLDivElement>(null)
  const gen = useRef(0)

  const more = useCallback(async (reset = false) => {
    if (loading && !reset) return
    const g = reset ? ++gen.current : gen.current
    setLoading(true)
    const offset = reset ? 0 : posts?.length || 0
    const page = await loader(offset, pageSize).catch(() => [] as Post[])
    if (g !== gen.current) return
    setPosts(prev => {
      const base = reset ? [] : prev || []
      const seen = new Set(base.map(p => p.id))
      return [...base, ...page.filter(p => !seen.has(p.id))]
    })
    if (page.length) {
      const { data } = await sb().from('products').select('post_id').in('post_id', page.map(p => p.id))
      setProductIds(prev => new Set([...(reset ? [] : Array.from(prev)), ...(data || []).map((r: any) => r.post_id)]))
    }
    setDone(page.length < pageSize)
    setLoading(false)
  }, [loader, posts, loading, pageSize])

  useEffect(() => { setPosts(null); setDone(false); more(true) }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinel.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !done && !loading && posts) more() }, { rootMargin: '800px' })
    io.observe(el); return () => io.disconnect()
  }, [done, loading, posts, more])

  if (!posts) return <GridSkeleton />
  if (posts.length === 0) return <>{empty || <Empty title="Nothing here yet" body="When people publish pins that match, they'll show up here." />}</>
  return (
    <>
      <div className="masonry">{posts.map(p => <PinCard key={p.id} post={p} hasProducts={productIds.has(p.id)} />)}</div>
      <div ref={sentinel} className="grid h-16 place-items-center">{loading && <Spinner />}</div>
    </>
  )
}
