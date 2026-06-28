import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { CATEGORY_GROUPS } from "./category-groups";

type Metrics = {
  volume: number;
  diff: number;
  chance: number;
  opportunity: number;
  results: number;
  relevancy: number;
  rank: number | null;
};

function detectCategories(appName: string): Set<string> {
  const text = appName.toLowerCase();
  const detected = new Set<string>();
  for (const [cat, terms] of Object.entries(CATEGORY_GROUPS)) {
    if (terms.some((t) => text.includes(t))) detected.add(cat);
  }
  return detected;
}

function wordTokens(str: string): string[] {
  return str.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
}

function storeCategoryToGroups(storeCategory: string): Set<string> {
  const detected = new Set<string>();
  const c = storeCategory.toLowerCase();
  if (c.includes("health") || c.includes("fitness") || c.includes("sport")) detected.add("fitness");
  if (c.includes("food") || c.includes("drink") || c.includes("nutrition")) detected.add("nutrition");
  if (c.includes("finance") || c.includes("business") || c.includes("money")) detected.add("finance");
  if (c.includes("productivity") || c.includes("utilities")) detected.add("productivity");
  if (c.includes("travel") || c.includes("navigation")) detected.add("travel");
  if (c.includes("education") || c.includes("reference")) detected.add("education");
  if (c.includes("lifestyle") || c.includes("medical") || c.includes("wellness")) detected.add("meditation");
  if (c.includes("photo") || c.includes("video") || c.includes("camera")) detected.add("photo");
  return detected;
}

function computeRelevancy(
  keyword: string,
  appName: string,
  topTitles: string[],
  appDescription?: string,
  appCategory?: string,
): number {
  const kwWords  = wordTokens(keyword);
  const appWords = wordTokens(appName);
  if (!kwWords.length || !appWords.length) return 0;

  const appSet = new Set(appWords);

  // Prefer store-provided category over heuristic name detection
  const appCategories = appCategory && appCategory.length > 0
    ? storeCategoryToGroups(appCategory)
    : detectCategories(appName);

  // 1. Direct word overlap between keyword and app name (30%)
  const directMatches = kwWords.filter((w) => appWords.some((aw) => aw.includes(w) || w.includes(aw))).length;
  const directScore   = Math.round((directMatches / kwWords.length) * 100);

  // 2. Description overlap — keyword words that appear in what the app actually does (40%)
  let descScore = 0;
  if (appDescription && appDescription.length > 0) {
    const descWords = new Set(wordTokens(appDescription));
    const descMatches = kwWords.filter((w) =>
      descWords.has(w) || [...descWords].some((dw) => dw.includes(w) || w.includes(dw))
    ).length;
    descScore = Math.round((descMatches / kwWords.length) * 100);
  }

  // 3. Category semantic match — keyword belongs to the same domain as the app
  const semanticMatches = kwWords.filter((w) => {
    for (const [cat, terms] of Object.entries(CATEGORY_GROUPS)) {
      if (appCategories.has(cat) && terms.some((t) => w.includes(t) || t.includes(w))) return true;
    }
    return false;
  }).length;
  const semanticScore = Math.round((semanticMatches / kwWords.length) * 100);

  // 4. Context — top search results that share words with the app name (20%)
  const similar      = topTitles.filter((t) => wordTokens(t).some((w) => appSet.has(w))).length;
  const contextScore = Math.min(Math.round((similar / Math.max(topTitles.length, 1)) * 100), 100);

  if (appDescription && appDescription.length > 0) {
    // With description: name(30%) + description(40%) + semantic(10%) + context(20%)
    return Math.min(Math.round(
      directScore * 0.3 + descScore * 0.4 + semanticScore * 0.1 + contextScore * 0.2
    ), 100);
  }
  // Without description: name(40%) + semantic(40%) + context(20%)
  return Math.min(Math.round(directScore * 0.4 + semanticScore * 0.4 + contextScore * 0.2), 100);
}

// Android only: converts Play Store suggest position to a popularity score.
// Position 0 (top suggestion) = 100. Not in suggestions: falls back to
// result count proxy scaled by 0.7.
function hintsScore(idx: number, total: number, resultCountScore: number): number {
  if (idx === -1) return Math.round(resultCountScore * 0.7);
  return Math.max(Math.round(((total - idx) / total) * 100), 5);
}

async function fetchIosMetrics(term: string, country: string, appName: string): Promise<Metrics | null> {
  try {
    // Apple's autocomplete hints API returns 404 for server-side requests —
    // it only works in a browser/device context. Volume is estimated from
    // search result signals instead.
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes = await fetch(searchUrl, { cache: "no-store" } as any);
    const searchData = searchRes.ok ? await searchRes.json() : {};

    const apps: any[]    = searchData.results ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const count: number  = searchData.resultCount ?? apps.length;

    const top5 = apps.slice(0, 5);

    // Volume: average userRatingCount of apps whose title contains all keyword
    // words, on a log₁₀ scale against 10M. Popular keywords → their dedicated
    // apps have high avg ratings (many users found them via search). Brand
    // keywords → the one matching app has few ratings → score stays at 5.
    // Using avg (not count) avoids penalising multi-word keywords that have
    // fewer title matches than single-word ones like "workout".
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

    // Difficulty: log scale so mid-range competition (10k–100k ratings) is
    // meaningfully differentiated, not compressed near 0 by a linear 500k cap.
    // log10 scale: 1k ratings ≈ 50, 100k ≈ 83, 1M ≈ 100.
    const avgRatings =
      top5.length > 0
        ? top5.reduce((s: number, r: any) => s + (r.userRatingCount ?? 0), 0) / top5.length // eslint-disable-line @typescript-eslint/no-explicit-any
        : 0;
    const diff = avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(1_000_000)) * 100), 100);

    const name    = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = name ? apps.findIndex((r: any) => (r.trackName ?? "").toLowerCase().trim() === name) : -1;
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedApp   = rankIdx >= 0 ? apps[rankIdx] : null;
    const appDesc      = (matchedApp?.description ?? "") as string;
    const appCategory  = (matchedApp?.primaryGenreName ?? "") as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = apps.slice(0, 10).map((r: any) => r.trackName ?? "");
    const relevancy = computeRelevancy(term, appName, topTitles, appDesc, appCategory);

    const chance      = Math.min(Math.max(100 - diff, 5), 95);
    const base        = Math.sqrt(volume * chance);
    const opportunity = Math.round(base * (0.3 + 0.7 * relevancy / 100));

    return { volume, diff, chance, opportunity, results: count, relevancy, rank };
  } catch {
    return null;
  }
}

async function fetchAndroidMetrics(term: string, country: string, appName: string): Promise<Metrics | null> {
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

    const top5  = apps.slice(0, 5);

    const avgScore =
      top5.length > 0
        ? top5.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / top5.length // eslint-disable-line @typescript-eslint/no-explicit-any
        : 0;
    // Log scale: 4.5★ avg = ~100, 3★ avg = ~58, 1★ avg = ~0
    const diff = avgScore < 0.1 ? 0 : Math.min(Math.round((Math.log10(avgScore * 10) / Math.log10(50)) * 100), 100);

    const name    = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = name ? apps.findIndex((r: any) => (r.title ?? "").toLowerCase().trim() === name) : -1;
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedApp  = rankIdx >= 0 ? apps[rankIdx] : null;
    // summary is the short description available in Play Store search results
    const appDesc     = (matchedApp?.summary ?? matchedApp?.description ?? "") as string;
    const appCategory = (matchedApp?.genre ?? "") as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = apps.slice(0, 10).map((r: any) => r.title ?? "");
    const relevancy = computeRelevancy(term, appName, topTitles, appDesc, appCategory);

    const chance      = Math.min(Math.max(100 - diff, 5), 95);
    const base        = Math.sqrt(volume * chance);
    const opportunity = Math.round(base * (0.3 + 0.7 * relevancy / 100));

    return { volume, diff, chance, opportunity, results: count, relevancy, rank };
  } catch {
    return null;
  }
}

// GET /api/keywords/metrics?terms=kw1,kw2&country=us&store=ios&appName=MyApp
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const termsParam = searchParams.get("terms") ?? "";
  const country    = (searchParams.get("country") ?? "us").toLowerCase();
  const store      = searchParams.get("store") ?? "ios";
  const appName    = searchParams.get("appName") ?? "";

  const terms = termsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!terms.length) return NextResponse.json({});

  const entries = await Promise.all(
    terms.map(async (term) => {
      const metrics =
        store === "android"
          ? await fetchAndroidMetrics(term, country, appName)
          : await fetchIosMetrics(term, country, appName);
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
