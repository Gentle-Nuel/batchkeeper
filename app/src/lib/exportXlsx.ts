// Builds a real .xlsx workbook from an AccountExport — one sheet per data
// type (Materials, Products, Batches, Sales, Restocks), with a Business
// column on each row so multiple businesses coexist in one file without
// ambiguity. Raw ids are resolved to real names/numbers rather than left
// as UUIDs, since a spreadsheet full of ids would be just as unreadable
// as raw JSON was.
//
// Dynamically imported only when the export button is clicked (see
// Account.tsx) — xlsx is a sizeable library and has no reason to be in the
// main bundle for people who never export.
import * as XLSX from "xlsx";
import type { AccountExport } from "../types/export";
import type { Material } from "../types/models";

function materialsUsedSummary(items: { materialId: string; actualQuantity: number }[], materialsById: Map<string, Material>): string {
  if (items.length === 0) return "None";
  return items.map((i) => `${materialsById.get(i.materialId)?.name ?? "Unknown material"}: ${i.actualQuantity}`).join(", ");
}

function recipeSummary(items: { materialId: string; quantity: number }[], materialsById: Map<string, Material>): string {
  if (items.length === 0) return "None";
  return items.map((i) => `${materialsById.get(i.materialId)?.name ?? "Unknown material"}: ${i.quantity}`).join(", ");
}

export function buildExportWorkbook(data: AccountExport): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const materialRows: Record<string, unknown>[] = [];
  const productRows: Record<string, unknown>[] = [];
  const batchRows: Record<string, unknown>[] = [];
  const saleRows: Record<string, unknown>[] = [];
  const restockRows: Record<string, unknown>[] = [];

  for (const entry of data.businesses) {
    const { business, materials, products, batches, sales, restockEntries } = entry;
    const businessName = business.name || "Unnamed business";
    const materialsById = new Map(materials.map((m) => [m.id, m]));
    const productsById = new Map(products.map((p) => [p.id, p]));
    const batchesById = new Map(batches.map((b) => [b.id, b]));

    for (const m of materials) {
      materialRows.push({
        Business: businessName,
        Name: m.name,
        Unit: m.unit,
        "Cost/Unit": m.costPerUnit,
        "Current Stock": m.currentStock,
        "Reorder Point": m.reorderPoint,
        Supplier: m.supplier || "None",
      });
    }

    for (const p of products) {
      productRows.push({
        Business: businessName,
        Name: p.name,
        Code: p.code,
        Category: p.category,
        "Batch Size": p.standardBatchSize,
        "Batch Unit": p.standardBatchUnit,
        "Target Yield": p.targetYield,
        "NAFDAC Relevant": p.nafdacRelevant ? "Yes" : "No",
        "NAFDAC Status": p.nafdacRelevant ? p.nafdacStatus.replace("_", " ") : "N/A",
        "NAFDAC Reg. No.": p.nafdacRelevant ? p.nafdacRegNo || "None" : "N/A",
        Recipe: recipeSummary(p.recipe, materialsById),
      });
    }

    for (const b of batches) {
      batchRows.push({
        Business: businessName,
        "Batch Number": b.batchNumber,
        Product: productsById.get(b.productId)?.name || "Unknown product",
        "Date Made": b.dateMade,
        "Ready Date": b.cureReadyDate || "None",
        "Expiry Date": b.expiryDate || "None",
        Status: b.status,
        "Planned Yield": b.plannedYield,
        "Actual Yield": b.actualYield,
        Lost: b.lossQuantity,
        "Loss Reason": b.lossReason || "None",
        "Labour Cost": b.labourCost,
        "Materials Used": materialsUsedSummary(b.materialsUsed, materialsById),
      });
    }

    for (const s of sales) {
      saleRows.push({
        Business: businessName,
        Date: s.date,
        Batch: batchesById.get(s.batchId)?.batchNumber || "Unknown batch",
        "Quantity Sold": s.quantitySold,
        "Unit Price": s.unitPrice,
        "Buyer Type": s.buyerType,
        "Buyer Name": s.buyerName || "None",
      });
    }

    for (const r of restockEntries) {
      const m = materialsById.get(r.materialId);
      restockRows.push({
        Business: businessName,
        Date: r.date,
        Material: m?.name || "Unknown material",
        Quantity: r.quantity,
        "Cost/Unit Paid": r.costPerUnit ?? "None",
        Supplier: r.supplier || "None",
        Note: r.note || "None",
      });
    }
  }

  const addSheet = (rows: Record<string, unknown>[], name: string) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ " ": "None yet" }]);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  };

  addSheet(materialRows, "Materials");
  addSheet(productRows, "Products");
  addSheet(batchRows, "Batches");
  addSheet(saleRows, "Sales");
  addSheet(restockRows, "Restocks");

  return wb;
}
