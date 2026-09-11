import { useAppStore } from "../store/useAppStore";

// Deterministic symbol-prefix map rather than leaning on Intl's locale-driven
// currency formatting — Intl's placement/spacing rules vary by locale (many
// put € after the number, e.g. "1.234 €"), which would make one currency
// look inconsistent with the rest of the app. Every currency here always
// renders the same way: symbol immediately before the number, comma
// thousands separator, no decimals.
export const CURRENCY_OPTIONS: { code: string; symbol: string; label: string }[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
];

const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCY_OPTIONS.map((c) => [c.code, c.symbol]),
);

/** Formats an amount in the given currency code, or the active business's
 * currency if no code is passed — so existing call sites automatically
 * follow whatever's set in Business Profile without needing to thread the
 * currency through every one of them. */
export function formatCurrency(amount: number, currencyCode?: string): string {
  const code = currencyCode ?? getActiveBusinessCurrency();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(amount).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function getActiveBusinessCurrency(): string {
  // useAppStore doesn't import format.ts, so this isn't a circular import —
  // just a plain read of the store's current state outside a component.
  return useAppStore.getState().business.currency || "NGN";
}

/** "1 material" vs "2 materials" — pass an explicit plural for irregular
 * nouns (e.g. "batch" -> "batches"); regular nouns just take an "s". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Units that never take a plural "-s" here: SI/metric abbreviations
 * (g, kg, ml, l -- "2 kgs" is wrong) and "dozen" (English convention is
 * "2 dozen eggs", not "2 dozens"). Everything else -- a UNIT_PRESETS word
 * like "piece", or any free-typed custom unit (e.g. "cup") -- pluralizes
 * with a regular "+s" via the pluralize() helper above. Known limitation:
 * only handles regular pluralization -- an irregular plural a user might
 * type (e.g. "loaf" -> "loaves") won't come out right. Not worth a full
 * irregular-plural dictionary for a display nicety. */
const NON_PLURALIZING_UNITS = new Set(["g", "kg", "ml", "l", "dozen"]);

export function formatQty(qty: number, unit: string): string {
  const trimmed = Number.isInteger(qty) ? qty : Math.round(qty * 100) / 100;
  return NON_PLURALIZING_UNITS.has(unit.toLowerCase()) ? `${trimmed} ${unit}` : pluralize(trimmed, unit);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

export function monthLabel(monthIndex: number): string {
  return [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][monthIndex];
}
