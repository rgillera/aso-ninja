import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { computeShares } from "@/libs/keyword-downloads-apportionment";

type HistoryPoint = { recorded_on: string; downloads: number; estimated: number };

// GET /api/keywords/downloads-history?appId=...&keyword=...&days=90
//
// Applies this keyword's CURRENT volume/rank weight (same formula as
// app/api/keywords/list/route.ts) to each past day's real app-wide download
// total, rather than recomputing what the weight actually was on each of
// those past days — simpler, and reuses data already being fetched, at the
// cost of the split ratio being "as of today" rather than truly historical.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId   = searchParams.get("appId") ?? "";
  const keyword = (searchParams.get("keyword") ?? "").toLowerCase().trim();
  const days    = Math.min(Math.max(parseInt(searchParams.get("days") ?? "90"), 1), 365);

  if (!appId || !keyword) return NextResponse.json({ history: [], share: 0 });

  const supabase = await createClient();

  const { data: metricsRows } = await supabase
    .from("keyword_metrics")
    .select("volume, rank, keywords!inner(term)")
    .eq("app_id", appId);

  const weighted = (metricsRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => {
      const kw = Array.isArray(row.keywords) ? row.keywords[0] : row.keywords;
      return { term: ((kw?.term as string | undefined) ?? "").toLowerCase(), volume: row.volume ?? 0, rank: row.rank ?? null };
    });

  const shares = computeShares(weighted);
  const targetIndex = weighted.findIndex((k) => k.term === keyword);
  const share = targetIndex >= 0 ? shares[targetIndex] : 0;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: downloadsRows, error } = await supabase
    .from("app_download_history")
    .select("recorded_on, downloads")
    .eq("app_id", appId)
    .gte("recorded_on", since.toISOString().split("T")[0])
    .order("recorded_on", { ascending: true });

  if (error) return NextResponse.json({ history: [], share: 0 }, { status: 500 });

  const history: HistoryPoint[] = (downloadsRows ?? []).map((r) => ({
    recorded_on: r.recorded_on,
    downloads: r.downloads,
    estimated: Math.round(r.downloads * share),
  }));

  return NextResponse.json({ history, share });
}
