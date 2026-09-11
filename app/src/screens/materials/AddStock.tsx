import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedInput, BoxedTextarea, PrimaryButton, ReadOnlyField } from "../../components/ui";
import { formatQty } from "../../lib/format";
import { ProductionCapBanner } from "../../components/PlanLimitBanner";
import { useIsOverRestockCap } from "../../lib/planLimits";

export function AddStock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const materials = useAppStore((s) => s.materials);
  const restockMaterial = useAppStore((s) => s.restockMaterial);

  const material = materials.find((m) => m.id === id);

  const [quantity, setQuantity] = useState<number | "">("");
  const [costPerUnit, setCostPerUnit] = useState<number | "">(material?.costPerUnit ?? "");
  const [supplier, setSupplier] = useState(material?.supplier ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const overCap = useIsOverRestockCap(date);

  if (!material) {
    return (
      <div className="p-5">
        <p className="text-[14px] text-text-secondary">Material not found.</p>
      </div>
    );
  }

  const qty = quantity === "" ? 0 : Number(quantity);
  const newStock = material.currentStock + qty;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!material || qty <= 0 || overCap) return;
    restockMaterial({
      materialId: material.id,
      date,
      quantity: qty,
      costPerUnit: costPerUnit === "" ? undefined : Number(costPerUnit),
      supplier: supplier || undefined,
      note: note || undefined,
    });
    navigate("/materials");
  }

  return (
    <div className="pb-8">
      <BackHeader title="Add Stock" onBack={() => navigate(-1)} />
      <p className="px-5 -mt-1 text-[12px] text-text-secondary">{material.name}</p>
      <ProductionCapBanner dateISO={date} kind="restock" />

      <form onSubmit={handleSubmit}>
        <Section title="Current stock">
          <Card className="flex items-center justify-between">
            <ReadOnlyField label="On hand now" value={formatQty(material.currentStock, material.unit)} />
            {qty > 0 && <ReadOnlyField label="After restock" value={formatQty(newStock, material.unit)} />}
          </Card>
        </Section>

        <Section title="Restock details">
          <Card className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <BoxedInput
                label={`Quantity (${material.unit})`}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
              <BoxedInput
                label="Cost / Unit Paid"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <BoxedInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <BoxedInput label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Optional" />
            <BoxedTextarea label="Note" rows={2} placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
          </Card>
        </Section>

        <Section>
          <PrimaryButton type="submit" disabled={qty <= 0 || overCap}>
            Add Stock
          </PrimaryButton>
        </Section>
      </form>
    </div>
  );
}
