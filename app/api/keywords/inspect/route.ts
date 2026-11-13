import { NextRequest, NextResponse, after } from "next/server";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { trackServerEvent } from "@/libs/analytics/events";
import { inspectorAllowedFor } from "@/features/aso/keywords/inspector/serverAccess";
import { fetchIosCoreMetrics, fetchAndroidCoreMetrics } from "@/libs/keyword-core-metrics";
import { estimateDailySearches } from "@/libs/keyword-impressions";
import { findRankIdx, computeChance } from "@/libs/keyword-rank-match";
import { recomputeOpportunity } from "@/libs/keyword-volume";
import { isRestrictedSearch } from "@/libs/keyword-restricted";
import type { AppSearchResult } from "@/app/api/keywords/search/route";

const TOP_APPS_LIMIT = 20;

export type KeywordInspection = {
  term: string;
  store: "ios" | "android";
  country: string;
  popularity: number;
  difficulty: number;
  results: number;
  estDailySearches: number;
  // The top results from the search this route already ran, as a fallback
  // for when the browser's own live search (fetchLiveSearchResults) fails,
  // e.g. Apple rate-limiting the viewer's IP. iOS rows here only carry what
  // the shared search cache stores (name, icon, rating count) — no star
  // rating, developer or price — so the live search stays the primary source.
  topApps: AppSearchResult[];
  // Set when appId tracks this term in this storefront: that row, rewritten
  // with this inspection's numbers, so Keyword Research's table matches it.
  tracked?: TrackedRowRefresh;
  // appId's stored relevancy for this term in this storefront (scored rows
  // only), so the Inspector can show it beside the rank without waiting on
  // the relevancy route's top-10 scoring.
  trackedRelevancy?: number;
};

export type TrackedRowRefresh = { volume: number; diff: number; chance: number; rank: number | null; opportunity: number | null; results: number };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// A fresh inspection is newer than the tracked row's stored metrics, and its
// persisted snapshot even makes the refresh cron skip the term (see
// stale_keywords_for_refresh), so the row would keep its old numbers. Rewrite
// it here with the same math as the cron's refreshKeywordMetrics. An
// iPad-only app is never in these iPhone results, so it keeps its stored
// rank; a frozen link (over the plan's keyword limit) is left alone.
async function refreshTrackedRow(
  supabase: SupabaseClient, appId: string, term: string, store: string, country: string,
  volume: number, diff: number, names: string[], ids: (string | number | null | undefined)[]
): Promise<{ row?: TrackedRowRefresh; relevancy?: number } | undefined> {
  const { data: row } = await supabase
    .from("keyword_metrics")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("keyword_id, rank, relevancy, relevancy_scored, opportunity, apps!inner(name, store, country, store_id, ipad_only), keywords!inner(term)" as any)
    .eq("app_id", appId)
    .eq("keywords.term", term)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  if (!r || r.apps.store !== store || (r.apps.country ?? "us").toLowerCase() !== country) return undefined;
  const relevancy = r.relevancy_scored && typeof r.relevancy === "number" ? r.relevancy as number : undefined;

  const { data: link } = await supabase
    .from("app_keywords").select("status").eq("app_id", appId).eq("keyword_id", r.keyword_id).maybeSingle();
  if (link?.status === "frozen") return { relevancy };

  const rankIdx = findRankIdx(names, r.apps.name, ids, r.apps.store_id);
  const rank = store === "ios" && r.apps.ipad_only === true ? r.rank : rankIdx >= 0 ? rankIdx + 1 : null;
  const results = names.length;
  const chance = computeChance(diff, rank, isRestrictedSearch(results, volume));
  const opportunity = recomputeOpportunity(r, volume, chance);

  const { error } = await supabase
    .from("keyword_metrics")
    .update({ volume, diff, chance, rank, opportunity, results, updated_at: new Date().toISOString() })
    .eq("app_id", appId)
    .eq("keyword_id", r.keyword_id);
  return { row: error ? undefined : { volume, diff, chance, rank, opportunity, results }, relevancy };
}

// Body of the 403 a below-Pro user gets.
export type InspectorLocked = { error: string; code: "plan_required" };

// GET /api/keywords/inspect?term=calorie+counter&store=ios&country=us&workspaceId=<uuid>[&appId=<uuid>]
// Keyword Inspector: popularity and difficulty for any keyword in any
// storefront, with no app involved. Same scoring (and the same shared
// same-day search cache) as /api/keywords/metrics, so a keyword reads the
// same here as it does once it's tracked in Keyword Research. The ranked
// search results themselves come from the client's live search
// (fetchLiveSearchResults), which has the richer per-app fields.
//
// Pro and above, signup Pro trial included (see
// features/aso/keywords/inspector/limits.ts).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const term        = (searchParams.get("term") ?? "").trim();
  const store       = searchParams.get("store") === "android" ? "android" : "ios";
  const country     = (searchParams.get("country") ?? "us").toLowerCase();
  const workspaceId = searchParams.get("workspaceId") ?? "";
  // The app whose tracked row for this term gets this inspection's numbers.
  const appId       = searchParams.get("appId") ?? "";

  if (!term) return NextResponse.json({ error: "Enter a keyword to inspect." }, { status: 400 });
  if (term.length > 100) return NextResponse.json({ error: "Keyword is too long." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!(await inspectorAllowedFor(supabase, user.id, workspaceId))) {
    return NextResponse.json({
      error: "Keyword Inspector is a Pro feature. Upgrade to Pro to inspect any keyword.",
      code: "plan_required",
    } satisfies InspectorLocked, { status: 403 });
  }
  const impersonating = await isImpersonating();

  // Logged up front, so a search the store then rate-limits still shows in
  // Recent (the user can retry it from there). Skipped while an admin views
  // as this user: those searches aren't theirs. Best-effort, never fails the
  // inspection.
  const record = impersonating
    ? Promise.resolve()
    : Promise.resolve(
        supabase.rpc("record_keyword_inspector_search", {
          p_term: term.toLowerCase(),
          p_store: store,
          p_country: country,
          p_workspace_id: workspaceId || null,
        })
      ).then(() => {}, () => {});

  const [core] = await Promise.all([
    store === "ios"
      ? fetchIosCoreMetrics(supabase, term, country)
      : fetchAndroidCoreMetrics(supabase, term, country),
    record,
  ]);

  if (core === "rate_limited") {
    return NextResponse.json({ error: "The App Store is busy right now. Try again in a minute." }, { status: 429 });
  }
  if (!core) {
    return NextResponse.json({ error: "Couldn't check this keyword right now. Try again shortly." }, { status: 502 });
  }

  if (!impersonating) after(() => trackServerEvent(user.id, "Keyword Inspected", { store, country }));

  const refreshed = appId
    ? await refreshTrackedRow(
        supabase, appId, term.toLowerCase(), store, country, core.volume, core.diff,
        store === "ios"
          ? (core.apps as { trackName: string }[]).map((a) => a.trackName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (core.apps as any[]).map((a) => a.title ?? ""),
        store === "ios"
          ? (core.apps as { trackId: number }[]).map((a) => a.trackId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (core.apps as any[]).map((a) => a.appId),
      ).catch(() => undefined)
    : undefined;

  return NextResponse.json({
    term,
    store,
    country,
    popularity: core.volume,
    difficulty: core.diff,
    results: core.results,
    estDailySearches: Math.round(estimateDailySearches(core.volume)),
    topApps: store === "ios"
      ? (core.apps as { trackId: number; trackName: string; userRatingCount: number; artworkUrl: string }[])
          .slice(0, TOP_APPS_LIMIT)
          .map((a, i) => ({
            position: i + 1, trackId: a.trackId, name: a.trackName, subtitle: "", developer: "",
            icon: a.artworkUrl, rating: 0, ratingCount: a.userRatingCount, price: "",
            inAppPurchases: false, screenshotUrls: [],
          }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (core.apps as any[]).slice(0, TOP_APPS_LIMIT).map((a, i) => ({
          position: i + 1, trackId: 0, appId: (a.appId ?? "") as string, name: (a.title ?? "") as string,
          // search()'s summary is the full description, not the short one,
          // so the fallback list goes without (see the search route).
          subtitle: "", developer: (a.developer ?? "") as string, icon: (a.icon ?? "") as string,
          rating: (a.score ?? 0) as number, ratingCount: 0,
          price: a.free ? "Free" : typeof a.price === "number" ? `$${a.price.toFixed(2)}` : "",
          inAppPurchases: false, screenshotUrls: [],
        })),
    tracked: refreshed?.row,
    trackedRelevancy: refreshed?.relevancy,
  } satisfies KeywordInspection);
}
