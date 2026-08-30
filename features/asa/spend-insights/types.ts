import type { SavedKeyword } from "@/app/api/keywords/list/route";
import type { AsaKeywordRow } from "@/libs/asa-connections/types";

// Same organic-dominance cutoff KeywordTable.tsx's rank coloring uses
// (rank <= 3 renders emerald/"you own this") and the same opportunity
// cutoff Bid Suggestions' "Aggressive" tier uses — kept in sync so a
// keyword never reads as both "wasted spend" and "aggressive bid target"
// across the two ASA pages.
const TOP_RANK_THRESHOLD = 3;
const OPPORTUNITY_THRESHOLD = 60;

export type WastedSpendRow = {
  term: string;
  rank: number;
  spend: number;
  currency: string | null;
  campaignName: string;
  adGroupName: string;
};

export type UntappedOpportunityRow = {
  term: string;
  volume: number;
  opportunity: number;
  rank: number | null;
};

// ASA keywords you're already ranking top-3 organically for, but still
// spending on — that spend is largely buying installs you'd get for free.
export function findWastedSpend(organic: SavedKeyword[], asaKeywords: AsaKeywordRow[]): WastedSpendRow[] {
  const rankByTerm = new Map(organic.map((k) => [k.term.toLowerCase(), k.rank]));
  const rows: WastedSpendRow[] = [];

  for (const kw of asaKeywords) {
    const rank = rankByTerm.get(kw.text.toLowerCase());
    if (rank == null || rank > TOP_RANK_THRESHOLD) continue;
    if (!kw.spend || kw.spend <= 0) continue;
    rows.push({ term: kw.text, rank, spend: kw.spend, currency: kw.currency, campaignName: kw.campaignName, adGroupName: kw.adGroupName });
  }

  return rows.sort((a, b) => b.spend - a.spend);
}

// Tracked keywords with real Opportunity (high volume, realistic organic
// chance, strong relevancy) that aren't dominating organically and have no
// live Apple Search Ads campaign targeting them at all.
export function findUntappedOpportunities(organic: SavedKeyword[], asaKeywords: AsaKeywordRow[]): UntappedOpportunityRow[] {
  const targeted = new Set(asaKeywords.map((k) => k.text.toLowerCase()));

  return organic
    .filter((k) => k.opportunity !== null && k.opportunity >= OPPORTUNITY_THRESHOLD)
    .filter((k) => k.rank === null || k.rank > TOP_RANK_THRESHOLD)
    .filter((k) => !targeted.has(k.term.toLowerCase()))
    .map((k) => ({ term: k.term, volume: k.volume, opportunity: k.opportunity as number, rank: k.rank }))
    .sort((a, b) => b.opportunity - a.opportunity);
}
