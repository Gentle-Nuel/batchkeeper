// Static, curated preset lists for Product.category and Material/Batch
// unit fields — see the vertical-expansion plan (memory:
// batchkeeper-vertical-expansion-plan). Product.category, Material.unit,
// and Batch.standardBatchUnit are all open `string` columns/fields; these
// presets are SUGGESTIONS for autocomplete only, never a hard constraint —
// a user can always type something not in either list below.
//
// Kept static and hardcoded on purpose, NEVER built from other businesses'
// live category/unit values. This app is multi-tenant (see types/models.ts)
// — building suggestions from what other tenants have typed would leak one
// business's terminology into another's UI and reintroduce the exact
// "one vertical's language becomes the default" problem this effort exists
// to fix.
//
// The preset list itself was written to avoid defaulting to soap/cosmetic
// vocabulary anywhere — no entry is treated as "the" default; every screen
// that reads these falls back to a neutral value (empty string, or a
// genuinely universal unit like "kg") when nothing matches, not to the
// first entry in either list.

export interface CategoryPreset {
  /** Stored verbatim in Product.category / Business.defaultCategoryPreset. */
  value: string;
  label: string;
  /** Section label for a product's materials list. "Recipe" reads
   * naturally for formulation-based makers (soap, food, candles);
   * "Parts list" reads naturally for assembly-based ones (jewelry,
   * pottery) even though the underlying data model is the same flat
   * RecipeItem[] either way — see recipeLabelFor() below. */
  recipeLabel: string;
  /** Suggested starting unit for this vertical — one of UNIT_PRESETS'
   * values, but never enforced; a product can use any unit string. */
  defaultUnit: string;
  /** Default for Product.nafdacRelevant when this preset is chosen. This
   * is NOT a legal determination the app makes on the producer's behalf —
   * it's only a starting point, always user-overridable via the toggle on
   * Product Detail. */
  nafdacRelevantDefault: boolean;
  /** Whether this vertical typically has a curing/settling/processing
   * period between "made" and "ready to sell" (soap curing, candle
   * setting, dough proofing, pottery firing...). Drives Log a Batch's
   * "Target ready date" suggestion — see LogABatch.tsx — instead of a
   * hardcoded category === "soap" check. */
  hasCureStage: boolean;
  /** Only meaningful when hasCureStage is true. A starting suggestion the
   * producer can freely override per batch, not a fixed rule. */
  defaultCureDays?: number;
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  { value: "soap", label: "Soap", recipeLabel: "Recipe", defaultUnit: "kg", nafdacRelevantDefault: true, hasCureStage: true, defaultCureDays: 28 },
  { value: "cosmetic", label: "Cosmetic", recipeLabel: "Recipe", defaultUnit: "kg", nafdacRelevantDefault: true, hasCureStage: false },
  { value: "cleaning agent", label: "Cleaning agent", recipeLabel: "Recipe", defaultUnit: "l", nafdacRelevantDefault: true, hasCureStage: false },
  { value: "food", label: "Food", recipeLabel: "Recipe", defaultUnit: "kg", nafdacRelevantDefault: true, hasCureStage: false },
  { value: "beverage", label: "Beverage", recipeLabel: "Recipe", defaultUnit: "l", nafdacRelevantDefault: true, hasCureStage: false },
  { value: "candle", label: "Candle", recipeLabel: "Recipe", defaultUnit: "g", nafdacRelevantDefault: false, hasCureStage: true, defaultCureDays: 2 },
  { value: "jewelry", label: "Jewelry", recipeLabel: "Parts list", defaultUnit: "piece", nafdacRelevantDefault: false, hasCureStage: false },
  { value: "pottery", label: "Pottery", recipeLabel: "Parts list", defaultUnit: "piece", nafdacRelevantDefault: false, hasCureStage: true, defaultCureDays: 3 },
  { value: "herbal", label: "Herbal", recipeLabel: "Recipe", defaultUnit: "kg", nafdacRelevantDefault: true, hasCureStage: false },
  { value: "textile", label: "Textile", recipeLabel: "Parts list", defaultUnit: "piece", nafdacRelevantDefault: false, hasCureStage: false },
  { value: "household chemical", label: "Household chemical", recipeLabel: "Recipe", defaultUnit: "l", nafdacRelevantDefault: true, hasCureStage: false },
];

export interface UnitPreset {
  value: string;
  label: string;
}

export const UNIT_PRESETS: UnitPreset[] = [
  { value: "g", label: "g — grams" },
  { value: "kg", label: "kg — kilograms" },
  { value: "ml", label: "ml — millilitres" },
  { value: "l", label: "l — litres" },
  { value: "piece", label: "piece" },
  { value: "dozen", label: "dozen" },
];

export function findCategoryPreset(value: string | undefined): CategoryPreset | undefined {
  if (!value) return undefined;
  return CATEGORY_PRESETS.find((p) => p.value === value);
}

/** Recipe section label for a given category value. Falls back to the
 * universal default "Recipe" for an empty or free-typed category that
 * doesn't match any preset — a BOM is arguably just a kind of recipe, so
 * this is a safe, honest fallback rather than a soap-flavored default. */
export function recipeLabelFor(category: string | undefined): string {
  return findCategoryPreset(category)?.recipeLabel ?? "Recipe";
}
