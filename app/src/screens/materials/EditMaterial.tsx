import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedInput, ComboInput, PrimaryButton, DeleteLink, ConfirmDialog } from "../../components/ui";
import { productsUsingMaterial } from "../../lib/selectors";
import { UNIT_PRESETS } from "../../lib/presets";
import type { MaterialUnit } from "../../types/models";

export function EditMaterial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const materials = useAppStore((s) => s.materials);
  const products = useAppStore((s) => s.products);
  const addMaterial = useAppStore((s) => s.addMaterial);
  const updateMaterial = useAppStore((s) => s.updateMaterial);
  const removeMaterial = useAppStore((s) => s.removeMaterial);

  const existing = materials.find((m) => m.id === id);
  const isNew = !existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [unit, setUnit] = useState<MaterialUnit>(existing?.unit ?? "kg");
  const [costPerUnit, setCostPerUnit] = useState<number | "">(existing?.costPerUnit ?? "");
  const [currentStock, setCurrentStock] = useState<number | "">(existing?.currentStock ?? "");
  const [reorderPoint, setReorderPoint] = useState<number | "">(existing?.reorderPoint ?? "");
  const [supplier, setSupplier] = useState(existing?.supplier ?? "");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const usedIn = existing ? productsUsingMaterial(existing.id, products) : [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      unit,
      costPerUnit: costPerUnit === "" ? 0 : Number(costPerUnit),
      currentStock: currentStock === "" ? 0 : Number(currentStock),
      reorderPoint: reorderPoint === "" ? 0 : Number(reorderPoint),
      supplier: supplier || undefined,
    };
    if (existing) {
      updateMaterial(existing.id, payload);
      navigate("/materials");
    } else {
      addMaterial(payload);
      navigate("/materials");
    }
  }

  function handleRemove() {
    if (existing) {
      removeMaterial(existing.id);
      navigate("/materials");
    }
  }

  function confirmRemove() {
    setConfirmDeleteOpen(false);
    handleRemove();
  }

  return (
    <div className="pb-8">
      <BackHeader title={isNew ? "Add Material" : "Edit Material"} onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit}>
        <Section>
          <BoxedInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Section>

        <Section>
          <Card className="grid grid-cols-2 gap-3">
            <ComboInput
              label="Unit"
              options={UNIT_PRESETS}
              value={unit}
              onChange={(e) => setUnit(e.target.value as MaterialUnit)}
              required
            />
            <BoxedInput
              label="Cost / Unit"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </Card>
        </Section>

        <Section>
          <Card className="grid grid-cols-2 gap-3">
            <BoxedInput
              label="Current Stock"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
            <BoxedInput
              label="Reorder Point"
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </Card>
        </Section>

        <Section>
          <BoxedInput label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Optional" />
        </Section>

        {usedIn.length > 0 && (
          <Section title="Used in">
            <div className="flex flex-wrap gap-2">
              {usedIn.map((p) => (
                <span key={p.id} className="rounded-pill border border-border bg-surface px-3 py-1.5 text-[12px] text-text">
                  {p.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        <Section>
          <PrimaryButton type="submit">{isNew ? "Add Material" : "Save Material"}</PrimaryButton>
        </Section>

        {!isNew && (
          <Section>
            <DeleteLink type="button" onClick={() => setConfirmDeleteOpen(true)}>
              Remove material
            </DeleteLink>
          </Section>
        )}
      </form>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove this material?"
        message={
          usedIn.length > 0
            ? `"${name}" will be permanently removed. It's used in ${usedIn.map((p) => p.name).join(", ")}, so those recipes will no longer include it.`
            : `"${name}" will be permanently removed.`
        }
        confirmLabel="Remove Material"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
