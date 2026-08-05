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
// Fallback only — see findRankIdx below for why this isn't the primary match.
function findRankIdxByName(resultNames: string[], appName: string): number {
  if (!appName) return -1;
  const name     = appName.toLowerCase().trim();
  const nameNorm = normalizeForRankMatch(appName);

  let idx = resultNames.findIndex((n) => n.toLowerCase().trim() === name);
  if (idx >= 0) return idx;

  if (!nameNorm) return -1;

  idx = resultNames.findIndex((n) => normalizeForRankMatch(n) === nameNorm);
  if (idx >= 0) return idx;

  return resultNames.findIndex((n) => {
    const nNorm = normalizeForRankMatch(n);
    if (!nNorm) return false;
    return nNorm.startsWith(nameNorm) || nameNorm.startsWith(nNorm);
  });
}

// Finds our app's position in a list of search results. Prefers matching by
// the store's own stable id (apps.store_id — Apple's trackId, or the Play
// package name) over matching by name: a store listing rename desyncs
// `apps.name` from what search results actually return until this app
// itself is next refetched, which used to silently zero out
// keyword_metrics.rank for a renamed app even though it was still genuinely
// ranked (keyword_rankings_history, which is keyed by app_id, kept showing
// the real rank the whole time — see Keyword Performance vs Keyword Research
// disagreeing on the same keyword).
//
// resultIds/appId are optional: a result set with no id field, or an app
// with no store_id captured yet, falls back to the old name-matching
// behavior. Once appId is provided it's treated as authoritative — not
// finding it in resultIds means genuinely unranked, not a cue to fall back
// to a possibly-coincidental name match.
export function findRankIdx(
  resultNames: string[],
  appName: string,
  resultIds?: (string | number | null | undefined)[],
  appId?: string | null
): number {
  if (appId && resultIds) {
    return resultIds.findIndex((id) => id != null && String(id) === String(appId));
  }
  return findRankIdxByName(resultNames, appName);
}

// rank=1 -> 95, rank=10 -> 90, rank=50 -> 50, rank=100+ -> no boost over raw difficulty.
export function computeChance(diff: number, rank: number | null): number {
  const rawChance = Math.min(Math.max(100 - diff, 5), 95);
  return rank !== null
    ? Math.max(rawChance, Math.min(95, 100 - rank))
    : rawChance;
}
