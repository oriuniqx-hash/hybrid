-- Collages
alter table public.posts add column if not exists is_collage boolean not null default false;
create table if not exists public.collages (
  post_id uuid primary key references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  background text not null default '#f4f1ec',
  layers jsonb not null default '[]'::jsonb,
  source_post_ids uuid[] not null default '{}',
  remixed_from uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists collages_remixed_from_idx on public.collages(remixed_from);
alter table public.collages enable row level security;
drop policy if exists "collages read" on public.collages;
create policy "collages read" on public.collages for select using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
drop policy if exists "collages write" on public.collages;
create policy "collages write" on public.collages for all using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

-- Live video
create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  status text not null default 'live' check (status in ('live','ended')),
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  peak_viewers int not null default 0,
  replay_post_id uuid references public.posts(id) on delete set null
);
create index if not exists live_streams_live_idx on public.live_streams(status, heartbeat_at desc);
create index if not exists live_streams_host_idx on public.live_streams(host_id, started_at desc);
alter table public.live_streams enable row level security;

create or replace function public.can_view_profile(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select uid = auth.uid() or public.is_admin() or (
    not exists (select 1 from public.blocks b where (b.blocker_id = uid and b.blocked_id = auth.uid()) or (b.blocker_id = auth.uid() and b.blocked_id = uid))
    and (not coalesce((select is_private from public.profiles where id = uid), false)
      or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = uid and f.status = 'accepted'))
  );
$$;

drop policy if exists "live read" on public.live_streams;
create policy "live read" on public.live_streams for select using (public.can_view_profile(host_id));
drop policy if exists "live insert" on public.live_streams;
create policy "live insert" on public.live_streams for insert with check (host_id = auth.uid());
drop policy if exists "live update" on public.live_streams;
create policy "live update" on public.live_streams for update using (host_id = auth.uid() or public.is_admin()) with check (host_id = auth.uid() or public.is_admin());
drop policy if exists "live delete" on public.live_streams;
create policy "live delete" on public.live_streams for delete using (host_id = auth.uid() or public.is_admin());

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists live_messages_stream_idx on public.live_messages(stream_id, created_at);
alter table public.live_messages enable row level security;
drop policy if exists "live msgs read" on public.live_messages;
create policy "live msgs read" on public.live_messages for select using (exists (select 1 from public.live_streams s where s.id = stream_id and public.can_view_profile(s.host_id)));
drop policy if exists "live msgs insert" on public.live_messages;
create policy "live msgs insert" on public.live_messages for insert with check (user_id = auth.uid() and exists (select 1 from public.live_streams s where s.id = stream_id and s.status = 'live' and public.can_view_profile(s.host_id)));
drop policy if exists "live msgs delete" on public.live_messages;
create policy "live msgs delete" on public.live_messages for delete using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid()));

-- notify followers when someone goes live (body carries the stream id)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('like','comment','follow','follow_request','save','message','mention','report_resolved','live','remix'));
create or replace function public.on_live_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, actor_id, type, body)
  select f.follower_id, new.host_id, 'live', new.id::text from public.follows f
  where f.following_id = new.host_id and f.status = 'accepted' limit 5000;
  return null;
end $$;
drop trigger if exists live_notify on public.live_streams;
create trigger live_notify after insert on public.live_streams for each row execute function public.on_live_notify();

create or replace function public.on_remix_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.remixed_from is not null then
    perform public.notify((select user_id from public.posts where id = new.remixed_from), new.user_id, 'remix', new.post_id);
  end if;
  return null;
end $$;
drop trigger if exists collage_remix_notify on public.collages;
create trigger collage_remix_notify after insert on public.collages for each row execute function public.on_remix_notify();

do $$ begin
  begin alter publication supabase_realtime add table public.live_streams; exception when others then null; end;
  begin alter publication supabase_realtime add table public.live_messages; exception when others then null; end;
end $$;
