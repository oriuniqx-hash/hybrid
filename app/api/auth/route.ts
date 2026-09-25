import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) return NextResponse.json({ error: 'Enter a valid email and a password of at least 6 characters.' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    let { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const signUp = await supabase.auth.signUp({ email, password })
      if (signUp.error) return NextResponse.json({ error: signUp.error.message }, { status: 400 })
      data = signUp.data
      error = null
    }
    return NextResponse.json({ ok: true, user: data.user, session: data.session, confirmationRequired: !data.session })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Authentication failed.' }, { status: 500 })
  }
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
