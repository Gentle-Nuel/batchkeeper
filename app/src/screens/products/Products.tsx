import { Link } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Section, NafdacPill } from "../../components/ui";
import { useNavigate } from "react-router-dom";

export function Products() {
  const navigate = useNavigate();
  const products = useAppStore((s) => s.products);

  return (
    <div className="pb-8">
      <BackHeader title="Products" onBack={() => navigate(-1)} />

      <Section
        title="All products"
        action={
          <Link to="/products/new" className="rounded-pill bg-teal px-3 py-1.5 text-[14px] font-semibold text-white">
            + Add
          </Link>
        }
      >
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-text">{p.name}</p>
                <p className="text-[12px] capitalize text-text-secondary">{p.category}</p>
              </div>
              <NafdacPill status={p.nafdacStatus} />
            </Link>
          ))}
          {products.length === 0 && (
            <p className="py-10 text-center text-[12px] text-text-secondary">No products yet.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
