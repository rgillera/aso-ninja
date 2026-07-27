import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { isGeminiReachable, embedText } from "@/libs/gemini";
import {
  type IntentTheme,
  computeRelevancy,
  fetchIosAppMeta,
  fetchAndroidAppMeta,
  getCachedIosSearch,
  searchIosLive,
} from "@/libs/keyword-relevancy";

// Simulate runs never touch keyword_metrics/keyword_volume_history/
// keyword_rankings_history — purely ephemeral, matching the cron's
// "relevancy is only ever computed on the real add path" precedent.
const MAX_TERMS = 50;

type SimulateResult = { relevancy: number; opportunity: number | null; intentThemeId: string | null };

// POST /api/keywords/simulate
// Body: { appId, workspaceId, appName, store, country, hypotheticalTitle, hypotheticalSubtitle, terms }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const {
    appId, workspaceId, appName, store, country,
    hypotheticalTitle, hypotheticalSubtitle, terms,
  } = body as {
    appId?: string; workspaceId?: string; appName?: string;
    store?: "ios" | "android"; country?: string;
    hypotheticalTitle?: string; hypotheticalSubtitle?: string;
    terms?: string[];
  };

  if (!appId || !workspaceId || !appName || !hypotheticalTitle?.trim() || !Array.isArray(terms) || !terms.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (terms.length > MAX_TERMS) {
    return NextResponse.json({ error: `Simulate is limited to ${MAX_TERMS} keywords at a time` }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Keyword Simulator itself is a Pro+-and-up feature (distinct from the
  // relevancy pool check below, which is Pro-and-up) — checked first so a
  // Pro (not Pro+) workspace gets a clear "needs Pro+" message instead of
  // silently falling through to the relevancy-pool response shape.
  const planState = await getWorkspacePlanState(workspaceId);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  if (!isPlanAtLeast(planSlug, "pro_plus")) {
    return NextResponse.json({ error: "Keyword Simulator requires the Pro+ plan or above." }, { status: 403 });
  }

  // Same gating as the real add flow (app/api/keywords/metrics/route.ts) —
  // relevancy_scored_count is a live COUNT of already-scored keyword_metrics
  // rows, not a spendable balance, so there's nothing to "charge" a re-run
  // against. Blocking simulate once the pool is already exhausted is the
  // correct read of "count against the same pool" without inventing new
  // schema or risking a permanent double-spend on already-scored keywords.
  const hasRelevancyAccess = isPlanAtLeast(planSlug, "pro");
  const relevancyLimit = planState && !("error" in planState) ? planState.usage.relevancy_limit : null;
  const relevancyScoredCount = planState && !("error" in planState) ? planState.usage.relevancy_scored_count : 0;
  const relevancyPoolExhausted = hasRelevancyAccess && relevancyLimit !== null && relevancyScoredCount >= relevancyLimit;

  if (!hasRelevancyAccess || relevancyPoolExhausted) {
    return NextResponse.json({ results: {}, _relevancyLimitReached: true });
  }

  const aiReachable = await isGeminiReachable();
  if (!aiReachable) {
    return NextResponse.json({ results: {}, _aiDown: true });
  }

  // Validate the requested terms are genuinely tracked by this app, and pull
  // their real (already-scored) volume/chance to compute a simulated
  // opportunity alongside the simulated relevancy — never trust client input
  // for these.
  const [{ data: akRows }, { data: metricRows }] = await Promise.all([
    supabase
      .from("app_keywords")
      .select("keyword_id, keywords!inner(id, term)")
      .eq("app_id", appId),
    supabase
      .from("keyword_metrics")
      .select("keyword_id, volume, chance")
      .eq("app_id", appId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const termById = new Map<string, string>((akRows ?? []).map((r: any) => [r.keyword_id, r.keywords?.term as string]));
  const metricsByKeywordId = new Map<string, { volume: number; chance: number }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (metricRows ?? []).map((r: any) => [r.keyword_id, { volume: r.volume ?? 0, chance: r.chance ?? 0 }])
  );

  const requestedTerms = new Set(terms.map((t) => t.toLowerCase().trim()));
  const validated: { term: string; volume: number; chance: number }[] = [];
  for (const [keywordId, term] of termById) {
    if (!term || !requestedTerms.has(term.toLowerCase().trim())) continue;
    const m = metricsByKeywordId.get(keywordId);
    validated.push({ term, volume: m?.volume ?? 0, chance: m?.chance ?? 0 });
  }

  if (!validated.length) return NextResponse.json({ results: {} });

  const normalizedCountry = (country ?? "us").toLowerCase();
  const resolvedStore = store === "android" ? "android" : "ios";

  // Real current description — this is what today's persisted relevancy was
  // computed from, so comparing against it (not a differently-sourced
  // description) keeps the delta caused purely by the title/subtitle edit.
  // Title and subtitle are passed to computeRelevancy as their own fields
  // below (not folded into this description string) so Current and Simulated
  // stay computed the exact same way — only the hypothetical title/subtitle
  // values differ between the two calls.
  // withEmbedding=false: skip the store-description embedding, since the
  // simulation needs an embedding of the HYPOTHETICAL text instead.
  const { description, developer } = resolvedStore === "android"
    ? await fetchAndroidAppMeta(appName, normalizedCountry, false)
    : await fetchIosAppMeta(appName, normalizedCountry, false);

  const embeddingText = [hypotheticalTitle, hypotheticalSubtitle, description].filter(Boolean).join(". ");
  const appEmbedding = embeddingText ? await embedText(embeddingText) : null;

  const themes: IntentTheme[] = appId
    ? ((await supabase
        .from("app_intent_themes")
        .select("id, label")
        .eq("app_id", appId)
        .order("sort_order", { ascending: true })).data ?? []) as IntentTheme[]
    : [];

  // Per-term work (store search + LLM/embedding scoring) runs concurrently
  // rather than one term at a time — each term's computeRelevancy call stays
  // fully independent (same prompt as scoring a single keyword), so scores
  // stay comparable with Current Relevancy (computed the same way on the real
  // add path). Only wall-clock time changes: actual Gemini/Apple concurrency
  // is bounded by the shared queues in libs/gemini.ts and
  // libs/apple-rate-limiter.ts, not by this route.
  const encoder = new TextEncoder();
  const total = validated.length;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const results: Record<string, SimulateResult> = {};
      let done = 0;

      await Promise.all(validated.map(async ({ term, volume, chance }) => {
        let topTitles: string[] = [];
        if (resolvedStore === "ios") {
          let apps = await getCachedIosSearch(supabase, term, normalizedCountry);
          if (!apps) {
            const live = await searchIosLive(term, normalizedCountry);
            apps = live === "rate_limited" || live === null ? null : live;
          }
          topTitles = (apps ?? []).slice(0, 10).map((a) => a.trackName);
        } else {
          try {
            const gplay = await import("google-play-scraper");
            const api = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const apps: any[] = await api.search({ term, country: normalizedCountry, num: 10 });
            topTitles = apps.map((a) => a.title ?? "");
          } catch {
            topTitles = [];
          }
        }

        const { score: relevancy, intentThemeId } = await computeRelevancy(
          term, hypotheticalTitle, hypotheticalSubtitle, topTitles, appEmbedding, description, themes, developer
        );
        const opportunity = Math.round(Math.sqrt(volume * chance) * Math.pow(relevancy / 100, 2));
        results[term] = { relevancy, opportunity, intentThemeId };

        done++;
        send({ type: "progress", done, total });
      }));

      send({ type: "done", results });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
