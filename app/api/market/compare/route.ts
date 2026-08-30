import { NextRequest, NextResponse } from "next/server";
import type { StoreData } from "@/libs/contracts";
import { fetchStoreData } from "@/libs/store/load-benchmark";

export type MarketCompareResult = { storeData: StoreData };

// GET /api/market/compare?store=ios|android&storeId=&bundleId=&country=
//
// AppSearchResult (what /api/apps/search returns) only carries identity
// fields — name, icon, developer. The comparison table needs the richer
// scraped metadata (rating, screenshots, content rating, last updated...),
// which is exactly what fetchStoreData already assembles for the Benchmark
// feature, so this route is a thin pass-through rather than a new fetcher.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get("store") === "android" ? "android" : "ios";
  const storeId = searchParams.get("storeId") ?? "";
  const bundleId = searchParams.get("bundleId") ?? "";
  const country = (searchParams.get("country") ?? "US").toUpperCase();

  const storeData = await fetchStoreData(store, storeId, bundleId, country);

  const result: MarketCompareResult = { storeData };
  // fetchStoreData is already cached server-side for 6h (see
  // fetchIosStoreData / fetchAndroidStoreData) — mirroring that at the HTTP
  // layer lets browsers/CDNs skip re-hitting this route for repeat requests.
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" },
  });
}
