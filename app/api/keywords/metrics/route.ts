import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { isGeminiReachable, generateText, embedText, embedTexts } from "@/libs/gemini";
import { findRankIdx, computeChance } from "@/libs/keyword-rank-match";

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

type IntentTheme = { id: string; label: string };

type AppMeta = {
  description: string;
  category: string;
  embedding: number[] | null;
};

// ── Embedding (Gemini) ────────────────────────────────────────────────────────

// Process-level caches.
const embeddingCache = new Map<string, number[]>();
const llmScoreCache  = new Map<string, DescScoreResult>(); // key: descScoreCacheKey(...)
const appMetaCache   = new Map<string, { meta: AppMeta; ts: number }>();
const APP_META_TTL   = 5 * 60 * 1000;

async function getEmbedding(text: string): Promise<number[] | null> {
  if (embeddingCache.has(text)) return embeddingCache.get(text)!;
  const embedding = await embedText(text);
  if (embedding) embeddingCache.set(text, embedding);
  return embedding;
}

// Same cache as getEmbedding, but fetches every not-yet-cached text in one
// batchEmbedContents call instead of one embedContent call each.
async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const missingIdx: number[] = [];
  const missingTexts: string[] = [];

  texts.forEach((text, i) => {
    const cached = embeddingCache.get(text);
    if (cached) results[i] = cached;
    else { missingIdx.push(i); missingTexts.push(text); }
  });

  if (missingTexts.length) {
    const fetched = await embedTexts(missingTexts);
    fetched.forEach((embedding, j) => {
      if (embedding) embeddingCache.set(missingTexts[j], embedding);
      results[missingIdx[j]] = embedding;
    });
  }

  return results;
}

async function embeddingDescScore(keyword: string, description: string): Promise<number> {
  const [kwEmbed, descEmbed] = await getEmbeddings([keyword, description]);
  if (!kwEmbed || !descEmbed) return 50;
  const sim = cosineSimilarity(kwEmbed, descEmbed);
  return Math.max(0, Math.min(100, Math.round((sim - 0.3) / 0.5 * 100)));
}

type DescScoreResult = { score: number; intentThemeId: string | null };

// Cache key includes the theme label set so a mid-flight regeneration of the
// app's intent themes doesn't serve a stale classification from before it.
function descScoreCacheKey(keyword: string, description: string, themes: IntentTheme[]): string {
  return `${keyword}|||${description}|||${themes.map((t) => t.label).join(",")}`;
}

async function getDescRelevanceScore(keyword: string, description: string, themes: IntentTheme[]): Promise<DescScoreResult> {
  const cacheKey = descScoreCacheKey(keyword, description, themes);
  if (llmScoreCache.has(cacheKey)) return llmScoreCache.get(cacheKey)!;
  try {
    const intentSection = themes.length
      ? `\n\nAlso classify the keyword's search intent against this app's theme list: ${JSON.stringify(themes.map((t) => t.label))}. Pick the single best-matching theme label verbatim, or reply "Other" if none reasonably fits.

Reply with exactly two lines:
Line 1: the integer score.
Line 2: the matching theme label (verbatim from the list) or "Other".`
      : `\n\nReply with ONLY a single integer. No explanation, no punctuation, just the number.`;

    const prompt = `You are an ASO expert scoring keyword intent. A user typed this keyword in the App Store search bar. Score the probability (0-100) that they are specifically looking for THIS app.

App description: "${description}"
Keyword: "${keyword}"

Rules — apply in order, stop at first match:
1. If the keyword is another app's brand name or company name → score 0-10. The user wants that specific product, not this one.
2. If the keyword describes a completely unrelated category (e.g. "baby tracker", "pet care", "ride sharing" for a nutrition app) → score 0-15.
3. If the keyword is loosely related but this app is unlikely to satisfy the search intent → score 16-40.
4. If the keyword is a secondary use case this app genuinely supports → score 41-60.
5. If the keyword directly describes a core feature of this app → score 61-80.
6. If the keyword is exactly what this app is built for → score 81-100.

Critical: score USER INTENT, not category overlap. Two apps in the same category can still have very different intents (e.g. "myfitnesspal" typed by someone who wants MyFitnessPal specifically = score 5 for any other app).${intentSection}`;
    const raw = await generateText(prompt, 0);
    if (!raw) return { score: await embeddingDescScore(keyword, description), intentThemeId: null };
    const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const num = parseInt(lines[0]?.match(/\d+/)?.[0] ?? "", 10);
    if (isNaN(num)) return { score: await embeddingDescScore(keyword, description), intentThemeId: null };
    const score = Math.max(0, Math.min(100, num));

    let intentThemeId: string | null = null;
    if (themes.length && lines[1]) {
      const label = lines[1].replace(/^["'-]+|["'-]+$/g, "").trim().toLowerCase();
      const matched = themes.find((t) => t.label.toLowerCase() === label);
      intentThemeId = matched?.id ?? null;
    }

    console.log(`[llm-desc] "${keyword}" → raw="${raw.trim()}" score=${score} intent=${intentThemeId ?? "none"}`);
    const result: DescScoreResult = { score, intentThemeId };
    llmScoreCache.set(cacheKey, result);
    return result;
  } catch {
    return { score: await embeddingDescScore(keyword, description), intentThemeId: null };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ── Relevancy ─────────────────────────────────────────────────────────────────


function wordTokens(str: string): string[] {
  return str.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
}

// Returns true when the keyword is a brand/name term for this app.
// Covers: exact match, brand token match
function getBrandTokens(appName: string): string[] {
  const separators = /[:\-–—|]/;
  const segments = appName.split(separators).map((segment) => segment.trim()).filter(Boolean);
  const brandPart = segments[0] ?? appName;
  return wordTokens(brandPart);
}

function isBrandKeyword(keyword: string, appName: string): boolean {
  const kwWords  = wordTokens(keyword);
  const appWords = wordTokens(appName);
  if (!kwWords.length || !appWords.length) return false;

  const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedAppName = appName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalizedKeyword === normalizedAppName) return true;

  const appWordSet = new Set(appWords);
  const brandTokens = getBrandTokens(appName);
  const brandTokenSet = new Set(brandTokens);

  // Keyword includes the brand portion and otherwise only contains terms from the app name.
  if (brandTokens.length > 0) {
    const hasBrandToken = kwWords.some((w) => brandTokenSet.has(w));
    if (hasBrandToken && kwWords.every((w) => appWordSet.has(w) || brandTokenSet.has(w))) return true;

    const kwCompact = normalizedKeyword;
    const appCompact = appWords.join("");
    const brandCompact = brandTokens.join("");
    if (brandCompact && kwCompact.length >= 4 && kwCompact.includes(brandCompact) && appCompact.includes(kwCompact)) return true;
  }

  return false;
}


type RelevancyResult = { score: number; intentThemeId: string | null };

async function computeRelevancy(
  keyword: string,
  appName: string,
  topTitles: string[],
  appEmbedding: number[] | null,
  appDescription: string | undefined,
  themes: IntentTheme[],
): Promise<RelevancyResult> {
  const appWords = wordTokens(appName);
  if (!wordTokens(keyword).length || !appWords.length) return { score: 0, intentThemeId: null };

  // Brand keywords aren't classified against the app's feature-intent themes
  // — there's no meaningful match, so they surface in the "Other" bucket.
  if (isBrandKeyword(keyword, appName)) return { score: 100, intentThemeId: null };

  const hasDesc = !!appDescription && appDescription.length > 10;

  // 1. Description relevance (70%) — LLM or embedding keyword-vs-description.
  //    Most reliable signal: directly asks "is this keyword relevant to this app?"
  //    Intent theme classification piggybacks on this same LLM call.
  let descScore = 0;
  let intentThemeId: string | null = null;
  if (hasDesc) {
    const result = await getDescRelevanceScore(keyword, appDescription!, themes);
    descScore = result.score;
    intentThemeId = result.intentThemeId;
  }

  // 2. Semantic embedding (30%) — keyword vs app embedding + market context.
  //    Secondary signal. Direct/context scores are dropped because generic words
  //    like "tracker" in app names cause false matches (e.g. baby tracker apps
  //    sharing "tracker" with NutriSnap inflates both direct and context scores).
  let semanticScore = 0;
  if (appEmbedding) {
    const topText = topTitles.length > 0 ? `${keyword}: ${topTitles.slice(0, 5).join(". ")}` : null;
    const texts = topText ? [keyword, topText] : [keyword];
    const [kwEmbedding, topEmbedding] = await getEmbeddings(texts);

    let kwScore = 0;
    if (kwEmbedding) {
      const sim = cosineSimilarity(appEmbedding, kwEmbedding);
      kwScore = Math.max(0, Math.min(100, Math.round((sim - 0.3) / 0.5 * 100)));
    }

    let marketScore = 0;
    if (topEmbedding) {
      const sim = cosineSimilarity(appEmbedding, topEmbedding);
      marketScore = Math.max(0, Math.min(100, Math.round((sim - 0.3) / 0.5 * 100)));
    }

    semanticScore = Math.round(kwScore * 0.6 + marketScore * 0.4);
  } else if (!hasDesc) {
    semanticScore = 50;
  }

  const base = hasDesc
    ? Math.round(descScore * 0.7 + semanticScore * 0.3)
    : Math.round(semanticScore);
  console.log(`[relevancy] "${keyword}" → desc=${descScore} semantic=${semanticScore} hasDesc=${hasDesc} → ${base}`);
  return { score: base, intentThemeId };
}

// ── App metadata ──────────────────────────────────────────────────────────────

async function fetchIosAppMeta(appName: string, country: string): Promise<AppMeta> {
  const cacheKey = `ios:${appName.toLowerCase()}:${country}`;
  const cached = appMetaCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < APP_META_TTL) return cached.meta;
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(appName)}&entity=software&limit=5&country=${country}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res  = await fetch(url, { cache: "no-store" } as any);
    const data = res.ok ? await res.json() : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = data.results ?? [];
    const name  = appName.toLowerCase().trim();
    // Exact → starts-with → contains: catches "NutriSnap: Calorie Counter" for query "nutrisnap"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = apps.find((a: any) => (a.trackName ?? "").toLowerCase().trim() === name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?? apps.find((a: any) => (a.trackName ?? "").toLowerCase().trim().startsWith(name))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?? apps.find((a: any) => (a.trackName ?? "").toLowerCase().includes(name));
    const description = ((match?.description ?? "") as string).slice(0, 500);
    const category    = (match?.primaryGenreName ?? "") as string;
    const embText  = [appName, description].filter(Boolean).join(". ");
    const embedding = embText ? await getEmbedding(embText) : null;
    console.log(`[appMeta iOS] "${appName}" → found=${!!match} descLen=${description.length} category="${category}"`);
    const meta = { description, category, embedding };
    appMetaCache.set(cacheKey, { meta, ts: Date.now() });
    return meta;
  } catch {
    return { description: "", category: "", embedding: null };
  }
}

async function fetchAndroidAppMeta(appName: string, country: string): Promise<AppMeta> {
  const cacheKey = `android:${appName.toLowerCase()}:${country}`;
  const cached = appMetaCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < APP_META_TTL) return cached.meta;
  try {
    const gplay = await import("google-play-scraper");
    const api   = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = await api.search({ term: appName, country: country.toLowerCase(), num: 5 });
    const name  = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = apps.find((a: any) => (a.title ?? "").toLowerCase().trim() === name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?? apps.find((a: any) => (a.title ?? "").toLowerCase().trim().startsWith(name))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?? apps.find((a: any) => (a.title ?? "").toLowerCase().includes(name));
    const description = ((match?.summary ?? match?.description ?? "") as string).slice(0, 500);
    const category    = (match?.genre ?? "") as string;
    const embText  = [appName, description].filter(Boolean).join(". ");
    const embedding = embText ? await getEmbedding(embText) : null;
    console.log(`[appMeta Android] "${appName}" → found=${!!match} descLen=${description.length} category="${category}"`);
    const meta = { description, category, embedding };
    appMetaCache.set(cacheKey, { meta, ts: Date.now() });
    return meta;
  } catch {
    return { description: "", category: "", embedding: null };
  }
}

// ── Metric fetchers ───────────────────────────────────────────────────────────

type RawIosApp = { trackId: number; trackName: string; userRatingCount: number; artworkUrl: string };

// Raw iTunes search results for a term/country/day are identical no matter
// which app is asking — volume/diff/rank are all derived from the same
// result set. Checking this shared cache before hitting iTunes means only
// the FIRST app to add a given keyword on a given day pays for the call;
// every other app/workspace reuses it, cutting total request volume against
// Apple's per-IP rate limit.
async function getCachedIosSearch(
  supabase: SupabaseClient, term: string, country: string
): Promise<RawIosApp[] | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("keyword_volume_history")
    .select("raw_apps")
    .eq("term", term.toLowerCase().trim())
    .eq("store", "ios")
    .eq("country", country)
    .eq("recorded_on", today)
    .not("raw_apps", "is", null)
    .maybeSingle();
  return (data?.raw_apps as RawIosApp[] | null) ?? null;
}

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
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchRes = await enqueueAppleRequest(() => fetch(searchUrl, { cache: "no-store" } as any));
      if (!searchRes.ok) return searchRes.status === 403 ? "rate_limited" : null;
      const searchData = await searchRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apps = ((searchData.results ?? []) as any[]).map((a) => ({
        trackId: a.trackId ?? 0,
        trackName: a.trackName ?? "",
        userRatingCount: a.userRatingCount ?? 0,
        artworkUrl: a.artworkUrl512 ?? a.artworkUrl100 ?? "",
      }));
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
  // if one was cached from before a downgrade. Pro and Enterprise both have
  // relevancy_limit = null (unlimited) — only the plan tier gates access.
  const planState = workspaceId ? await getWorkspacePlanState(workspaceId) : null;
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const canUseRelevancy = isPlanAtLeast(planSlug, "pro");

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
      // indistinguishable from a genuine 0 score). If this request can now
      // compute a real score, don't trust this cache row for this term — let
      // it fall through to `uncached` below instead of staying stuck
      // unscored forever.
      if (!fast && canUseRelevancy && !row.relevancy_scored && !isBrand) continue;
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
  // they were computed.
  if (!canUseRelevancy) {
    for (const m of Object.values(merged)) { m.relevancy = null; m.opportunity = null; }
  }

  return NextResponse.json({
    ...merged,
    ...(rateLimited ? { _rateLimited: true } : {}),
    ...(!aiReachable ? { _aiDown: true } : {}),
  });
}
