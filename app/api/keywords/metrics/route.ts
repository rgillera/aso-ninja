import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isGeminiReachable } from "@/libs/gemini";
import { findRankIdx, computeChance } from "@/libs/keyword-rank-match";
import { fetchIosCoreMetrics, fetchAndroidCoreMetrics } from "@/libs/keyword-core-metrics";
import {
  type IntentTheme,
  type AppMeta,
  isBrandKeyword,
  computeRelevancy,
  fetchIosAppMeta,
  fetchAndroidAppMeta,
  searchIosLive,
} from "@/libs/keyword-relevancy";
import { resolveIpadOnly, persistIpadRank } from "@/libs/store/ipad-only";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type Metrics = {
  volume: number;
  diff: number;
  chance: number;
  opportunity: number | null;
  results: number | null;
  relevancy: number | null;
  rank: number | null;
  intentThemeId: string | null;
};

// ── Metric fetchers ───────────────────────────────────────────────────────────

// Everything iOS needs before relevancy scoring: the search itself must stay
// serial (Apple's per-IP rate limit, via enqueueAppleRequest), but nothing
// past this point does — see the route handler below, which runs this in a
// loop and then scores all the results concurrently afterward.
type IosBase = {
  volume: number; diff: number; chance: number; results: number;
  rank: number | null; topTitles: string[];
};

// Search, volume, difficulty and today's persisted snapshot all come from
// fetchIosCoreMetrics (shared with Keyword Inspector) — this only adds the
// app-specific rank/chance on top. An iPad-only app (ipadIcon !== undefined)
// never shows up in that iPhone search, so its rank comes from a second,
// iPad search instead; a failed iPad search leaves rank null.
async function fetchIosMetricsBase(term: string, country: string, appName: string, storeId: string, supabase: SupabaseClient, ipadIcon?: string | null): Promise<IosBase | null | "rate_limited"> {
  const core = await fetchIosCoreMetrics(supabase, term, country);
  if (core === null || core === "rate_limited") return core;
  const { volume, diff, results, apps } = core;

  let rank: number | null;
  if (ipadIcon !== undefined) {
    const ipadApps = await searchIosLive(term, country, "ipad");
    if (ipadApps === "rate_limited") return ipadApps;
    rank = ipadApps ? await persistIpadRank(supabase, { term, country, storeId, appName, appIcon: ipadIcon }, ipadApps) : null;
  } else {
    const rankIdx = findRankIdx(apps.map((r) => r.trackName), appName, apps.map((r) => r.trackId), storeId);
    rank = rankIdx >= 0 ? rankIdx + 1 : null;
  }
  const chance  = computeChance(diff, rank);
  const topTitles = apps.slice(0, 10).map((r) => r.trackName);

  return { volume, diff, chance, results, rank, topTitles };
}

// AI provider down → leave both null rather than guessing. A null relevancy is
// what already signals "needs (re)computing" everywhere downstream (DB cache
// eligibility, mount-time backfill), so this keyword is retried — and
// re-flagged via _aiDown — on the very next fetch instead of getting stuck
// behind a fake persisted score.
async function scoreMetrics(term: string, appName: string, base: IosBase, appMeta: AppMeta, withRelevancy: boolean, aiReachable: boolean, themes: IntentTheme[]): Promise<Metrics> {
  let relevancy: number | null = null;
  let opportunity: number | null = null;
  let intentThemeId: string | null = null;
  if (withRelevancy && aiReachable) {
    const result = await computeRelevancy(term, appName, appMeta.subtitle, base.topTitles, appMeta.embedding, appMeta.description, themes, appMeta.developer);
    relevancy = result.score;
    intentThemeId = result.intentThemeId;
    opportunity = Math.round(Math.sqrt(base.volume * base.chance) * Math.pow(relevancy / 100, 2));
  }
  return { volume: base.volume, diff: base.diff, chance: base.chance, opportunity, results: base.results, relevancy, rank: base.rank, intentThemeId };
}

async function fetchAndroidMetrics(term: string, country: string, appName: string, storeId: string, appMeta: AppMeta, withRelevancy: boolean, aiReachable: boolean, supabase: SupabaseClient, themes: IntentTheme[]): Promise<Metrics | null> {
  // Search, volume, difficulty and today's persisted snapshot (popularity +
  // rankings history) — shared with Keyword Inspector.
  const core = await fetchAndroidCoreMetrics(supabase, term, country);
  if (!core) return null;
  const { volume, diff, results: count, apps } = core;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rankIdx = findRankIdx(apps.map((r: any) => r.title ?? ""), appName, apps.map((r: any) => r.appId), storeId);
  const rank    = rankIdx >= 0 ? rankIdx + 1 : null;
  const chance  = computeChance(diff, rank);

  let relevancy: number | null = null;
  let opportunity: number | null = null;
  let intentThemeId: string | null = null;
  // AI provider down → leave both null (see comment in scoreMetrics).
  if (withRelevancy && aiReachable) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = apps.slice(0, 10).map((r: any) => r.title ?? "");
    const result = await computeRelevancy(term, appName, appMeta.subtitle, topTitles, appMeta.embedding, appMeta.description, themes, appMeta.developer);
    relevancy = result.score;
    intentThemeId = result.intentThemeId;
    const base = Math.sqrt(volume * chance);
    opportunity = Math.round(base * Math.pow(relevancy / 100, 2));
  }

  return { volume, diff, chance, opportunity, results: count, relevancy, rank, intentThemeId };
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
  // The store's own id for this app (apps.store_id — Apple's trackId, or the
  // Play package name) — matched against search results by id, not name, so
  // a store listing rename doesn't desync rank from the real search results.
  // See libs/keyword-rank-match.ts.
  const storeId    = searchParams.get("storeId") ?? "";
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

  // Each term arrives percent-encoded (see newKeywords.map(encodeURIComponent)
  // on the client) so a literal comma inside a keyword — e.g. "10,000
  // airports" — survives as %2C instead of being mistaken for the
  // between-terms delimiter and splitting the keyword in two.
  const terms = termsParam.split(",").map((t) => decodeURIComponent(t.trim())).filter(Boolean);
  if (!terms.length) return NextResponse.json({});

  const supabase = await createClient();

  // Resolved even when every term is a cache hit, so apps.ipad_only gets set
  // for the refresh cron and the Performance tab's live rank checks too.
  // Defined (the app's icon, for its rank rows) only for an iPad-only app.
  const { data: appRow } = store === "ios" && appId
    ? await supabase.from("apps").select("id, store, store_id, country, icon_url, ipad_only").eq("id", appId).maybeSingle()
    : { data: null };
  const ipadIcon = appRow && await resolveIpadOnly(appRow) ? (appRow.icon_url ?? null) : undefined;

  // Every plan (Free included) gets a relevancy/opportunity pool now, so
  // access is purely a function of that pool rather than a tier check —
  // Free/Basic/Pro/Pro+ each have a lifetime relevancy pool (relevancy_limit)
  // instead of being unlimited; once a workspace's pooled
  // relevancy_scored_count reaches it, no further keywords get scored
  // (already-scored ones keep showing). Only Enterprise has
  // relevancy_limit = null (unlimited). A missing/errored plan state (no
  // workspace yet) has no pool to draw from, so it stays locked out.
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const relevancyLimit = planState && !("error" in planState) ? planState.usage.relevancy_limit : 0;
  const relevancyScoredCount = planState && !("error" in planState) ? planState.usage.relevancy_scored_count : 0;
  const hasRelevancyAccess = !!planState && !("error" in planState) && (relevancyLimit === null || relevancyLimit > 0);
  const relevancyPoolExhausted = hasRelevancyAccess && relevancyLimit !== null && relevancyScoredCount >= relevancyLimit;
  const canUseRelevancy = hasRelevancyAccess && !relevancyPoolExhausted;

  // DB cache hit — avoids LLM for keywords computed in the last 7 days
  const dbCache: Record<string, Metrics> = {};
  if (appId && !forceIntent) {
    const { data: rows } = await supabase
      .from("keyword_metrics")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("volume, diff, chance, opportunity, relevancy, relevancy_scored, rank, intent_theme_id, results, updated_at, keywords(term)" as any)
      .eq("app_id", appId);

    for (const row of (rows ?? []) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const term = row.keywords?.term as string | undefined;
      if (!term || !terms.includes(term)) continue;
      if (Date.now() - new Date(row.updated_at as string).getTime() > CACHE_TTL_MS) continue;
      const isBrand  = appName ? isBrandKeyword(term, appName) : false;
      // A row saved before this workspace had any relevancy pool at all (or
      // from a fast-mode add) never actually got scored — `relevancy_scored` is the
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
        opportunity, results: row.results ?? null,
        relevancy, rank: row.rank ?? null,
        intentThemeId: row.intent_theme_id ?? null,
      };
    }
  }

  const uncached = terms.filter((t) => !dbCache[t]);

  let freshMetrics: Record<string, Metrics> = {};
  let rateLimited = false;
  let aiReachable = true;
  // canUseRelevancy above only says the pool had *some* room left when this
  // request started, not how many of *these* uncached terms fit in it — a
  // single request (e.g. onboarding backfilling a dozen keywords in one
  // shot) can easily carry more uncached terms than the remaining budget.
  // Scoring all of them anyway would just have enforce_relevancy_limit()
  // silently claw the excess back to unscored on save, leaving the client
  // showing more scored keywords than the plan's pool actually allows until
  // the next reload. relevancyBudgetExceeded flags that case so the response
  // below reports it the same way an already-exhausted pool does.
  let relevancyBudgetExceeded = false;
  if (uncached.length) {
    const withRelevancy = !fast && canUseRelevancy;
    const relevancyBudget = relevancyLimit === null ? Infinity : Math.max(0, relevancyLimit - relevancyScoredCount);
    if (withRelevancy && uncached.length > relevancyBudget) relevancyBudgetExceeded = true;

    // Gemini down → skip the LLM/embedding pass entirely and leave
    // relevancy/opportunity null instead of silently falling back to guessed
    // scores (see scoreMetrics/fetchAndroidMetrics).
    aiReachable = withRelevancy && relevancyBudget > 0 ? await isGeminiReachable() : true;

    // Fetch app description + embed it once; shared across all keyword lookups.
    // Skipped entirely when relevancy won't be computed (fast mode, the
    // workspace has no pool budget left, or Gemini is unreachable) since it's
    // only ever used for that pass.
    const appMeta: AppMeta = withRelevancy && relevancyBudget > 0 && aiReachable && appName
      ? await (store === "android"
          ? fetchAndroidAppMeta(appName, country)
          : fetchIosAppMeta(appName, country))
      : { description: "", subtitle: "", category: "", developer: "", embedding: null };

    // This app's intent theme list — classification piggybacks on the same
    // LLM call as relevancy, so an app with no themes generated yet just
    // gets intentThemeId: null back (see getDescRelevanceScore).
    const themes: IntentTheme[] = withRelevancy && relevancyBudget > 0 && aiReachable && appId
      ? ((await supabase
          .from("app_intent_themes")
          .select("id, label")
          .eq("app_id", appId)
          .order("sort_order", { ascending: true })).data ?? []) as IntentTheme[]
      : [];

    // iOS: the search itself stays sequential to stay under Apple's per-IP
    // rate limit, but relevancy scoring (Gemini) doesn't share that
    // constraint — it runs as its own concurrent phase once every term's
    // search has resolved, bounded by the Gemini pool in libs/gemini.ts
    // rather than by this loop.
    // Android: parallel is fine end-to-end (google-play-scraper has no such
    // restriction).
    let entries: (readonly [string, Metrics | null])[];
    if (store === "ios") {
      const baseEntries: [string, IosBase][] = [];
      for (const term of uncached) {
        const result = await fetchIosMetricsBase(term, country, appName, storeId, supabase, ipadIcon);
        if (result === "rate_limited") { rateLimited = true; continue; }
        if (result === null) continue;
        baseEntries.push([term, result]);
      }
      // Budget is spent in order, so a batch that only partly fits still
      // scores as many of its terms as the pool has room for.
      entries = await Promise.all(
        baseEntries.map(async ([term, base], idx) => {
          const scoreThisTerm = withRelevancy && idx < relevancyBudget;
          const metrics = await scoreMetrics(term, appName, base, appMeta, scoreThisTerm, aiReachable, themes);
          return [term, metrics] as const;
        })
      );
    } else {
      entries = await Promise.all(
        uncached.map(async (term, idx) => {
          const scoreThisTerm = withRelevancy && idx < relevancyBudget;
          const metrics = await fetchAndroidMetrics(term, country, appName, storeId, appMeta, scoreThisTerm, aiReachable, supabase, themes);
          return [term, metrics] as const;
        })
      );
    }

    freshMetrics = Object.fromEntries(entries.filter((e): e is [string, Metrics] => e[1] !== null));

    // Both stores already wrote their popularity snapshot (and rankings
    // history) inside fetchIosCoreMetrics / fetchAndroidCoreMetrics, scoped
    // to genuine fresh successes only — doing it again here unconditionally
    // is what used to let a degraded 403 fallback poison the shared cache for
    // every other app/workspace querying this term today.
  }

  const merged = { ...dbCache, ...freshMetrics };
  // Strip relevancy/opportunity for a workspace with no pool at all —
  // including values read back from the 7-day DB cache, in case the plan
  // state couldn't be resolved. A workspace that has simply exhausted its
  // relevancy pool still gets to see keywords it already paid to have
  // scored; the pool only blocks scoring *new* ones (see `withRelevancy`
  // above).
  if (!hasRelevancyAccess) {
    for (const m of Object.values(merged)) { m.relevancy = null; m.opportunity = null; }
  }

  return NextResponse.json({
    ...merged,
    ...(rateLimited ? { _rateLimited: true } : {}),
    ...(!aiReachable ? { _aiDown: true } : {}),
    ...(relevancyPoolExhausted || relevancyBudgetExceeded ? { _relevancyLimitReached: true } : {}),
  });
}
