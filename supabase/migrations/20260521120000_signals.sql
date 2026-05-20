-- HumanX Signals — schema migration.
--
-- Replaces the file-on-disk JSON storage that the original signals-final/
-- module assumed. Five tables:
--
--   signals_meta       — single row (singleton), holds clients/voices/freshness
--   signals_sections   — one row per section, stores the validated JSON payload
--   signals_threads    — single row (singleton), cross-section synthesis output
--   signals_bookmarks  — one row per user × item, persistent across devices
--   signals_history    — versioned snapshots of full payloads, capped to 5
--
-- The original build.js maintained data/.history/ with at most 5 prior builds;
-- we mirror that in Supabase so admins can revert without redeploying.

-- pgcrypto's gen_random_uuid() is bundled with Supabase under the `extensions`
-- schema. We avoid uuid-ossp here because its functions live outside the
-- default search_path in Supabase projects.

-- ---------------------------------------------------------------------------
-- signals_meta — singleton config row. RLS lets anyone authenticated read it
-- (so the dashboard can render clients + freshness); only admins can write.
-- ---------------------------------------------------------------------------
create table if not exists public.signals_meta (
  id           text primary key default 'singleton'
                  check (id = 'singleton'),
  data         jsonb not null default jsonb_build_object(
                  'last_full_refresh', null,
                  'clients', jsonb_build_array(),
                  'cross_domain_voices', jsonb_build_array(),
                  'section_freshness', jsonb_build_object()
                ),
  updated_at   timestamptz not null default now()
);

insert into public.signals_meta (id, data)
values ('singleton', jsonb_build_object(
  'last_full_refresh', null,
  'clients', jsonb_build_array(),
  'cross_domain_voices', jsonb_build_array(),
  'section_freshness', jsonb_build_object()
))
on conflict (id) do nothing;

alter table public.signals_meta enable row level security;

drop policy if exists "signals_meta read for authenticated" on public.signals_meta;
create policy "signals_meta read for authenticated"
  on public.signals_meta for select
  to authenticated
  using (true);

drop policy if exists "signals_meta write for admins" on public.signals_meta;
create policy "signals_meta write for admins"
  on public.signals_meta for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- signals_sections — one row per section id (7 rows total). Each `data` JSONB
-- holds a SectionData<Item> payload as defined in src/lib/signals/types.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.signals_sections (
  section_id   text primary key
                  check (section_id in (
                    'domain-signals','competitor-updates','leader-tweets',
                    'design-tool-news','visual-inspiration','lenny-podcast',
                    'reddit-threads'
                  )),
  data         jsonb not null,
  generated_at timestamptz not null default now(),
  schema_version int not null default 2,
  updated_at   timestamptz not null default now()
);

alter table public.signals_sections enable row level security;

drop policy if exists "signals_sections read for authenticated" on public.signals_sections;
create policy "signals_sections read for authenticated"
  on public.signals_sections for select
  to authenticated
  using (true);

drop policy if exists "signals_sections write for admins" on public.signals_sections;
create policy "signals_sections write for admins"
  on public.signals_sections for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- signals_threads — singleton row. Cross-section synthesis output.
-- ---------------------------------------------------------------------------
create table if not exists public.signals_threads (
  id           text primary key default 'singleton'
                  check (id = 'singleton'),
  data         jsonb not null default jsonb_build_object(
                  'schema_version', 2,
                  'generated_at', null,
                  'briefing_line', '',
                  'items', jsonb_build_array(),
                  'run_log', jsonb_build_object()
                ),
  updated_at   timestamptz not null default now()
);

insert into public.signals_threads (id, data)
values ('singleton', jsonb_build_object(
  'schema_version', 2,
  'generated_at', null,
  'briefing_line', '',
  'items', jsonb_build_array(),
  'run_log', jsonb_build_object(
    'items_shipped', 0,
    'candidates_rejected', 0,
    'rejection_reasons', jsonb_build_array(),
    'queries_run', jsonb_build_array()
  )
))
on conflict (id) do nothing;

alter table public.signals_threads enable row level security;

drop policy if exists "signals_threads read for authenticated" on public.signals_threads;
create policy "signals_threads read for authenticated"
  on public.signals_threads for select
  to authenticated
  using (true);

drop policy if exists "signals_threads write for admins" on public.signals_threads;
create policy "signals_threads write for admins"
  on public.signals_threads for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- signals_bookmarks — one row per user × item. Items can come from any of the
-- 7 sections; section_id is stored so the bookmarks page can group + render
-- with the correct card variant without re-resolving section membership.
-- ---------------------------------------------------------------------------
create table if not exists public.signals_bookmarks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  item_id      text not null,
  section_id   text not null
                  check (section_id in (
                    'domain-signals','competitor-updates','leader-tweets',
                    'design-tool-news','visual-inspiration','lenny-podcast',
                    'reddit-threads'
                  )),
  created_at   timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists signals_bookmarks_user_idx
  on public.signals_bookmarks (user_id, created_at desc);

alter table public.signals_bookmarks enable row level security;

drop policy if exists "signals_bookmarks select self" on public.signals_bookmarks;
create policy "signals_bookmarks select self"
  on public.signals_bookmarks for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "signals_bookmarks insert self" on public.signals_bookmarks;
create policy "signals_bookmarks insert self"
  on public.signals_bookmarks for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "signals_bookmarks delete self" on public.signals_bookmarks;
create policy "signals_bookmarks delete self"
  on public.signals_bookmarks for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- signals_history — versioned snapshots of the full payload. Capped to 5 by
-- a trigger that deletes older rows on insert. Mirrors build.js's data/.history.
-- ---------------------------------------------------------------------------
create table if not exists public.signals_history (
  id           uuid primary key default gen_random_uuid(),
  built_at     timestamptz not null default now(),
  items_shipped int not null default 0,
  snapshot     jsonb not null
);

create index if not exists signals_history_built_at_idx
  on public.signals_history (built_at desc);

alter table public.signals_history enable row level security;

drop policy if exists "signals_history read for admins" on public.signals_history;
create policy "signals_history read for admins"
  on public.signals_history for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "signals_history write for admins" on public.signals_history;
create policy "signals_history write for admins"
  on public.signals_history for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.signals_history_prune()
returns trigger
language plpgsql
as $$
begin
  -- Keep newest 5 rows; delete the rest.
  delete from public.signals_history
  where id in (
    select id from public.signals_history
    order by built_at desc
    offset 5
  );
  return new;
end;
$$;

drop trigger if exists signals_history_prune_trg on public.signals_history;
create trigger signals_history_prune_trg
  after insert on public.signals_history
  for each statement
  execute function public.signals_history_prune();

-- ---------------------------------------------------------------------------
-- updated_at trigger — shared helper.
-- ---------------------------------------------------------------------------
create or replace function public.signals_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists signals_meta_updated_at on public.signals_meta;
create trigger signals_meta_updated_at
  before update on public.signals_meta
  for each row execute function public.signals_set_updated_at();

drop trigger if exists signals_sections_updated_at on public.signals_sections;
create trigger signals_sections_updated_at
  before update on public.signals_sections
  for each row execute function public.signals_set_updated_at();

drop trigger if exists signals_threads_updated_at on public.signals_threads;
create trigger signals_threads_updated_at
  before update on public.signals_threads
  for each row execute function public.signals_set_updated_at();
