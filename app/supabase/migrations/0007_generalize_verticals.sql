-- Batchkeeper — generalize beyond soap/cosmetics (see
-- memory:batchkeeper-vertical-expansion-plan / Batchkeeper-DEVLOG.md for
-- the full plan this implements).
--
-- Note on scope: products.category, materials.unit, and
-- products.standard_batch_unit / batches.standard_batch_unit were already
-- plain `text` columns with no CHECK constraint (see 0001_init.sql) — the
-- closed 3-value category / 4-value unit union was a TypeScript-only wall
-- (src/types/models.ts), never a real schema one. Nothing to migrate there
-- at the database level; src/types/models.ts and src/lib/presets.ts carry
-- that change instead. This migration only adds the two genuinely new
-- fields identified by the plan.

-- PRODUCTS: producer-controlled NAFDAC-relevance toggle -------------------
-- Replaces the implicit "NAFDAC always applies" assumption baked into the
-- old 3-category union. Defaults to true for both new rows and existing
-- ones — every category that existed before this migration (soap,
-- cosmetic, cleaning agent) is in fact NAFDAC-relevant, so backfilling true
-- changes nothing for current data; it only stops being universally true
-- once a non-regulated category (candle, jewelry, pottery, textile, ...)
-- gets used.
alter table public.products
  add column nafdac_relevant boolean not null default true;

-- BUSINESSES: onboarding "what do you make?" pre-fill source --------------
-- Purely a pre-fill source for a NEW product's category/unit/NAFDAC/cure
-- defaults (see src/lib/presets.ts) — read once at Add Product time, never
-- enforced, nullable since it's optional and every existing business has
-- no answer on record yet.
alter table public.businesses
  add column default_category_preset text;
