import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { computeDailyWeights, type DailyObservation } from "@/libs/keyword-downloads-apportionment";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

export type DownloadsHistoryPoint = {
  recorded_on: string;
  downloads: number;
  // This keyword's modeled share of that day's real total; null when no
  // tracked keyword had a rank check yet by that day (nothing to split by).
  estimated: number | null;
  // Rank in effect that day (latest check on or before it): null = checked
  // and not found, undefined/absent = not checked yet.
  rank?: number | null;
};

// How far before the chart's first day to look for rank/volume
// observations, so the first days carry forward a real earlier check
// instead of starting blank. Ranks are checked about weekly; a month
// covers a few missed checks.
const SEED_DAYS = 30;

function isoDateDaysAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

// GET /api/keywords/downloads-history?appId=...&keyword=...&days=90
//
// Splits each past day's real app-wide download total by THAT day's
// volume/rank weights (see computeDailyWeights), across every keyword this
// app tracks today — so the line follows this keyword's own rank changes
// rather than just mirroring the app's total. Same Pro-and-up gate as
// app/api/keywords/list/route.ts.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId   = searchParams.get("appId") ?? "";
  const keyword = (searchParams.get("keyword") ?? "").toLowerCase().trim();
  const days    = Math.min(Math.max(parseInt(searchParams.get("days") ?? "90"), 1), 365);

  const empty = { history: [] as DownloadsHistoryPoint[] };
  if (!appId || !keyword) return NextResponse.json(empty);

  const supabase = await createClient();

  // RLS'd: an appId from a workspace the caller isn't in just comes back empty.
  const { data: app } = await supabase
    .from("apps")
    .select("workspace_id, store, store_id, country")
    .eq("id", appId)
    .maybeSingle();
  if (!app) return NextResponse.json(empty);

  const planState = await getWorkspacePlanState(app.workspace_id);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) return NextResponse.json(empty, { status: 403 });

  const since = isoDateDaysAgo(days);

  const [akResult, metricsResult, downloadsResult] = await Promise.all([
    supabase
      .from("app_keywords")
      .select("keyword_id, keywords!inner(term)")
      .eq("app_id", appId),
    supabase
      .from("keyword_metrics")
      .select("keyword_id, volume")
      .eq("app_id", appId),
    supabase
      .from("app_download_history")
      .select("recorded_on, downloads")
      .eq("app_id", appId)
      .gte("recorded_on", since)
      .order("recorded_on", { ascending: true }),
  ]);

  if (akResult.error || downloadsResult.error) return NextResponse.json(empty, { status: 500 });

  const volumeById = new Map((metricsResult.data ?? []).map((m) => [m.keyword_id, m.volume as number]));
  const fallbackVolume = new Map<string, number>();
  for (const row of akResult.data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kw = Array.isArray((row as any).keywords) ? (row as any).keywords[0] : (row as any).keywords;
    const term = ((kw?.term as string | undefined) ?? "").toLowerCase().trim();
    if (term) fallbackVolume.set(term, volumeById.get(row.keyword_id) ?? 0);
  }
  const terms = [...fallbackVolume.keys()];
  const targetIndex = terms.indexOf(keyword);

  const downloadRows = downloadsResult.data ?? [];
  if (targetIndex < 0 || !downloadRows.length) {
    return NextResponse.json({ history: downloadRows.map((r) => ({ ...r, estimated: null })) });
  }

  const { data: observations, error: obsError } = await supabase.rpc("keyword_daily_observations", {
    p_terms: terms,
    p_store: app.store,
    p_country: (app.country ?? "US").toLowerCase(),
    p_app_id: app.store_id,
    p_since: isoDateDaysAgo(days + SEED_DAYS),
  });
  if (obsError) return NextResponse.json(empty, { status: 500 });

  const dayWeights = computeDailyWeights(
    downloadRows.map((r) => r.recorded_on),
    terms,
    (observations ?? []) as DailyObservation[],
    fallbackVolume,
  );

  const history: DownloadsHistoryPoint[] = downloadRows.map((r, i) => {
    const { weights, totalWeight, ranks } = dayWeights[i];
    return {
      recorded_on: r.recorded_on,
      downloads: r.downloads,
      estimated: totalWeight > 0 ? Math.round(r.downloads * (weights[targetIndex] / totalWeight)) : null,
      rank: ranks[targetIndex],
    };
  });

  return NextResponse.json({ history });
}
