import { AlertTriangle } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { productionEntriesInMonth } from "../lib/selectors";
import { entryCapForBusiness, isNearEntryCap, isOverEntryCap } from "../lib/planLimits";

/** Live "X/Y production entries used this month" counter shown on both
 * entry points that count against the free-plan cap (Log a Batch, Add
 * Stock) — mirrors the server-side enforcement in
 * supabase/migrations/0004_freemium_caps.sql. Purely a UX convenience,
 * computed from data already loaded in the store (no extra request): a
 * business on an unlimited plan, or whose limits haven't loaded yet,
 * renders nothing rather than risk wrongly warning/blocking. `dateISO` is
 * the date the entry being logged will actually be filed under (the form's
 * own date field), not necessarily today. */
export function ProductionCapBanner({ dateISO }: { dateISO: string }) {
  const business = useAppStore((s) => s.business);
  const batches = useAppStore((s) => s.batches);
  const restocks = useAppStore((s) => s.restocks);
  const planLimits = useAppStore((s) => s.planLimits);

  const cap = entryCapForBusiness(business, planLimits);
  if (cap === null || !dateISO) return null;

  const used = productionEntriesInMonth(batches, restocks, dateISO);
  const over = isOverEntryCap(used, cap);
  const near = isNearEntryCap(used, cap);
  if (!over && !near) return null;

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
          ? `You've used all ${cap} free production entries this month. Upgrade to log more.`
          : `${used}/${cap} free production entries used this month.`}
      </span>
    </div>
  );
}
