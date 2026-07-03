import { NextRequest, NextResponse } from "next/server";
import type { ChartApp } from "@/libs/contracts";
import { fetchTopCharts } from "@/libs/store/appstore";
import { fetchAndroidTopCharts } from "@/libs/store/googleplay";
import { fetchNewlyDiscoveredApps } from "@/libs/store/marketCatalog";

export type MarketExplorerResult = { apps: ChartApp[] };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store") === "android" ? "android" : "ios";
  const country = (searchParams.get("country") ?? "US").toUpperCase();
  const category = searchParams.get("category");

  let apps: ChartApp[] | null;
  if (store === "android") {
    const chartParam = searchParams.get("chart");
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 200));

    if (chartParam === "new") {
      // Google Play has no "new apps" feed at all (checked the scraper's
      // source directly) — this substitutes our own accumulating catalog's
      // discovery order instead of a live chart. Different guarantee than
      // iOS's New Apps: reflects when *we* first saw it, not when the
      // developer released it, and only has data once the crawler has
      // actually reached Android combos.
      apps = await fetchNewlyDiscoveredApps("android", category, limit);
    } else {
      // Play's list() caps out at 200 real results no matter what's requested.
      const chart = chartParam === "paid" || chartParam === "grossing" ? chartParam : "free";
      apps = await fetchAndroidTopCharts({ country: country.toLowerCase(), category, chart, limit });
    }
  } else {
    const device = searchParams.get("device") === "ipad" ? "ipad" : "iphone";
    const chartParam = searchParams.get("chart");
    const chart = chartParam === "paid" || chartParam === "grossing" || chartParam === "new" ? chartParam : "free";
    // Apple's RSS feed caps out at 100 real results no matter what's requested.
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));
    apps = await fetchTopCharts({ country, device, chart, genreId: category, limit });
  }

  if (apps === null) {
    const message =
      store === "android" && searchParams.get("chart") === "new"
        ? "Couldn't load newly discovered apps right now."
        : `${store === "android" ? "Google Play" : "Apple's"} chart feed is unavailable right now.`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const result: MarketExplorerResult = { apps };
  // Chart data is public and already cached server-side for 6h (see
  // fetchTopCharts / fetchAndroidTopCharts) — mirroring that at the HTTP layer
  // lets browsers/CDNs skip re-hitting this route for repeat requests.
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" },
  });
}
