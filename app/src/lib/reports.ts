import type { Batch, Material, Product, Sale } from "../types/models";
import { legacyProductSplit, seedMonthlyTrend } from "../data/seed";
import { monthLabel } from "./format";

export function batchMaterialsCost(batch: Batch, materials: Material[]): number {
  return batch.materialsUsed.reduce((sum, used) => {
    // Prefer the price snapshotted when the batch was actually logged —
    // falling back to the material's current cost only for batches logged
    // before that snapshot existed. Using the current cost unconditionally
    // would make this figure silently drift for old batches every time a
    // material gets restocked at a different price.
    if (used.costPerUnit !== undefined) return sum + used.actualQuantity * used.costPerUnit;
    const material = materials.find((m) => m.id === used.materialId);
    if (!material) return sum;
    return sum + used.actualQuantity * material.costPerUnit;
  }, 0);
}

export function batchTotalCost(batch: Batch, materials: Material[]): number {
  return batchMaterialsCost(batch, materials) + batch.labourCost;
}

export function batchCostPerUnit(batch: Batch, materials: Material[]): number {
  if (batch.actualYield <= 0) return 0;
  return batchTotalCost(batch, materials) / batch.actualYield;
}

function inMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

export interface ProductSplit {
  productId: string;
  revenue: number;
  costs: number;
  profit: number;
}

export interface PeriodSummary {
  year: number;
  month: number;
  label: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number; // -1..1
  isLoss: boolean;
  isComputed: boolean; // real batch/sale data vs. pre-adoption summary seed
  byProduct: ProductSplit[];
}

/** Real P&L for a month computed from actual batches/sales (used from Jul 2026 onward). */
export function computeRealPeriod(
  year: number,
  month: number,
  batches: Batch[],
  sales: Sale[],
  materials: Material[],
  products: Product[],
): PeriodSummary {
  const monthBatches = batches.filter((b) => inMonth(b.dateMade, year, month));
  const monthSales = sales.filter((s) => inMonth(s.date, year, month));

  const byProduct: ProductSplit[] = products.map((p) => {
    const productBatches = monthBatches.filter((b) => b.productId === p.id);
    const productBatchIds = new Set(productBatches.map((b) => b.id));
    const costs = productBatches.reduce((sum, b) => sum + batchTotalCost(b, materials), 0);
    const revenue = monthSales
      .filter((s) => productBatchIds.has(s.batchId))
      .reduce((sum, s) => sum + s.quantitySold * s.unitPrice, 0);
    return { productId: p.id, revenue, costs, profit: revenue - costs };
  });

  const revenue = byProduct.reduce((sum, p) => sum + p.revenue, 0);
  const costs = byProduct.reduce((sum, p) => sum + p.costs, 0);
  const profit = revenue - costs;

  return {
    year,
    month,
    label: monthLabel(month),
    revenue,
    costs,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
    isLoss: profit < 0,
    isComputed: true,
    byProduct,
  };
}

/** Pre-adoption month: only summary revenue/costs were seeded, no batch detail. */
export function legacyPeriod(
  year: number,
  month: number,
  products: Product[],
): PeriodSummary | undefined {
  const seed = seedMonthlyTrend.find((s) => s.year === year && s.month === month);
  if (!seed) return undefined;
  const profit = seed.revenue - seed.costs;
  const byProduct: ProductSplit[] = products.map((p) => {
    const ratio = legacyProductSplit[p.id] ?? 1 / products.length;
    return {
      productId: p.id,
      revenue: Math.round(seed.revenue * ratio),
      costs: Math.round(seed.costs * ratio),
      profit: Math.round(profit * ratio),
    };
  });
  return {
    year,
    month,
    label: monthLabel(month),
    revenue: seed.revenue,
    costs: seed.costs,
    profit,
    margin: seed.revenue > 0 ? profit / seed.revenue : 0,
    isLoss: profit < 0,
    isComputed: false,
    byProduct,
  };
}

export function getPeriod(
  year: number,
  month: number,
  batches: Batch[],
  sales: Sale[],
  materials: Material[],
  products: Product[],
): PeriodSummary {
  const legacy = legacyPeriod(year, month, products);
  if (legacy) return legacy;
  return computeRealPeriod(year, month, batches, sales, materials, products);
}

/** Trailing N months ending at (year, month) inclusive, oldest first. */
export function getTrend(
  year: number,
  month: number,
  count: number,
  batches: Batch[],
  sales: Sale[],
  materials: Material[],
  products: Product[],
): PeriodSummary[] {
  const out: PeriodSummary[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    out.push(getPeriod(d.getFullYear(), d.getMonth(), batches, sales, materials, products));
  }
  return out;
}
