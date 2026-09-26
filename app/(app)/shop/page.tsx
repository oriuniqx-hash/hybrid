'use client'
import { useCallback, useEffect, useState } from 'react'
import { ShoppingBag, Search } from 'lucide-react'
import { sb } from '../../../lib/supabase/client'
import { Empty, Spinner } from '../../../components/ui'
import { ProductGrid } from '../../../components/social/Tiles'

export default function ShopPage() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<'new' | 'low' | 'high'>('new')
  const [list, setList] = useState<any[] | null>(null)
  const load = useCallback(async () => {
    setList(null)
    let qb = sb().from('products').select('*, post:posts(id,media_url,thumbnail_url,title,saves_count)').limit(120)
    if (term) qb = qb.or(`name.ilike.%${term}%,merchant.ilike.%${term}%`)
    if (maxPrice) qb = qb.lte('price', Number(maxPrice))
    qb = sort === 'low' ? qb.order('price', { ascending: true, nullsFirst: false }) : sort === 'high' ? qb.order('price', { ascending: false, nullsFirst: false }) : qb.order('created_at', { ascending: false })
    const { data } = await qb; setList((data || []).filter((p: any) => p.post))
  }, [term, maxPrice, sort])
  useEffect(() => { load() }, [load])
  return (
    <div className="mx-auto max-w-[1600px] px-3 py-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold">Shop</h1><p className="mt-1 text-sm text-muted">Products tagged by creators and businesses in their pins.</p></div>
        <form onSubmit={e => { e.preventDefault(); setTerm(q.trim()) }} className="flex flex-wrap gap-2">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products" className="input w-56 pl-9" /></div>
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Max ₹" className="input w-28" inputMode="numeric" />
          <select value={sort} onChange={e => setSort(e.target.value as any)} className="input w-40" aria-label="Sort"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select>
        </form>
      </div>
      <div className="mt-6">{!list ? <div className="grid place-items-center py-16"><Spinner /></div> : !list.length ? <Empty icon={<ShoppingBag size={24} />} title="No products yet" body="When a creator tags products on a pin, they appear here with prices and links to the store." action={{ href: '/create', label: 'Tag products on a pin' }} /> : <ProductGrid list={list} />}</div>
    </div>
  )
}
