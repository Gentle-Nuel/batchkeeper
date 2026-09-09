import type { Batch, Material, Product, RestockEntry } from "../types/models";

export function isLowStock(material: Material): boolean {
  return material.currentStock <= material.reorderPoint;
}

export function lowStockMaterials(materials: Material[]): Material[] {
  return materials.filter(isLowStock);
}

/** Products whose recipe draws on the given material — used so low-stock
 * alerts can name which products are affected, not just the material. */
export function productsUsingMaterial(materialId: string, products: Product[]): Product[] {
  return products.filter((p) => p.recipe.some((r) => r.materialId === materialId));
}

export function productForBatch(batch: Batch, products: Product[]): Product | undefined {
  return products.find((p) => p.id === batch.productId);
}

export function materialsAffectedSummary(materials: Material[], products: Product[]): string[] {
  return lowStockMaterials(materials).map((m) => {
    const affected = productsUsingMaterial(m.id, products);
    const names = affected.map((p) => p.name).join(", ");
    return names ? `${m.name}: affects ${names}` : m.name;
  });
}

export function sortByDateDesc<T extends { dateMade: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.dateMade).getTime() - new Date(a.dateMade).getTime());
}

export function unitsSoldForBatch(batchId: string, sales: { batchId: string; quantitySold: number }[]): number {
  return sales.filter((s) => s.batchId === batchId).reduce((sum, s) => sum + s.quantitySold, 0);
}

export function unitsRemainingForBatch(
  batch: Batch,
  sales: { batchId: string; quantitySold: number }[],
): number {
  return Math.max(0, batch.actualYield - unitsSoldForBatch(batch.id, sales));
}

/** Combined production-entry count (batches + restocks) for one calendar
 * month, computed from already-loaded local state — no extra query needed.
 * Mirrors supabase/migrations/0004_freemium_caps.sql's enforce_entry_cap()
 * exactly (same two tables, same date_trunc('month', ...) logic over each
 * row's own date field), so the client's live counter never disagrees with
 * what the database will actually enforce. */
export function productionEntriesInMonth(batches: Batch[], restocks: RestockEntry[], monthOfDate: string): number {
  const month = monthOfDate.slice(0, 7); // "YYYY-MM"
  const batchCount = batches.filter((b) => b.dateMade.slice(0, 7) === month).length;
  const restockCount = restocks.filter((r) => r.date.slice(0, 7) === month).length;
  return batchCount + restockCount;
}
