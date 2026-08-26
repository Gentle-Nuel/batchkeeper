import type { Business, Material, Product, Batch, Sale, RestockEntry, NotificationSettings } from "./models";

export interface BusinessExport {
  business: Business;
  materials: Material[];
  products: Product[];
  batches: Batch[];
  sales: Sale[];
  restockEntries: RestockEntry[];
  notificationSettings: NotificationSettings | null;
}

export interface AccountExport {
  exportedAt: string;
  email: string | null;
  businesses: BusinessExport[];
}
