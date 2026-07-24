import { createClient } from "@/libs/supabase/server";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { generateText, embedText, embedTexts } from "@/libs/gemini";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type IntentTheme = { id: string; label: string };

export type AppMeta = {
  description: string;
  category: string;
  embedding: number[] | null;
};

export type RelevancyResult = { score: number; intentThemeId: string | null };

export type RawIosApp = { trackId: number; trackName: string; userRatingCount: number; artworkUrl: string };

// ── Embedding (Gemini) ────────────────────────────────────────────────────────

// Process-level caches.
const embeddingCache = new Map<string, number[]>();
const llmScoreCache  = new Map<string, DescScoreResult>(); // key: descScoreCacheKey(...)
const appMetaCache   = new Map<string, { meta: AppMeta; ts: number }>();
const APP_META_TTL   = 5 * 60 * 1000;

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (embeddingCache.has(text)) return embeddingCache.get(text)!;
  const embedding = await embedText(text);
  if (embedding) embeddingCache.set(text, embedding);
  return embedding;
}

// Same cache as getEmbedding, but fetches every not-yet-cached text in one
// batchEmbedContents call instead of one embedContent call each.
export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
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

export async function getDescRelevanceScore(keyword: string, description: string, themes: IntentTheme[]): Promise<DescScoreResult> {
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

export function cosineSimilarity(a: number[], b: number[]): number {
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

export function wordTokens(str: string): string[] {
  // \W is ASCII-only, so it treats every CJK/non-Latin character as a
  // separator — a pure-Japanese keyword would otherwise tokenize to nothing
  // and get force-scored as irrelevant. Split on non-letter/number instead.
  return str.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
}

// Returns true when the keyword is a brand/name term for this app.
// Covers: exact match, brand token match
function getBrandTokens(appName: string): string[] {
  const separators = /[:\-–—|]/;
  const segments = appName.split(separators).map((segment) => segment.trim()).filter(Boolean);
  const brandPart = segments[0] ?? appName;
  return wordTokens(brandPart);
}

export function isBrandKeyword(keyword: string, appName: string): boolean {
  const kwWords  = wordTokens(keyword);
  const appWords = wordTokens(appName);
  if (!kwWords.length || !appWords.length) return false;

  const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedAppName = appName.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Both strip to "" for any non-Latin (e.g. Japanese-titled) app/keyword —
  // guard so two unrelated CJK strings can't vacuously "match" as empty.
  if (normalizedKeyword && normalizedKeyword === normalizedAppName) return true;

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

export async function computeRelevancy(
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

// `withEmbedding=false` skips the Gemini embedding call for callers (e.g. the
// keyword simulator) that will compute their own embedding from hypothetical
// text instead. Cache WRITES are skipped in that case so a no-embedding
// result can never poison the shared 5-min cache for a later withEmbedding=true
// caller — cache READS still happen normally either way.
export async function fetchIosAppMeta(appName: string, country: string, withEmbedding: boolean = true): Promise<AppMeta> {
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
    const embedding = withEmbedding && embText ? await getEmbedding(embText) : null;
    console.log(`[appMeta iOS] "${appName}" → found=${!!match} descLen=${description.length} category="${category}"`);
    const meta = { description, category, embedding };
    if (withEmbedding) appMetaCache.set(cacheKey, { meta, ts: Date.now() });
    return meta;
  } catch {
    return { description: "", category: "", embedding: null };
  }
}

export async function fetchAndroidAppMeta(appName: string, country: string, withEmbedding: boolean = true): Promise<AppMeta> {
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
    const embedding = withEmbedding && embText ? await getEmbedding(embText) : null;
    console.log(`[appMeta Android] "${appName}" → found=${!!match} descLen=${description.length} category="${category}"`);
    const meta = { description, category, embedding };
    if (withEmbedding) appMetaCache.set(cacheKey, { meta, ts: Date.now() });
    return meta;
  } catch {
    return { description: "", category: "", embedding: null };
  }
}

// ── Live iTunes search ────────────────────────────────────────────────────────

// Raw iTunes search results for a term/country/day are identical no matter
// which app is asking — volume/diff/rank are all derived from the same
// result set. Checking this shared cache before hitting iTunes means only
// the FIRST app to add a given keyword on a given day pays for the call;
// every other app/workspace reuses it, cutting total request volume against
// Apple's per-IP rate limit.
export async function getCachedIosSearch(
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

// Live iTunes search, no persistence — callers that need to write results
// into keyword_volume_history/keyword_rankings_history do so themselves
// (see persistIosSearch in app/api/keywords/metrics/route.ts).
export async function searchIosLive(term: string, country: string): Promise<RawIosApp[] | "rate_limited" | null> {
  const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchRes = await enqueueAppleRequest(() => fetch(searchUrl, { cache: "no-store" } as any));
  if (!searchRes.ok) return searchRes.status === 403 ? "rate_limited" : null;
  const searchData = await searchRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((searchData.results ?? []) as any[]).map((a) => ({
    trackId: a.trackId ?? 0,
    trackName: a.trackName ?? "",
    userRatingCount: a.userRatingCount ?? 0,
    artworkUrl: a.artworkUrl512 ?? a.artworkUrl100 ?? "",
  }));
}
