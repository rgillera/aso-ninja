import type { AppSearchResult, StoreData } from "@/libs/contracts";

// Up to 4 columns fits the table without forcing horizontal scroll on a
// typical laptop viewport (see CompareTable) — 5+ apps is also rarely a real
// "which one do I pick" comparison anymore.
export const MAX_COMPARE_APPS = 4;

// Real store-enforced hard caps. iOS: 30 chars for both the app name and the
// subtitle. Android: title dropped from 50 to 30 chars industry-wide; the
// "subtitle" field here is actually Play's short description (`summary`),
// capped at 80. Shared by CompareTable's length rows and AiInsights' prompt.
export const FIELD_LIMITS: Record<"ios" | "android", { name: number; subtitle: number }> = {
  ios: { name: 30, subtitle: 30 },
  android: { name: 30, subtitle: 80 },
};

export type CompareApp = AppSearchResult & {
  storeData: StoreData | null;
  loading: boolean;
  // Distinct from `storeData === null`, which also covers "hasn't loaded
  // yet" — this is only set once a fetch for this app+country has come back
  // empty/failed, so the table can show a real error state instead of an
  // endless skeleton.
  failed: boolean;
};

export function compareKey(store: "ios" | "android", storeId: string): string {
  return `${store}:${storeId}`;
}

// Neither AppSearchResult nor StoreData carries a storefront link (the
// former is search-result identity only, the latter is scraped metadata) —
// built here from the same id fields ExplorerTable's appHref uses.
export function storeUrl(app: Pick<AppSearchResult, "store" | "storeId" | "bundleId">, country: string): string {
  if (app.store === "ios") return `https://apps.apple.com/${country.toLowerCase()}/app/id${app.storeId}`;
  return `https://play.google.com/store/apps/details?id=${app.bundleId}&gl=${country}`;
}
