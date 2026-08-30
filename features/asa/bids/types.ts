import type { SavedKeyword } from "@/app/api/keywords/list/route";

export type BidTier = "Aggressive" | "Moderate" | "Low" | "Skip" | "Unscored";

export type BidSuggestion = { term: string; keyword: SavedKeyword; tier: BidTier; reason: string };

// Deterministic, math-only tiering — no Apple Search Ads API call and no LLM.
// Reuses the same volume/rank/relevancy/opportunity data Keyword Research
// already computes (see app/api/keywords/metrics/route.ts), so a keyword's
// tier here always agrees with its Opportunity score there. Thresholds
// (70/40) match the Opportunity pill's own emerald/yellow/gray cutoffs in
// features/aso/keywords/research/KeywordTable.tsx.
export function suggestBid(k: SavedKeyword): { tier: BidTier; reason: string } {
  if (k.opportunity === null || k.relevancy === null) {
    return { tier: "Unscored", reason: "Not yet scored — visit Keyword Research to compute relevancy." };
  }
  if (k.relevancy < 40) {
    return { tier: "Skip", reason: "Low relevancy match for your app." };
  }
  if (k.rank !== null && k.rank <= 3) {
    return { tier: "Low", reason: `Already ranking #${k.rank} organically — ASA spend here mostly cannibalizes free installs.` };
  }
  if (k.opportunity >= 70) {
    return { tier: "Aggressive", reason: "High-value keyword you don't yet own organically — bid to capture visibility." };
  }
  if (k.opportunity >= 40) {
    return { tier: "Moderate", reason: "Solid volume and relevancy match — worth a moderate bid." };
  }
  if (k.opportunity >= 15) {
    return { tier: "Low", reason: "Modest value — a small bid may be worth testing." };
  }
  return { tier: "Skip", reason: "Low search volume or weak organic chance — limited ASA value." };
}

export const BID_TIER_ORDER: Record<BidTier, number> = {
  Aggressive: 4,
  Moderate: 3,
  Low: 2,
  Skip: 1,
  Unscored: 0,
};
