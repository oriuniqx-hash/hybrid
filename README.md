# HYBRID

A production-oriented visual community built with Next.js 14, Supabase, Tailwind CSS and Framer Motion.

## Data
Uses the existing Supabase project and its existing RLS-protected tables: profiles, boards, posts, likes, comments and messages. No seed or fake analytics data is included.

## Run
Copy .env.example to .env.local, install dependencies, then run `npm run dev`. Production checks: `npm run lint`, `npm run typecheck`, `npm run build`.

## Environment
NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are public client configuration values and must be provided by the deployment environment.