-- Run after schema.sql to allow anonymous access only to shared 2026 state.
-- WARNING: Anyone with the site URL can read, overwrite, or delete this shared data.
begin;

revoke all on all tables in schema public from public, anon;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from public;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.teams, public.team_members from anon, authenticated;
grant select, insert, update, delete on public.project_state to anon;

drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "active profile self read" on public.profiles;
create policy "active profile self read"
on public.profiles
for select
using (auth.uid() = id and is_active = true);

drop policy if exists "state read own" on public.project_state;
drop policy if exists "state write own" on public.project_state;
drop policy if exists "state anon read" on public.project_state;
drop policy if exists "state anon write" on public.project_state;
drop policy if exists "authorized shared 2026 state" on public.project_state;
drop policy if exists "public shared 2026 state" on public.project_state;
create policy "public shared 2026 state"
on public.project_state
for all
to anon, authenticated
using (
    sync_scope = 'client'
    and sync_id = 'shared_ramazan_2026'
)
with check (
    sync_scope = 'client'
    and sync_id = 'shared_ramazan_2026'
);

commit;
