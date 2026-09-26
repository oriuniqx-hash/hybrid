import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'HYBRID — discover, save, share',
  description: 'Visual discovery meets social. Find ideas, save them to boards, share Reels and Stories, and grow as a creator.',
  icons: { icon: '/favicon.svg' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#faf9f7' }

const themeScript = `try{var t=localStorage.getItem('hybrid-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=cabinet-grotesk@700,800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
