import type { ChartApp } from "@/libs/contracts";

export type Store = "ios" | "android";
export type Device = "all" | "iphone" | "ipad";
export type ChartType = "free" | "paid" | "grossing" | "new";

export type Filters = {
  store: Store;
  device: Device;
  category: string; // "all", an Apple genre id, or a Play category constant — id space depends on `store`
  country: string;  // ISO country code
  chart: ChartType;
  query: string;
};

export const DEFAULT_FILTERS: Filters = {
  store: "ios",
  device: "all",
  category: "all",
  country: "US",
  chart: "free",
  query: "",
};

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
