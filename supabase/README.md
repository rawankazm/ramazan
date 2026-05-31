# Supabase Schema

This folder contains the database schema for the project.

## What it creates

- `project_systems` for the dashboard modules and archive routes.
- `project_orders` for the order header data.
- `project_order_rows` for the row-level measurements and item data.
- `project_state` for shared app state that currently lives in browser `localStorage`.

## How to apply

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Paste the contents of `schema.sql`.
4. Run it once.

## Notes

- The schema enables RLS and adds permissive policies so the current browser app can work with the publishable key.
- If you later add login/auth, replace the public policies with user-specific policies.
- The `project_state` table is the closest database replacement for keys like `2026_data`, `2026_table_rows`, `glass_orders_2026`, `app_lang`, and similar browser state.
- Use a browser-generated `client_key` to keep each browser/profile state separate without requiring login.
