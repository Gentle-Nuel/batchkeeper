import { describe, expect, it, vi } from "vitest";
import type { Batch, Product, Sale } from "../types/models";
import { computeRealPeriod, getTrend } from "./reports";

// format.ts pulls in the zustand store (and through it the Supabase client),
// none of which reports.ts needs beyond the month label.
vi.mock("./format", () => ({ monthLabel: (m: number) => `M${m}` }));

const JUL = 6;
const AUG = 7;
const SEP = 8;

// Mid-month dates on purpose: month membership is judged in local time, so
// dates near a month boundary would shift with the machine's timezone.
function batch(id: string, productId: string, dateMade: string, cost: number): Batch {
  return {
    id,
    businessId: "biz",
    batchNumber: id,
    productId,
    dateMade,
    plannedYield: 20,
    actualYield: 20,
    lossQuantity: 0,
    labourCost: cost,
    status: "sold_out",
    materialsUsed: [],
  };
}

function sale(id: string, batchId: string, date: string, qty: number, price: number): Sale {
  return {
    id,
    businessId: "biz",
    batchId,
    date,
    quantitySold: qty,
    unitPrice: price,
    buyerType: "retail",
  };
}

function product(id: string, name: string): Product {
  return {
    id,
    businessId: "biz",
    code: id.slice(0, 2).toUpperCase(),
    name,
    category: "soap",
    standardBatchSize: 1000,
    standardBatchUnit: "g",
    targetYield: 20,
    nafdacStatus: "not_registered",
    recipe: [],
  };
}

const products = [product("soap", "Soap"), product("disinfectant", "Disinfectant")];

describe("computeRealPeriod", () => {
  it("counts a sale's revenue in the month of the sale, not the month of its batch", () => {
    const batches = [batch("b1", "disinfectant", "2026-07-10", 15000)];
    const sales = [sale("s1", "b1", "2026-08-15", 20, 1500)];

    const jul = computeRealPeriod(2026, JUL, batches, sales, [], products);
    const aug = computeRealPeriod(2026, AUG, batches, sales, [], products);
    const sep = computeRealPeriod(2026, SEP, batches, sales, [], products);

    expect(jul).toMatchObject({ revenue: 0, costs: 15000, profit: -15000 });
    expect(aug).toMatchObject({ revenue: 30000, costs: 0, profit: 30000 });
    expect(sep).toMatchObject({ revenue: 0, costs: 0, profit: 0 });
  });

  it("splits a later month's revenue by the product of each sale's earlier batch", () => {
    const batches = [
      batch("b1", "soap", "2026-07-10", 4000),
      batch("b2", "disinfectant", "2026-07-12", 6000),
    ];
    const sales = [
      sale("s1", "b1", "2026-08-10", 10, 1000),
      sale("s2", "b2", "2026-08-11", 5, 2000),
    ];

    const aug = computeRealPeriod(2026, AUG, batches, sales, [], products);

    expect(aug.revenue).toBe(20000);
    expect(aug.byProduct).toEqual([
      { productId: "soap", revenue: 10000, costs: 0, profit: 10000 },
      { productId: "disinfectant", revenue: 10000, costs: 0, profit: 10000 },
    ]);
  });

  it("still counts same-month sales, and sums several sales of one batch across months", () => {
    const batches = [batch("b1", "soap", "2026-07-10", 3000)];
    const sales = [
      sale("s1", "b1", "2026-07-20", 4, 1000),
      sale("s2", "b1", "2026-08-05", 6, 1000),
    ];

    expect(computeRealPeriod(2026, JUL, batches, sales, [], products)).toMatchObject({
      revenue: 4000,
      costs: 3000,
      profit: 1000,
    });
    expect(computeRealPeriod(2026, AUG, batches, sales, [], products)).toMatchObject({
      revenue: 6000,
      costs: 0,
      profit: 6000,
    });
  });

  it("does not lose sales across a year boundary", () => {
    const batches = [batch("b1", "soap", "2025-12-15", 2000)];
    const sales = [sale("s1", "b1", "2026-01-15", 5, 1000)];

    expect(computeRealPeriod(2025, 11, batches, sales, [], products)).toMatchObject({ revenue: 0, costs: 2000 });
    expect(computeRealPeriod(2026, 0, batches, sales, [], products)).toMatchObject({ revenue: 5000, costs: 0 });
  });

  it("keeps a month's total equal to the sum of its product splits", () => {
    const batches = [
      batch("b1", "soap", "2026-07-10", 4000),
      batch("b2", "disinfectant", "2026-08-02", 6000),
    ];
    const sales = [
      sale("s1", "b1", "2026-08-10", 10, 1000),
      sale("s2", "b2", "2026-08-11", 5, 2000),
    ];

    const aug = computeRealPeriod(2026, AUG, batches, sales, [], products);

    expect(aug.revenue).toBe(aug.byProduct.reduce((sum, p) => sum + p.revenue, 0));
    expect(aug.costs).toBe(aug.byProduct.reduce((sum, p) => sum + p.costs, 0));
  });
});

describe("getTrend", () => {
  it("shows the cost in the batch's month and the revenue in the later sale month", () => {
    const batches = [batch("b1", "disinfectant", "2026-07-10", 15000)];
    const sales = [sale("s1", "b1", "2026-08-15", 20, 1500)];

    const trend = getTrend(2026, SEP, 3, batches, sales, [], products);

    expect(trend.map((p) => [p.label, p.revenue, p.costs])).toEqual([
      ["M6", 0, 15000],
      ["M7", 30000, 0],
      ["M8", 0, 0],
    ]);
  });
});
