import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type MonthlyKeywordStats = {
  // Average search volume score across this keyword's daily readings this
  // calendar month (at most one row/day — see the recorded_on upsert key in
  // the refresh cron). Volume is a computed score off fairly stable inputs,
  // so averaging smooths out an occasional bad-day reading (a partial scrape,
  // a transient API hiccup) instead of letting one glitch define the month.
  avgVolume: number | null;
  // Best (lowest/numerically smallest) rank position recorded this month.
  // #1 is the best possible rank, so "highest ranking" means the smallest
  // number here, not the largest. Unlike volume this is deliberately not
  // averaged — rank is genuinely volatile day to day, so "best position
  // reached" is the meaningful monthly signal. null means no numeric rank
  // was ever recorded this month (every check that month came back
  // "unranked").
  bestRank: number | null;
};

// Keyed by term, then by "YYYY-MM" for every month that term has any real
// volume or rank data for.
export type PerformanceReportResult = Record<string, Record<string, MonthlyKeywordStats>>;

// GET /api/keywords/performance-report?terms=a,b&store=ios&country=us&storeId=123456
//
// Powers the "Export Report" button on Keyword Performance. Rolls the full
// volume/rank history for each tracked keyword up to one entry per calendar
// month (see MonthlyKeywordStats for why it's the month's best value, not its
// last). The client turns this into one Excel tab per month (a fixed rolling
// window — see exportReport.ts), each showing that month's rank change vs.
// the month before it.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam = searchParams.get("terms") ?? "";
  const store    = searchParams.get("store") ?? "ios";
  const country  = (searchParams.get("country") ?? "us").toLowerCase();
  const ourAppId = searchParams.get("storeId") ?? "";

  // Each term arrives percent-encoded (see the client's encodeURIComponent
  // before joining) so a literal comma inside a keyword survives as %2C
  // instead of being mistaken for the between-terms delimiter.
  const terms = [...new Set(termsParam.split(",").map((t) => decodeURIComponent(t.trim()).toLowerCase()).filter(Boolean))];
  if (!terms.length) return NextResponse.json({});

  const supabase = await createClient();

  const [volRes, rankRes] = await Promise.all([
    supabase
      .from("keyword_volume_history")
      .select("term, score, recorded_on")
      .in("term", terms)
      .eq("store", store)
      .eq("country", country),
    // Only our own app's rank belongs in this report — skip the query
    // entirely when we don't have a store_id to filter on (a
    // previewed-but-not-yet-tracked app).
    ourAppId
      ? supabase
          .from("keyword_rankings_history")
          .select("keyword, recorded_on, position")
          .in("keyword", terms)
          .eq("store", store)
          .eq("country", country)
          .eq("app_id", ourAppId)
      : Promise.resolve({ data: [] as { keyword: string; recorded_on: string; position: number | null }[] }),
  ]);

  const monthOf = (recordedOn: string) => recordedOn.slice(0, 7); // "YYYY-MM"

  // Accumulates a running sum/count per term+month so the average can be
  // taken once at the end, rather than trying to maintain a running average
  // per row.
  type Accum = { volSum: number; volCount: number; bestRank: number | null };
  const accum: Record<string, Record<string, Accum>> = {};
  for (const term of terms) accum[term] = {};

  for (const row of volRes.data ?? []) {
    const bucket = accum[row.term] ?? (accum[row.term] = {});
    const month = monthOf(row.recorded_on);
    const entry = bucket[month] ?? (bucket[month] = { volSum: 0, volCount: 0, bestRank: null });
    if (row.score != null) {
      entry.volSum += row.score;
      entry.volCount += 1;
    }
  }

  for (const row of rankRes.data ?? []) {
    // A null position is the "checked, not found in results" marker — no
    // numeric rank to compare, so it can't set a month's best.
    if (row.position == null) continue;
    const bucket = accum[row.keyword] ?? (accum[row.keyword] = {});
    const month = monthOf(row.recorded_on);
    const entry = bucket[month] ?? (bucket[month] = { volSum: 0, volCount: 0, bestRank: null });
    if (entry.bestRank === null || row.position < entry.bestRank) {
      entry.bestRank = row.position;
    }
  }

  const result: PerformanceReportResult = {};
  for (const term of terms) {
    result[term] = {};
    for (const [month, entry] of Object.entries(accum[term])) {
      result[term][month] = {
        avgVolume: entry.volCount ? Math.round(entry.volSum / entry.volCount) : null,
        bestRank: entry.bestRank,
      };
    }
  }

  return NextResponse.json(result);
}
