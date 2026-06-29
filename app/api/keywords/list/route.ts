import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type SavedKeyword = {
  term: string;
  volume: number;
  diff: number;
  chance: number;
  opportunity: number;
  relevancy: number;
  rank: number | null;
  hasCachedMetrics: boolean;
};

// GET /api/keywords/list?appId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId") ?? "";

  if (!appId) return NextResponse.json({ keywords: [] });

  const supabase = await createClient();

  // Two separate queries — no direct FK exists between app_keywords and keyword_metrics
  const [akResult, metricsResult] = await Promise.all([
    supabase
      .from("app_keywords")
      .select("keyword_id, keywords!inner(id, term)")
      .eq("app_id", appId)
      .order("added_at", { ascending: true }),
    supabase
      .from("keyword_metrics")
      .select("keyword_id, volume, diff, chance, opportunity, relevancy, rank")
      .eq("app_id", appId),
  ]);

  if (akResult.error) return NextResponse.json({ keywords: [] }, { status: 500 });

  // Build metrics lookup by keyword_id
  const metricsMap = new Map<string, { volume: number; diff: number; chance: number; opportunity: number; relevancy: number; rank: number | null }>();
  for (const m of metricsResult.data ?? []) {
    metricsMap.set(m.keyword_id, {
      volume:      m.volume,
      diff:        m.diff,
      chance:      m.chance,
      opportunity: m.opportunity,
      relevancy:   m.relevancy,
      rank:        m.rank ?? null,
    });
  }

  const keywords: SavedKeyword[] = (akResult.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => {
      const kw = Array.isArray(row.keywords) ? row.keywords[0] : row.keywords;
      const term = kw?.term as string | undefined;
      if (!term) return null;
      const m = metricsMap.get(row.keyword_id);
      return {
        term,
        volume:           m?.volume      ?? 0,
        diff:             m?.diff        ?? 0,
        chance:           m?.chance      ?? 0,
        opportunity:      m?.opportunity ?? 0,
        relevancy:        m?.relevancy   ?? 0,
        rank:             m?.rank        ?? null,
        hasCachedMetrics: !!m,
      } satisfies SavedKeyword;
    })
    .filter(Boolean) as SavedKeyword[];

  return NextResponse.json({ keywords });
}
