'use client'

import { useMemo } from 'react'
import part01 from '../lib/hybrid-layout/part01'
import part02 from '../lib/hybrid-layout/part02'
import part03 from '../lib/hybrid-layout/part03'
import part04 from '../lib/hybrid-layout/part04'
import part05 from '../lib/hybrid-layout/part05'
import tailBase64 from '../lib/hybrid-layout/part06.b64'

function decodeBase64Utf8(value: string) {
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export default function Home() {
  const html = useMemo(
    () => [part01, part02, part03, part04, part05, decodeBase64Utf8(tailBase64)].join(''),
    []
  )

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#05070c]">
      <iframe
        title="HYBRID by OriUniqx"
        srcDoc={html}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </main>
  )
}
