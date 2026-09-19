// Data model — see Production-Log-App-Handoff.md §6, plus additions agreed
// with the user before build started: RestockEntry (materials restocking has
// no wireframed screen otherwise), Batch.expiryDate (cosmetics/soap shelf
// life), and businessId multi-tenancy (this may be sold to other small
// business owners, each with their own branded PWA over one shared backend —
// every business-owned table carries businessId so Postgres Row-Level
// Security can scope reads/writes per tenant once Supabase is wired up).
//
// One login can own several businesses (a person running more than one
// production line) — Business.id is independent, ownerId links it back to
// the signed-in auth user. See supabase/migrations/0002_multi_business.sql.

export type PlanTier = "free" | "paid";

export interface Business {
  id: string;
  ownerId: string;
  name?: string;
  phone?: string;
  address?: string;
  currency: string; // e.g. "NGN"
  ownerEmail: string;
  createdAt: string; // ISO date
  // Gates the free-tier caps enforced server-side in
  // supabase/migrations/0004_freemium_caps.sql (monthly production-entry
  // count, businesses-per-account) — see src/lib/planLimits.ts.
  plan: PlanTier;
}

export type MaterialUnit = "g" | "ml" | "kg" | "l";

export interface Material {
  id: string;
  businessId: string;
  name: string;
  unit: MaterialUnit;
  costPerUnit: number;
  currentStock: number;
  reorderPoint: number;
  supplier?: string;
}

/** A single restock event — the only thing that increases a material's stock. */
export interface RestockEntry {
  id: string;
  businessId: string;
  materialId: string;
  date: string; // ISO date
  quantity: number;
  costPerUnit?: number; // price paid this time, may differ from Material.costPerUnit
  supplier?: string;
  note?: string;
}

export type ProductCategory = "soap" | "cosmetic" | "cleaning agent";
export type NafdacStatus = "not_registered" | "in_process" | "registered";

export interface RecipeItem {
  materialId: string;
  quantity: number;
}

export interface Product {
  id: string;
  businessId: string;
  code: string; // short prefix used in batch numbers, e.g. "BC" -> BC-YYMMDD-NN
  name: string;
  category: ProductCategory;
  standardBatchSize: number;
  standardBatchUnit: MaterialUnit;
  targetYield: number;
  nafdacStatus: NafdacStatus;
  nafdacRegNo?: string;
  recipe: RecipeItem[];
}

export type BatchStatus = "curing" | "ready" | "selling" | "sold_out";

export interface BatchMaterialUsed {
  materialId: string;
  plannedQuantity: number;
  actualQuantity: number;
  // Snapshot of Material.costPerUnit at the moment this batch was logged —
  // without it, cost reports for a past batch silently drift whenever the
  // material's price changes later (e.g. after a restock at a new price),
  // since there'd be nothing but the CURRENT price to fall back on. Optional
  // because batches logged before this field existed won't have it; readers
  // fall back to the material's current cost for those.
  costPerUnit?: number;
}

export interface Batch {
  id: string;
  businessId: string;
  batchNumber: string; // PRODCODE-YYMMDD-NN
  productId: string;
  dateMade: string; // ISO date
  cureReadyDate?: string; // ISO date, soap only
  expiryDate?: string; // ISO date
  plannedYield: number;
  actualYield: number;
  lossQuantity: number;
  lossReason?: string;
  labourCost: number;
  status: BatchStatus;
  materialsUsed: BatchMaterialUsed[];
}

export type BuyerType = "retail" | "distributor";

export interface Sale {
  id: string;
  businessId: string;
  batchId: string;
  date: string; // ISO date
  quantitySold: number;
  unitPrice: number;
  buyerType: BuyerType;
  buyerName?: string;
}

export interface NotificationSettings {
  businessId: string;
  lowStockAlerts: boolean;
  batchReadyAlerts: boolean;
  dailySummary: boolean;
  syncIssueAlerts: boolean;
}

export type SyncState = "synced" | "pending" | "offline";
