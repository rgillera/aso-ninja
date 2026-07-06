import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { generateCombinations } from "@/libs/keyword-combinations";

export const maxDuration = 60;

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

// POST /api/keywords/expand-seed
// Body: { term, store, country, appName?, appSubtitle? }
// Fire-and-forget: pre-warms keyword_volume_history for all combinations of the seed.
export async function POST(req: Request) {
  const { term, store, country = "us", appName = "", appSubtitle = "", terms } = await req.json() as {
    term: string; store: string; country?: string; appName?: string; appSubtitle?: string;
    terms?: string[]; // explicit phrases to cache — skips Ollama generation
  };

  if (!term || store !== "ios") {
    return NextResponse.json({ skipped: true });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const phrases = terms?.length ? terms : await generateCombinations(term, 5, appName, appSubtitle);
  if (!phrases.length) return NextResponse.json({ expanded: 0 });

  // Find which combinations already have today's data
  const { data: cached } = await supabase
    .from("keyword_volume_history")
    .select("term")
    .in("term", phrases)
    .eq("store", "ios")
    .eq("country", country)
    .eq("recorded_on", today);

  const cachedSet = new Set((cached ?? []).map((c) => c.term));
  const uncached = phrases.filter((p) => !cachedSet.has(p));

  let expanded = 0;
  for (const phrase of uncached) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(phrase)}&entity=software&limit=50&country=${country}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await enqueueAppleRequest(() => fetch(url, { cache: "no-store" } as any));
      if (!res.ok) continue;

      const json = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apps: any[] = json.results ?? [];
      const { volume, diff } = computeVolume(apps, phrase);

      await supabase
        .from("keyword_volume_history")
        .upsert(
          { term: phrase, store: "ios", country, score: volume, diff, raw_apps: apps, recorded_on: today },
          { onConflict: "term,store,country,recorded_on" }
        );

      expanded++;
    } catch { /* continue on error */ }
  }

  return NextResponse.json({ expanded, skipped: cachedSet.size });
}
