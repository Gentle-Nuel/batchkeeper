import { useAppStore } from "../store/useAppStore";
import { productionEntriesInMonth } from "./selectors";
import type { Business } from "../types/models";

// Mirrors supabase/migrations/0004_freemium_caps.sql's `plan_limits` table —
// fetched once at app boot into the store (see loadPlanLimits() in
// useAppStore.ts) so the client's live counter/warning always uses the
// exact same numbers the database triggers actually enforce, never a
// separately hardcoded guess that could drift out of sync.

export interface PlanLimits {
  monthlyEntries: number | null; // null = unlimited
  maxBusinesses: number | null; // null = unlimited
}

export type PlanLimitsByPlan = Record<string, PlanLimits>;

/** A business whose plan isn't in the loaded table yet (limits still
 * fetching, or an unrecognized plan) is treated as unlimited — fail OPEN,
 * not closed. This is only ever a UX convenience; the real boundary is the
 * server-side trigger, so a client that hasn't loaded limits yet must never
 * wrongly block a legitimate save. */
export function entryCapForBusiness(business: Business, planLimits: PlanLimitsByPlan): number | null {
  return planLimits[business.plan]?.monthlyEntries ?? null;
}

export function isOverEntryCap(count: number, cap: number | null): boolean {
  return cap !== null && count >= cap;
}

export function isNearEntryCap(count: number, cap: number | null, thresholdRatio = 0.8): boolean {
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

/** Whether logging a new production entry (a batch or a restock) dated
 * `dateISO` would be over the free-plan cap right now — used to block
 * submission client-side before the optimistic write happens. This is a UX
 * nicety for the common online case, not the actual security boundary; the
 * database trigger is what really enforces it (see
 * supabase/migrations/0004_freemium_caps.sql), which matters for the
 * offline case this can't see coming. */
export function useIsOverProductionCap(dateISO: string): boolean {
  const business = useAppStore((s) => s.business);
  const batches = useAppStore((s) => s.batches);
  const restocks = useAppStore((s) => s.restocks);
  const planLimits = useAppStore((s) => s.planLimits);

  const cap = entryCapForBusiness(business, planLimits);
  if (cap === null || !dateISO) return false;
  return isOverEntryCap(productionEntriesInMonth(batches, restocks, dateISO), cap);
}
