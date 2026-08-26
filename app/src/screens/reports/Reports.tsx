import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { BackHeader, Card, Section, BoxedSelect } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import { getTrend } from "../../lib/reports";
import { CoachmarkSequence } from "../../components/Coachmark";

const TODAY = new Date();

const reportsCoachSteps = [
  {
    targetId: "profit-loss-row",
    title: "Automatic loss detection",
    body: "When a period loses money, this relabels itself \"Loss\" and turns red on its own. No need to check the sign yourself.",
  },
];

export function Reports() {
  const navigate = useNavigate();
  const materials = useAppStore((s) => s.materials);
  const products = useAppStore((s) => s.products);
  const batches = useAppStore((s) => s.batches);
  const sales = useAppStore((s) => s.sales);

  const trend = useMemo(
    () => getTrend(TODAY.getFullYear(), TODAY.getMonth(), 6, batches, sales, materials, products),
    [batches, sales, materials, products],
  );

  const [periodIndex, setPeriodIndex] = useState(trend.length - 1);
  const [productFilter, setProductFilter] = useState<string>("all");

  const period = trend[periodIndex];

  const headline =
    productFilter === "all"
      ? { revenue: period.revenue, costs: period.costs, profit: period.profit, margin: period.margin }
      : (() => {
          const split = period.byProduct.find((p) => p.productId === productFilter);
          const revenue = split?.revenue ?? 0;
          const costs = split?.costs ?? 0;
          const profit = split?.profit ?? 0;
          return { revenue, costs, profit, margin: revenue > 0 ? profit / revenue : 0 };
        })();

  const isLoss = headline.profit < 0;
  const maxAbs = Math.max(
    1,
    ...trend.map((p) => {
      if (productFilter === "all") return Math.abs(p.profit);
      const split = p.byProduct.find((bp) => bp.productId === productFilter);
      return Math.abs(split?.profit ?? 0);
    }),
  );

  return (
    <div className="pb-8">
      <CoachmarkSequence sequenceId="reports.profitLoss" steps={reportsCoachSteps} />
      <BackHeader title="Reports" onBack={() => navigate(-1)} />

      <Section title="Filter">
        <Card className="grid grid-cols-2 gap-3">
          <BoxedSelect label="Period" value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))}>
            {trend.map((p, i) => (
              <option key={`${p.year}-${p.month}`} value={i}>
                {p.label} {p.year}
              </option>
            ))}
          </BoxedSelect>
          <BoxedSelect label="Product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="all">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </BoxedSelect>
        </Card>
      </Section>

      <Section title="P&L Overview">
        <Card className="flex flex-col gap-2">
          <div className="flex justify-between text-[14px]">
            <span className="text-text-secondary">Revenue</span>
            <span className="text-text">{formatCurrency(headline.revenue)}</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-text-secondary">Costs</span>
            <span className="text-text">{formatCurrency(headline.costs)}</span>
          </div>
          <div
            id="profit-loss-row"
            className="mt-1 flex justify-between border-t border-border pt-2 text-[16px] font-semibold"
          >
            <span className="text-text">{isLoss ? "Loss" : "Profit"}</span>
            <span className={isLoss ? "text-danger" : "text-teal"}>{formatCurrency(headline.profit)}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-text-secondary">Margin</span>
            <span className={isLoss ? "font-semibold text-danger" : "font-semibold text-teal"}>
              {(headline.margin * 100).toFixed(0)}%
            </span>
          </div>
        </Card>
      </Section>

      <Section title="6-month trend">
        <Card>
          <div className="flex h-32 items-center gap-2">
            {trend.map((p, i) => {
              const value =
                productFilter === "all"
                  ? p.profit
                  : p.byProduct.find((bp) => bp.productId === productFilter)?.profit ?? 0;
              const height = Math.max(4, (Math.abs(value) / maxAbs) * 56);
              const loss = value < 0;
              const active = i === periodIndex;
              return (
                <button
                  key={`${p.year}-${p.month}`}
                  onClick={() => setPeriodIndex(i)}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-16 w-full flex-col justify-end">
                    {!loss && (
                      <div
                        style={{ height }}
                        className={`w-full rounded-t-[4px] ${active ? "bg-teal" : "bg-teal/40"}`}
                      />
                    )}
                  </div>
                  <div className="h-px w-full bg-border" />
                  <div className="flex h-16 w-full flex-col justify-start">
                    {loss && (
                      <div
                        style={{ height }}
                        className={`w-full rounded-b-[4px] ${active ? "bg-danger" : "bg-danger/40"}`}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? "text-text" : "text-text-secondary"}`}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </Section>

      <Section title="By product">
        <div className="flex flex-col gap-3">
          {period.byProduct.map((split) => {
            const product = products.find((p) => p.id === split.productId);
            const splitLoss = split.profit < 0;
            return (
              <Card key={split.productId} className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-text">{product?.name}</span>
                <span className={`text-[14px] font-semibold ${splitLoss ? "text-danger" : "text-teal"}`}>
                  {formatCurrency(split.profit)}
                </span>
              </Card>
            );
          })}
          {period.byProduct.length === 0 && (
            <p className="py-10 text-center text-[12px] text-text-secondary">No products to report on yet.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
