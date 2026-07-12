import type { ChartApp } from "@/libs/contracts";

export type Store = "ios" | "android";
export type StoreFilter = "all" | Store;
export type Device = "all" | "iphone" | "ipad";
export type ChartType = "free" | "paid" | "grossing" | "new";

export type Filters = {
  store: StoreFilter;
  device: Device;
  category: string; // "all", an Apple genre id, or a Play category constant — id space depends on `store`
  country: string;  // ISO country code
  chart: ChartType;
  query: string;
};

export const DEFAULT_FILTERS: Filters = {
  store: "all",
  device: "all",
  category: "all",
  country: "major",
  chart: "free",
  query: "",
};

// Merging all ~169 countries from libs/countries.ts would mean that many
// requests per store and a list dominated by the same handful of global apps
// repeated for every market (rank is only meaningful within a single
// country's chart) — the country filter offers two curated, bounded sets
// instead of a literal "every country" option.
export const MAJOR_MARKET_COUNTRIES = ["US", "GB", "DE", "FR", "JP", "KR", "BR", "AU", "CA", "IN"];
export const OTHER_MARKET_COUNTRIES = ["MX", "ES", "IT", "NL", "SE", "ID", "SG", "PH", "TR", "SA"];

export function isFiltersDefault(f: Filters): boolean {
  return (
    f.store === DEFAULT_FILTERS.store &&
    f.device === DEFAULT_FILTERS.device &&
    f.category === DEFAULT_FILTERS.category &&
    f.country === DEFAULT_FILTERS.country &&
    f.chart === DEFAULT_FILTERS.chart &&
    f.query === ""
  );
}

export type { ChartApp };
