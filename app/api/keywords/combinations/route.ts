import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/server";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { generateCombinations } from "@/libs/keyword-combinations";

export type CombinationChild = { term: string; volume: number; results: number };
export type CombinationGroup = { seed: string; children: CombinationChild[] };
export type CombinationsResult = { groups: CombinationGroup[] };

const EMPTY: CombinationsResult = { groups: [] };

async function fetchVolumeAndResults(
  term: string,
  country: string,
  supabase: SupabaseClient,
): Promise<CombinationChild> {
  // Check cache first — pre-warmed by expand-seed or previous user searches
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("keyword_volume_history")
      .select("score, raw_apps")
      .eq("term", term)
      .eq("store", "ios")
      .eq("country", country)
      .eq("recorded_on", today)
      .maybeSingle();

    if (data) {
      const results = Array.isArray(data.raw_apps) ? (data.raw_apps as unknown[]).length : 0;
      return { term, volume: data.score ?? 0, results };
    }
  } catch { /* fall through to live fetch */ }

  // Cache miss — fetch from Apple via rate-limited queue
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=50&country=${country}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await enqueueAppleRequest(() => fetch(url, { cache: "no-store" } as any));
    if (!res.ok) return { term, volume: 0, results: 0 };
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = json.results ?? [];
    const resultCount: number = json.resultCount ?? apps.length;
    const kwTokens = term.toLowerCase().split(/\s+/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleApps = apps.filter((a: any) => kwTokens.every((w) => (a.trackName ?? "").toLowerCase().includes(w)));
    const avgRatings = titleApps.length === 0 ? 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : titleApps.reduce((s: number, a: any) => s + (a.userRatingCount ?? 0), 0) / titleApps.length;
    const volume = avgRatings < 1_000 ? 5
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(10_000_000)) * 100), 100);
    return { term, volume, results: resultCount };
  } catch { return { term, volume: 0, results: 0 }; }
}

// GET /api/keywords/combinations?seeds=fitness,boxing&country=us&perSeed=8
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seedsParam  = searchParams.get("seeds") ?? "";
  const country     = (searchParams.get("country") ?? "us").toLowerCase();
  const perSeed     = Math.min(Math.max(parseInt(searchParams.get("perSeed") ?? "8", 10), 1), 20);
  const appName     = searchParams.get("appName") ?? "";
  const appSubtitle = searchParams.get("appSubtitle") ?? "";

  const seeds = [...new Set(seedsParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (!seeds.length) return NextResponse.json(EMPTY);

  const supabase = await createClient();

  const groups: CombinationGroup[] = await Promise.all(
    seeds.map(async (seed) => {
      const phrases  = await generateCombinations(seed, perSeed, appName, appSubtitle);
      const children = await Promise.all(phrases.map((term) => fetchVolumeAndResults(term, country, supabase)));
      children.sort((a, b) => b.volume - a.volume);
      return { seed, children };
    })
  );

  return NextResponse.json({ groups } satisfies CombinationsResult);
}
