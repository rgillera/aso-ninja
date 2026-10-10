import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { computeDailyWeights, type DailyObservation } from "@/libs/keyword-downloads-apportionment";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

export type DownloadsHistoryWeek = {
  week: string; // Monday of that week, "2026-09-07"
  downloads: number; // real app-wide total over the week's synced days
  // Sum of this keyword's modeled daily shares; null when no tracked
  // keyword had a rank check yet on any synced day that week.
  estimated: number | null;
  // Rank in effect at the week's last synced day: null = checked and not
  // found, undefined/absent = not checked yet.
  rank?: number | null;
  days: number; // synced days in this week (< 7 for a partial or current week)
};

// How far before the chart's first day to look for rank/volume
// observations, so the first days carry forward a real earlier check
// instead of starting blank. Ranks are checked about weekly; a month
// covers a few missed checks.
const SEED_DAYS = 30;

function isoDateDaysAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

// Monday of the week containing this YYYY-MM-DD date. UTC on both ends, so
// the server's own timezone can't shift a day into the neighbouring week.
function weekStart(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().split("T")[0];
}

// GET /api/keywords/downloads-history?appId=...&keyword=...&weeks=13
//
// Splits each past day's real app-wide download total by THAT day's
// volume/rank weights (see computeDailyWeights), across every keyword this
// app tracks today — so the numbers follow this keyword's own rank changes
// rather than just mirroring the app's total — then sums the days into one
// total per Monday-to-Sunday week. Same Pro-and-up gate as
// app/api/keywords/list/route.ts.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId   = searchParams.get("appId") ?? "";
  const keyword = (searchParams.get("keyword") ?? "").toLowerCase().trim();
  const weeks   = Math.min(Math.max(parseInt(searchParams.get("weeks") ?? "13"), 1), 52);

  const empty = { history: [] as DownloadsHistoryWeek[] };
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

  // Start on a Monday so the oldest week is a whole week, not a fragment.
  const firstWeek = new Date(weekStart(isoDateDaysAgo(0)) + "T00:00:00Z");
  firstWeek.setUTCDate(firstWeek.getUTCDate() - (weeks - 1) * 7);
  const since = firstWeek.toISOString().split("T")[0];

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
  if (!downloadRows.length) return NextResponse.json(empty);

  const { data: observations, error: obsError } = await supabase.rpc("keyword_daily_observations", {
    p_terms: terms,
    p_store: app.store,
    p_country: (app.country ?? "US").toLowerCase(),
    p_app_id: app.store_id,
    p_since: new Date(firstWeek.getTime() - SEED_DAYS * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  if (obsError) return NextResponse.json(empty, { status: 500 });

  const dayWeights = computeDailyWeights(
    downloadRows.map((r) => r.recorded_on),
    terms,
    (observations ?? []) as DailyObservation[],
    fallbackVolume,
  );

  // Rows are ascending, so each week's entry ends up holding the rank from
  // its last synced day.
  const byWeek = new Map<string, DownloadsHistoryWeek>();
  downloadRows.forEach((r, i) => {
    const { weights, totalWeight, ranks } = dayWeights[i];
    const week = weekStart(r.recorded_on);
    const entry = byWeek.get(week) ?? { week, downloads: 0, estimated: null, days: 0 };
    entry.downloads += r.downloads;
    entry.days += 1;
    if (targetIndex >= 0 && totalWeight > 0) {
      entry.estimated = (entry.estimated ?? 0) + r.downloads * (weights[targetIndex] / totalWeight);
    }
    entry.rank = targetIndex >= 0 ? ranks[targetIndex] : undefined;
    byWeek.set(week, entry);
  });

  // Rounded once per week, not per day, so small daily shares don't each
  // round down to 0 and vanish from the total.
  const history = [...byWeek.values()].map((w) => ({
    ...w,
    estimated: w.estimated == null ? null : Math.round(w.estimated),
  }));

  return NextResponse.json({ history });
}
