import { NextRequest, NextResponse, after } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient, isImpersonating } from "@/libs/supabase/server";
import { trackServerEvent } from "@/libs/analytics/events";
import { fetchStoreData } from "@/libs/store/load-benchmark";
import { scoreAppsRelevancyBatch, type BatchApp } from "@/libs/keyword-relevancy";
import { inspectorPlanFor } from "@/features/aso/keywords/inspector/serverAccess";
import { canUseInspectorRelevancy, RELEVANCY_APPS_LIMIT } from "@/features/aso/keywords/inspector/limits";
import type { InspectorLocked } from "@/app/api/keywords/inspect/route";

export type InspectorRelevancy = {
  // Keyed by store id: App Store track id, or Google Play package name.
  // An app missing here has no score (listing or LLM reply left it out).
  scores: Record<string, number>;
};

// One LLM call and one embedding call per keyword, storefront and result set, kept for a day: the
// top 10 rarely change within one, and a popular keyword gets inspected
// again and again. Listings come from the same 6h per-app cache the
// estimates step fills for these rows, so a warm lookup costs no store
// requests. ids are the results in rank order (their names are the market
// context, as for a tracked keyword); skip is left out of the scoring.
// Throws (so nothing is cached) when the LLM gave no usable reply.
const cachedBatchScores = unstable_cache(
  async (term: string, store: "ios" | "android", country: string, ids: string[], skip: string[]) => {
    const listings = await Promise.all(ids.map((id) =>
      fetchStoreData(store, store === "ios" ? id : "", store === "android" ? id : "", country)
    ));
    const apps: BatchApp[] = [];
    const topTitles: string[] = [];
    listings.forEach((data, i) => {
      if (!data?.name) return;
      topTitles.push(data.name);
      if (!skip.includes(ids[i])) apps.push({ id: ids[i], name: data.name, subtitle: data.subtitle ?? "", description: data.description ?? "" });
    });
    const scores = await scoreAppsRelevancyBatch(term, apps, topTitles);
    if (!scores) throw new Error("relevancy batch failed");
    return scores;
  },
  ["inspector-relevancy"],
  { revalidate: 24 * 60 * 60 },
);

// POST /api/keywords/inspect/relevancy
// body: { term, store, country, workspaceId, ids: string[], appId? }
// Keyword Inspector's relevancy column: how well the keyword fits each of
// the top 10 results, loaded after the list renders. Pro+ and above (see
// canUseInspectorRelevancy). It doesn't draw from the plan's relevancy pool:
// it scores other people's apps, nothing gets tracked.
//
// appId: the active app. When it's in the results and tracks this term in
// this storefront, its row shows its stored Keyword Research relevancy, so
// the two screens agree, and it's left out of the LLM call.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { term: rawTerm, store: rawStore, country: rawCountry, workspaceId, ids: rawIds, appId } = body as {
    term?: string; store?: string; country?: string; workspaceId?: string; ids?: unknown[]; appId?: string;
  };
  const term = (rawTerm ?? "").trim().toLowerCase();
  const store = rawStore === "android" ? "android" : "ios";
  const country = (rawCountry ?? "us").toLowerCase();
  if (!term || term.length > 100) return NextResponse.json({ error: "Invalid keyword." }, { status: 400 });
  if (!/^[a-z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country." }, { status: 400 });

  const ids = [...new Set((Array.isArray(rawIds) ? rawIds : [])
    .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200)
    .filter((id) => store === "android" || /^\d+$/.test(id)))]
    .slice(0, RELEVANCY_APPS_LIMIT);
  if (!ids.length) return NextResponse.json({ scores: {} } satisfies InspectorRelevancy);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const plan = await inspectorPlanFor(supabase, user.id, workspaceId ?? "");
  if (!plan || !canUseInspectorRelevancy(plan)) {
    return NextResponse.json({
      error: "Relevancy for top results is a Pro+ feature.",
      code: "plan_required",
    } satisfies InspectorLocked, { status: 403 });
  }

  const tracked: Record<string, number> = {};
  if (appId) {
    const { data: row } = await supabase
      .from("keyword_metrics")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("relevancy, relevancy_scored, apps!inner(store, country, store_id), keywords!inner(term)" as any)
      .eq("app_id", appId)
      .eq("keywords.term", term)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    if (r?.relevancy_scored && r.relevancy !== null && r.apps.store === store
      && (r.apps.country ?? "us").toLowerCase() === country && ids.includes(String(r.apps.store_id))) {
      tracked[String(r.apps.store_id)] = r.relevancy;
    }
  }

  const toScore = ids.filter((id) => !(id in tracked));
  let scores: Record<string, number> = {};
  if (toScore.length) {
    try {
      scores = await cachedBatchScores(term, store, country, ids, Object.keys(tracked));
    } catch {
      return NextResponse.json({ error: "Couldn't score relevancy right now." }, { status: 502 });
    }
  }

  if (!(await isImpersonating())) {
    after(() => trackServerEvent(user.id, "Inspector Relevancy Loaded", { store, country, apps: Object.keys(scores).length + Object.keys(tracked).length }));
  }

  return NextResponse.json({ scores: { ...scores, ...tracked } } satisfies InspectorRelevancy);
}
