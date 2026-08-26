import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { BoxedInput, PrimaryButton, FieldLabel } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { unitsRemainingForBatch } from "../../lib/selectors";
import type { BuyerType } from "../../types/models";

export function LogASale() {
  const { id } = useParams();
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const sales = useAppStore((s) => s.sales);
  const logSale = useAppStore((s) => s.logSale);

  const batch = batches.find((b) => b.id === id);
  const remainingBefore = batch ? unitsRemainingForBatch(batch, sales) : 0;

  const [quantity, setQuantity] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [buyerType, setBuyerType] = useState<BuyerType>("retail");
  const [buyerName, setBuyerName] = useState("");

  function close() {
    navigate(-1);
  }

  if (!batch) return null;

  const qty = quantity === "" ? 0 : Number(quantity);
  const price = unitPrice === "" ? 0 : Number(unitPrice);
  const total = qty * price;
  const remainingAfter = Math.max(0, remainingBefore - qty);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batch || qty <= 0) return;
    logSale({
      batchId: batch.id,
      date: new Date().toISOString().slice(0, 10),
      quantitySold: qty,
      unitPrice: price,
      buyerType,
      buyerName: buyerName || undefined,
    });
    navigate(`/batches/${batch.id}`, { replace: true });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={close} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="max-h-[85vh] overflow-y-auto rounded-t-frame border border-border bg-surface p-5 pb-8 no-scrollbar"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-text">Log a Sale</h2>
            <button type="button" onClick={close} aria-label="Close" className="text-text-secondary">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <BoxedInput
                label="Quantity Sold"
                type="number"
                min={1}
                max={remainingBefore}
                step={1}
                inputMode="numeric"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
              <BoxedInput
                label="Unit Price"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                placeholder="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>

            <div>
              <FieldLabel>Buyer Type</FieldLabel>
              <div className="flex rounded-input border border-border bg-input-fill p-1">
                {(["retail", "distributor"] as BuyerType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBuyerType(t)}
                    className={`flex-1 rounded-[8px] py-2 text-[12px] font-semibold capitalize transition ${
                      buyerType === t ? "bg-teal text-white" : "text-text-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <BoxedInput
              label="Buyer Name (optional)"
              type="text"
              placeholder="e.g. GreenClean Distributors"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />

            <div className="flex items-center justify-between rounded-input bg-input-fill p-3">
              <span className="text-[12px] text-text-secondary">Total</span>
              <span className="text-[16px] font-semibold text-text">{formatCurrency(total)}</span>
            </div>
            <p className="-mt-2 text-[12px] text-text-secondary">{remainingAfter} units will remain</p>

            <PrimaryButton type="submit" disabled={qty <= 0 || qty > remainingBefore}>
              Log Sale
            </PrimaryButton>
          </div>
        </form>
      </div>
    </>
  );
}
