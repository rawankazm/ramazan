# Supabase Schema

This folder contains the database schema for the project.

## What it creates

- `project_systems` for the dashboard modules and archive routes.
- `project_orders` for the order header data.
- `project_order_rows` for the row-level measurements and item data.
- `project_state` for shared app state that currently lives in browser `localStorage`.

## Setup and secure access

1. Open Supabase Dashboard → SQL Editor and run `schema.sql`.
2. Run `security_hardening.sql` in SQL Editor. This is required for existing projects too; editing `schema.sql` alone does not update a database that has already been set up.
3. In Authentication settings, enable email/password sign-in and disable public sign-ups. Add the deployed HTTPS site URL to the allowed site/redirect URLs.
4. In Authentication → Users, create each permitted user. Do not share passwords in chat or source files.
5. For each permitted user's Auth UUID, run this in SQL Editor, replacing the UUID and optional name:

   ```sql
   insert into public.profiles (id, display_name, is_active)
   values ('AUTH_USER_UUID', 'Name', true)
   on conflict (id) do update
   set display_name = excluded.display_name, is_active = true;
   ```

To revoke a user's access, set `is_active = false` for their profile. The browser app checks this flag, and database row-level security enforces it for shared 2026 data. Anonymous table access is revoked, and `teams`/`team_members` are not exposed to browser roles.

The app uses a Supabase publishable key in the browser; this key is not a password. Access control depends on the SQL policies and on only enabling trusted profiles. Never put a Supabase service-role key in browser code.

The system pages keep their existing responsive layout after sign-in. Login is required on both desktop and mobile; static HTML alone cannot protect shared data without the database policy above. To sign out on a device, open `../login.html` and use the sign-out button.
