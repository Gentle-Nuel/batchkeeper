-- Batchkeeper — free-tier mechanics.
-- A `plan` column on businesses, a data-driven limits table (so the
-- provisional cap numbers can be tuned via a plain UPDATE once real usage
-- data exists — see the freemium plan doc — rather than a new migration
-- every time), and server-side enforcement via BEFORE INSERT triggers.
-- The client shows a live counter/warning as a UX convenience, but these
-- triggers are the actual boundary: it must hold even for a write replayed
-- later from the offline outbox, when the client had no way to know the
-- live count at the time it was logged.

alter table public.businesses
  add column plan text not null default 'free' check (plan in ('free', 'paid'));

-- PLAN LIMITS -----------------------------------------------------------
-- Reference data, not per-tenant — deliberately no RLS enabled (every
-- authenticated user may read the whole table), just a table-level GRANT
-- so the client can fetch it once at boot and use the exact same numbers
-- the triggers below enforce. Nothing here is user-writable.
create table public.plan_limits (
  plan text primary key,
  monthly_entries integer, -- null = unlimited
  max_businesses integer   -- null = unlimited
);

insert into public.plan_limits (plan, monthly_entries, max_businesses) values
  ('free', 20, 1),
  ('paid', null, null);

grant select on public.plan_limits to authenticated;

-- ENTRY CAP ---------------------------------------------------------------
-- One combined counter per business per calendar month: batches +
-- restock_entries. Sales are deliberately excluded — see the freemium plan
-- (sales history feeds the paid P&L view, capping it would choke the very
-- data that makes upgrading worth it).
--
-- "Calendar month" is taken from the row's OWN date column (date_made /
-- date) — the same field the user actually typed/sees — not the server's
-- now(), so a late-night entry near a month boundary can't land in a
-- different month here than what's shown on screen.
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
  -- An upsert (INSERT ... ON CONFLICT DO UPDATE, what every client write in
  -- this app uses) fires this BEFORE INSERT trigger even when the row
  -- already exists and the operation will actually resolve to an UPDATE
  -- (e.g. updateBatch() editing an existing batch's status). Only a
  -- genuinely new id should ever count against the cap — an edit to an
  -- already-counted row must not be blocked by it.
  if TG_TABLE_NAME = 'batches' then
    if exists (select 1 from batches where id = NEW.id) then
      return NEW;
    end if;
    entry_date := NEW.date_made;
  else
    if exists (select 1 from restock_entries where id = NEW.id) then
      return NEW;
    end if;
    entry_date := NEW.date;
  end if;

  select plan into biz_plan from businesses where id = NEW.business_id;
  select monthly_entries into cap from plan_limits where plan = biz_plan;

  if cap is null then
    return NEW; -- unlimited plan, or no matching plan row — fail open
  end if;

  select
    (select count(*) from batches
      where business_id = NEW.business_id
        and date_trunc('month', date_made) = date_trunc('month', entry_date))
    +
    (select count(*) from restock_entries
      where business_id = NEW.business_id
        and date_trunc('month', date) = date_trunc('month', entry_date))
  into used;

  if used >= cap then
    -- Fixed, greppable prefix — the client's outbox matches on this exact
    -- string to tell a permanent rejection apart from a transient network
    -- failure (see src/lib/outbox.ts). Don't reword without updating there.
    raise exception 'FREE_PLAN_LIMIT: monthly production entry limit reached (% of % used)', used, cap;
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_entry_cap_batches on public.batches;
create trigger enforce_entry_cap_batches
  before insert on public.batches
  for each row execute procedure public.enforce_entry_cap();

drop trigger if exists enforce_entry_cap_restocks on public.restock_entries;
create trigger enforce_entry_cap_restocks
  before insert on public.restock_entries
  for each row execute procedure public.enforce_entry_cap();

-- BUSINESS CAP ------------------------------------------------------------
-- A brand-new account must always be able to create its first business —
-- only a 2nd+ business is gated. Subscribing on any ONE business unlocks
-- adding more to the same account, rather than each business needing its
-- own separate subscription just to exist.
create or replace function public.enforce_business_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_count integer;
  has_paid boolean;
begin
  -- Same upsert-fires-BEFORE-INSERT-too subtlety as enforce_entry_cap()
  -- above — updateBusiness() upserts the full row on every edit.
  if exists (select 1 from businesses where id = NEW.id) then
    return NEW;
  end if;

  select count(*), bool_or(plan = 'paid')
    into existing_count, has_paid
    from businesses where owner_id = NEW.owner_id;

  if existing_count >= 1 and not coalesce(has_paid, false) then
    raise exception 'FREE_PLAN_LIMIT: free accounts are limited to 1 business';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_business_cap on public.businesses;
create trigger enforce_business_cap
  before insert on public.businesses
  for each row execute procedure public.enforce_business_cap();
