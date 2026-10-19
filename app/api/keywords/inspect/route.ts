import { NextRequest, NextResponse } from "next/server";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import type { InspectorUsage } from "@/features/aso/keywords/inspector/limits";
import { inspectorLimitFor } from "@/features/aso/keywords/inspector/serverLimit";
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
  // Today's allowance after this lookup, for the page's "lookups left" badge.
  usage: InspectorUsage;
};

// Body of the 403 a capped user gets once today's lookups are used up.
export type InspectorLimitReached = { error: string; code: "daily_limit"; usage: InspectorUsage };

// GET /api/keywords/inspect?term=calorie+counter&store=ios&country=us&workspaceId=<uuid>
// Keyword Inspector: popularity and difficulty for any keyword in any
// storefront, with no app involved. Same scoring (and the same shared
// same-day search cache) as /api/keywords/metrics, so a keyword reads the
// same here as it does once it's tracked in Keyword Research. The ranked
// search results themselves come from the client's live search
// (fetchLiveSearchResults), which has the richer per-app fields.
//
// Open to every signed-in user; below Pro it's capped per day (see
// features/aso/keywords/inspector/limits.ts). Every request is one lookup,
// including the same keyword again. It's used before the store is hit and
// handed back if the inspection then fails.
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

  const limit = await inspectorLimitFor(supabase, user.id, workspaceId);
  const impersonating = await isImpersonating();

  // Capped plans use one of today's lookups first. Skipped while an admin
  // views as this user, so checking their account doesn't spend their
  // allowance. Service role: users can read their lookups but not write them.
  let usage: InspectorUsage = { used: 0, limit };
  let lookupId: number | null = null;
  if (limit !== null && !impersonating) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("consume_keyword_inspector_lookup", {
        p_user_id: user.id, p_term: term.toLowerCase(), p_store: store, p_country: country, p_limit: limit,
      })
      .single<{ allowed: boolean; lookup_id: number | null; used: number }>();
    if (error || !data) {
      return NextResponse.json({ error: "Couldn't check this keyword right now. Try again shortly." }, { status: 500 });
    }
    usage = { used: data.used, limit };
    if (!data.allowed) {
      return NextResponse.json({
        error: `You've used your ${limit} free lookups for today. Upgrade to Pro for unlimited lookups.`,
        code: "daily_limit",
        usage,
      } satisfies InspectorLimitReached, { status: 403 });
    }
    lookupId = data.lookup_id;
  }
  const refund = async () => {
    if (lookupId === null) return;
    await createAdminClient().rpc("refund_keyword_inspector_lookup", { p_lookup_id: lookupId }).then(() => {}, () => {});
    usage = { used: Math.max(0, usage.used - 1), limit };
  };

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
    await refund();
    return NextResponse.json({ error: "The App Store is busy right now. Try again in a minute.", usage }, { status: 429 });
  }
  if (!core) {
    await refund();
    return NextResponse.json({ error: "Couldn't check this keyword right now. Try again shortly.", usage }, { status: 502 });
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
    usage,
  } satisfies KeywordInspection);
}
