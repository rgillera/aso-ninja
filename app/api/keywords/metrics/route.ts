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

const STOP_WORDS = new Set([
  "app", "the", "a", "an", "and", "or", "for", "of", "to", "in",
  "with", "my", "pro", "free", "lite", "hd", "plus", "ai",
]);

function words(str: string): string[] {
  return str.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function computeRelevancy(keyword: string, appName: string, topTitles: string[]): number {
  const kwWords  = words(keyword);
  const appWords = words(appName);
  if (!kwWords.length || !appWords.length) return 0;

  const appSet = new Set(appWords);

  // Keyword ↔ app-name word overlap (0–100)
  const directMatches = kwWords.filter((w) => appWords.some((aw) => aw.includes(w) || w.includes(aw))).length;
  const directScore   = Math.round((directMatches / kwWords.length) * 100);

  // Category signal: top results that share words with the app name
  const similar     = topTitles.filter((t) => words(t).some((w) => appSet.has(w))).length;
  const contextScore = Math.min(Math.round((similar / Math.max(topTitles.length, 1)) * 100), 100);

  return Math.min(Math.round(directScore * 0.6 + contextScore * 0.4), 100);
}

// Converts autocomplete hint position to a 0–100 popularity score.
// Position 0 (top suggestion) = 100, last position = lowest score.
// Not in suggestions at all = falls back to resultCountScore (capped at 35).
function hintsScore(idx: number, total: number, resultCountScore: number): number {
  if (idx === -1) return Math.min(resultCountScore, 35);
  return Math.max(Math.round(((total - idx) / total) * 100), 5);
}

async function fetchIosMetrics(term: string, country: string, appName: string): Promise<Metrics | null> {
  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
    const hintsUrl  = `https://search.itunes.apple.com/WebObjects/MZSearchHints.wo/wa/hints?media=software&term=${encodeURIComponent(term)}&limit=25&lang=en-US&country=${country}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [searchRes, hintsRes] = await Promise.all([
      fetch(searchUrl, { next: { revalidate: 86400 } } as any),
      fetch(hintsUrl,  { next: { revalidate: 3600  } } as any),
    ]);

    const [searchData, hintsData] = await Promise.all([
      searchRes.ok ? searchRes.json() : Promise.resolve({}),
      hintsRes.ok  ? hintsRes.json()  : Promise.resolve({}),
    ]);

    const apps: any[]  = searchData.results ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const count: number = searchData.resultCount ?? apps.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hints: { term: string }[] = hintsData.hints ?? [];
    const hintIdx = hints.findIndex((h) => h.term.toLowerCase() === term.toLowerCase());

    // Volume = today's popularity via autocomplete position
    const resultCountScore = Math.min(Math.round((count / 200) * 100), 100);
    const volume = hintsScore(hintIdx, hints.length || 25, resultCountScore);

    const top10 = apps.slice(0, 10);
    const top5  = apps.slice(0, 5);

    const avgRatings =
      top5.length > 0
        ? top5.reduce((s: number, r: any) => s + (r.userRatingCount ?? 0), 0) / top5.length // eslint-disable-line @typescript-eslint/no-explicit-any
        : 0;
    const diff = Math.min(Math.round((avgRatings / 500_000) * 100), 100);

    const name    = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = name ? apps.findIndex((r: any) => (r.trackName ?? "").toLowerCase().trim() === name) : -1;
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = top10.map((r: any) => r.trackName ?? "");
    const relevancy = computeRelevancy(term, appName, topTitles);

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
    const resultCountScore = Math.min(Math.round((count / 100) * 100), 100);

    const suggestIdx = (suggestions as string[]).findIndex(
      (s) => s.toLowerCase() === term.toLowerCase()
    );

    const volume = hintsScore(suggestIdx, suggestions.length || 5, resultCountScore);

    const top10 = apps.slice(0, 10);
    const top5  = apps.slice(0, 5);

    const avgScore =
      top5.length > 0
        ? top5.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / top5.length // eslint-disable-line @typescript-eslint/no-explicit-any
        : 0;
    const diff = Math.min(Math.round((avgScore / 5) * 100), 100);

    const name    = appName.toLowerCase().trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rankIdx = name ? apps.findIndex((r: any) => (r.title ?? "").toLowerCase().trim() === name) : -1;
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topTitles = top10.map((r: any) => r.title ?? "");
    const relevancy = computeRelevancy(term, appName, topTitles);

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
