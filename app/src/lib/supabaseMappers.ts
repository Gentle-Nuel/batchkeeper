// Generic snake_case (Postgres columns) <-> camelCase (TS types) converters.
// Only applied to a row's TOP-LEVEL keys — jsonb columns (Product.recipe,
// Batch.materialsUsed) are passed through as opaque values, so their internal
// keys stay camelCase exactly as defined in types/models.ts. This works
// because supabase/migrations/0001_init.sql was written to mirror
// types/models.ts field-for-field, just snake_cased.

function snakeToCamelKey(k: string): string {
  return k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnakeKey(k: string): string {
  return k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function rowToCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamelKey(k)] = v;
  }
  return out as T;
}

export function toSnakeRow<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[camelToSnakeKey(k)] = v;
  }
  return out;
}
