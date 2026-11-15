# Supabase Schema

This folder contains the database schema for the project.

## What it creates

- `project_systems` for the dashboard modules and archive routes.
- `project_orders` for the order header data.
- `project_order_rows` for the row-level measurements and item data.
- `project_state` for shared app state that currently lives in browser `localStorage`.

## Setup and access

1. Open Supabase Dashboard → SQL Editor and run `schema.sql`.
2. Run `security_hardening.sql` in SQL Editor. This is required for existing projects too; editing `schema.sql` alone does not update a database that has already been set up.

`security_hardening.sql` enables anonymous read/write access only to the shared 2026 state rows. This removes the email/password sign-in requirement, but anyone who can reach the site can read, change, or delete that shared data. Do not use this configuration for private or sensitive information. The app uses a Supabase publishable key in the browser; never put a Supabase service-role key in browser code.

After both SQL files have been applied and the Supabase project is active, desktop and mobile can use the shared 2026 data without signing in.

## Troubleshooting `HTTP 402` (`exceed_egress_quota`)

This response means Supabase has restricted the project after its egress quota was exceeded. It cannot be fixed by changing the browser key or frontend code. The project owner must use Supabase Dashboard to upgrade the plan or remove the spend cap, as indicated by the API response. Once service is restored, reload the app on each device.

The archive page batches state writes, waits for a pause in editing before syncing, and checks for remote changes only while visible, with a one-minute fallback interval. Realtime updates remain enabled.
