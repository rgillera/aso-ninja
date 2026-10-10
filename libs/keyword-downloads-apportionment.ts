// Splits an app's real total downloads across its tracked keywords, weighted
// by search-volume score and current rank. Neither store attributes
// downloads to specific search terms — even for the app's own owner — so
// this is a modeled share of a real number, not a per-keyword-measured
// figure: keywords where the app ranks better and that have higher
// search-volume scores get credited a larger share. Unranked keywords
// (rank === null) get no share, since the app can't be capturing installs
// from a search it doesn't appear in. Shared by app/api/keywords/list/route.ts
// (today's split), app/api/keywords/downloads-history/route.ts (each past
// day's split, from that day's own rank/volume via computeDailyWeights) and
// the performance report (each month's split) so the formula can't drift
// between them.
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

// One rank check / volume snapshot for a term on a given day, as returned by
// the keyword_daily_observations RPC (see
// supabase/migrations/20261010000001_keyword_daily_observations.sql).
export type DailyObservation = {
  term: string;
  day: string; // YYYY-MM-DD
  checked: boolean; // a rank check ran that day; rank null then means "not found"
  rank: number | null;
  volume: number | null;
};

export type DayWeights = {
  day: string;
  // Rank in effect that day per term (same order as `terms`): undefined
  // before the term's first rank check, null when checked and not found.
  ranks: (number | null | undefined)[];
  weights: number[];
  totalWeight: number;
};

// Same weighting as computeWeight, but per past day: each term's rank and
// volume are whatever was last observed on or before that day (ranks are
// only checked about weekly, so the latest check stands until the next
// one). Volume falls back to `fallbackVolume` (today's) for days before the
// term's first snapshot; a term with no rank check yet gets no weight that
// day. `days` and `observations` must both be sorted ascending by day.
// Used by app/api/keywords/downloads-history/route.ts.
export function computeDailyWeights(
  days: string[],
  terms: string[],
  observations: DailyObservation[],
  fallbackVolume: Map<string, number>,
): DayWeights[] {
  const index = new Map(terms.map((t, i) => [t, i]));
  const ranks: (number | null | undefined)[] = terms.map(() => undefined);
  const volumes: (number | undefined)[] = terms.map(() => undefined);

  let next = 0;
  return days.map((day) => {
    for (; next < observations.length && observations[next].day <= day; next++) {
      const o = observations[next];
      const i = index.get(o.term);
      if (i === undefined) continue;
      if (o.checked) ranks[i] = o.rank;
      if (o.volume !== null) volumes[i] = o.volume;
    }
    const weights = terms.map((t, i) =>
      ranks[i] == null ? 0 : computeWeight({ volume: volumes[i] ?? fallbackVolume.get(t) ?? 0, rank: ranks[i] as number })
    );
    return { day, ranks: [...ranks], weights, totalWeight: weights.reduce((s, w) => s + w, 0) };
  });
}
