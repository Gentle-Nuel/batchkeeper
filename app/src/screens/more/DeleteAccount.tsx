import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { Card, Section, BoxedInput, SecondaryButton } from "../../components/ui";
import { pluralize } from "../../lib/format";

export function DeleteAccount() {
  const navigate = useNavigate();
  const businesses = useAppStore((s) => s.businesses);
  const materials = useAppStore((s) => s.materials);
  const products = useAppStore((s) => s.products);
  const batches = useAppStore((s) => s.batches);
  const sales = useAppStore((s) => s.sales);
  const deleteAllData = useAppStore((s) => s.deleteAllData);
  const multipleBusinesses = businesses.length > 1;

  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const armed = confirmText.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    setError("");
    setLoading(true);
    try {
      await deleteAllData();
      navigate("/sign-in", { replace: true });
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="pb-8">
      {/* No sync badge here deliberately — reads tonally wrong beside an irreversible-deletion warning. */}
      <div className="px-5 pt-8 pb-2 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={28} />
        </span>
        <h1 className="mt-3 text-[24px] font-semibold text-danger">Delete Account</h1>
        <p className="mx-auto mt-2 max-w-xs text-[12px] text-text-secondary">
          You're the only user on this account, so deleting it permanently erases{" "}
          {multipleBusinesses ? `all ${businesses.length} of your businesses` : "all of your business data"}, not
          just your login. This cannot be undone.
        </p>
      </div>

      <Section title="What will be deleted">
        <Card className="flex flex-col gap-1">
          {multipleBusinesses && (
            <p className="text-[14px] font-semibold text-text">
              {businesses.length} businesses, including:
            </p>
          )}
          <p className="text-[14px] text-text">
            {pluralize(materials.length, "material")} · {pluralize(products.length, "product")} ·{" "}
            {pluralize(batches.length, "batch", "batches")} · {pluralize(sales.length, "sales record")}
            {multipleBusinesses && " (this business alone)"}
          </p>
        </Card>
      </Section>

      <Section>
        <BoxedInput
          label='Type "DELETE" to confirm'
          placeholder="DELETE"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
        />
      </Section>

      {error && (
        <Section>
          <p className="text-[12px] font-medium text-danger">{error}</p>
        </Section>
      )}

      <Section>
        <button
          type="button"
          disabled={!armed || loading}
          onClick={handleDelete}
          className="w-full rounded-card bg-danger px-4 py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Delete Everything"}
        </button>
      </Section>

      <Section>
        <SecondaryButton type="button" onClick={() => navigate(-1)}>
          Cancel
        </SecondaryButton>
      </Section>
    </div>
  );
}
