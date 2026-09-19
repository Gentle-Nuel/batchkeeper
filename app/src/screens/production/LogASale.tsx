import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { BoxedInput, PrimaryButton, FieldLabel } from "../../components/ui";
import { Sheet, type SheetHandle } from "../../components/Sheet";
import { formatCurrency } from "../../lib/format";
import { unitsRemainingForBatch } from "../../lib/selectors";
import type { BuyerType } from "../../types/models";

/** `closing` and `onGone` come from App when this is shown as an overlay: App
 * keeps the sheet mounted after the route pops (Android back button, browser
 * back) and flips `closing` so it slides out instead of vanishing, then
 * `onGone` lets App drop it. Both are absent on the direct-load fallback route. */
export function LogASale({ closing = false, onGone }: { closing?: boolean; onGone?: () => void }) {
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

  const sheetRef = useRef<SheetHandle>(null);

  // The route has already popped: slide out from where it is, then let App drop it.
  useEffect(() => {
    if (closing) sheetRef.current?.dismiss(() => onGone?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

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
    // Save happens now; the sheet then slides away before landing on Batch Detail.
    const batchId = batch.id;
    sheetRef.current?.dismiss(() => {
      onGone?.();
      navigate(`/batches/${batchId}`, { replace: true });
    });
  }

  return (
    <Sheet
      ref={sheetRef}
      label="Log a Sale"
      // Reached when the user dismisses it (X, scrim tap, Esc, drag down).
      onClose={() => {
        onGone?.();
        navigate(-1);
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-frame border border-border bg-surface p-5 pb-8 no-scrollbar"
      >
        <div data-sheet-drag className="mb-4 flex touch-none items-center justify-between">
          <h2 className="text-[16px] font-semibold text-text">Log a Sale</h2>
          <button type="button" onClick={() => sheetRef.current?.dismiss()} aria-label="Close" className="relative text-text-secondary after:absolute after:-inset-3">
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
    </Sheet>
  );
}
