import { useAppStore } from "../store/useAppStore";
import { batchesInMonth, restocksInMonth } from "./selectors";
import type { Business, Product } from "../types/models";

// Mirrors supabase/migrations/0006_split_freemium_caps.sql's `plan_limits`
// table — fetched once at app boot into the store (see loadPlanLimits() in
// useAppStore.ts) so the client's live counter/warning always uses the
// exact same numbers the database triggers actually enforce, never a
// separately hardcoded guess that could drift out of sync.

export interface PlanLimits {
  monthlyBatches: number | null; // null = unlimited
  monthlyRestocks: number | null; // null = unlimited
  maxBusinesses: number | null; // null = unlimited
  maxProducts: number | null; // null = unlimited
}

export type PlanLimitsByPlan = Record<string, PlanLimits>;

/** A business whose plan isn't in the loaded table yet (limits still
 * fetching, or an unrecognized plan) is treated as unlimited — fail OPEN,
 * not closed. This is only ever a UX convenience; the real boundary is the
 * server-side trigger, so a client that hasn't loaded limits yet must never
 * wrongly block a legitimate save. */
export function batchCapForBusiness(business: Business, planLimits: PlanLimitsByPlan): number | null {
  return planLimits[business.plan]?.monthlyBatches ?? null;
}

/** See batchCapForBusiness above — restocks are capped independently, not
 * summed with batches (see the 0006 migration for why). Free tier starts
 * this uncapped by design; a non-null value only ever comes from the
 * plan_limits table being tuned later. */
export function restockCapForBusiness(business: Business, planLimits: PlanLimitsByPlan): number | null {
  return planLimits[business.plan]?.monthlyRestocks ?? null;
}

export function productCapForBusiness(business: Business, planLimits: PlanLimitsByPlan): number | null {
  return planLimits[business.plan]?.maxProducts ?? null;
}

export function isOverCap(count: number, cap: number | null): boolean {
  return cap !== null && count >= cap;
}

export function isNearCap(count: number, cap: number | null, thresholdRatio = 0.8): boolean {
  return cap !== null && count >= cap * thresholdRatio && count < cap;
}

/** Mirrors enforce_business_cap()'s actual rule directly (existing_count >= 1
 * and none of the owner's businesses is paid) rather than reading a numeric
 * limit — the real rule isn't "each plan permits N businesses" in general,
 * it's "any one paid business unlocks adding more to the account." */
export function canAddBusiness(businesses: Business[]): boolean {
  if (businesses.length === 0) return true;
  return businesses.some((b) => b.plan === "paid");
}

/** Whether this business can add another product/recipe right now — the
 * free tier's primary gate. Unlike canAddBusiness, this DOES read the
 * tunable plan_limits number (max_products), matching enforce_product_cap()
 * in the 0006 migration, so the free-tier count (currently 1) can be
 * re-tuned later via a plain UPDATE without a client code change. */
export function canAddProduct(products: Product[], business: Business, planLimits: PlanLimitsByPlan): boolean {
  const cap = productCapForBusiness(business, planLimits);
  return cap === null || products.length < cap;
}

/** Whether logging a new batch dated `dateISO` would be over the free-plan
 * batch cap right now — used to block submission client-side before the
 * optimistic write happens. This is a UX nicety for the common online case,
 * not the actual security boundary; the database trigger is what really
 * enforces it (see supabase/migrations/0006_split_freemium_caps.sql), which
 * matters for the offline case this can't see coming. */
export function useIsOverBatchCap(dateISO: string): boolean {
  const business = useAppStore((s) => s.business);
  const batches = useAppStore((s) => s.batches);
  const planLimits = useAppStore((s) => s.planLimits);

  const cap = batchCapForBusiness(business, planLimits);
  if (cap === null || !dateISO) return false;
  return isOverCap(batchesInMonth(batches, dateISO), cap);
}

/** See useIsOverBatchCap above — the restock equivalent. Returns false
 * whenever restocks are uncapped for the business's plan (the free-tier
 * default today). */
export function useIsOverRestockCap(dateISO: string): boolean {
  const business = useAppStore((s) => s.business);
  const restocks = useAppStore((s) => s.restocks);
  const planLimits = useAppStore((s) => s.planLimits);

  const cap = restockCapForBusiness(business, planLimits);
  if (cap === null || !dateISO) return false;
  return isOverCap(restocksInMonth(restocks, dateISO), cap);
}
