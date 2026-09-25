import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../lib/supabase/server'
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ authenticated: Boolean(user), user: user ? { id:user.id, email:user.email } : null })
}
