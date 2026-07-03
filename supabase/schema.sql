-- Supabase schema for the DS Partition & Curtain project
-- Designed for clean cross-device sync, auditability, and future login support.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        display_name text null,
        full_name text null,
        phone text null,
        role text not null default 'member',
        avatar_url text null,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);

create table if not exists public.teams (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        slug text not null unique,
        owner_id uuid not null references public.profiles(id) on delete cascade,
        is_active boolean not null default true,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
        team_id uuid not null references public.teams(id) on delete cascade,
        user_id uuid not null references public.profiles(id) on delete cascade,
        member_role text not null default 'member',
        is_active boolean not null default true,
        joined_at timestamptz not null default now(),
        primary key (team_id, user_id)
);

create table if not exists public.devices (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references public.profiles(id) on delete cascade,
        team_id uuid null references public.teams(id) on delete set null,
        device_key text not null unique,
        device_name text null,
        platform text null,
        last_seen_at timestamptz not null default now(),
        is_primary boolean not null default false,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);

create table if not exists public.project_systems (
        id uuid primary key default gen_random_uuid(),
        slug text not null unique,
        display_name text not null,
        route text not null,
        category text not null default 'system',
        sort_order integer not null default 0,
        is_active boolean not null default true,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);

create table if not exists public.project_orders (
        id uuid primary key default gen_random_uuid(),
        team_id uuid null references public.teams(id) on delete set null,
        user_id uuid null references public.profiles(id) on delete set null,
        device_id uuid null references public.devices(id) on delete set null,
        system_slug text null references public.project_systems(slug) on delete set null,
        source_page text null,
        company_name text null,
        owner_name text null,
        order_date date null,
        q_total numeric(12, 3) not null default 0,
        m2_total numeric(12, 3) not null default 0,
        total_price numeric(12, 2) not null default 0,
        color text null,
        glass_type text null,
        driver_name text null,
        transport_flag boolean not null default false,
        finalized boolean not null default false,
        archived_year integer null,
        status text not null default 'draft',
        version integer not null default 1,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_at timestamptz null
);

create table if not exists public.project_order_rows (
        id uuid primary key default gen_random_uuid(),
        order_id uuid not null references public.project_orders(id) on delete cascade,
        row_number integer not null,
        width numeric(12, 3) null,
        height numeric(12, 3) null,
        quantity numeric(12, 3) null,
        m2 numeric(12, 3) null,
        price numeric(12, 2) null,
        ready boolean not null default false,
        glass boolean not null default false,
        order_g boolean not null default false,
        color text null,
        system text null,
        glass_received text null,
        transport text null,
        driver_name text null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);

create table if not exists public.project_state (
        id uuid primary key default gen_random_uuid(),
        user_id uuid null references public.profiles(id) on delete cascade,
    team_id uuid null references public.teams(id) on delete cascade,
        client_key text null,
    sync_scope text not null default 'user',
    sync_id text not null,
        state_key text not null,
        state_value jsonb not null,
        sync_version integer not null default 1,
        expires_at timestamptz null,
        updated_at timestamptz not null default now(),
        created_at timestamptz not null default now(),
    check (sync_scope in ('user', 'team', 'client')),
    unique (sync_scope, sync_id, state_key)
);

create table if not exists public.sync_conflicts (
        id uuid primary key default gen_random_uuid(),
        team_id uuid null references public.teams(id) on delete cascade,
        user_id uuid null references public.profiles(id) on delete set null,
        entity_type text not null,
        entity_id uuid null,
        local_version integer null,
        remote_version integer null,
        local_payload jsonb not null default '{}'::jsonb,
        remote_payload jsonb not null default '{}'::jsonb,
        resolved boolean not null default false,
        resolved_by uuid null references public.profiles(id) on delete set null,
        resolved_at timestamptz null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
        id uuid primary key default gen_random_uuid(),
        team_id uuid null references public.teams(id) on delete cascade,
        user_id uuid null references public.profiles(id) on delete set null,
        device_id uuid null references public.devices(id) on delete set null,
        action text not null,
        table_name text not null,
        record_id uuid null,
        before_data jsonb not null default '{}'::jsonb,
        after_data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
);

create table if not exists public.project_attachments (
        id uuid primary key default gen_random_uuid(),
        team_id uuid null references public.teams(id) on delete cascade,
        order_id uuid not null references public.project_orders(id) on delete cascade,
        row_id uuid null references public.project_order_rows(id) on delete cascade,
        storage_bucket text not null default 'project-files',
        storage_path text not null,
        file_name text not null,
        mime_type text null,
        file_size bigint null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
);

create index if not exists teams_owner_id_idx on public.teams (owner_id);
create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists devices_user_id_idx on public.devices (user_id);
create index if not exists project_systems_sort_order_idx on public.project_systems (sort_order);
create index if not exists project_orders_team_id_idx on public.project_orders (team_id);
create index if not exists project_orders_user_id_idx on public.project_orders (user_id);
create index if not exists project_orders_created_at_idx on public.project_orders (created_at desc);
create index if not exists project_orders_status_idx on public.project_orders (status);
create index if not exists project_order_rows_order_id_idx on public.project_order_rows (order_id);
create unique index if not exists project_order_rows_order_id_row_number_idx on public.project_order_rows (order_id, row_number);
create index if not exists project_state_state_key_idx on public.project_state (state_key);
create index if not exists project_state_team_id_idx on public.project_state (team_id);
create index if not exists project_state_user_id_idx on public.project_state (user_id);
create index if not exists project_state_sync_scope_id_idx on public.project_state (sync_scope, sync_id);
create index if not exists sync_conflicts_entity_type_idx on public.sync_conflicts (entity_type);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists project_attachments_order_id_idx on public.project_attachments (order_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_devices_updated_at on public.devices;
create trigger set_devices_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

drop trigger if exists set_project_systems_updated_at on public.project_systems;
create trigger set_project_systems_updated_at
before update on public.project_systems
for each row execute function public.set_updated_at();

drop trigger if exists set_project_orders_updated_at on public.project_orders;
create trigger set_project_orders_updated_at
before update on public.project_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_project_order_rows_updated_at on public.project_order_rows;
create trigger set_project_order_rows_updated_at
before update on public.project_order_rows
for each row execute function public.set_updated_at();

drop trigger if exists set_project_state_updated_at on public.project_state;
create trigger set_project_state_updated_at
before update on public.project_state
for each row execute function public.set_updated_at();

drop trigger if exists set_sync_conflicts_updated_at on public.sync_conflicts;
create trigger set_sync_conflicts_updated_at
before update on public.sync_conflicts
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
-- Disable RLS on teams and team_members to prevent circular recursion issues
alter table public.teams disable row level security;
alter table public.team_members disable row level security;
alter table public.devices enable row level security;
alter table public.project_systems enable row level security;
alter table public.project_orders enable row level security;
alter table public.project_order_rows enable row level security;
alter table public.project_state enable row level security;
alter table public.sync_conflicts enable row level security;
alter table public.audit_log enable row level security;
alter table public.project_attachments enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
using (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self write"
on public.profiles
for insert
with check (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
using (auth.uid() = id or auth.role() = 'service_role')
with check (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "teams member read" on public.teams;
create policy "teams member read"
on public.teams
for select
using (
    auth.role() = 'service_role'
    or owner_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = teams.id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "teams owner write" on public.teams;
create policy "teams owner write"
on public.teams
for insert
with check (auth.uid() = owner_id or auth.role() = 'service_role');

drop policy if exists "teams owner update" on public.teams;
create policy "teams owner update"
on public.teams
for update
using (auth.uid() = owner_id or auth.role() = 'service_role')
with check (auth.uid() = owner_id or auth.role() = 'service_role');

drop policy if exists "team members self read" on public.team_members;
create policy "team members self read"
on public.team_members
for select
using (
    auth.role() = 'service_role'
    or (auth.uid() is not null and (
        user_id = auth.uid()
        or exists (
            select 1
            from public.team_members self
            where self.team_id = team_members.team_id
                and self.user_id = auth.uid()
                and self.is_active = true
        )
    ))
);

drop policy if exists "team members owner write" on public.team_members;
create policy "team members owner write"
on public.team_members
for all
using (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.teams t
        where t.id = team_members.team_id
            and t.owner_id = auth.uid()
    )
)
with check (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.teams t
        where t.id = team_members.team_id
            and t.owner_id = auth.uid()
    )
);

drop policy if exists "devices self read" on public.devices;
create policy "devices self read"
on public.devices
for select
using (auth.role() = 'service_role' or user_id = auth.uid());

drop policy if exists "devices self write" on public.devices;
create policy "devices self write"
on public.devices
for all
using (auth.role() = 'service_role' or user_id = auth.uid())
with check (auth.role() = 'service_role' or user_id = auth.uid());

drop policy if exists "public read systems" on public.project_systems;
create policy "public read systems"
on public.project_systems
for select
using (true);

drop policy if exists "systems service write" on public.project_systems;
create policy "systems service write"
on public.project_systems
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "orders read own" on public.project_orders;
create policy "orders read own"
on public.project_orders
for select
using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_orders.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "orders write own" on public.project_orders;
create policy "orders write own"
on public.project_orders
for insert
with check (
    auth.role() = 'service_role'
    or user_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_orders.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "orders update own" on public.project_orders;
create policy "orders update own"
on public.project_orders
for update
using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_orders.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
)
with check (
    auth.role() = 'service_role'
    or user_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_orders.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "orders delete own" on public.project_orders;
create policy "orders delete own"
on public.project_orders
for delete
using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_orders.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "rows read own" on public.project_order_rows;
create policy "rows read own"
on public.project_order_rows
for select
using (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.project_orders po
        where po.id = project_order_rows.order_id
            and (
                po.user_id = auth.uid()
                or exists (
                    select 1
                    from public.team_members tm
                    where tm.team_id = po.team_id
                        and tm.user_id = auth.uid()
                        and tm.is_active = true
                )
            )
    )
);

drop policy if exists "rows write own" on public.project_order_rows;
create policy "rows write own"
on public.project_order_rows
for all
using (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.project_orders po
        where po.id = project_order_rows.order_id
            and (
                po.user_id = auth.uid()
                or exists (
                    select 1
                    from public.team_members tm
                    where tm.team_id = po.team_id
                        and tm.user_id = auth.uid()
                        and tm.is_active = true
                )
            )
    )
)
with check (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.project_orders po
        where po.id = project_order_rows.order_id
            and (
                po.user_id = auth.uid()
                or exists (
                    select 1
                    from public.team_members tm
                    where tm.team_id = po.team_id
                        and tm.user_id = auth.uid()
                        and tm.is_active = true
                )
            )
    )
);

drop policy if exists "state read own" on public.project_state;
create policy "state read own"
on public.project_state
for select
using (
    auth.role() = 'service_role'
    or (sync_scope = 'user' and sync_id = auth.uid()::text and user_id = auth.uid())
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_state.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "state write own" on public.project_state;
create policy "state write own"
on public.project_state
for all
using (
    auth.role() = 'service_role'
    or (sync_scope = 'user' and sync_id = auth.uid()::text and user_id = auth.uid())
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_state.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
)
with check (
    auth.role() = 'service_role'
    or (sync_scope = 'user' and sync_id = auth.uid()::text and user_id = auth.uid())
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = project_state.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

-- Allow anonymous read and write access to project_state for cross-device sharing
drop policy if exists "state anon read" on public.project_state;
create policy "state anon read"
on public.project_state
for select
using (true);

drop policy if exists "state anon write" on public.project_state;
create policy "state anon write"
on public.project_state
for all
using (true)
with check (true);

drop policy if exists "conflicts read own" on public.sync_conflicts;
create policy "conflicts read own"
on public.sync_conflicts
for select
using (
    auth.role() = 'service_role'
    or user_id = auth.uid()
    or exists (
        select 1
        from public.team_members tm
        where tm.team_id = sync_conflicts.team_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
    )
);

drop policy if exists "conflicts write own" on public.sync_conflicts;
create policy "conflicts write own"
on public.sync_conflicts
for all
using (auth.role() = 'service_role' or user_id = auth.uid())
with check (auth.role() = 'service_role' or user_id = auth.uid());

drop policy if exists "audit read service" on public.audit_log;
create policy "audit read service"
on public.audit_log
for select
using (auth.role() = 'service_role');

drop policy if exists "audit write service" on public.audit_log;
create policy "audit write service"
on public.audit_log
for insert
with check (auth.role() = 'service_role' or user_id = auth.uid());

drop policy if exists "attachments read own" on public.project_attachments;
create policy "attachments read own"
on public.project_attachments
for select
using (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.project_orders po
        where po.id = project_attachments.order_id
            and (
                po.user_id = auth.uid()
                or exists (
                    select 1
                    from public.team_members tm
                    where tm.team_id = po.team_id
                        and tm.user_id = auth.uid()
                        and tm.is_active = true
                )
            )
    )
);

drop policy if exists "attachments write own" on public.project_attachments;
create policy "attachments write own"
on public.project_attachments
for all
using (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.project_orders po
        where po.id = project_attachments.order_id
            and (
                po.user_id = auth.uid()
                or exists (
                    select 1
                    from public.team_members tm
                    where tm.team_id = po.team_id
                        and tm.user_id = auth.uid()
                        and tm.is_active = true
                )
            )
    )
)
with check (
    auth.role() = 'service_role'
    or exists (
        select 1
        from public.project_orders po
        where po.id = project_attachments.order_id
            and (
                po.user_id = auth.uid()
                or exists (
                    select 1
                    from public.team_members tm
                    where tm.team_id = po.team_id
                        and tm.user_id = auth.uid()
                        and tm.is_active = true
                )
            )
    )
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into public.project_systems (slug, display_name, route, category, sort_order, is_active)
values
        ('dashboard', 'Dashboard', 'Dashboard.html', 'portal', 1, true),
        ('archive-2026', 'Archive 2026', '2026.html', 'archive', 2, true),
        ('office', 'Office', 'ئۆفیس.html', 'system', 10, true),
        ('mil-16', 'MIL 16', 'میل16.html', 'system', 20, true),
        ('mil-20', 'MIL 20', 'میل20.html', 'system', 30, true),
        ('mag-16', 'MAG 16', 'المغناطیس16.html', 'system', 40, true),
        ('mag-20', 'MAG 20', 'المغناطیس20.html', 'system', 50, true),
        ('motor', 'Motor', 'ماطور.HTML', 'system', 60, true),
        ('tel-16', 'TEL 16', 'سیستم تیل16.html', 'system', 70, true),
        ('tel-20', 'TEL 20', 'تیل20.html', 'system', 80, true),
        ('sliding', 'Sliding', 'سلایدینگ.html', 'system', 90, true),
        ('exterior', 'Exterior', 'خارجی.html', 'system', 100, true),
        ('equipment', 'Tajhizar Elyomi', 'تجهیزار الیومی.html', 'system', 110, true)
on conflict (slug) do update
set display_name = excluded.display_name,
        route = excluded.route,
        category = excluded.category,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        updated_at = now();
