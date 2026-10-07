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

  // Rolled up in Postgres and returned as one jsonb value (see
  // 20261007000003_keyword_ranked_summary_rpc.sql): pulling every rank row
  // here got silently cut off at PostgREST's 1000-row cap regardless of
  // .limit(), dropping keywords late in the alphabet and undercounting the
  // chart.
  const { data } = await supabase.rpc("keyword_ranked_summary", {
    p_app_id: storeId, p_store: store, p_country: country,
  });

  return NextResponse.json({
    keywords: data?.keywords ?? [],
    history: data?.history ?? [],
  } satisfies RankedKeywordsResult);
}
