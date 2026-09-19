import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, BatchStatusPill } from "../../components/ui";
import { sortByDateDesc, productForBatch } from "../../lib/selectors";
import { formatDateShort } from "../../lib/format";
import type { BatchStatus } from "../../types/models";

const filters: { label: string; value: BatchStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Processing", value: "curing" },
  { label: "Ready", value: "ready" },
  { label: "Sold Out", value: "sold_out" },
];

export function AllBatches() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const products = useAppStore((s) => s.products);
  const [filter, setFilter] = useState<BatchStatus | "all">("all");

  const visible = sortByDateDesc(
    batches.filter((b) => filter === "all" || b.status === filter || (filter === "ready" && b.status === "selling")),
  );

  return (
    <div className="pb-8">
      <BackHeader title="All Batches" onBack={() => navigate(-1)} />

      <div className="flex gap-2 overflow-x-auto px-5 py-3 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[12px] font-semibold ${
              filter === f.value ? "bg-teal text-white" : "border border-border bg-surface text-text-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-5">
        {visible.map((batch) => {
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
        {visible.length === 0 && (
          <p className="py-10 text-center text-[12px] text-text-secondary">No batches in this filter yet.</p>
        )}
      </div>
    </div>
  );
}
