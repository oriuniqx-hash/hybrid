'use client'

import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  return <div ref={ref} className="fixed bottom-5 right-5 z-[60]">
    <button onClick={() => setOpen(v => !v)} aria-label="Notifications" className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#11141c]/90 text-white/70 shadow-2xl backdrop-blur-xl hover:text-white"><Bell size={20}/></button>
    {open && <div className="absolute bottom-14 right-0 w-80 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c10]/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 p-4"><div><p className="font-bold">Notifications</p><p className="text-xs text-white/35">Your latest activity</p></div><button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X size={17}/></button></div>
      <div className="p-4 text-sm text-white/45">You&apos;re all caught up.</div>
    </div>}
  </div>
}
