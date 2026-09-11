-- Batchkeeper — revise free-tier gating (see the free-tier-gating
-- recommendation docs, revised version matched to shipped code).
--
-- Two changes to 0004_freemium_caps.sql's mechanics:
-- 1. Split the combined batches+restocks counter into two independent
--    caps. Bundling them measured an activity (purchasing pattern) that
--    varies for reasons unrelated to value delivered — two businesses
--    with identical batch output could burn the shared counter at very
--    different rates purely based on how often they restock, and
--    frequent-small-buy businesses tend to be the more cash-constrained
--    ones, exactly who the free tier should be least eager to squeeze.
--    Restocks are left uncapped for now (the more clearly-reasoned of the
--    two options the doc offered) — tune via a plain UPDATE once real
--    usage data exists, same as every other number in this table.
-- 2. Add a product/recipe count cap — a new, independent gate (caps
--    product LINES within one business, distinct from the existing
--    1-business-per-account gate) and, per the finalized spec, now the
--    tier's PRIMARY gate: a certain trigger tied to business growth, not
--    a behavioral assumption.
--
-- Export gating and staff/user seats were both considered and are
-- deliberately NOT part of this migration — export stays free on every
-- tier (Account.tsx's "Export My Data" is how users exercise their NDPA
-- right to their own data; gating it would break that compliance path
-- and contradicts the standing principle that compliance-related access
-- stays free so the product doesn't look exploitative). Staff seats is a
-- real new auth feature (invite flow, roles, RLS changes), not just a
-- gate on something that already exists — scoped separately.

alter table public.plan_limits
  add column monthly_batches integer,   -- null = unlimited
  add column monthly_restocks integer,  -- null = unlimited
  add column max_products integer;      -- null = unlimited

-- monthly_batches keeps the free tier's original headline number (20),
-- now counting batches alone. monthly_restocks starts unlimited by
-- design. max_products is the new primary gate: 1 free.
update public.plan_limits set monthly_batches = 20, monthly_restocks = null, max_products = 1 where plan = 'free';
update public.plan_limits set monthly_batches = null, monthly_restocks = null, max_products = null where plan = 'paid';

-- monthly_entries is deliberately NOT dropped here, even though nothing in
-- this migration reads it anymore. The frontend currently deployed to
-- production still queries it (loadPlanLimits() in useAppStore.ts on
-- main/production selects `*` from plan_limits and destructures
-- row.monthly_entries) — dropping it now would make that column vanish
-- out from under the live app before the matching frontend deploys,
-- silently failing open (unlimited) for every real user in the gap
-- between this migration applying and the new frontend shipping. Left as
-- a deprecated column; drop it in a follow-up cleanup migration once the
-- frontend that reads monthly_batches/monthly_restocks/max_products
-- instead is actually live.

-- ENTRY CAP, split ---------------------------------------------------------
-- Same function/trigger wiring as 0004 (triggers already exist, this just
-- replaces the function body in place) — only now each table is checked
-- against its own cap and its own count, instead of both summed against
-- one shared cap.
create or replace function public.enforce_entry_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  biz_plan text;
  cap integer;
  entry_date date;
  used integer;
begin
  -- Same upsert-fires-BEFORE-INSERT-too subtlety as 0004 — only a
  -- genuinely new id should ever count against the cap.
  if TG_TABLE_NAME = 'batches' then
    if exists (select 1 from batches where id = NEW.id) then
      return NEW;
    end if;
    entry_date := NEW.date_made;

    select plan into biz_plan from businesses where id = NEW.business_id;
    select monthly_batches into cap from plan_limits where plan = biz_plan;
    if cap is null then
      return NEW; -- unlimited plan, unrecognized plan, or restocks now uncapped — fail open
    end if;

    select count(*) into used from batches
      where business_id = NEW.business_id
        and date_trunc('month', date_made) = date_trunc('month', entry_date);
  else
    if exists (select 1 from restock_entries where id = NEW.id) then
      return NEW;
    end if;
    entry_date := NEW.date;

    select plan into biz_plan from businesses where id = NEW.business_id;
    select monthly_restocks into cap from plan_limits where plan = biz_plan;
    if cap is null then
      return NEW;
    end if;

    select count(*) into used from restock_entries
      where business_id = NEW.business_id
        and date_trunc('month', date) = date_trunc('month', entry_date);
  end if;

  if used >= cap then
    -- Fixed, greppable prefix — src/lib/outbox.ts matches on this exact
    -- prefix to tell a permanent rejection apart from a transient network
    -- failure. Don't reword the prefix without updating there.
    raise exception 'FREE_PLAN_LIMIT: monthly % limit reached (% of % used)',
      (case when TG_TABLE_NAME = 'batches' then 'batch' else 'restock' end), used, cap;
  end if;

  return NEW;
end;
$$;

-- PRODUCT CAP ---------------------------------------------------------------
-- Mirrors enforce_business_cap()'s shape (see 0004): count existing rows
-- for this business, compare against the business's plan's limit.
create or replace function public.enforce_product_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  biz_plan text;
  cap integer;
  used integer;
begin
  if exists (select 1 from products where id = NEW.id) then
    return NEW;
  end if;

  select plan into biz_plan from businesses where id = NEW.business_id;
  select max_products into cap from plan_limits where plan = biz_plan;
  if cap is null then
    return NEW;
  end if;

  select count(*) into used from products where business_id = NEW.business_id;

  if used >= cap then
    raise exception 'FREE_PLAN_LIMIT: free accounts are limited to % product(s)', cap;
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_product_cap on public.products;
create trigger enforce_product_cap
  before insert on public.products
  for each row execute procedure public.enforce_product_cap();
