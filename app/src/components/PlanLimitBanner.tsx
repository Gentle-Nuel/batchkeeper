import { AlertTriangle } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { batchesInMonth, restocksInMonth } from "../lib/selectors";
import { batchCapForBusiness, restockCapForBusiness, isNearCap, isOverCap } from "../lib/planLimits";

/** Live "X/Y batches (or restocks) used this month" counter shown on the
 * entry point that counts against the corresponding free-plan cap (Log a
 * Batch for `kind="batch"`, Add Stock for `kind="restock"`) — mirrors the
 * server-side enforcement in
 * supabase/migrations/0007_split_freemium_caps.sql. Batches and restocks
 * are capped independently (not summed) — see that migration's comment for
 * why — so this renders nothing for `kind="restock"` while restocks remain
 * uncapped, the free-tier default today. Purely a UX convenience, computed
 * from data already loaded in the store (no extra request): a business on
 * an unlimited plan, or whose limits haven't loaded yet, renders nothing
 * rather than risk wrongly warning/blocking. `dateISO` is the date the
 * entry being logged will actually be filed under (the form's own date
 * field), not necessarily today. */
export function ProductionCapBanner({ dateISO, kind }: { dateISO: string; kind: "batch" | "restock" }) {
  const business = useAppStore((s) => s.business);
  const batches = useAppStore((s) => s.batches);
  const restocks = useAppStore((s) => s.restocks);
  const planLimits = useAppStore((s) => s.planLimits);

  const cap = kind === "batch" ? batchCapForBusiness(business, planLimits) : restockCapForBusiness(business, planLimits);
  if (cap === null || !dateISO) return null;

  const used = kind === "batch" ? batchesInMonth(batches, dateISO) : restocksInMonth(restocks, dateISO);
  const over = isOverCap(used, cap);
  const near = isNearCap(used, cap);
  if (!over && !near) return null;

  const label = kind === "batch" ? "batches" : "restocks";

  return (
    <div
      className={`mx-5 mb-3 flex items-start gap-2 rounded-card border p-3 text-[12px] ${
        over
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-status-curing-text/30 bg-status-curing-bg text-status-curing-text"
      }`}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>
        {over
          ? `You've used all ${cap} free ${label} this month. Upgrade to log more.`
          : `${used}/${cap} free ${label} used this month.`}
      </span>
    </div>
  );
}
