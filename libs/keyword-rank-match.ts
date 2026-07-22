// Shared by the live /api/keywords/metrics route and the refresh-keywords
// cron so both compute "our app's rank" the same way against a search
// results list — divergent copies here is exactly what caused
// keyword_metrics.rank and keyword_rankings_history.position to disagree.

// Strip punctuation/extra spaces
function normalizeForRankMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

// Three-tier fuzzy match against a list of result names:
//   1. Exact lowercase trim (fast path)
//   2. Punctuation-normalized (handles dash/colon variants)
//   3. Starts-with either direction (handles stored short name vs full title in results)
export function findRankIdx(resultNames: string[], appName: string): number {
  if (!appName) return -1;
  const name     = appName.toLowerCase().trim();
  const nameNorm = normalizeForRankMatch(appName);

  let idx = resultNames.findIndex((n) => n.toLowerCase().trim() === name);
  if (idx >= 0) return idx;

  idx = resultNames.findIndex((n) => normalizeForRankMatch(n) === nameNorm);
  if (idx >= 0) return idx;

  if (!nameNorm) return -1;

  return resultNames.findIndex((n) => {
    const nNorm = normalizeForRankMatch(n);
    if (!nNorm) return false;
    return nNorm.startsWith(nameNorm) || nameNorm.startsWith(nNorm);
  });
}

// rank=1 -> 95, rank=10 -> 90, rank=50 -> 50, rank=100+ -> no boost over raw difficulty.
export function computeChance(diff: number, rank: number | null): number {
  const rawChance = Math.min(Math.max(100 - diff, 5), 95);
  return rank !== null
    ? Math.max(rawChance, Math.min(95, 100 - rank))
    : rawChance;
}
