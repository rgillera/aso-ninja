import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type RankValue = number | "unranked" | "unknown";

export type TermHistory = {
  volumeStart: number | null;
  volumeEnd: number | null;
  volumeMax: number | null;
  rankStart: RankValue;
  rankEnd: RankValue;
};

export type PerformanceHistoryResult = Record<string, TermHistory>;

// GET /api/keywords/performance-history?terms=a,b&store=ios&country=us&from=2026-03-29&to=2026-06-29&storeId=123456
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam = searchParams.get("terms") ?? "";
  const store      = searchParams.get("store") ?? "ios";
  const country    = (searchParams.get("country") ?? "us").toLowerCase();
  const from       = searchParams.get("from") ?? "";
  const to         = searchParams.get("to") ?? "";
  const ourAppId   = searchParams.get("storeId") ?? "";

  const terms = [...new Set(termsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (!terms.length || !from || !to) return NextResponse.json({});

  const supabase = await createClient();

  const [popRes, rankRes] = await Promise.all([
    supabase
      .from("keyword_volume_history")
      .select("term, score, recorded_on")
      .in("term", terms)
      .eq("store", store)
      .eq("country", country)
      .gte("recorded_on", from)
      .lte("recorded_on", to),
    supabase
      .from("keyword_rankings_history")
      .select("keyword, recorded_on, position, app_id")
      .in("keyword", terms)
      .eq("store", store)
      .eq("country", country)
      .in("recorded_on", [from, to]),
  ]);

  const result: PerformanceHistoryResult = {};

  for (const term of terms) {
    const popRows = (popRes.data ?? []).filter((r) => r.term === term);
    const volumeStart = popRows.find((r) => r.recorded_on === from)?.score ?? null;
    const volumeEnd   = popRows.find((r) => r.recorded_on === to)?.score ?? null;
    const volumeMax   = popRows.length ? Math.max(...popRows.map((r) => r.score)) : null;

    const rankRows = (rankRes.data ?? []).filter((r) => r.keyword === term);
    const rankFor = (date: string): RankValue => {
      const dayRows = rankRows.filter((r) => r.recorded_on === date);
      if (!dayRows.length) return "unknown";
      const mine = ourAppId ? dayRows.find((r) => r.app_id === ourAppId) : undefined;
      // A found row with a null position is the explicit "checked, not
      // found" marker — same "unranked" display as no row at all.
      return mine ? mine.position ?? "unranked" : "unranked";
    };

    result[term] = {
      volumeStart,
      volumeEnd,
      volumeMax,
      rankStart: rankFor(from),
      rankEnd:   rankFor(to),
    };
  }

  return NextResponse.json(result);
}
