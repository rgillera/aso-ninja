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
};
