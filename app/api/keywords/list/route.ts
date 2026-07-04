import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type SavedKeyword = {
  term: string;
  volume: number;
  diff: number;
  chance: number;
  opportunity: number | null;
  relevancy: number | null;
  rank: number | null;
  hasCachedMetrics: boolean;
};

// GET /api/keywords/list?appId=...
// or, for an app previewed but not yet formally tracked (no internal id yet):
// GET /api/keywords/list?workspaceId=...&bundleId=...&store=...&country=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let appId = searchParams.get("appId") ?? "";

  const supabase = await createClient();

  if (!appId) {
    // Preview apps have no apps-table row reference on the client yet, but
    // /api/keywords/save resolves/creates one by this same natural key on
    // every add — look it up the same way so keywords saved while previewing
    // still load back, instead of the page silently staying empty.
    const workspaceId = searchParams.get("workspaceId") ?? "";
    const bundleId     = searchParams.get("bundleId") ?? "";
    const store        = searchParams.get("store") ?? "";
    const country       = (searchParams.get("country") ?? "us").toLowerCase();
    if (workspaceId && bundleId && store) {
      const { data } = await supabase
        .from("apps")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("store", store)
        .eq("bundle_id", bundleId)
        .eq("country", country)
        .maybeSingle();
      appId = data?.id ?? "";
    }
  }

  if (!appId) return NextResponse.json({ keywords: [] });

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
  const metricsMap = new Map<string, { volume: number; diff: number; chance: number; opportunity: number | null; relevancy: number | null; rank: number | null }>();
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
        // null (as opposed to 0) means relevancy/opportunity were never
        // computed for this row — e.g. added while below Pro+ — so callers
        // can tell "not yet scored" apart from a genuine score of 0.
        opportunity:      m?.opportunity ?? null,
        relevancy:        m?.relevancy   ?? null,
        rank:             m?.rank        ?? null,
        hasCachedMetrics: !!m,
      } satisfies SavedKeyword;
    })
    .filter(Boolean) as SavedKeyword[];

  return NextResponse.json({ keywords });
}
