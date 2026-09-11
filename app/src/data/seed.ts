import type {
  Material,
  Product,
  Batch,
  Sale,
  RestockEntry,
  Business,
  NotificationSettings,
} from "../types/models";

// Running mock example carried across every screen — same 5 materials, 3
// products, and Body Cream / BC-260813-01 batch used throughout the Penpot
// wireframe, per Production-Log-App-Handoff.md. Every business-owned record
// is stamped with DEMO_BUSINESS_ID so the shape already matches the
// multi-tenant schema this will run on once Supabase is wired up (one shared
// backend, Row-Level Security scoped per business — see types/models.ts).

export const DEMO_BUSINESS_ID = "biz-demo";

function withBusiness<T extends object>(rows: T[]): (T & { businessId: string })[] {
  return rows.map((r) => ({ ...r, businessId: DEMO_BUSINESS_ID }));
}

export const seedBusiness: Business = {
  id: DEMO_BUSINESS_ID,
  ownerId: "demo-owner",
  currency: "NGN",
  ownerEmail: "owner@example.com",
  createdAt: "2026-08-01",
  plan: "free",
};

export const seedMaterials: Material[] = withBusiness<Omit<Material, "businessId">>([
  {
    id: "mat-shea",
    name: "Shea Butter",
    unit: "kg",
    costPerUnit: 4500,
    currentStock: 3.2,
    reorderPoint: 5,
    supplier: "Northern Naturals",
  },
  {
    id: "mat-naoh",
    name: "Sodium Hydroxide",
    unit: "kg",
    costPerUnit: 1800,
    currentStock: 1.1,
    reorderPoint: 2,
    supplier: "ChemSource Nigeria",
  },
  {
    id: "mat-coconut",
    name: "Coconut Oil",
    unit: "kg",
    costPerUnit: 3200,
    currentStock: 12,
    reorderPoint: 4,
    supplier: "Tropical Oils Ltd",
  },
  {
    id: "mat-palmkernel",
    name: "Palm Kernel Oil",
    unit: "kg",
    costPerUnit: 2600,
    currentStock: 9,
    reorderPoint: 3,
    supplier: "Tropical Oils Ltd",
  },
  {
    id: "mat-fragrance",
    name: "Fragrance Oil",
    unit: "ml",
    costPerUnit: 45,
    currentStock: 800,
    reorderPoint: 200,
    supplier: "Aroma Essentials",
  },
]);

export const seedProducts: Product[] = withBusiness<Omit<Product, "businessId">>([
  {
    id: "prod-bodycream",
    code: "BC",
    name: "Body Cream",
    category: "cosmetic",
    standardBatchSize: 2.4,
    standardBatchUnit: "kg",
    targetYield: 50,
    nafdacRelevant: true,
    nafdacStatus: "in_process",
    recipe: [
      { materialId: "mat-shea", quantity: 1.2 },
      { materialId: "mat-naoh", quantity: 0.35 },
      { materialId: "mat-coconut", quantity: 0.85 },
    ],
  },
  {
    id: "prod-soapbara",
    code: "SA",
    name: "Soap Bar A",
    category: "soap",
    standardBatchSize: 5,
    standardBatchUnit: "kg",
    targetYield: 40,
    nafdacRelevant: true,
    nafdacStatus: "registered",
    nafdacRegNo: "A7-1234L",
    recipe: [
      { materialId: "mat-coconut", quantity: 2.5 },
      { materialId: "mat-palmkernel", quantity: 1.8 },
      { materialId: "mat-naoh", quantity: 0.7 },
      { materialId: "mat-fragrance", quantity: 100 },
    ],
  },
  {
    id: "prod-disinfectant",
    code: "DI",
    name: "Disinfectant",
    category: "cleaning agent",
    standardBatchSize: 10,
    standardBatchUnit: "l",
    targetYield: 60,
    nafdacRelevant: true,
    nafdacStatus: "not_registered",
    recipe: [
      { materialId: "mat-coconut", quantity: 0.4 },
      { materialId: "mat-fragrance", quantity: 30 },
    ],
  },
]);

export const seedBatches: Batch[] = withBusiness<Omit<Batch, "businessId">>([
  {
    id: "batch-bc-01",
    batchNumber: "BC-260813-01",
    productId: "prod-bodycream",
    dateMade: "2026-08-13",
    expiryDate: "2028-08-13",
    plannedYield: 50,
    actualYield: 48,
    lossQuantity: 2,
    lossReason: "Spillage during pour",
    labourCost: 8000,
    status: "ready",
    materialsUsed: [
      { materialId: "mat-shea", plannedQuantity: 1.2, actualQuantity: 1.25 },
      { materialId: "mat-naoh", plannedQuantity: 0.35, actualQuantity: 0.34 },
      { materialId: "mat-coconut", plannedQuantity: 0.85, actualQuantity: 0.85 },
    ],
  },
  {
    id: "batch-sa-01",
    batchNumber: "SA-260815-01",
    productId: "prod-soapbara",
    dateMade: "2026-08-15",
    cureReadyDate: "2026-09-12",
    expiryDate: "2027-09-12",
    plannedYield: 40,
    actualYield: 40,
    lossQuantity: 0,
    labourCost: 6500,
    status: "curing",
    materialsUsed: [
      { materialId: "mat-coconut", plannedQuantity: 2.5, actualQuantity: 2.5 },
      { materialId: "mat-palmkernel", plannedQuantity: 1.8, actualQuantity: 1.8 },
      { materialId: "mat-naoh", plannedQuantity: 0.7, actualQuantity: 0.7 },
      { materialId: "mat-fragrance", plannedQuantity: 100, actualQuantity: 100 },
    ],
  },
  {
    id: "batch-di-01",
    batchNumber: "DI-260810-01",
    productId: "prod-disinfectant",
    dateMade: "2026-08-10",
    expiryDate: "2027-08-10",
    plannedYield: 60,
    actualYield: 59,
    lossQuantity: 1,
    lossReason: "Bottle cap defect",
    labourCost: 4000,
    status: "sold_out",
    materialsUsed: [
      { materialId: "mat-coconut", plannedQuantity: 0.4, actualQuantity: 0.4 },
      { materialId: "mat-fragrance", plannedQuantity: 30, actualQuantity: 30 },
    ],
  },
  {
    id: "batch-bc-00",
    batchNumber: "BC-260720-01",
    productId: "prod-bodycream",
    dateMade: "2026-07-20",
    expiryDate: "2028-07-20",
    plannedYield: 50,
    actualYield: 49,
    lossQuantity: 1,
    lossReason: "Mould defect",
    labourCost: 8000,
    status: "sold_out",
    materialsUsed: [
      { materialId: "mat-shea", plannedQuantity: 1.2, actualQuantity: 1.2 },
      { materialId: "mat-naoh", plannedQuantity: 0.35, actualQuantity: 0.35 },
      { materialId: "mat-coconut", plannedQuantity: 0.85, actualQuantity: 0.85 },
    ],
  },
  {
    id: "batch-sa-00",
    batchNumber: "SA-260712-01",
    productId: "prod-soapbara",
    dateMade: "2026-07-12",
    cureReadyDate: "2026-08-09",
    expiryDate: "2027-08-09",
    plannedYield: 40,
    actualYield: 38,
    lossQuantity: 2,
    lossReason: "Cracked bars",
    labourCost: 6500,
    status: "sold_out",
    materialsUsed: [
      { materialId: "mat-coconut", plannedQuantity: 2.5, actualQuantity: 2.6 },
      { materialId: "mat-palmkernel", plannedQuantity: 1.8, actualQuantity: 1.85 },
      { materialId: "mat-naoh", plannedQuantity: 0.7, actualQuantity: 0.72 },
      { materialId: "mat-fragrance", plannedQuantity: 100, actualQuantity: 105 },
    ],
  },
  {
    id: "batch-di-00",
    batchNumber: "DI-260703-01",
    productId: "prod-disinfectant",
    dateMade: "2026-07-03",
    expiryDate: "2027-07-03",
    plannedYield: 60,
    actualYield: 60,
    lossQuantity: 0,
    labourCost: 4000,
    status: "sold_out",
    materialsUsed: [
      { materialId: "mat-coconut", plannedQuantity: 0.4, actualQuantity: 0.4 },
      { materialId: "mat-fragrance", plannedQuantity: 30, actualQuantity: 30 },
    ],
  },
]);

export const seedSales: Sale[] = withBusiness<Omit<Sale, "businessId">>([
  // batch-di-01 (59 units, sold out)
  { id: "sale-1", batchId: "batch-di-01", date: "2026-08-11", quantitySold: 40, unitPrice: 900, buyerType: "retail" },
  { id: "sale-2", batchId: "batch-di-01", date: "2026-08-14", quantitySold: 19, unitPrice: 700, buyerType: "distributor", buyerName: "GreenClean Distributors" },
  // batch-bc-00 (49 units, sold out)
  { id: "sale-3", batchId: "batch-bc-00", date: "2026-07-25", quantitySold: 30, unitPrice: 1800, buyerType: "retail" },
  { id: "sale-4", batchId: "batch-bc-00", date: "2026-07-29", quantitySold: 19, unitPrice: 1400, buyerType: "distributor", buyerName: "Amara Beauty Supplies" },
  // batch-sa-00 (38 units, sold out)
  { id: "sale-5", batchId: "batch-sa-00", date: "2026-07-18", quantitySold: 25, unitPrice: 700, buyerType: "retail" },
  { id: "sale-6", batchId: "batch-sa-00", date: "2026-07-22", quantitySold: 13, unitPrice: 550, buyerType: "distributor", buyerName: "Lagos Market Traders" },
  // batch-di-00 (60 units, sold out)
  { id: "sale-7", batchId: "batch-di-00", date: "2026-07-06", quantitySold: 35, unitPrice: 900, buyerType: "retail" },
  { id: "sale-8", batchId: "batch-di-00", date: "2026-07-09", quantitySold: 25, unitPrice: 700, buyerType: "distributor", buyerName: "GreenClean Distributors" },
]);

export const seedRestocks: RestockEntry[] = withBusiness<Omit<RestockEntry, "businessId">>([
  { id: "restock-1", materialId: "mat-shea", date: "2026-07-28", quantity: 5, costPerUnit: 4400, supplier: "Northern Naturals" },
  { id: "restock-2", materialId: "mat-coconut", date: "2026-08-02", quantity: 15, costPerUnit: 3150, supplier: "Tropical Oils Ltd" },
  { id: "restock-3", materialId: "mat-naoh", date: "2026-07-15", quantity: 3, costPerUnit: 1750, supplier: "ChemSource Nigeria" },
]);

// Historical months before app adoption (this month, Aug 2026, is when she
// started using it) only have summary P&L, not batch-level detail — matches
// how she "currently tracks things informally" per the brief. Aug figures
// below are placeholders too; the real Aug number is computed from seed data
// in lib/reports.ts and supersedes this entry.
export const seedMonthlyTrend: { year: number; month: number; revenue: number; costs: number }[] = [
  { year: 2026, month: 2, revenue: 58000, costs: 51000 }, // Mar
  { year: 2026, month: 3, revenue: 71000, costs: 57000 }, // Apr
  { year: 2026, month: 4, revenue: 52000, costs: 60000 }, // May (loss)
  { year: 2026, month: 5, revenue: 45000, costs: 56000 }, // Jun (loss)
];

// Fixed allocation used only for the pre-adoption, summary-only months above,
// where there's no batch/sale detail to compute a real per-product split from.
export const legacyProductSplit: Record<string, number> = {
  "prod-bodycream": 0.45,
  "prod-soapbara": 0.35,
  "prod-disinfectant": 0.2,
};

export const seedNotificationSettings: NotificationSettings = {
  businessId: DEMO_BUSINESS_ID,
  lowStockAlerts: true,
  batchReadyAlerts: true,
  dailySummary: false,
  syncIssueAlerts: true,
};
