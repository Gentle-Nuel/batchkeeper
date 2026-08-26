import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, ReadOnlyField, BatchStatusPill, SecondaryButton } from "../../components/ui";
import { formatCurrency, formatDate, formatQty } from "../../lib/format";
import { batchMaterialsCost, batchTotalCost, batchCostPerUnit } from "../../lib/reports";
import { isLowStock, unitsRemainingForBatch } from "../../lib/selectors";
import { CoachmarkSequence } from "../../components/Coachmark";

const batchDetailCoachSteps = [
  {
    targetId: "mark-as-ready-btn",
    title: "Nothing flips this on its own",
    body: "There's no timer checking the target date for you. Tap this whenever you've actually checked the batch, even if it's early or a few days late.",
  },
];

export function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const materials = useAppStore((s) => s.materials);
  const products = useAppStore((s) => s.products);
  const batches = useAppStore((s) => s.batches);
  const sales = useAppStore((s) => s.sales);
  const updateBatch = useAppStore((s) => s.updateBatch);

  const batch = batches.find((b) => b.id === id);
  if (!batch) {
    return (
      <div className="p-5">
        <p className="text-[14px] text-text-secondary">Batch not found.</p>
      </div>
    );
  }

  const product = products.find((p) => p.id === batch.productId);
  const materialsCost = batchMaterialsCost(batch, materials);
  const totalCost = batchTotalCost(batch, materials);
  const costPerUnit = batchCostPerUnit(batch, materials);
  const remaining = unitsRemainingForBatch(batch, sales);
  const canSell = batch.status === "ready" || batch.status === "selling";

  return (
    <div className="pb-8">
      <BackHeader
        title={product?.name ?? "Batch"}
        onBack={() => navigate(-1)}
        right={<BatchStatusPill status={batch.status} />}
      />
      <p className="px-5 -mt-1 text-[12px] text-text-secondary">{batch.batchNumber}</p>

      {batch.status === "curing" && (
        <Section>
          <CoachmarkSequence sequenceId="batchDetail.markReady" steps={batchDetailCoachSteps} />
          <SecondaryButton id="mark-as-ready-btn" type="button" onClick={() => updateBatch(batch.id, { status: "ready" })}>
            <CheckCircle2 size={18} />
            Mark as Ready
          </SecondaryButton>
          <p className="mt-2 text-center text-[12px] text-text-secondary">
            {batch.cureReadyDate
              ? `Target ready date: ${formatDate(batch.cureReadyDate)}. Mark it whenever you've actually checked it.`
              : "Mark it ready whenever it's actually done. Nothing flips this automatically."}
          </p>
        </Section>
      )}

      <Section title="Overview">
        <Card className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="Date Made" value={formatDate(batch.dateMade)} />
          <ReadOnlyField label="Labour Cost" value={formatCurrency(batch.labourCost)} />
          {batch.cureReadyDate && <ReadOnlyField label="Ready Date" value={formatDate(batch.cureReadyDate)} />}
          {batch.expiryDate && <ReadOnlyField label="Expires" value={formatDate(batch.expiryDate)} />}
        </Card>
      </Section>

      <Section title="Yield & loss">
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <ReadOnlyField label="Planned" value={`${batch.plannedYield} units`} />
            <ReadOnlyField label="Actual" value={`${batch.actualYield} units`} />
            <ReadOnlyField label="Lost" value={`${batch.lossQuantity} units`} />
          </div>
          {batch.lossReason && (
            <p className="rounded-input bg-input-fill p-2.5 text-[12px] text-text-secondary">
              Reason: {batch.lossReason}
            </p>
          )}
        </Card>
      </Section>

      <Section title="Materials used">
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_70px_80px] gap-2 text-[10px] font-semibold uppercase text-text-secondary">
            <span>Material</span>
            <span>Used</span>
            <span>Remaining</span>
          </div>
          {batch.materialsUsed.map((used) => {
            const material = materials.find((m) => m.id === used.materialId);
            if (!material) return null;
            const low = isLowStock(material);
            return (
              <div key={used.materialId} className="grid grid-cols-[1fr_70px_80px] items-center gap-2">
                <span className="truncate text-[14px] text-text">{material.name}</span>
                <span className="text-[12px] text-text-secondary">{formatQty(used.actualQuantity, material.unit)}</span>
                <span className={`flex items-center gap-1 text-[12px] font-semibold ${low ? "text-status-curing-text" : "text-text"}`}>
                  {low && <AlertTriangle size={12} />}
                  {formatQty(material.currentStock, material.unit)}
                </span>
              </div>
            );
          })}
        </Card>
      </Section>

      <Section title="Cost breakdown">
        <Card className="flex flex-col gap-2">
          <div className="flex justify-between text-[14px]">
            <span className="text-text-secondary">Materials</span>
            <span className="text-text">{formatCurrency(materialsCost)}</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-text-secondary">Labour</span>
            <span className="text-text">{formatCurrency(batch.labourCost)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-[14px] font-semibold">
            <span className="text-text">Total</span>
            <span className="text-text">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-text-secondary">
            <span>Cost / unit</span>
            <span>{formatCurrency(costPerUnit)}</span>
          </div>
        </Card>
      </Section>

      {canSell && (
        <Section>
          <Link
            to={`/batches/${batch.id}/log-a-sale`}
            state={{ backgroundLocation: location }}
            className="flex items-center gap-3 rounded-card bg-teal p-4 text-white active:bg-teal-dark"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-white/15">
              <ShoppingCart size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">Log a Sale</span>
              <span className="block text-[12px] text-white/80">{remaining} units remaining</span>
            </span>
            <ArrowRight size={18} />
          </Link>
        </Section>
      )}
    </div>
  );
}
