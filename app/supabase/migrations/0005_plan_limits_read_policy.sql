-- Batchkeeper — fix: plan_limits was unreadable to real client requests.
--
-- 0004 deliberately left `plan_limits` without ROW LEVEL SECURITY enabled,
-- on the assumption that skipping it entirely would leave the table
-- globally readable to anyone with the table-level GRANT. That assumption
-- was wrong: confirmed live, the client-side query returned zero rows even
-- though the table genuinely has 2 (the `free`/`paid` rows) — Supabase
-- auto-enables RLS with zero policies on new public tables by default,
-- which silently makes a table return nothing to every real client role
-- (authenticated/anon), even with a GRANT in place. Only a superuser-level
-- connection (e.g. `supabase db query --linked`, which is how the
-- enforcement triggers were verified) bypasses RLS and sees the real rows
-- — which is exactly why this went unnoticed until testing against the
-- actual running app instead of admin SQL alone.
--
-- Fix: enable RLS explicitly (documenting the real state rather than
-- relying on an unstated platform default) and add the read policy that
-- was missing. This is reference data, not per-tenant — every
-- authenticated user may read every row.
alter table public.plan_limits enable row level security;

create policy "Any authenticated user can read plan limits"
  on public.plan_limits for select
  using (true);
