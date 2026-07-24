import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { isGeminiReachable } from "@/libs/gemini";
import { findRankIdx, computeChance } from "@/libs/keyword-rank-match";
import {
  type IntentTheme,
  type AppMeta,
  type RawIosApp,
  isBrandKeyword,
  computeRelevancy,
  fetchIosAppMeta,
  fetchAndroidAppMeta,
  getCachedIosSearch,
  searchIosLive,
} from "@/libs/keyword-relevancy";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type Metrics = {
  volume: number;
  diff: number;
  chance: number;
  opportunity: number | null;
  results: number;
  relevancy: number | null;
  rank: number | null;
  intentThemeId: string | null;
};

// ── Metric fetchers ───────────────────────────────────────────────────────────

async function persistIosSearch(
  supabase: SupabaseClient, term: string, country: string,
  apps: RawIosApp[], volume: number, diff: number
) {
  const today = new Date().toISOString().split("T")[0];
  const normTerm = term.toLowerCase().trim();
  await supabase.from("keyword_volume_history").upsert(
    { term: normTerm, store: "ios", country, score: volume, diff, raw_apps: apps, recorded_on: today },
    { onConflict: "term,store,country,recorded_on" }
  );
  if (apps.length) {
    // Same write the manual/automatic client-side live search performs —
    // doing it here too means a successful metrics fetch already covers
    // today's rank history for every app in the results, not just this one.
    await supabase.from("keyword_rankings_history").upsert(
      apps.map((a, i) => ({
        keyword: normTerm, store: "ios", country, recorded_on: today,
        position: i + 1, app_id: String(a.trackId || a.trackName),
        app_name: a.trackName, app_icon: a.artworkUrl,
      })),
      { onConflict: "keyword,store,country,recorded_on,app_id" }
    );
  }
}

async function fetchIosMetrics(term: string, country: string, appName: string, appMeta: AppMeta, withRelevancy: boolean, aiReachable: boolean, supabase: SupabaseClient, themes: IntentTheme[]): Promise<Metrics | null | "rate_limited"> {
  try {
    let apps: RawIosApp[] | null = await getCachedIosSearch(supabase, term, country);

    if (!apps) {
      const result = await searchIosLive(term, country);
      if (result === "rate_limited") return "rate_limited";
      if (result === null) return null;
      apps = result;
    }

    const count = apps.length;
    const top5 = apps.slice(0, 5);

    const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    const titleApps = apps.filter((a) => kwTokens.every((w) => a.trackName.toLowerCase().includes(w)));
    const avgTitleRatings = titleApps.length === 0
      ? 0
      : titleApps.reduce((s, a) => s + a.userRatingCount, 0) / titleApps.length;
    const volume = avgTitleRatings < 1_000
      ? 5
      : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

    const avgRatings = top5.length > 0
      ? top5.reduce((s, r) => s + r.userRatingCount, 0) / top5.length
      : 0;
    const diff = avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(1_000_000)) * 100), 100);

    // Persist on every check, not just a fresh iTunes call — a cache hit still
    // has a full apps[] result set to record into keyword_rankings_history, and
    // the upsert is keyed on (term/keyword,store,country,recorded_on[,app_id]),
    // so re-writing the same day's data here is a no-op, not a duplicate.
    await persistIosSearch(supabase, term, country, apps, volume, diff);

    const rankIdx = findRankIdx(apps.map((r) => r.trackName), appName);
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;
    const chance  = computeChance(diff, rank);

    let relevancy: number | null = null;
    let opportunity: number | null = null;
    let intentThemeId: string | null = null;
    // AI provider down → leave both null rather than guessing. A null relevancy is
    // what already signals "needs (re)computing" everywhere downstream (DB
    // cache eligibility, mount-time backfill), so this keyword is retried —
    // and re-flagged via _aiDown — on the very next fetch instead of
    // getting stuck behind a fake persisted score.
    if (withRelevancy && aiReachable) {
      const topTitles = apps.slice(0, 10).map((r) => r.trackName);
      const result = await computeRelevancy(term, appName, topTitles, appMeta.embedding, appMeta.description, themes);
      relevancy = result.score;
      intentThemeId = result.intentThemeId;
      const base = Math.sqrt(volume * chance);
      opportunity = Math.round(base * Math.pow(relevancy / 100, 2));
    }

    return { volume, diff, chance, opportunity, results: count, relevancy, rank, intentThemeId };
  } catch {
    return null;
  }
}

// Same write persistIosSearch performs for iOS — apps[] here already has
// appId/title/icon for every result, so there's no reason Android's
// keyword_rankings_history should depend on a separate manual live search.
async function persistAndroidSearch(
  supabase: SupabaseClient, term: string, country: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apps: any[]
) {
  if (!apps.length) return;
  const today = new Date().toISOString().split("T")[0];
  const normTerm = term.toLowerCase().trim();
  await supabase.from("keyword_rankings_history").upsert(
    apps.map((a, i) => ({
      keyword: normTerm, store: "android", country, recorded_on: today,
      position: i + 1, app_id: a.appId ?? a.title, app_name: a.title, app_icon: a.icon,
    })),
    { onConflict: "keyword,store,country,recorded_on,app_id" }
  );
}

async function fetchAndroidMetrics(term: string, country: string, appName: string, appMeta: AppMeta, withRelevancy: boolean, aiReachable: boolean, supabase: SupabaseClient, themes: IntentTheme[]): Promise<Metrics | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api   = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = await api.search({ term, country: country.toLowerCase(), num: 250 });

    // Mirrors persistIosSearch's placement in fetchIosMetrics — re-writing the
    // same day's data is a no-op via the upsert's onConflict key, not a duplicate.
    await persistAndroidSearch(supabase, term, country, apps);

    const count = apps.length;
    const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleMatches = apps.filter((a: any) => kwTokens.every((w) => (a.title ?? "").toLowerCase().includes(w))).length;
    const resultCountScore = Math.min(Math.round((count / 100) * 100), 100);
    const titleMatchScore  = Math.min(Math.round((titleMatches / 30) * 100), 100);
    // Play's "suggest" autocomplete used to feed this (does the exact term
    // appear in autosuggest?), but it almost always echoes back any
    // well-formed multi-word phrase as its own top suggestion — that made
    // volume saturate near 100 for precisely the specific, long-tail phrases
    // ASO research cares about most, while only discriminating on single
    // generic words. Title-match/result-count is a weaker but honest signal.
    const volume = Math.round(resultCountScore * 0.3 + titleMatchScore * 0.7);

    const top5 = apps.slice(0, 5);
    // Use rating *count* (install signal), not star rating — same approach as iOS.
    // Star ratings cluster at 4.0–4.5 for virtually all apps, giving every keyword
    // a diff of 87–97 regardless of actual competition.
    const avgRatings = top5.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? top5.reduce((s: number, r: any) => s + (r.ratings ?? r.reviews ?? 0), 0) / top5.length
      : 0;
    const diff = avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(1_000_000)) * 100), 100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = findRankIdx(apps.map((r: any) => r.title ?? ""), appName);
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;
    const chance  = computeChance(diff, rank);

    let relevancy: number | null = null;
    let opportunity: number | null = null;
    let intentThemeId: string | null = null;
    // AI provider down → leave both null (see comment in fetchIosMetrics).
    if (withRelevancy && aiReachable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topTitles = apps.slice(0, 10).map((r: any) => r.title ?? "");
      const result = await computeRelevancy(term, appName, topTitles, appMeta.embedding, appMeta.description, themes);
      relevancy = result.score;
      intentThemeId = result.intentThemeId;
      const base = Math.sqrt(volume * chance);
      opportunity = Math.round(base * Math.pow(relevancy / 100, 2));
    }

    return { volume, diff, chance, opportunity, results: count, relevancy, rank, intentThemeId };
  } catch {
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// GET /api/keywords/metrics?terms=kw1,kw2&country=us&store=ios&appName=MyApp&appId=<uuid>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam = searchParams.get("terms") ?? "";
  const country    = (searchParams.get("country") ?? "us").toLowerCase();
  const store      = searchParams.get("store") ?? "ios";
  const appName    = searchParams.get("appName") ?? "";
  const appId      = searchParams.get("appId") ?? "";
  const workspaceId = searchParams.get("workspaceId") ?? "";
  // fast=1 skips the LLM/embedding relevancy pass (the slow part of adding a
  // keyword) — relevancy/opportunity come back null and get back-filled by a
  // follow-up non-fast request.
  const fast       = searchParams.get("fast") === "1";
  // forceIntent=1 bypasses the 7-day DB cache even for terms that already
  // have a fresh relevancy score, so a newly (re)generated intent theme list
  // gets applied to already-tracked keywords instead of waiting up to 7 days
  // for their cache to expire naturally.
  const forceIntent = searchParams.get("forceIntent") === "1";

  const terms = termsParam.split(",").map((t) => t.trim()).filter(Boolean);
  if (!terms.length) return NextResponse.json({});

  const supabase = await createClient();

  // Relevancy/opportunity are Pro-and-up features — anything below that plan
  // never triggers the Gemini embedding/LLM pass, and never sees a value even
  // if one was cached from before a downgrade. Pro and Pro+ both have a
  // lifetime relevancy pool (relevancy_limit) instead of being unlimited —
  // once a workspace's pooled relevancy_scored_count reaches it, no further
  // keywords get scored (already-scored ones keep showing). Only Enterprise
  // has relevancy_limit = null (unlimited).
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const hasRelevancyAccess = isPlanAtLeast(planSlug, "pro");
  const relevancyLimit = planState && !("error" in planState) ? planState.usage.relevancy_limit : null;
  const relevancyScoredCount = planState && !("error" in planState) ? planState.usage.relevancy_scored_count : 0;
  const relevancyPoolExhausted = hasRelevancyAccess && relevancyLimit !== null && relevancyScoredCount >= relevancyLimit;
  const canUseRelevancy = hasRelevancyAccess && !relevancyPoolExhausted;

  // DB cache hit — avoids LLM for keywords computed in the last 7 days
  const dbCache: Record<string, Metrics> = {};
  if (appId && !forceIntent) {
    const { data: rows } = await supabase
      .from("keyword_metrics")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("volume, diff, chance, opportunity, relevancy, relevancy_scored, rank, intent_theme_id, updated_at, keywords(term)" as any)
      .eq("app_id", appId);

    for (const row of (rows ?? []) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const term = row.keywords?.term as string | undefined;
      if (!term || !terms.includes(term)) continue;
      if (Date.now() - new Date(row.updated_at as string).getTime() > CACHE_TTL_MS) continue;
      const isBrand  = appName ? isBrandKeyword(term, appName) : false;
      // A row saved while the workspace was below Pro (or from a fast-mode
      // add) never actually got scored — `relevancy_scored` is the
      // authoritative marker for that (the `relevancy` column itself can't
      // be trusted: it's `not null default 0`, so a never-scored row is
      // indistinguishable from a genuine 0 score). If this workspace has
      // relevancy access at all, don't trust this cache row for this term —
      // let it fall through to `uncached` below, where the pool-budget check
      // decides whether it actually gets (re)scored right now.
      if (!fast && hasRelevancyAccess && !row.relevancy_scored && !isBrand) continue;
      const relevancy = isBrand ? 100 : (row.relevancy ?? null);
      const rawBase   = Math.sqrt((row.volume ?? 0) * (row.chance ?? 0));
      const opportunity = isBrand ? Math.round(rawBase) : row.opportunity;
      dbCache[term] = {
        volume: row.volume, diff: row.diff, chance: row.chance,
        opportunity, results: 0,
        relevancy, rank: row.rank ?? null,
        intentThemeId: row.intent_theme_id ?? null,
      };
    }
  }

  const uncached = terms.filter((t) => !dbCache[t]);

  let freshMetrics: Record<string, Metrics> = {};
  let rateLimited = false;
  let aiReachable = true;
  if (uncached.length) {
    const withRelevancy = !fast && canUseRelevancy;
    // Gemini down → skip the LLM/embedding pass entirely and leave
    // relevancy/opportunity null instead of silently falling back to guessed
    // scores (see fetchIosMetrics/fetchAndroidMetrics).
    aiReachable = withRelevancy ? await isGeminiReachable() : true;

    // Fetch app description + embed it once; shared across all keyword lookups.
    // Skipped entirely when relevancy won't be computed (fast mode, the
    // workspace isn't Pro, or Gemini is unreachable) since it's only ever
    // used for that pass.
    const appMeta: AppMeta = withRelevancy && aiReachable && appName
      ? await (store === "android"
          ? fetchAndroidAppMeta(appName, country)
          : fetchIosAppMeta(appName, country))
      : { description: "", category: "", embedding: null };

    // This app's intent theme list — classification piggybacks on the same
    // LLM call as relevancy, so an app with no themes generated yet just
    // gets intentThemeId: null back (see getDescRelevanceScore).
    const themes: IntentTheme[] = withRelevancy && aiReachable && appId
      ? ((await supabase
          .from("app_intent_themes")
          .select("id, label")
          .eq("app_id", appId)
          .order("sort_order", { ascending: true })).data ?? []) as IntentTheme[]
      : [];

    // iOS: sequential to stay under Apple's per-IP rate limit.
    // Android: parallel is fine (google-play-scraper has no such restriction).
    let entries: (readonly [string, Metrics | null])[];
    if (store === "ios") {
      entries = [];
      for (const term of uncached) {
        const result = await fetchIosMetrics(term, country, appName, appMeta, withRelevancy, aiReachable, supabase, themes);
        if (result === "rate_limited") { rateLimited = true; entries.push([term, null] as const); }
        else entries.push([term, result] as const);
      }
    } else {
      entries = await Promise.all(
        uncached.map(async (term) => {
          const metrics = await fetchAndroidMetrics(term, country, appName, appMeta, withRelevancy, aiReachable, supabase, themes);
          return [term, metrics] as const;
        })
      );
    }

    freshMetrics = Object.fromEntries(entries.filter((e): e is [string, Metrics] => e[1] !== null));

    // iOS already wrote its popularity snapshot (and rankings history) inside
    // fetchIosMetrics, scoped to genuine fresh successes only — doing it again
    // here unconditionally is what used to let a degraded 403 fallback poison
    // the shared cache for every other app/workspace querying this term today.
    if (store === "android") {
      const today = new Date().toISOString().split("T")[0];
      await Promise.all(
        entries
          .filter(([, m]) => m !== null)
          .map(([term, m]) =>
            supabase.from("keyword_volume_history").upsert(
              { term: (term as string).toLowerCase(), store, country, score: m!.volume, recorded_on: today },
              { onConflict: "term,store,country,recorded_on" }
            )
          )
      );
    }
  }

  const merged = { ...dbCache, ...freshMetrics };
  // Strip relevancy/opportunity for anything below Pro — including values
  // read back from the 7-day DB cache, in case the workspace downgraded since
  // they were computed. This is a tier check only — a Pro/Pro+ workspace that
  // has simply exhausted its relevancy pool still gets to see keywords it
  // already paid to have scored; the pool only blocks scoring *new* ones
  // (see `withRelevancy` above).
  if (!hasRelevancyAccess) {
    for (const m of Object.values(merged)) { m.relevancy = null; m.opportunity = null; }
  }

  return NextResponse.json({
    ...merged,
    ...(rateLimited ? { _rateLimited: true } : {}),
    ...(!aiReachable ? { _aiDown: true } : {}),
    ...(relevancyPoolExhausted ? { _relevancyLimitReached: true } : {}),
  });
}
