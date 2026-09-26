-- HYBRID platform: Pinterest-style discovery + Instagram-style social
-- ---------------------------------------------------------------
-- PROFILES
alter table public.profiles
  add column if not exists website text,
  add column if not exists account_type text not null default 'personal' check (account_type in ('personal','business','creator')),
  add column if not exists is_private boolean not null default false,
  add column if not exists role text not null default 'user' check (role in ('user','admin')),
  add column if not exists note text,
  add column if not exists note_at timestamptz,
  add column if not exists interests text[] not null default '{}',
  add column if not exists onboarded boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- prevent users from promoting themselves to admin
create or replace function public.protect_profile_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    new.role := old.role;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute function public.protect_profile_role();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- FOLLOWS
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted','pending')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);

-- BLOCKS / CLOSE FRIENDS
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create table if not exists public.close_friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  primary key (user_id, friend_id)
);

-- POSTS (pins, posts, reels, stories)
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add constraint posts_type_check check (type in ('pin','reel','story'));
alter table public.posts
  add column if not exists media_type text not null default 'image' check (media_type in ('image','video')),
  add column if not exists alt_text text,
  add column if not exists location text,
  add column if not exists status text not null default 'published' check (status in ('published','removed','draft')),
  add column if not exists publish_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists audience text not null default 'public' check (audience in ('public','close_friends')),
  add column if not exists dominant_color text,
  add column if not exists category text,
  add column if not exists views_count integer not null default 0,
  add column if not exists saves_count integer not null default 0,
  add column if not exists shares_count integer not null default 0,
  add column if not exists allow_comments boolean not null default true,
  add column if not exists is_paid_partnership boolean not null default false,
  add column if not exists partner_brand text;
create index if not exists posts_user_idx on public.posts(user_id, created_at desc);
create index if not exists posts_feed_idx on public.posts(type, status, publish_at desc);
create index if not exists posts_tags_idx on public.posts using gin(tags);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  position integer not null default 0,
  aspect_ratio double precision not null default 1
);
create index if not exists post_media_post_idx on public.post_media(post_id, position);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  price numeric(12,2),
  currency text not null default 'INR',
  url text,
  merchant text,
  created_at timestamptz not null default now()
);
create index if not exists products_post_idx on public.products(post_id);

-- privacy-aware visibility check used by RLS on posts and children
create or replace function public.can_view_post(p public.posts) returns boolean language sql stable security definer set search_path = public as $$
  select
    p.user_id = auth.uid()
    or public.is_admin()
    or (
      p.status = 'published'
      and p.publish_at <= now()
      and (p.type <> 'story' or p.expires_at is null or p.expires_at > now())
      and not exists (select 1 from public.blocks b where (b.blocker_id = p.user_id and b.blocked_id = auth.uid()) or (b.blocker_id = auth.uid() and b.blocked_id = p.user_id))
      and (
        not (select is_private from public.profiles where id = p.user_id)
        or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id and f.status = 'accepted')
      )
      and (p.audience = 'public' or exists (select 1 from public.close_friends c where c.user_id = p.user_id and c.friend_id = auth.uid()))
    );
$$;

drop policy if exists "Posts are publicly viewable" on public.posts;
drop policy if exists "Posts visible by privacy rules" on public.posts;
create policy "Posts visible by privacy rules" on public.posts for select using (public.can_view_post(posts));
drop policy if exists "Admins can moderate posts" on public.posts;
create policy "Admins can moderate posts" on public.posts for update using (public.is_admin());
drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts" on public.posts for delete using (public.is_admin());

-- COMMENTS replies
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;

-- BOARDS
alter table public.boards
  add column if not exists description text,
  add column if not exists cover_url text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.board_sections (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.board_collaborators (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create table if not exists public.board_pins (
  board_id uuid not null references public.boards(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  section_id uuid references public.board_sections(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, post_id)
);
create index if not exists board_pins_post_idx on public.board_pins(post_id);

create or replace function public.can_edit_board(b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.boards where id = b and user_id = auth.uid())
      or exists (select 1 from public.board_collaborators where board_id = b and user_id = auth.uid());
$$;
create or replace function public.can_view_board(b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.boards where id = b and (is_private = false or user_id = auth.uid()))
      or exists (select 1 from public.board_collaborators where board_id = b and user_id = auth.uid());
$$;

drop policy if exists "Public boards and own boards are viewable" on public.boards;
drop policy if exists "Boards viewable" on public.boards;
create policy "Boards viewable" on public.boards for select using (is_private = false or user_id = auth.uid() or public.can_view_board(id));
drop policy if exists "Users can update their own boards" on public.boards;
drop policy if exists "Board editors can update" on public.boards;
create policy "Board editors can update" on public.boards for update using (public.can_edit_board(id));

-- SAVED COUNTS
create or replace function public.sync_post_saves_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.posts set saves_count = saves_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then update public.posts set saves_count = greatest(saves_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
drop trigger if exists board_pins_saves_sync on public.board_pins;
create trigger board_pins_saves_sync after insert or delete on public.board_pins for each row execute function public.sync_post_saves_count();

-- HIGHLIGHTS
create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cover_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.highlight_items (
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (highlight_id, post_id)
);

-- MESSAGING (1:1 + groups)
create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.messages
  alter column receiver_id drop not null,
  add column if not exists group_id uuid references public.chat_groups(id) on delete cascade,
  add column if not exists post_id uuid references public.posts(id) on delete set null,
  add column if not exists read_at timestamptz;
create index if not exists messages_pair_idx on public.messages(sender_id, receiver_id, created_at);
create index if not exists messages_group_idx on public.messages(group_id, created_at);

create or replace function public.is_group_member(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_group_members where group_id = g and user_id = auth.uid());
$$;

drop policy if exists "Users can read their own messages" on public.messages;
drop policy if exists "Read own or group messages" on public.messages;
create policy "Read own or group messages" on public.messages for select using (sender_id = auth.uid() or receiver_id = auth.uid() or (group_id is not null and public.is_group_member(group_id)));
drop policy if exists "Users can send messages as themselves" on public.messages;
drop policy if exists "Send messages" on public.messages;
create policy "Send messages" on public.messages for insert with check (
  sender_id = auth.uid()
  and ((group_id is null and receiver_id is not null and not exists (select 1 from public.blocks b where b.blocker_id = receiver_id and b.blocked_id = auth.uid()))
       or (group_id is not null and public.is_group_member(group_id)))
);
drop policy if exists "Receivers mark read" on public.messages;
create policy "Receivers mark read" on public.messages for update using (receiver_id = auth.uid());

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','comment','follow','follow_request','save','message','mention','report_resolved')),
  post_id uuid references public.posts(id) on delete cascade,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.notify(target uuid, actor uuid, kind text, post uuid, body text default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if target is null or target = actor then return; end if;
  insert into public.notifications(user_id, actor_id, type, post_id, body) values (target, actor, kind, post, body);
end $$;

create or replace function public.on_like_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify((select user_id from public.posts where id = new.post_id), new.user_id, 'like', new.post_id); return null; end $$;
drop trigger if exists likes_notify on public.likes;
create trigger likes_notify after insert on public.likes for each row execute function public.on_like_notify();

create or replace function public.on_comment_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare m text; mentioned uuid;
begin
  perform public.notify((select user_id from public.posts where id = new.post_id), new.user_id, 'comment', new.post_id, left(new.content, 140));
  for m in select distinct (regexp_matches(new.content, '@([a-z0-9_]{3,24})', 'g'))[1] loop
    select id into mentioned from public.profiles where username = m;
    perform public.notify(mentioned, new.user_id, 'mention', new.post_id, left(new.content, 140));
  end loop;
  return null;
end $$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.on_comment_notify();

create or replace function public.on_follow_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify(new.following_id, new.follower_id, case when new.status = 'pending' then 'follow_request' else 'follow' end, null); return null; end $$;
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows for each row execute function public.on_follow_notify();

create or replace function public.on_save_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify((select user_id from public.posts where id = new.post_id), new.user_id, 'save', new.post_id); return null; end $$;
drop trigger if exists board_pins_notify on public.board_pins;
create trigger board_pins_notify after insert on public.board_pins for each row execute function public.on_save_notify();

create or replace function public.on_message_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.receiver_id is not null then perform public.notify(new.receiver_id, new.sender_id, 'message', new.post_id, left(new.content, 140)); end if;
  return null;
end $$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages for each row execute function public.on_message_notify();

-- follow status: private accounts get requests
create or replace function public.set_follow_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select is_private from public.profiles where id = new.following_id) then new.status := 'pending'; else new.status := 'accepted'; end if;
  return new;
end $$;
drop trigger if exists follows_status on public.follows;
create trigger follows_status before insert on public.follows for each row execute function public.set_follow_status();

-- REPORTS / MODERATION
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','dismissed','actioned')),
  created_at timestamptz not null default now()
);

-- ANALYTICS: views, searches
create table if not exists public.post_views (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists post_views_post_idx on public.post_views(post_id, created_at);
create table if not exists public.search_history (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);
create index if not exists search_history_created_idx on public.search_history(created_at desc);

create or replace function public.record_view(p uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.post_views where post_id = p and viewer_id = auth.uid() and created_at > now() - interval '30 minutes') then
    insert into public.post_views(post_id, viewer_id) values (p, auth.uid());
    update public.posts set views_count = views_count + 1 where id = p;
  end if;
end $$;

create or replace function public.record_share(p uuid) returns void language sql security definer set search_path = public as $$
  update public.posts set shares_count = shares_count + 1 where id = p;
$$;

-- RECOMMENDATIONS: personalised "For you" feed
create or replace function public.feed_for_you(lim int default 30, off int default 0)
returns setof public.posts language sql stable security invoker set search_path = public as $$
  with interest as (
    select unnest(p.tags) as tag, 3 as w from public.board_pins bp join public.posts p on p.id = bp.post_id where bp.user_id = auth.uid()
    union all select unnest(p.tags), 2 from public.likes l join public.posts p on p.id = l.post_id where l.user_id = auth.uid()
    union all select unnest(interests), 2 from public.profiles where id = auth.uid()
  ), weights as (select lower(tag) tag, sum(w) w from interest group by 1)
  select p.* from public.posts p
  where p.type = 'pin' and p.status = 'published' and p.publish_at <= now()
  order by
    coalesce((select sum(w.w) from weights w where w.tag = any (select lower(t) from unnest(p.tags) t)), 0) * 4
    + ln(1 + p.saves_count * 3 + p.likes_count * 2 + p.comments_count * 2 + p.views_count * 0.1)
    + (case when exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id) then 3 else 0 end)
    - extract(epoch from (now() - p.publish_at)) / 86400.0 * 0.15 desc
  limit lim offset off;
$$;

create or replace function public.trending_tags(days int default 7, lim int default 20)
returns table(tag text, uses bigint) language sql stable security invoker set search_path = public as $$
  select lower(t) as tag, count(*) as uses
  from public.posts p, unnest(p.tags) t
  where p.status = 'published' and p.created_at > now() - make_interval(days => days)
  group by 1 order by 2 desc limit lim;
$$;

create or replace function public.trending_searches(days int default 7, lim int default 20)
returns table(query text, searches bigint) language sql stable security definer set search_path = public as $$
  select lower(trim(query)), count(*) from public.search_history
  where created_at > now() - make_interval(days => days) and length(trim(query)) > 1
  group by 1 order by 2 desc limit lim;
$$;

-- ---------------------------------------------------------------
-- RLS
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.close_friends enable row level security;
alter table public.post_media enable row level security;
alter table public.products enable row level security;
alter table public.board_sections enable row level security;
alter table public.board_collaborators enable row level security;
alter table public.board_pins enable row level security;
alter table public.highlights enable row level security;
alter table public.highlight_items enable row level security;
alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.post_views enable row level security;
alter table public.search_history enable row level security;

do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies where schemaname='public' and tablename in
    ('follows','blocks','close_friends','post_media','products','board_sections','board_collaborators','board_pins','highlights','highlight_items','chat_groups','chat_group_members','notifications','reports','post_views','search_history')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

create policy "follows read" on public.follows for select using (true);
create policy "follows insert" on public.follows for insert with check (follower_id = auth.uid());
create policy "follows delete" on public.follows for delete using (follower_id = auth.uid() or following_id = auth.uid());
create policy "follows accept" on public.follows for update using (following_id = auth.uid());

create policy "blocks own" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "close friends own" on public.close_friends for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "post media read" on public.post_media for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post media write" on public.post_media for all using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

create policy "products read" on public.products for select using (exists (select 1 from public.posts p where p.id = post_id));
create policy "products write" on public.products for all using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

create policy "sections read" on public.board_sections for select using (public.can_view_board(board_id));
create policy "sections write" on public.board_sections for all using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy "collab read" on public.board_collaborators for select using (public.can_view_board(board_id));
create policy "collab owner manage" on public.board_collaborators for all using (exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid()) or user_id = auth.uid()) with check (exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid()));

create policy "board pins read" on public.board_pins for select using (public.can_view_board(board_id));
create policy "board pins insert" on public.board_pins for insert with check (user_id = auth.uid() and public.can_edit_board(board_id));
create policy "board pins update" on public.board_pins for update using (public.can_edit_board(board_id));
create policy "board pins delete" on public.board_pins for delete using (public.can_edit_board(board_id));

create policy "highlights read" on public.highlights for select using (true);
create policy "highlights write" on public.highlights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "highlight items read" on public.highlight_items for select using (true);
create policy "highlight items write" on public.highlight_items for all using (exists (select 1 from public.highlights h where h.id = highlight_id and h.user_id = auth.uid())) with check (exists (select 1 from public.highlights h where h.id = highlight_id and h.user_id = auth.uid()));

create policy "groups read" on public.chat_groups for select using (created_by = auth.uid() or public.is_group_member(id));
create policy "groups create" on public.chat_groups for insert with check (created_by = auth.uid());
create policy "groups update" on public.chat_groups for update using (created_by = auth.uid());
create policy "group members read" on public.chat_group_members for select using (public.is_group_member(group_id) or exists (select 1 from public.chat_groups g where g.id = group_id and g.created_by = auth.uid()));
create policy "group members add" on public.chat_group_members for insert with check (exists (select 1 from public.chat_groups g where g.id = group_id and g.created_by = auth.uid()));
create policy "group members leave" on public.chat_group_members for delete using (user_id = auth.uid() or exists (select 1 from public.chat_groups g where g.id = group_id and g.created_by = auth.uid()));

create policy "notifications own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete using (user_id = auth.uid());

create policy "reports create" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports read" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports admin update" on public.reports for update using (public.is_admin());

create policy "views owner read" on public.post_views for select using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()) or public.is_admin());
create policy "search insert" on public.search_history for insert with check (user_id = auth.uid());
create policy "search own read" on public.search_history for select using (user_id = auth.uid() or public.is_admin());
create policy "search own delete" on public.search_history for delete using (user_id = auth.uid());

-- admin can manage profiles (moderation)
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update using (public.is_admin());

-- REALTIME
do $$ begin
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
  begin alter publication supabase_realtime add table public.follows; exception when others then null; end;
end $$;
