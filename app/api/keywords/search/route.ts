import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export type AppSearchResult = {
  position: number;
  trackId: number;
  appId?: string;
  name: string;
  subtitle: string;
  developer: string;
  icon: string;
  rating: number;
  ratingCount: number;
  price: string;
  inAppPurchases: boolean;
  screenshotUrls: string[];
};

// POST /api/keywords/search  — persist pre-fetched iOS results from the browser
export async function POST(request: NextRequest) {
  const { keyword, store, country, apps, trackedApp } = await request.json() as {
    keyword: string;
    store: string;
    country: string;
    apps: AppSearchResult[];
    trackedApp?: { id: string; name: string; icon: string };
  };
  if (!keyword || !apps?.length) return NextResponse.json({ ok: true });
  const today = new Date().toISOString().split("T")[0];
  const supabase = await createClient();
  const rows = apps.map((app) => ({
    keyword:     keyword.toLowerCase().trim(),
    store,
    country:     country.toLowerCase(),
    recorded_on: today,
    position:    app.position as number | null,
    app_id:      String(app.trackId || app.name),
    app_name:    app.name,
    app_icon:    app.icon,
  }));
  // The tracked app not appearing anywhere in `apps` is a real, checked
  // result (genuinely outside this search's window) — record it with a null
  // position so it reads as "checked, unranked" rather than leaving no row
  // at all, which is indistinguishable from "never checked" and would retry
  // forever.
  if (trackedApp && !rows.some((r) => r.app_id === trackedApp.id)) {
    rows.push({
      keyword:     keyword.toLowerCase().trim(),
      store,
      country:     country.toLowerCase(),
      recorded_on: today,
      position:    null,
      app_id:      trackedApp.id,
      app_name:    trackedApp.name,
      app_icon:    trackedApp.icon,
    });
  }
  await supabase.from("keyword_rankings_history").upsert(rows, { onConflict: "keyword,store,country,recorded_on,app_id" });
  return NextResponse.json({ ok: true });
}

// GET /api/keywords/search?term=calorie+counter&store=ios&country=us
// Note: iOS searches should be done client-side (Apple's API blocks server-side requests).
// This GET endpoint is kept for Android (google-play-scraper is server-only).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const term    = searchParams.get("term") ?? "";
  const country = (searchParams.get("country") ?? "us").toLowerCase();
  const store   = searchParams.get("store") ?? "ios";
  const trackedId   = searchParams.get("trackedId") ?? undefined;
  const trackedName = searchParams.get("trackedName") ?? "";
  const trackedIcon = searchParams.get("trackedIcon") ?? "";

  if (!term) return NextResponse.json({ apps: [] });

  if (store === "ios") {
    try {
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=20&country=${country}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchRes  = await fetch(searchUrl, { cache: "no-store" } as any);
      if (!searchRes.ok) return NextResponse.json({ apps: [] });
      const searchData = await searchRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = searchData.results ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apps: AppSearchResult[] = results.map((a: any, i: number) => ({
        position:       i + 1,
        trackId:        (a.trackId ?? 0) as number,
        name:           (a.trackName ?? "") as string,
        subtitle:       (a.trackSubtitle ?? a.primaryGenreName ?? "") as string,
        developer:      (a.artistName ?? "") as string,
        icon:           (a.artworkUrl512 ?? a.artworkUrl100 ?? "") as string,
        rating:         (a.averageUserRating ?? 0) as number,
        ratingCount:    (a.userRatingCount ?? 0) as number,
        price:          (a.formattedPrice ?? "Free") as string,
        inAppPurchases: !!(a.minimumOsVersion) && (a.trackPrice === 0 || a.trackPrice === undefined),
        screenshotUrls: [],
      }));

      // Persist today's rankings to history (fire-and-forget)
      const today = new Date().toISOString().split("T")[0];
      createClient().then((supabase) => {
        supabase.from("keyword_rankings_history").upsert(
          apps.map((app) => ({
            keyword:     term.toLowerCase().trim(),
            store,
            country,
            recorded_on: today,
            position:    app.position,
            app_id:      String(results[app.position - 1]?.trackId ?? app.name),
            app_name:    app.name,
            app_icon:    app.icon,
          })),
          { onConflict: "keyword,store,country,recorded_on,app_id" }
        );
      });

      return NextResponse.json({ apps });
    } catch {
      return NextResponse.json({ apps: [] });
    }
  }

  // Android
  try {
    const gplay = await import("google-play-scraper");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api   = (gplay.default ?? gplay) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await api.search({ term, country, num: 20 });
    const apps: AppSearchResult[] = results.map((a, i) => ({
      position:       i + 1,
      trackId:        0,
      appId:          (a.appId ?? "") as string,
      name:           (a.title ?? "") as string,
      subtitle:       (a.genre ?? "") as string,
      developer:      (a.developer ?? "") as string,
      icon:           (a.icon ?? "") as string,
      rating:         (a.score ?? 0) as number,
      ratingCount:    (a.ratings ?? 0) as number,
      price:          a.free ? "Free" : `$${(a.price as number).toFixed(2)}`,
      inAppPurchases: !!(a.IAPRange),
      screenshotUrls: [],
    }));

    const today = new Date().toISOString().split("T")[0];
    const rows = apps.map((app) => ({
      keyword:     term.toLowerCase().trim(),
      store,
      country,
      recorded_on: today,
      position:    app.position as number | null,
      app_id:      app.appId || app.name,
      app_name:    app.name,
      app_icon:    app.icon,
    }));
    // Same "checked, not found" fallback as the iOS POST path: without this,
    // a tracked app genuinely outside the search window leaves no row at
    // all, indistinguishable from "never checked", and retries forever.
    if (trackedId && !rows.some((r) => r.app_id === trackedId)) {
      rows.push({
        keyword:     term.toLowerCase().trim(),
        store,
        country,
        recorded_on: today,
        position:    null,
        app_id:      trackedId,
        app_name:    trackedName,
        app_icon:    trackedIcon,
      });
    }
    const supabase = await createClient();
    await supabase.from("keyword_rankings_history").upsert(rows, { onConflict: "keyword,store,country,recorded_on,app_id" });

    return NextResponse.json({ apps });
  } catch {
    return NextResponse.json({ apps: [] });
  }
}
