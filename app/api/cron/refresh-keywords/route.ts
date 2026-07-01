import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";

// Vercel: 300s on Pro, 60s on Hobby (~40 keywords/run on Hobby)
export const maxDuration = 300;

type RawApp = { trackId: number; trackName: string; userRatingCount: number; artworkUrl: string };

function computeVolumeAndDiff(apps: RawApp[], term: string) {
  const kwTokens = term.split(/\s+/).filter(Boolean);
  const titleApps = apps.filter((a) =>
    kwTokens.every((w) => a.trackName.toLowerCase().includes(w))
  );
  const avgTitleRatings =
    titleApps.length === 0
      ? 0
      : titleApps.reduce((s, a) => s + a.userRatingCount, 0) / titleApps.length;
  const volume =
    avgTitleRatings < 1_000
      ? 5
      : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

  const top5 = apps.slice(0, 5);
  const avgRatings =
    top5.length > 0 ? top5.reduce((s, r) => s + r.userRatingCount, 0) / top5.length : 0;
  const diff =
    avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(10_000_000)) * 100), 100);

  return { volume, diff };
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  // Find keywords with historical data but no today's snapshot
  const { data: stale, error } = await supabase.rpc("stale_keywords_today", {
    p_today: today,
    p_limit: 200,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!stale?.length) {
    return NextResponse.json({ refreshed: 0, message: "All keywords up to date" });
  }

  let refreshed = 0;
  let failed = 0;
  let rateLimited = false;

  for (const { term, store, country } of stale as { term: string; store: string; country: string }[]) {
    if (rateLimited) break;

    try {
      if (store === "ios") {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await enqueueAppleRequest(() => fetch(url, { cache: "no-store" } as any));

        if (!res.ok) {
          if (res.status === 403) { rateLimited = true; break; }
          failed++;
          continue;
        }

        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apps: RawApp[] = (json.results ?? []).map((a: any) => ({
          trackId: a.trackId ?? 0,
          trackName: a.trackName ?? "",
          userRatingCount: a.userRatingCount ?? 0,
          artworkUrl: a.artworkUrl512 ?? a.artworkUrl100 ?? "",
        }));

        const { volume, diff } = computeVolumeAndDiff(apps, term);

        await supabase.from("keyword_volume_history").upsert(
          { term, store: "ios", country, score: volume, diff, raw_apps: apps, recorded_on: today },
          { onConflict: "term,store,country,recorded_on" }
        );

        if (apps.length) {
          await supabase.from("keyword_rankings_history").upsert(
            apps.map((a, i) => ({
              keyword: term, store: "ios", country, recorded_on: today,
              position: i + 1, app_id: String(a.trackId || a.trackName),
              app_name: a.trackName, app_icon: a.artworkUrl,
            })),
            { onConflict: "keyword,store,country,recorded_on,position" }
          );
        }

        refreshed++;
      }
      // Android: skipped for now — no rate limit issue there
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    refreshed,
    failed,
    rateLimited,
    total: stale.length,
    message: rateLimited
      ? `Rate limited after ${refreshed} keywords. Remaining will be picked up tomorrow.`
      : `Refreshed ${refreshed}/${stale.length} keywords.`,
  });
}
