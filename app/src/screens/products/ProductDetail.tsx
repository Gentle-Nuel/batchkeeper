import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Package } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import {
  BackHeader,
  Card,
  Section,
  BoxedInput,
  BoxedSelect,
  PrimaryButton,
  DeleteLink,
  FieldLabel,
  ConfirmDialog,
} from "../../components/ui";
import { canAddProduct } from "../../lib/planLimits";
import type { MaterialUnit, NafdacStatus, ProductCategory, RecipeItem } from "../../types/models";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const products = useAppStore((s) => s.products);
  const materials = useAppStore((s) => s.materials);
  const business = useAppStore((s) => s.business);
  const planLimits = useAppStore((s) => s.planLimits);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const removeProduct = useAppStore((s) => s.removeProduct);

  const existing = products.find((p) => p.id === id);
  const isNew = !existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [category, setCategory] = useState<ProductCategory>(existing?.category ?? "soap");
  const [standardBatchSize, setStandardBatchSize] = useState<number | "">(existing?.standardBatchSize ?? "");
  const [standardBatchUnit, setStandardBatchUnit] = useState<MaterialUnit>(existing?.standardBatchUnit ?? "kg");
  const [targetYield, setTargetYield] = useState<number | "">(existing?.targetYield ?? "");
  const [nafdacStatus, setNafdacStatus] = useState<NafdacStatus>(existing?.nafdacStatus ?? "not_registered");
  const [nafdacRegNo, setNafdacRegNo] = useState(existing?.nafdacRegNo ?? "");
  const [recipe, setRecipe] = useState<RecipeItem[]>(existing?.recipe ?? []);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Free accounts are limited to 1 product/recipe (see
  // supabase/migrations/0006_split_freemium_caps.sql's enforce_product_cap())
  // — this is only the UX-nicety half of that boundary, blocking the form
  // before it's even shown rather than letting the user fill it out and then
  // have the write silently purged after the fact. Only gates ADDING a new
  // product — editing an existing one (already counted) is never blocked.
  if (isNew && !canAddProduct(products, business, planLimits)) {
    return (
      <div className="pb-8">
        <BackHeader title="Add Product" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-teal/10 text-teal">
            <Package size={28} />
          </span>
          <h2 className="text-[16px] font-semibold text-text">Free accounts are limited to 1 product</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-text-secondary">
            Upgrade this account to add more products.
          </p>
        </div>
      </div>
    );
  }

  function addRecipeRow() {
    const unused = materials.find((m) => !recipe.some((r) => r.materialId === m.id));
    if (unused) setRecipe((prev) => [...prev, { materialId: unused.id, quantity: 0 }]);
  }

  function updateRecipeRow(index: number, patch: Partial<RecipeItem>) {
    setRecipe((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRecipeRow(index: number) {
    setRecipe((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      code: code.toUpperCase(),
      category,
      standardBatchSize: standardBatchSize === "" ? 0 : Number(standardBatchSize),
      standardBatchUnit,
      targetYield: targetYield === "" ? 0 : Number(targetYield),
      nafdacStatus,
      nafdacRegNo: nafdacRegNo || undefined,
      recipe,
    };
    if (existing) {
      updateProduct(existing.id, payload);
    } else {
      addProduct(payload);
    }
    navigate("/products");
  }

  function handleRemove() {
    if (existing) {
      removeProduct(existing.id);
      navigate("/products");
    }
  }

  function confirmRemove() {
    setConfirmDeleteOpen(false);
    handleRemove();
  }

  return (
    <div className="pb-8">
      <BackHeader title={isNew ? "Add Product" : name || "Product"} onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit}>
        <Section title="Overview">
          <Card className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <BoxedInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <BoxedInput label="Code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={4} required />
            </div>
            <BoxedSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
              <option value="soap">Soap</option>
              <option value="cosmetic">Cosmetic</option>
              <option value="cleaning agent">Cleaning agent</option>
            </BoxedSelect>
            <div className="grid grid-cols-[1fr_64px_1fr] gap-2">
              <BoxedInput
                label="Batch Size"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={standardBatchSize}
                onChange={(e) => setStandardBatchSize(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
              <BoxedSelect
                label="Unit"
                value={standardBatchUnit}
                onChange={(e) => setStandardBatchUnit(e.target.value as MaterialUnit)}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
              </BoxedSelect>
              <BoxedInput
                label="Target Yield"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={targetYield}
                onChange={(e) => setTargetYield(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
          </Card>
        </Section>

        <Section title="NAFDAC">
          <Card className="flex flex-col gap-3">
            <BoxedSelect label="Status" value={nafdacStatus} onChange={(e) => setNafdacStatus(e.target.value as NafdacStatus)}>
              <option value="not_registered">Not registered</option>
              <option value="in_process">In process</option>
              <option value="registered">Registered</option>
            </BoxedSelect>
            <BoxedInput
              label="Registration Number (optional)"
              value={nafdacRegNo}
              onChange={(e) => setNafdacRegNo(e.target.value)}
              placeholder="e.g. A7-1234L"
            />
          </Card>
        </Section>

        <Section
          title="Recipe"
          action={
            <button type="button" onClick={addRecipeRow} className="flex items-center gap-1 text-[12px] font-semibold text-teal">
              <Plus size={14} />
              Add material
            </button>
          }
        >
          <Card className="flex flex-col gap-3">
            {recipe.length === 0 && <p className="text-[12px] text-text-secondary">No materials yet.</p>}
            {recipe.map((item, index) => {
              const material = materials.find((m) => m.id === item.materialId);
              return (
                <div key={index} className="grid grid-cols-[1fr_90px_20px] items-end gap-2">
                  <BoxedSelect
                    value={item.materialId}
                    onChange={(e) => updateRecipeRow(index, { materialId: e.target.value })}
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </BoxedSelect>
                  <div>
                    <FieldLabel>Qty ({material?.unit})</FieldLabel>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateRecipeRow(index, { quantity: Number(e.target.value) })}
                      className="w-full rounded-input border border-border bg-input-fill px-2 py-2.5 text-[13px] text-text outline-none focus:border-teal"
                    />
                  </div>
                  <button type="button" onClick={() => removeRecipeRow(index)} className="mb-2.5 text-text-secondary">
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </Card>
        </Section>

        <Section>
          <PrimaryButton type="submit">{isNew ? "Add Product" : "Save Product"}</PrimaryButton>
        </Section>

        {!isNew && (
          <Section>
            <DeleteLink type="button" onClick={() => setConfirmDeleteOpen(true)}>
              Delete product
            </DeleteLink>
          </Section>
        )}
      </form>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this product?"
        message={`"${name}" and its recipe will be permanently removed. This won't delete past batches already logged for it.`}
        confirmLabel="Delete Product"
        onConfirm={confirmRemove}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
