'use client'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { Heart } from 'lucide-react'

export type HeartsHandle = { burst: () => void }
const Hearts = forwardRef<HeartsHandle>(function Hearts(_, ref) {
  const [hs, setHs] = useState<{ id: number; x: number; hue: number }[]>([])
  useImperativeHandle(ref, () => ({
    burst() {
      const h = { id: Date.now() + Math.random(), x: Math.random() * 40 - 20, hue: [340, 0, 20, 300][Math.floor(Math.random() * 4)] }
      setHs(v => [...v.slice(-25), h]); setTimeout(() => setHs(v => v.filter(x => x.id !== h.id)), 2200)
    },
  }))
  return (
    <div className="pointer-events-none absolute bottom-24 right-6 h-72 w-16">
      {hs.map(h => <Heart key={h.id} size={28} fill={`hsl(${h.hue} 90% 60%)`} stroke="none" className="absolute bottom-0 left-1/2 animate-[floatUp_2.2s_ease-out_forwards]" style={{ marginLeft: h.x }} />)}
    </div>
  )
})
export default Hearts
