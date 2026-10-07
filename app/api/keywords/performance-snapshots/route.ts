import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type RankValue = number | "unranked" | "unknown";

export type CompetitorRankSnapshot = {
  rankPrev: RankValue;
  rankPrevDate: string | null;
  rankLatest: RankValue;
  rankLatestDate: string | null;
};

export type TermSnapshot = {
  volumePrev: number | null;
  volumePrevDate: string | null;
  volumeLatest: number | null;
  volumeLatestDate: string | null;
  volumeMax: number | null;
  rankPrev: RankValue;
  rankPrevDate: string | null;
  rankLatest: RankValue;
  rankLatestDate: string | null;
  competitors: Record<string, CompetitorRankSnapshot>;
};

export type PerformanceSnapshotResult = Record<string, TermSnapshot>;

// GET /api/keywords/performance-snapshots?terms=a,b&store=ios&country=us&storeId=123456&competitorIds=1,2
//
// Compares the two most recent real snapshots we have for each keyword — not
// two specific calendar dates. Snapshots land irregularly (Volume whenever
// metrics are computed, Rank only on a manual Live Search), so anchoring to
// exact dates the user picks mostly returns gaps. "Prev vs Latest" always
// reflects real data, whatever dates those happen to be. Competitor ranks
// reuse the same two dates as our own app — a Live Search records every
// app's position for a keyword in one pass, so the dates already line up.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam = searchParams.get("terms") ?? "";
  const store      = searchParams.get("store") ?? "ios";
  const country    = (searchParams.get("country") ?? "us").toLowerCase();
  const ourAppId   = searchParams.get("storeId") ?? "";
  const competitorIds = [...new Set(
    (searchParams.get("competitorIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  )];

  // Each term arrives percent-encoded (see the client's encodeURIComponent
  // before joining) so a literal comma inside a keyword survives as %2C
  // instead of being mistaken for the between-terms delimiter.
  const terms = [...new Set(termsParam.split(",").map((t) => decodeURIComponent(t.trim()).toLowerCase()).filter(Boolean))];
  if (!terms.length) return NextResponse.json({});

  // rankAt() below only ever looks up ourAppId and competitorIds — every other
  // app's position for these keywords is fetched and thrown away. Since
  // keyword_rankings_history isn't scoped per workspace (a Live Search records
  // every app in the results, from any workspace that ever searched a shared
  // term), a large tracked-keyword list with a few generic terms in it (e.g.
  // "pet care") can pull in tens of thousands of irrelevant rows and blow past
  // PostgREST's default 1000-row cap — silently truncating the response and
  // making unrelated keywords show as "Unknown" with no error anywhere.
  // Filtering to just the app_ids we actually use keeps this bounded.
  const relevantAppIds = [...new Set([ourAppId, ...competitorIds].filter(Boolean))];

  const supabase = await createClient();

  // Reduced in Postgres to just the rows the loop below reads (each term's
  // two latest volume dates + its max score, and its two latest rank dates)
  // and returned as one jsonb value: pulling the raw history here got
  // silently cut off at PostgREST's 1000-row cap, and since it was ordered
  // oldest-first, the rows dropped were the newest. See
  // 20261007000002_keyword_snapshots_visibility_rpc.sql.
  const { data: reduced } = await supabase.rpc("keyword_performance_snapshots", {
    p_terms: terms, p_store: store, p_country: country, p_app_ids: relevantAppIds,
  });
  const popRes = { data: (reduced?.volume ?? []) as { term: string; recorded_on: string; score: number; max_score: number }[] };
  const rankRes = { data: (reduced?.rank ?? []) as { keyword: string; recorded_on: string; app_id: string; position: number | null }[] };

  const result: PerformanceSnapshotResult = {};

  for (const term of terms) {
    const popRows = (popRes.data ?? []).filter((r) => r.term === term);
    const popDates = [...new Set(popRows.map((r) => r.recorded_on))].sort();
    const volumeAt = (date: string | undefined) =>
      date ? popRows.find((r) => r.recorded_on === date)?.score ?? null : null;

    const volumeLatestDate = popDates.at(-1) ?? null;
    // Only one real snapshot so far — there's no earlier point to compare against.
    // Carry the same real value into Prev (growth reads as 0) rather than showing
    // a misleading blank "Unknown".
    const volumePrevDate = popDates.length > 1 ? popDates.at(-2)! : volumeLatestDate;
    // popRows is only the latest two dates now, so the all-time max comes
    // precomputed alongside them.
    const volumeMax = popRows.length ? popRows[0].max_score : null;

    const rankRows = (rankRes.data ?? []).filter((r) => r.keyword === term);
    const rankDates = [...new Set(rankRows.map((r) => r.recorded_on))].sort();
    const rankAt = (date: string | null, appId: string): RankValue => {
      if (!date || !appId) return "unknown";
      const found = rankRows.find((r) => r.recorded_on === date && r.app_id === appId);
      // A found row with a null position is the explicit "checked, not
      // found in results" marker — same "unranked" display as no row at all.
      return found ? found.position ?? "unranked" : "unranked";
    };

    const rankLatestDate = rankDates.at(-1) ?? null;
    const rankPrevDate    = rankDates.length > 1 ? rankDates.at(-2)! : rankLatestDate;

    const competitors: Record<string, CompetitorRankSnapshot> = {};
    for (const cid of competitorIds) {
      competitors[cid] = {
        rankPrev:       rankAt(rankPrevDate, cid),
        rankPrevDate,
        rankLatest:     rankAt(rankLatestDate, cid),
        rankLatestDate,
      };
    }

    result[term] = {
      volumePrev:       volumeAt(volumePrevDate ?? undefined),
      volumePrevDate,
      volumeLatest:     volumeAt(volumeLatestDate ?? undefined),
      volumeLatestDate,
      volumeMax,
      rankPrev:    rankAt(rankPrevDate, ourAppId),
      rankPrevDate,
      rankLatest:  rankAt(rankLatestDate, ourAppId),
      rankLatestDate,
      competitors,
    };
  }

  return NextResponse.json(result);
}
