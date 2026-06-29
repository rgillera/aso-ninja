import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

type Metrics = {
  volume: number;
  diff: number;
  chance: number;
  opportunity: number;
  results: number;
  relevancy: number;
  rank: number | null;
};

type AppMeta = {
  description: string;
  category: string;
  embedding: number[] | null;
};

// ── Embedding (Ollama + BGE-M3) ───────────────────────────────────────────────

const OLLAMA_HOST        = process.env.OLLAMA_HOST        ?? "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "bge-m3";
const OLLAMA_LLM_MODEL   = process.env.OLLAMA_LLM_MODEL   ?? "llama3.2";

// Process-level cache: avoids re-embedding the same app on every keyword request.
const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string): Promise<number[] | null> {
  if (embeddingCache.has(text)) return embeddingCache.get(text)!;
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (!res.ok) return null;
    const data = await res.json();
    const embedding = (data.embedding as number[]) ?? (data.embeddings?.[0] as number[]) ?? null;
    if (embedding) embeddingCache.set(text, embedding);
    return embedding;
  } catch {
    return null;
  }
}

async function embeddingDescScore(keyword: string, description: string): Promise<number> {
  const [kwEmbed, descEmbed] = await Promise.all([
    getEmbedding(keyword),
    getEmbedding(description),
  ]);
  if (!kwEmbed || !descEmbed) return 50;
  const sim = cosineSimilarity(kwEmbed, descEmbed);
  return Math.max(0, Math.min(100, Math.round((sim - 0.3) / 0.5 * 100)));
}

async function getDescRelevanceScore(keyword: string, description: string): Promise<number> {
  try {
    const prompt = `You are an ASO (App Store Optimization) expert. A user types a keyword into the App Store search bar. Rate whether they would be looking for this specific app.

App description: "${description}"
Keyword: "${keyword}"

Scoring guide (pick one range):
0-15  = Completely different category (e.g. "baby tracker" for a calorie counting app)
16-40 = Different primary use, loosely related
41-60 = Somewhat relevant secondary use case
61-80 = Relevant, user would likely consider this app
81-100 = Perfect match, exactly what they are searching for

Reply with ONLY a single integer. No words, no punctuation, just the number.`;
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_LLM_MODEL, prompt, stream: false, options: { temperature: 0 } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (!res.ok) return embeddingDescScore(keyword, description);
    const data = await res.json();
    const num = parseInt(((data.response ?? "") as string).trim().match(/\d+/)?.[0] ?? "", 10);
    if (isNaN(num)) return embeddingDescScore(keyword, description);
    const score = Math.max(0, Math.min(100, num));
    console.log(`[llm-desc] "${keyword}" → raw="${(data.response as string).trim()}" score=${score}`);
    return score;
  } catch {
    return embeddingDescScore(keyword, description);
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

async function computeRelevancy(
  keyword: string,
  appName: string,
  topTitles: string[],
  appEmbedding: number[] | null,
  appDescription?: string,
): Promise<number> {
  const kwWords  = wordTokens(keyword);
  const appWords = wordTokens(appName);
  if (!kwWords.length || !appWords.length) return 0;

  const hasDesc = !!appDescription && appDescription.length > 10;

  // 1. Description relevance (70%) — LLM or embedding keyword-vs-description.
  //    Most reliable signal: directly asks "is this keyword relevant to this app?"
  const descScore = hasDesc
    ? await getDescRelevanceScore(keyword, appDescription!)
    : 0;

  // 2. Semantic embedding (30%) — keyword vs app embedding + market context.
  //    Secondary signal. Direct/context scores are dropped because generic words
  //    like "tracker" in app names cause false matches (e.g. baby tracker apps
  //    sharing "tracker" with NutriSnap inflates both direct and context scores).
  let semanticScore = 0;
  if (appEmbedding) {
    const kwEmbedding = await getEmbedding(keyword);
    let kwScore = 0;
    if (kwEmbedding) {
      const sim = cosineSimilarity(appEmbedding, kwEmbedding);
      kwScore = Math.max(0, Math.min(100, Math.round((sim - 0.3) / 0.5 * 100)));
    }

    let marketScore = 0;
    if (topTitles.length > 0) {
      const topText = `${keyword}: ${topTitles.slice(0, 5).join(". ")}`;
      const topEmbedding = await getEmbedding(topText);
      if (topEmbedding) {
        const sim = cosineSimilarity(appEmbedding, topEmbedding);
        marketScore = Math.max(0, Math.min(100, Math.round((sim - 0.3) / 0.5 * 100)));
      }
    }

    semanticScore = Math.round(kwScore * 0.6 + marketScore * 0.4);
  } else if (!hasDesc) {
    semanticScore = 50;
  }

  const final = hasDesc
    ? Math.min(Math.round(descScore * 0.7 + semanticScore * 0.3), 100)
    : Math.min(Math.round(semanticScore), 100);
  console.log(`[relevancy] "${keyword}" → desc=${descScore} semantic=${semanticScore} hasDesc=${hasDesc} → ${final}`);
  return final;
}

// ── App metadata ──────────────────────────────────────────────────────────────

function hintsScore(idx: number, total: number, resultCountScore: number): number {
  if (idx === -1) return Math.round(resultCountScore * 0.7);
  return Math.max(Math.round(((total - idx) / total) * 100), 5);
}

async function fetchIosAppMeta(appName: string, country: string): Promise<AppMeta> {
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
    return { description, category, embedding };
  } catch {
    return { description: "", category: "", embedding: null };
  }
}

async function fetchAndroidAppMeta(appName: string, country: string): Promise<AppMeta> {
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
    return { description, category, embedding };
  } catch {
    return { description: "", category: "", embedding: null };
  }
}

// ── Metric fetchers ───────────────────────────────────────────────────────────

async function fetchIosMetrics(term: string, country: string, appName: string, appMeta: AppMeta): Promise<Metrics | null> {
  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes  = await fetch(searchUrl, { cache: "no-store" } as any);
    const searchData = searchRes.ok ? await searchRes.json() : {};

    const apps: any[]   = searchData.results ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const count: number = searchData.resultCount ?? apps.length;
    const top5 = apps.slice(0, 5);

    const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleApps = apps.filter((a: any) => kwTokens.every((w) => (a.trackName ?? "").toLowerCase().includes(w)));
    const avgTitleRatings = titleApps.length === 0
      ? 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : titleApps.reduce((s: number, a: any) => s + (a.userRatingCount ?? 0), 0) / titleApps.length;
    const volume = avgTitleRatings < 1_000
      ? 5
      : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

    const avgRatings = top5.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? top5.reduce((s: number, r: any) => s + (r.userRatingCount ?? 0), 0) / top5.length
      : 0;
    const diff = avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(1_000_000)) * 100), 100);

    const name    = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = name ? apps.findIndex((r: any) => (r.trackName ?? "").toLowerCase().trim() === name) : -1;
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = apps.slice(0, 10).map((r: any) => r.trackName ?? "");
    const relevancy = await computeRelevancy(term, appName, topTitles, appMeta.embedding, appMeta.description);

    const chance      = Math.min(Math.max(100 - diff, 5), 95);
    const base        = Math.sqrt(volume * chance);
    const opportunity = Math.round(base * (relevancy / 100));

    return { volume, diff, chance, opportunity, results: count, relevancy, rank };
  } catch {
    return null;
  }
}

async function fetchAndroidMetrics(term: string, country: string, appName: string, appMeta: AppMeta): Promise<Metrics | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api   = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const [apps, suggestions]: [any[], string[]] = await Promise.all([ // eslint-disable-line @typescript-eslint/no-explicit-any
      api.search({ term, country: country.toLowerCase(), num: 100 }),
      api.suggest({ term, lang: "en", country: country.toLowerCase() }).catch(() => [] as string[]),
    ]);

    const count = apps.length;
    const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleMatches = apps.filter((a: any) => kwTokens.every((w) => (a.title ?? "").toLowerCase().includes(w))).length;
    const resultCountScore = Math.min(Math.round((count / 100) * 100), 100);
    const titleMatchScore  = Math.min(Math.round((titleMatches / 30) * 100), 100);
    const fallbackScore    = Math.round(resultCountScore * 0.3 + titleMatchScore * 0.7);

    const suggestIdx = (suggestions as string[]).findIndex(
      (s) => s.toLowerCase() === term.toLowerCase()
    );
    const volume = hintsScore(suggestIdx, suggestions.length || 5, fallbackScore);

    const top5 = apps.slice(0, 5);
    const avgScore = top5.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? top5.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / top5.length
      : 0;
    const diff = avgScore < 0.1 ? 0 : Math.min(Math.round((Math.log10(avgScore * 10) / Math.log10(50)) * 100), 100);

    const name    = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = name ? apps.findIndex((r: any) => (r.title ?? "").toLowerCase().trim() === name) : -1;
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = apps.slice(0, 10).map((r: any) => r.title ?? "");
    const relevancy = await computeRelevancy(term, appName, topTitles, appMeta.embedding, appMeta.description);

    const chance      = Math.min(Math.max(100 - diff, 5), 95);
    const base        = Math.sqrt(volume * chance);
    const opportunity = Math.round(base * (relevancy / 100));

    return { volume, diff, chance, opportunity, results: count, relevancy, rank };
  } catch {
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

// GET /api/keywords/metrics?terms=kw1,kw2&country=us&store=ios&appName=MyApp
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam = searchParams.get("terms") ?? "";
  const country    = (searchParams.get("country") ?? "us").toLowerCase();
  const store      = searchParams.get("store") ?? "ios";
  const appName    = searchParams.get("appName") ?? "";

  const terms = termsParam.split(",").map((t) => t.trim()).filter(Boolean);
  if (!terms.length) return NextResponse.json({});

  // Fetch app description + embed it once; shared across all keyword lookups
  const appMeta: AppMeta = appName
    ? await (store === "android"
        ? fetchAndroidAppMeta(appName, country)
        : fetchIosAppMeta(appName, country))
    : { description: "", category: "", embedding: null };

  const entries = await Promise.all(
    terms.map(async (term) => {
      const metrics = store === "android"
        ? await fetchAndroidMetrics(term, country, appName, appMeta)
        : await fetchIosMetrics(term, country, appName, appMeta);
      return [term, metrics] as const;
    })
  );

  const result = Object.fromEntries(entries.filter(([, m]) => m !== null));

  // Record today's popularity snapshot for each term (builds the history chart)
  const today = new Date().toISOString().split("T")[0];
  const supabase = await createClient();
  await Promise.all(
    entries
      .filter(([, m]) => m !== null)
      .map(([term, m]) =>
        supabase.from("keyword_popularity_snapshots").upsert(
          { term: (term as string).toLowerCase(), store, country, score: m!.volume, recorded_on: today },
          { onConflict: "term,store,country,recorded_on" }
        )
      )
  );

  return NextResponse.json(result);
}
