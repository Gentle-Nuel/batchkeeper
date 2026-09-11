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
  // "What do you make?" choice from Business Setup (see lib/presets.ts's
  // CATEGORY_PRESETS) — purely a pre-fill source for a NEW product's
  // category/unit/NAFDAC/cure defaults, read once at Add Product time.
  // Never enforced, never re-read after that; a business isn't locked into
  // one vertical, and this field intentionally has no edit UI of its own —
  // added supabase/migrations/0008_generalize_verticals.sql.
  defaultCategoryPreset?: string;
}

// Open string, not a closed union — see supabase/migrations/0007's comment
// and memory:batchkeeper-vertical-expansion-plan. Postgres already stores
// this as plain `text` with no CHECK constraint (0001_init.sql), so this
// was always a TypeScript-only wall, not a real schema one. lib/presets.ts
// holds the curated suggestion list; anything else the user types is
// equally valid.
export type MaterialUnit = string;

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

// Open string, same reasoning as MaterialUnit above — lib/presets.ts's
// CATEGORY_PRESETS is the curated suggestion list, not an exhaustive enum.
export type ProductCategory = string;
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
  // Whether NAFDAC applies to this product at all — a producer-controlled
  // toggle, not a category->NAFDAC legal determination baked into the app
  // (that's a legal judgment call the app shouldn't make, and the category
  // list may not be exhaustive/correct for it anyway). Defaulted from the
  // chosen category preset (see lib/presets.ts) but always overridable.
  // The NAFDAC section only renders in the UI when this is true. Added
  // supabase/migrations/0008_generalize_verticals.sql, backfilled true for
  // every existing row (today's 3 categories are all NAFDAC-relevant).
  nafdacRelevant: boolean;
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
