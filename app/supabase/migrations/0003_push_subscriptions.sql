-- PUSH SUBSCRIPTIONS -------------------------------------------------------
-- One row per (business, device/browser) that has opted into Web Push. The
-- endpoint/p256dh/auth triple is exactly what the browser's PushManager
-- hands back from subscribe() and what the `send-push` Edge Function needs
-- to actually deliver a notification via the Web Push protocol.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Same predicate as every other per-business table (see 0002): does the
-- business this row belongs to have an owner_id matching me?
create policy "Business owner can manage push subscriptions"
  on public.push_subscriptions for all
  using (business_id in (select id from public.businesses where owner_id = auth.uid()))
  with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Table-level GRANT — RLS alone isn't enough, PostgREST 403s without this
-- regardless of policy correctness (see 0001's GRANT section for why).
grant select, insert, update, delete on public.push_subscriptions to authenticated;
