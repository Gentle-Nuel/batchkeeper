-- Production Log — multi-business support.
-- Businesses are no longer 1:1 with auth users (businesses.id used to BE
-- auth.uid()) — one person (owner_id) can now own several. Since there is
-- no real user data yet, this drops and recreates cleanly rather than
-- fighting an in-place change to a primary key's identity. Run this whole
-- file once in the Supabase SQL Editor.

drop table if exists public.sales cascade;
drop table if exists public.batches cascade;
drop table if exists public.restock_entries cascade;
drop table if exists public.products cascade;
drop table if exists public.materials cascade;
drop table if exists public.notification_settings cascade;
drop table if exists public.businesses cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

create extension if not exists pgcrypto;

-- BUSINESSES ----------------------------------------------------------------
-- id is now independent (client-generated, same crypto.randomUUID()
-- convention as every other table) — owner_id is what links it back to the
-- auth user. Created explicitly by the client (the business-setup screen,
-- shown right after signup and again for "+ Add Business" later), not by a
-- trigger, since a human-entered name is required.
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  phone text,
  address text,
  currency text not null default 'NGN',
  owner_email text not null,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "Owner can manage own businesses"
  on public.businesses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- MATERIALS -------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  unit text not null,
  cost_per_unit numeric not null default 0,
  current_stock numeric not null default 0,
  reorder_point numeric not null default 0,
  supplier text
);

alter table public.materials enable row level security;

-- Every per-business table below uses the same predicate: "does the
-- business this row belongs to have an owner_id matching me?" rather than
-- the old direct business_id = auth.uid() check.
create policy "Business owner can manage materials"
  on public.materials for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- RESTOCK ENTRIES ------------------------------------------------------
create table public.restock_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  date date not null,
  quantity numeric not null,
  cost_per_unit numeric,
  supplier text,
  note text
);

alter table public.restock_entries enable row level security;

create policy "Business owner can manage restock entries"
  on public.restock_entries for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- PRODUCTS ----------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null,
  standard_batch_size numeric not null default 0,
  standard_batch_unit text not null,
  target_yield integer not null default 0,
  nafdac_status text not null default 'not_registered',
  nafdac_reg_no text,
  recipe jsonb not null default '[]'::jsonb
);

alter table public.products enable row level security;

create policy "Business owner can manage products"
  on public.products for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- BATCHES -----------------------------------------------------------------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  batch_number text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  date_made date not null,
  cure_ready_date date,
  expiry_date date,
  planned_yield integer not null default 0,
  actual_yield integer not null default 0,
  loss_quantity integer not null default 0,
  loss_reason text,
  labour_cost numeric not null default 0,
  status text not null default 'curing',
  materials_used jsonb not null default '[]'::jsonb
);

alter table public.batches enable row level security;

create policy "Business owner can manage batches"
  on public.batches for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- SALES -------------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  date date not null,
  quantity_sold integer not null,
  unit_price numeric not null,
  buyer_type text not null,
  buyer_name text
);

alter table public.sales enable row level security;

create policy "Business owner can manage sales"
  on public.sales for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- NOTIFICATION SETTINGS -------------------------------------------------
create table public.notification_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  low_stock_alerts boolean not null default true,
  batch_ready_alerts boolean not null default true,
  daily_summary boolean not null default false,
  sync_issue_alerts boolean not null default true
);

alter table public.notification_settings enable row level security;

create policy "Business owner can manage notification settings"
  on public.notification_settings for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- TABLE PRIVILEGES --------------------------------------------------------
-- RLS policies above restrict which ROWS a query can touch, but PostgREST
-- separately requires the coarse table-level GRANT before it evaluates RLS
-- at all — without this every request 403s with "permission denied for
-- table x" regardless of how correct the policies are.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.businesses,
  public.materials,
  public.restock_entries,
  public.products,
  public.batches,
  public.sales,
  public.notification_settings
to authenticated;
