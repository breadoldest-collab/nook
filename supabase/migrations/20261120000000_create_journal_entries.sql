create table if not exists public.journal_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  constraint journal_entries_data_is_object check (jsonb_typeof(data) = 'object')
);

alter table public.journal_entries enable row level security;

revoke all on public.journal_entries from anon;
grant select, insert, update on public.journal_entries to authenticated;

create policy "Users can read their own journal entries"
  on public.journal_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own journal entries"
  on public.journal_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own journal entries"
  on public.journal_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
