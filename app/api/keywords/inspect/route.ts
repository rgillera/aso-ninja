import { NextRequest, NextResponse } from "next/server";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { fetchIosCoreMetrics, fetchAndroidCoreMetrics } from "@/libs/keyword-core-metrics";
import { estimateDailySearches } from "@/libs/keyword-impressions";
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
};

// GET /api/keywords/inspect?term=calorie+counter&store=ios&country=us&workspaceId=<uuid>
// Keyword Inspector: popularity and difficulty for any keyword in any
// storefront, with no app involved. Same scoring (and the same shared
// same-day search cache) as /api/keywords/metrics, so a keyword reads the
// same here as it does once it's tracked in Keyword Research. The ranked
// search results themselves come from the client's live search
// (fetchLiveSearchResults), which has the richer per-app fields.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const term        = (searchParams.get("term") ?? "").trim();
  const store       = searchParams.get("store") === "android" ? "android" : "ios";
  const country     = (searchParams.get("country") ?? "us").toLowerCase();
  const workspaceId = searchParams.get("workspaceId") ?? "";

  if (!term) return NextResponse.json({ error: "Enter a keyword to inspect." }, { status: 400 });
  if (term.length > 100) return NextResponse.json({ error: "Keyword is too long." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro")) {
    return NextResponse.json({ error: "Keyword Inspector requires the Pro plan or above." }, { status: 403 });
  }

  // Logged up front, so a search the store then rate-limits still shows in
  // Recent (the user can retry it from there). Skipped while an admin views
  // as this user: those searches aren't theirs. Best-effort, never fails the
  // inspection.
  const record = (await isImpersonating())
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
  } satisfies KeywordInspection);
}
