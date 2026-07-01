import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/server";
import { generateCombinations } from "@/libs/keyword-combinations";

export type CombinationChild = { term: string; volume: number; results: number };
export type CombinationGroup = { seed: string; children: CombinationChild[] };
export type CombinationsResult = { groups: CombinationGroup[] };

const EMPTY: CombinationsResult = { groups: [] };

async function fetchVolumeFromCache(
  term: string,
  country: string,
  supabase: SupabaseClient,
): Promise<CombinationChild> {
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
  } catch { /* return empty on error */ }

  // Not cached yet — expand-seed background job will fill this in
  return { term, volume: 0, results: 0 };
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
      const children = await Promise.all(phrases.map((term) => fetchVolumeFromCache(term, country, supabase)));
      children.sort((a: CombinationChild, b: CombinationChild) => b.volume - a.volume);
      return { seed, children };
    })
  );

  return NextResponse.json({ groups } satisfies CombinationsResult);
}
