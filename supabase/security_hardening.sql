-- Run after schema.sql to remove anonymous access and restrict shared 2026 data
-- to accounts explicitly enabled in public.profiles.
begin;

revoke all on all tables in schema public from public, anon;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from public;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.teams, public.team_members from anon, authenticated;

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
create policy "authorized shared 2026 state"
on public.project_state
for all
using (
    auth.role() = 'service_role'
    or (
        auth.uid() is not null
        and sync_scope = 'client'
        and sync_id = 'shared_ramazan_2026'
        and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and p.is_active = true
        )
    )
)
with check (
    auth.role() = 'service_role'
    or (
        auth.uid() is not null
        and sync_scope = 'client'
        and sync_id = 'shared_ramazan_2026'
        and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and p.is_active = true
        )
    )
);

commit;
