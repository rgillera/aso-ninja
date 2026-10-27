// Estimated daily search impressions for a keyword: how many times a day an
// app would be shown in search results for it. Neither store reports this
// per keyword, so it's modeled from two things we already have:
//
// 1. Daily searches, from the 0-100 volume score. Volume is log-scaled
//    (see computeIosVolumeAndDiff in libs/keyword-volume.ts), so it maps back
//    exponentially: every +20 points is ~10x the searches. 5 (the floor) is
//    ~2/day, 50 is ~300/day, 100 is ~100k/day.
// 2. How far down the results the app sits. Searchers rarely scroll far, so
//    the share who actually see the app drops quickly with rank.
//
// The keyword table shows the *potential* figure (at POTENTIAL_RANK) rather
// than the current one: it's a projection to compare keywords by, not a
// count to reconcile against App Store Connect / Play Console impressions.

export const POTENTIAL_RANK = 3;

export function estimateDailySearches(volume: number): number {
  return Math.pow(10, Math.max(0, Math.min(volume, 100)) / 20);
}

// Daily estimates are shown as a range, not a point: the volume curve is a
// rough fit and Apple's score is noisy, so a single "~63/day" reads as more
// precise than it is. The range is half to double the estimate. Below 5/day
// (volume at or near Apple's floor of 5) a range means nothing, so it's just
// "<5".
const ESTIMATE_FLOOR = 5;
const RANGE_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 2 });

export function formatEstimateRange(estimate: number): string {
  if (estimate < ESTIMATE_FLOOR) return `<${ESTIMATE_FLOOR}`;
  // Rounded first so small counts read as whole people ("9", not "8.9").
  return `${RANGE_FORMATTER.format(Math.round(estimate / 2))}-${RANGE_FORMATTER.format(Math.round(estimate * 2))}`;
}

// Share of searchers who scroll far enough to see the result at each
// position (index 0 = rank 1). Past rank 10, keeps decaying as ~1/rank.
const VIEW_RATE_TOP10 = [1, 0.85, 0.7, 0.55, 0.45, 0.38, 0.32, 0.27, 0.23, 0.2];

export function viewRateForRank(rank: number): number {
  if (rank < 1) return 0;
  if (rank <= VIEW_RATE_TOP10.length) return VIEW_RATE_TOP10[rank - 1];
  return 0.2 * (10 / rank);
}

// 0 for an unranked keyword: the app can't be seen in a search it doesn't
// appear in.
export function estimateDailyImpressions(volume: number, rank: number | null): number {
  if (rank === null || rank < 1) return 0;
  return Math.round(estimateDailySearches(volume) * viewRateForRank(rank));
}

// Impressions at POTENTIAL_RANK, or at the current rank if it's already
// better than that (an app at #1 shouldn't be told its potential is lower).
export function estimatePotentialImpressions(volume: number, rank: number | null): number {
  const target = rank !== null && rank >= 1 ? Math.min(rank, POTENTIAL_RANK) : POTENTIAL_RANK;
  return estimateDailyImpressions(volume, target);
}
