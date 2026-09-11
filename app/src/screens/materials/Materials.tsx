import { Link } from "react-router-dom";
import { AlertTriangle, PackagePlus } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { PageHeader, Section } from "../../components/ui";
import { isLowStock } from "../../lib/selectors";
import { formatCurrency, formatQty, pluralize } from "../../lib/format";
import { CoachmarkSequence } from "../../components/Coachmark";

const materialsCoachSteps = [
  {
    targetId: "reorder-point-hint",
    title: "Reorder point",
    body: "When stock drops to this level, Low Stock Alerts fire, naming exactly which products it affects, not just the material.",
  },
];

export function Materials() {
  const materials = useAppStore((s) => s.materials);
  const lowCount = materials.filter(isLowStock).length;

  // pb-24 (96px), not pb-4 -- BottomNav is fixed and 83px tall, so this
  // screen (rendered behind it, unlike drill-down screens which don't
  // need this) has to reserve real clearance itself or its last content
  // ends up hidden behind the nav with no more page to scroll to.
  return (
    <div className="pb-24">
      {materials.length > 0 && <CoachmarkSequence sequenceId="materials.reorderPoint" steps={materialsCoachSteps} />}
      <PageHeader title="Materials" />
      <p className="px-5 -mt-1 text-[12px] text-text-secondary">
        {pluralize(materials.length, "material")}{lowCount > 0 ? ` · ${lowCount} low stock` : ""}
      </p>

      <Section
        title="All materials"
        action={
          <Link
            to="/materials/new"
            className="rounded-pill bg-teal px-3 py-1.5 text-[14px] font-semibold text-white"
          >
            + Add
          </Link>
        }
      >
        <div className="flex flex-col gap-3">
          {materials.map((m, index) => {
            const low = isLowStock(m);
            return (
              <div key={m.id} className="rounded-card border border-border bg-surface p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/materials/${m.id}/edit`} className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-text">{m.name}</p>
                    <p className="text-[12px] text-text-secondary">
                      {formatCurrency(m.costPerUnit)} / {m.unit}
                    </p>
                  </Link>
                  <Link
                    to={`/materials/${m.id}/restock`}
                    className="flex shrink-0 items-center gap-1 rounded-pill border border-teal px-2.5 py-1 text-[12px] font-semibold text-teal"
                  >
                    <PackagePlus size={12} />
                    Restock
                  </Link>
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className={`flex items-center gap-1 font-semibold ${low ? "text-status-curing-text" : "text-text"}`}>
                    {low && <AlertTriangle size={12} />}
                    Stock: {formatQty(m.currentStock, m.unit)}
                  </span>
                  <span id={index === 0 ? "reorder-point-hint" : undefined} className="text-text-secondary">
                    Reorder at {formatQty(m.reorderPoint, m.unit)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
