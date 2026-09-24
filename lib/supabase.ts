import {createBrowserClient} from '@supabase/ssr';

type SupabaseClient = ReturnType<typeof createBrowserClient>;
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client can only be initialized in the browser.');
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase public environment variables are required.');
    client = createBrowserClient(url, key);
  }
  return client;
}
