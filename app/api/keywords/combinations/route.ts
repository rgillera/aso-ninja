import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/server";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { generateCombinations } from "@/libs/keyword-combinations";

export type CombinationChild = { term: string; volume: number; results: number; difficulty: number; chance: number };
export type CombinationGroup = { seed: string; children: CombinationChild[] };
export type CombinationsResult = { groups: CombinationGroup[] };

const EMPTY: CombinationsResult = { groups: [] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeVolume(apps: any[], term: string) {
  const kwTokens = term.split(/\s+/).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleApps = apps.filter((a: any) =>
    kwTokens.every((w) => (a.trackName ?? "").toLowerCase().includes(w))
  );
  const avgTitleRatings = titleApps.length === 0
    ? 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : titleApps.reduce((s: number, a: any) => s + (a.userRatingCount ?? 0), 0) / titleApps.length;
  const volume = avgTitleRatings < 1_000 ? 5
    : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

  const top5 = apps.slice(0, 5);
  const avgTop5 = top5.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? top5.reduce((s: number, a: any) => s + (a.userRatingCount ?? 0), 0) / top5.length
    : 0;
  const diff = avgTop5 < 10 ? 0
    : Math.min(Math.round((Math.log10(avgTop5) / Math.log10(10_000_000)) * 100), 100);

  return { volume, diff };
}

async function fetchVolume(
  term: string,
  country: string,
  supabase: SupabaseClient,
): Promise<CombinationChild> {
  const today = new Date().toISOString().split("T")[0];

  // Check cache first
  try {
    const { data } = await supabase
      .from("keyword_volume_history")
      .select("score, raw_apps")
      .eq("term", term)
      .eq("store", "ios")
      .eq("country", country)
      .eq("recorded_on", today)
      .maybeSingle();

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apps = Array.isArray(data.raw_apps) ? data.raw_apps as any[] : [];
      const results = apps.length;
      const { diff } = computeVolume(apps, term);
      return { term, volume: data.score ?? 0, results, difficulty: diff, chance: Math.max(0, 100 - diff) };
    }
  } catch { /* fall through to Apple */ }

  // Not cached — fetch from Apple (rate limited) and cache the result
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=50&country=${country}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await enqueueAppleRequest(() => fetch(url, { cache: "no-store" } as any));
    if (!res.ok) return { term, volume: 0, results: 0, difficulty: 0, chance: 0 };

    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = json.results ?? [];
    const { volume, diff } = computeVolume(apps, term);

    void supabase.from("keyword_volume_history").upsert(
      { term, store: "ios", country, score: volume, diff, raw_apps: apps, recorded_on: today },
      { onConflict: "term,store,country,recorded_on" }
    );

    return { term, volume, results: apps.length, difficulty: diff, chance: Math.max(0, 100 - diff) };
  } catch {
    return { term, volume: 0, results: 0, difficulty: 0, chance: 0 };
  }
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
      const children = await Promise.all(phrases.map((term) => fetchVolume(term, country, supabase)));
      children.sort((a, b) => b.volume - a.volume);
      return { seed, children };
    })
  );

  return NextResponse.json({ groups } satisfies CombinationsResult);
}
