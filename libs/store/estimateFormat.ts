// Client-safe display helpers for AppEstimate numbers (the model itself,
// libs/store/appEstimates.ts, pulls in server-only store fetchers).

// Below this the model can't tell values apart meaningfully, so everything
// under it reads as one "<5K" bucket, same convention as Sensor Tower.
export const ESTIMATE_FLOOR = 5_000;

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  return `${Math.round(n / 1_000)}K`;
}

export function formatDownloads(n: number): string {
  return n < ESTIMATE_FLOOR ? "<5K" : compact(n);
}

export function formatRevenue(n: number): string {
  return n < ESTIMATE_FLOOR ? "<$5K" : `$${compact(n)}`;
}
