import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }

const PROTECTED = ['/home', '/explore', '/reels', '/create', '/shop', '/messages', '/notifications', '/studio', '/settings', '/admin', '/p', '/u', '/boards', '/stories', '/highlights', '/onboarding', '/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Supabase falls back to the Site URL (usually "/") when the redirect URL is not
  // allow-listed. If an OAuth / email-confirm code lands anywhere other than the
  // callback route, forward it there so the session is actually created.
  const code = searchParams.get('code')
  if (code && pathname !== '/auth/callback') {
    const target = new URL('/auth/callback', request.url)
    target.searchParams.set('code', code)
    target.searchParams.set('next', searchParams.get('next') || '/home')
    return NextResponse.redirect(target)
  }
  // Supabase auth errors (e.g. expired link) also arrive on the Site URL.
  const authError = searchParams.get('error_description')
  if (authError && pathname === '/' && searchParams.get('auth') !== 'true') {
    const target = new URL('/', request.url)
    target.searchParams.set('auth', 'true')
    target.searchParams.set('error', authError)
    return NextResponse.redirect(target)
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  const isProtected = PROTECTED.some(path => pathname === path || pathname.startsWith(path + '/'))
  if (isProtected && !user) {
    const target = new URL('/', request.url)
    target.searchParams.set('auth', 'true')
    return NextResponse.redirect(target)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/callback|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
