export type ChartApp = {
  rank: number;
  store: "ios" | "android";
  storeId: string;
  bundleId?: string;
  name: string;
  developer: string;
  iconUrl: string;
  price: number;
  priceLabel: string;
  genre: string;
  url: string;
  rating: number | null;
  ratingCount: number | null;
  lastUpdatedAt: number | null;
  // iOS only, from the lookup API alongside rating/lastUpdatedAt.
  releasedAt?: number | null;
  // Catalog rows only (libs/store/marketCatalog.ts): the chart position the
  // market-apps crawler last saw this app at. Stands in for a live chart
  // rank when the app isn't in any chart withEstimates fetches.
  sighting?: { chart: "free" | "paid" | "grossing"; category: string | null; rank: number; country: string; seenAt: number };
  // Set by withEstimates (libs/store/appEstimates.ts). null/undefined = no
  // estimate possible for this app/storefront.
  estimate?: AppEstimate | null;
};

// Rough monthly downloads and gross revenue (USD) for one storefront, plus a
// short human-readable note on what each figure was modeled from.
export type AppEstimate = {
  downloads: number | null;
  revenue: number | null;
  downloadsBasis: string;
  revenueBasis: string;
};
