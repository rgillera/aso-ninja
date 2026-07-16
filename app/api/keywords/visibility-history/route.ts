import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type VisibilityPoint = { date: string; score: number };
export type VisibilityHistoryResult = Record<string, VisibilityPoint[]>;

// Linear decay: rank 1 = full weight, rank 200+ = no weight.
// Not an official Apple/Google metric — our own estimate of how much
// search-result real estate an app holds across its tracked keywords.
function positionWeight(rank: number): number {
  if (rank < 1 || rank > 200) return 0;
  return 1 - (rank - 1) / 200;
}

// GET /api/keywords/visibility-history?terms=a,b&store=ios&country=us&from=2026-03-29&to=2026-06-29&appIds=123,456
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam  = searchParams.get("terms") ?? "";
  const appIdsParam = searchParams.get("appIds") ?? "";
  const store        = searchParams.get("store") ?? "ios";
  const country       = (searchParams.get("country") ?? "us").toLowerCase();
  const from           = searchParams.get("from") ?? "";
  const to              = searchParams.get("to") ?? "";

  const terms  = [...new Set(termsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  const appIds = [...new Set(appIdsParam.split(",").map((a) => a.trim()).filter(Boolean))];
  if (!terms.length || !appIds.length || !from || !to) return NextResponse.json({});

  const supabase = await createClient();

  const [popRes, rankRes] = await Promise.all([
    supabase
      .from("keyword_volume_history")
      .select("term, score, recorded_on")
      .in("term", terms)
      .eq("store", store)
      .eq("country", country)
      .lte("recorded_on", to)
      .order("recorded_on", { ascending: true }),
    supabase
      .from("keyword_rankings_history")
      .select("keyword, recorded_on, position, app_id")
      .in("keyword", terms)
      .in("app_id", appIds)
      .eq("store", store)
      .eq("country", country)
      .gte("recorded_on", from)
      .lte("recorded_on", to)
      .order("recorded_on", { ascending: true }),
  ]);

  // Per term: ascending list of {recorded_on, score}, used to look up the
  // latest known popularity at or before a given date (volume isn't
  // snapshotted every single day either).
  const popByTerm = new Map<string, { recorded_on: string; score: number }[]>();
  for (const row of popRes.data ?? []) {
    const list = popByTerm.get(row.term) ?? [];
    list.push(row);
    popByTerm.set(row.term, list);
  }
  function popularityAt(term: string, date: string): number {
    const list = popByTerm.get(term);
    if (!list?.length) return 0;
    let latest = 0;
    for (const row of list) {
      if (row.recorded_on > date) break;
      latest = row.score;
    }
    return latest;
  }

  const rankRows = rankRes.data ?? [];
  const dates = [...new Set(rankRows.map((r) => r.recorded_on))].sort();

  const rankByKey = new Map<string, number>();
  for (const row of rankRows) {
    // A null position is a "checked, not found" marker, not a rank — it
    // contributes no visibility weight, same as no row at all.
    if (row.position === null) continue;
    rankByKey.set(`${row.keyword}|${row.recorded_on}|${row.app_id}`, row.position);
  }

  const result: VisibilityHistoryResult = {};
  for (const appId of appIds) {
    result[appId] = dates.map((date) => {
      let score = 0;
      for (const term of terms) {
        const position = rankByKey.get(`${term}|${date}|${appId}`);
        if (position !== undefined) score += popularityAt(term, date) * positionWeight(position);
      }
      return { date, score: Math.round(score) };
    });
  }

  return NextResponse.json(result);
}
