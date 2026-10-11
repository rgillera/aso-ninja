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
