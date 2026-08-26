import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackagePlus, FlaskConical } from "lucide-react";
import { BackHeader, Card, Section, BoxedInput, BoxedSelect, BoxedTextarea, PrimaryButton, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/useAppStore";
import { formatQty } from "../../lib/format";
import type { BatchMaterialUsed } from "../../types/models";
import { CoachmarkSequence } from "../../components/Coachmark";

/** Shown instead of the form when logging a batch isn't possible yet — a
 * batch consumes a recipe, and a recipe consumes materials, so both have to
 * exist first. Without this, a brand-new user landed on an empty product
 * dropdown with the Materials table hidden and a Save button that silently
 * no-oped — no error, no explanation, nothing. */
function LogABatchPrerequisite({
  icon,
  title,
  body,
  ctaLabel,
  ctaTo,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-teal/10 text-teal">{icon}</span>
      <h2 className="text-[16px] font-semibold text-text">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-text-secondary">{body}</p>
      <div className="mt-5 w-full max-w-xs">
        <PrimaryButton type="button" onClick={() => navigate(ctaTo)}>
          {ctaLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

const logBatchCoachSteps = [
  {
    targetId: "planned-actual-header",
    title: "Planned vs. Actual",
    body: "Planned comes straight from the recipe and can't be edited here. Actual is what you really used. They don't have to match, and the gap is worth recording, not smoothing over.",
  },
];

export function LogABatch() {
  const navigate = useNavigate();
  const products = useAppStore((s) => s.products);
  const materials = useAppStore((s) => s.materials);
  const logBatch = useAppStore((s) => s.logBatch);

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [dateMade, setDateMade] = useState(() => new Date().toISOString().slice(0, 10));
  // Both dates below were displayed on Batch Detail from day one but never
  // actually had an input anywhere — every real batch logged through this
  // form left them permanently blank, invisible in demo/seed data since
  // that's hand-filled directly. Real bug, not cosmetic: cureReadyDate is
  // literally what the "Mark as Ready" reminder message is built around.
  const [cureReadyDate, setCureReadyDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>({});
  const [actualYield, setActualYield] = useState<number | "">("");
  const [lossReason, setLossReason] = useState("");
  const [labourCost, setLabourCost] = useState<number | "">("");

  const product = products.find((p) => p.id === productId);

  // Soap needs weeks to cure — suggest a sensible starting point (4 weeks,
  // the commonly-cited minimum) rather than leaving it to be calculated by
  // hand every time. Only fills an empty field, never overwrites a value
  // she's already set or edited herself.
  useEffect(() => {
    if (product?.category === "soap" && !cureReadyDate) {
      const d = new Date(dateMade);
      d.setDate(d.getDate() + 28);
      setCureReadyDate(d.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.category, dateMade]);

  const planned: BatchMaterialUsed[] = useMemo(() => {
    if (!product) return [];
    return product.recipe.map((r) => ({
      materialId: r.materialId,
      plannedQuantity: r.quantity,
      actualQuantity: actualQuantities[r.materialId] ?? r.quantity,
    }));
  }, [product, actualQuantities]);

  const plannedYield = product?.targetYield ?? 0;
  const lossQuantity = actualYield === "" ? 0 : Math.max(0, plannedYield - Number(actualYield));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const id = logBatch({
      productCode: product.code,
      productId: product.id,
      dateMade,
      cureReadyDate: cureReadyDate || undefined,
      expiryDate: expiryDate || undefined,
      plannedYield,
      actualYield: actualYield === "" ? plannedYield : Number(actualYield),
      lossQuantity,
      lossReason: lossQuantity > 0 ? lossReason : undefined,
      labourCost: labourCost === "" ? 0 : Number(labourCost),
      materialsUsed: planned,
    });
    navigate(`/batches/${id}`);
  }

  if (materials.length === 0) {
    return (
      <div className="pb-8">
        <BackHeader title="Log a Batch" onBack={() => navigate(-1)} />
        <LogABatchPrerequisite
          icon={<PackagePlus size={28} />}
          title="Add a material first"
          body="A batch is made from a recipe, and a recipe is built from materials. Add at least one material before you can log a batch."
          ctaLabel="Add a Material"
          ctaTo="/materials/new"
        />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="pb-8">
        <BackHeader title="Log a Batch" onBack={() => navigate(-1)} />
        <LogABatchPrerequisite
          icon={<FlaskConical size={28} />}
          title="Add a product first"
          body="Logging a batch needs a product with a recipe to draw from. Add a product and its recipe, then come back here."
          ctaLabel="Add a Product"
          ctaTo="/products/new"
        />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {product && <CoachmarkSequence sequenceId="logABatch.plannedActual" steps={logBatchCoachSteps} />}
      <BackHeader title="Log a Batch" onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit}>
        <Section title="Product">
          <BoxedSelect value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </BoxedSelect>
        </Section>

        <Section title="Batch details">
          <Card className="flex flex-col gap-3">
            <BoxedInput label="Date made" type="date" value={dateMade} onChange={(e) => setDateMade(e.target.value)} required />
            {product?.category === "soap" && (
              <BoxedInput
                label="Target ready date"
                type="date"
                value={cureReadyDate}
                onChange={(e) => setCureReadyDate(e.target.value)}
              />
            )}
            <BoxedInput
              label="Expiry date (optional)"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </Card>
        </Section>

        {product && (
          <Section title="Materials">
            <Card className="flex flex-col gap-3">
              <div
                id="planned-actual-header"
                className="grid grid-cols-[1fr_72px_80px] gap-2 text-[10px] font-semibold uppercase text-text-secondary"
              >
                <span>Material</span>
                <span>Planned</span>
                <span>Actual</span>
              </div>
              {product.recipe.map((item) => {
                const material = materials.find((m) => m.id === item.materialId);
                if (!material) return null;
                return (
                  <div key={item.materialId} className="grid grid-cols-[1fr_72px_80px] items-center gap-2">
                    <span className="truncate text-[14px] text-text">{material.name}</span>
                    <span className="text-[12px] text-text-secondary">{formatQty(item.quantity, material.unit)}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={actualQuantities[item.materialId] ?? item.quantity}
                      onChange={(e) =>
                        setActualQuantities((prev) => ({ ...prev, [item.materialId]: Number(e.target.value) }))
                      }
                      className="w-full rounded-input border border-border bg-input-fill px-2 py-1.5 text-[13px] text-text outline-none focus:border-teal"
                    />
                  </div>
                );
              })}
            </Card>
          </Section>
        )}

        <Section title="Yield & outcome">
          <Card className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Planned Yield</FieldLabel>
                <p className="text-[14px] text-text">{plannedYield} units</p>
              </div>
              <BoxedInput
                label="Actual Yield"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder={String(plannedYield)}
                value={actualYield}
                onChange={(e) => setActualYield(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            {lossQuantity > 0 && (
              <BoxedTextarea
                label={`Loss reason (${lossQuantity} units lost)`}
                rows={2}
                placeholder="e.g. Spillage during pour"
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
              />
            )}
          </Card>
        </Section>

        <Section title="Labour cost">
          <BoxedInput
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            placeholder="0"
            value={labourCost}
            onChange={(e) => setLabourCost(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Section>

        <Section>
          <PrimaryButton type="submit">Save Batch</PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
