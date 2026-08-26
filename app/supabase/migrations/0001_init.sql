-- Production Log — initial schema
-- Multi-tenant: one business per auth user (v1, solo-owner-per-business).
-- businesses.id == auth.users.id, so every RLS policy is a simple
-- `business_id = auth.uid()` check. Run this whole file once in the
-- Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

-- BUSINESSES ----------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  address text,
  currency text not null default 'NGN',
  owner_email text not null,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "Owner can view own business"
  on public.businesses for select
  using (id = auth.uid());

create policy "Owner can update own business"
  on public.businesses for update
  using (id = auth.uid());

-- MATERIALS -------------------------------------------------------------
create table if not exists public.materials (
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

create policy "Business can manage own materials"
  on public.materials for all
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

-- RESTOCK ENTRIES ------------------------------------------------------
create table if not exists public.restock_entries (
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

create policy "Business can manage own restock entries"
  on public.restock_entries for all
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

-- PRODUCTS ----------------------------------------------------------------
-- recipe is stored as jsonb: [{ "materialId": "...", "quantity": 1.2 }, ...]
-- (mirrors src/types/models.ts RecipeItem[] exactly, no join table needed for v1)
create table if not exists public.products (
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

create policy "Business can manage own products"
  on public.products for all
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

-- BATCHES -----------------------------------------------------------------
-- materials_used is jsonb: [{ "materialId", "plannedQuantity", "actualQuantity" }, ...]
create table if not exists public.batches (
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

create policy "Business can manage own batches"
  on public.batches for all
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

-- SALES -------------------------------------------------------------------
create table if not exists public.sales (
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

create policy "Business can manage own sales"
  on public.sales for all
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

-- NOTIFICATION SETTINGS -------------------------------------------------
create table if not exists public.notification_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  low_stock_alerts boolean not null default true,
  batch_ready_alerts boolean not null default true,
  daily_summary boolean not null default false,
  sync_issue_alerts boolean not null default true
);

alter table public.notification_settings enable row level security;

create policy "Business can manage own notification settings"
  on public.notification_settings for all
  using (business_id = auth.uid())
  with check (business_id = auth.uid());

-- AUTO-CREATE A BUSINESS ROW ON SIGNUP -----------------------------------
-- Every new auth.users row (from supabase.auth.signUp) gets a matching
-- businesses row + default notification_settings automatically, so the
-- client never has to do this as a separate, racy post-signup step.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.businesses (id, owner_email, currency)
  values (new.id, new.email, 'NGN');

  insert into public.notification_settings (business_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
