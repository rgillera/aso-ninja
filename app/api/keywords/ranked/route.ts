import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type RankedKeyword = {
  term: string;
  volume: number | null;
  rank: number;
  rankDate: string;
  prevRank: number | null;
  prevDate: string | null;
};

export type RankedHistoryPoint = {
  date: string;
  count: number;
};

export type RankedKeywordsResult = {
  keywords: RankedKeyword[];
  history: RankedHistoryPoint[];
};

// GET /api/keywords/ranked?storeId=123456&store=ios&country=us
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? "";
  const store   = searchParams.get("store") ?? "ios";
  const country = (searchParams.get("country") ?? "us").toLowerCase();

  if (!storeId) return NextResponse.json({ keywords: [], history: [] });

  const supabase = await createClient();

  const { data: rankRows } = await supabase
    .from("keyword_rankings_history")
    .select("keyword, recorded_on, position")
    .eq("app_id", storeId)
    .eq("store", store)
    .eq("country", country)
    // Null position is a "checked, not found" marker, not a rank — this
    // route exists specifically to list keywords the app IS ranked for.
    .not("position", "is", null)
    .order("keyword", { ascending: true })
    .order("recorded_on", { ascending: false })
    .limit(10000);

  if (!rankRows?.length) return NextResponse.json({ keywords: [], history: [] });

  // Process: per keyword, collect latest + prev rank; per date, count distinct keywords
  type Entry = { latest: { pos: number; date: string }; prev: { pos: number; date: string } | null };
  const kwMap = new Map<string, Entry>();
  const dateMap = new Map<string, Set<string>>();

  for (const row of rankRows) {
    if (!kwMap.has(row.keyword)) {
      kwMap.set(row.keyword, { latest: { pos: row.position, date: row.recorded_on }, prev: null });
    } else {
      const entry = kwMap.get(row.keyword)!;
      if (!entry.prev && row.recorded_on !== entry.latest.date) {
        entry.prev = { pos: row.position, date: row.recorded_on };
      }
    }
    if (!dateMap.has(row.recorded_on)) dateMap.set(row.recorded_on, new Set());
    dateMap.get(row.recorded_on)!.add(row.keyword);
  }

  // Fetch volumes for all unique keywords
  const terms = [...kwMap.keys()];
  const { data: volRows } = await supabase
    .from("keyword_volume_history")
    .select("term, score, recorded_on")
    .in("term", terms)
    .eq("store", store)
    .eq("country", country)
    .order("recorded_on", { ascending: false })
    .limit(10000);

  const volMap = new Map<string, number>();
  for (const row of volRows ?? []) {
    if (!volMap.has(row.term)) volMap.set(row.term, row.score);
  }

  const keywords: RankedKeyword[] = [...kwMap.entries()].map(([term, entry]) => ({
    term,
    volume:   volMap.get(term) ?? null,
    rank:     entry.latest.pos,
    rankDate: entry.latest.date,
    prevRank: entry.prev?.pos ?? null,
    prevDate: entry.prev?.date ?? null,
  }));

  const history: RankedHistoryPoint[] = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kws]) => ({ date, count: kws.size }));

  return NextResponse.json({ keywords, history } satisfies RankedKeywordsResult);
}
