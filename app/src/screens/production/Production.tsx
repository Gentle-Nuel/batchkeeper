import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ClipboardPlus, ChevronRight } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { PageHeader, Card, Section, BatchStatusPill } from "../../components/ui";
import { lowStockMaterials, materialsAffectedSummary, productForBatch, sortByDateDesc } from "../../lib/selectors";
import { formatDateShort } from "../../lib/format";
import { CoachmarkSequence } from "../../components/Coachmark";

const productionCoachSteps = [
  {
    targetId: "log-a-batch-cta",
    title: "Start here",
    body: "Log a batch every time you make a run. Materials, yield, and cost all get tracked automatically from this one action.",
  },
  {
    targetId: "sync-badge",
    title: "Works offline too",
    body: "This shows whether your latest changes have synced. Nothing is lost if you're offline mid-production, it catches up once you're back online.",
  },
];

export function Production() {
  const materials = useAppStore((s) => s.materials);
  const products = useAppStore((s) => s.products);
  const batches = useAppStore((s) => s.batches);

  const lowStock = lowStockMaterials(materials);
  const affectedLines = materialsAffectedSummary(materials, products);
  const curingCount = batches.filter((b) => b.status === "curing").length;
  const readyCount = batches.filter((b) => b.status === "ready" || b.status === "selling").length;
  const recentBatches = sortByDateDesc(batches).slice(0, 3);

  return (
    <div className="pb-4">
      <CoachmarkSequence sequenceId="production.intro" steps={productionCoachSteps} />
      <PageHeader title="Production" />

      <Section>
        <Card>
          {lowStock.length > 0 && (
            <div className="mb-3 flex gap-2.5 rounded-input border border-status-curing-text/20 bg-status-curing-bg p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-curing-text" />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-status-curing-text">
                  {lowStock.length} material{lowStock.length > 1 ? "s" : ""} low on stock
                </p>
                {affectedLines.map((line) => (
                  <p key={line} className="text-[12px] text-status-curing-text/90">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="flex divide-x divide-border">
            <div className="flex-1 pr-3 text-center">
              <p className="text-[24px] font-semibold text-text">{curingCount}</p>
              <p className="text-[12px] text-text-secondary">Processing</p>
            </div>
            <div className="flex-1 pl-3 text-center">
              <p className="text-[24px] font-semibold text-text">{readyCount}</p>
              <p className="text-[12px] text-text-secondary">Ready to sell</p>
            </div>
          </div>
        </Card>
      </Section>

      <Section>
        <Link
          id="log-a-batch-cta"
          to="/log-a-batch"
          className="flex items-center gap-3 rounded-card bg-teal p-4 text-white shadow-sm active:bg-teal-dark"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-white/15">
            <ClipboardPlus size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">Log a Batch</span>
            <span className="block text-[12px] text-white/80">Record a new production run</span>
          </span>
          <ArrowRight size={18} />
        </Link>
      </Section>

      <Section
        title="Recent batches"
        action={
          <Link to="/batches" className="flex items-center gap-0.5 text-[12px] font-semibold text-teal">
            View all
            <ChevronRight size={14} />
          </Link>
        }
      >
        <div className="flex flex-col gap-3">
          {recentBatches.map((batch) => {
            const product = productForBatch(batch, products);
            return (
              <Link
                key={batch.id}
                to={`/batches/${batch.id}`}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-text">{product?.name ?? "Unknown"}</p>
                  <p className="text-[12px] text-text-secondary">
                    {batch.batchNumber} · {formatDateShort(batch.dateMade)}
                  </p>
                </div>
                <BatchStatusPill status={batch.status} />
              </Link>
            );
          })}
          {recentBatches.length === 0 && (
            <p className="py-10 text-center text-[12px] text-text-secondary">No batches logged yet.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
