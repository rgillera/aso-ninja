// Splits an app's real total downloads across its tracked keywords, weighted
// by search-volume score and current rank. Neither store attributes
// downloads to specific search terms — even for the app's own owner — so
// this is a modeled share of a real number, not a per-keyword-measured
// figure: keywords where the app ranks better and that have higher
// search-volume scores get credited a larger share. Unranked keywords
// (rank === null) get no share, since the app can't be capturing installs
// from a search it doesn't appear in. Shared by app/api/keywords/list/route.ts
// (today's split) and app/api/keywords/downloads-history/route.ts (the same
// split applied to past days' real totals) so the formula can't drift
// between the two.
export type WeightInput = { volume: number; rank: number | null };

export function computeWeight(k: WeightInput): number {
  return k.rank !== null && k.rank > 0 ? k.volume / k.rank : 0;
}

// Returns each keyword's share of the total (0 for unranked keywords, or
// for every keyword when the whole set has zero weight).
export function computeShares(keywords: WeightInput[]): number[] {
  const weights = keywords.map(computeWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  return weights.map((w) => w / totalWeight);
}
