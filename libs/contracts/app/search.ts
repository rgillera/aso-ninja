export type AppSearchResult = {
  name: string;
  store: "ios" | "android";
  bundleId: string;
  storeId: string;
  iconUrl: string;
  developer: string;
};
