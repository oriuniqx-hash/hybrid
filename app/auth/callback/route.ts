import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?auth=true', url.origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/?auth=true&error=auth_callback', url.origin))
  }

  const user = sessionData.session?.user
  if (user) {
    const metadataUsername = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : ''
    const fallbackUsername = metadataUsername || (user.email?.split('@')[0] || 'user') + '_' + user.id.slice(0, 6)
    await supabase.from('profiles').upsert({
      id: user.id,
      username: fallbackUsername.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24),
      full_name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
      avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
