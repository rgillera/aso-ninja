// Shared by every path that scores a live iOS search result set for a
// keyword: how many ratings do apps whose *title* actually contains this
// keyword have (log-scaled into a 0-100 "volume" score), and how
// competitive the top 5 results are ("diff"). Kept in one place so the
// refresh cron (app/api/cron/refresh-keywords) and an on-demand check
// (app/api/keywords/performance-report) always score a keyword identically,
// whichever path happens to be the one that checks it.
export type RawStoreApp = { trackId: number; trackName: string; userRatingCount: number };

export function computeIosVolumeAndDiff(apps: RawStoreApp[], term: string) {
  const kwTokens = term.split(/\s+/).filter(Boolean);
  const titleApps = apps.filter((a) =>
    kwTokens.every((w) => a.trackName.toLowerCase().includes(w))
  );
  const avgTitleRatings =
    titleApps.length === 0
      ? 0
      : titleApps.reduce((s, a) => s + a.userRatingCount, 0) / titleApps.length;
  const volume =
    avgTitleRatings < 1_000
      ? 5
      : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

  const top5 = apps.slice(0, 5);
  const avgRatings =
    top5.length > 0 ? top5.reduce((s, r) => s + r.userRatingCount, 0) / top5.length : 0;
  const diff =
    avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(10_000_000)) * 100), 100);

  return { volume, diff };
}
