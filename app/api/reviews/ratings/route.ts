import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { fetchIosStoreData, fetchIosCategoryPeers } from "@/libs/store/appstore";
import { fetchAndroidStoreData, fetchAndroidCategoryPeers } from "@/libs/store/googleplay";
import { recordRatingSnapshot, fetchRatingSnapshots, type RatingHistogram } from "@/libs/store/rating-snapshots";
import type { CategoryBenchmark } from "@/libs/contracts";

type SeriesPoint = {
  date: string;
  gainedByStar: RatingHistogram | null;
  gainedTotal: number | null;
  ratingCount: number | null;
  avgRating: number | null;
};

function diffHistogram(prev: RatingHistogram | null, next: RatingHistogram | null): RatingHistogram | null {
  if (!prev || !next) return null;
  return {
    "1": next["1"] - prev["1"],
    "2": next["2"] - prev["2"],
    "3": next["3"] - prev["3"],
    "4": next["4"] - prev["4"],
    "5": next["5"] - prev["5"],
  };
}

// GET /api/reviews/ratings?appId=...&store=ios&country=us&storeId=...&bundleId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appId    = searchParams.get("appId") ?? "";
  const store    = (searchParams.get("store") ?? "ios") as "ios" | "android";
  const country  = searchParams.get("country") ?? "US";
  const storeId  = searchParams.get("storeId") ?? "";
  const bundleId = searchParams.get("bundleId") ?? "";
  const from     = searchParams.get("from") ?? "";
  const to       = searchParams.get("to") ?? "";

  if (!appId) return NextResponse.json({ error: "appId is required" }, { status: 400 });

  const storeData = store === "ios" && storeId
    ? await fetchIosStoreData(storeId, country)
    : store === "android" && bundleId
      ? await fetchAndroidStoreData(bundleId, country)
      : null;

  const supabase = await createClient();

  if (storeData) {
    const rating = storeData.rating ?? null;
    const ratingCount = storeData.ratingCount ?? null;
    const histogram = storeData.ratingHistogram ?? null;
    try {
      await recordRatingSnapshot(supabase, appId, rating, ratingCount, histogram);
    } catch {
      // Best-effort — history accretes over repeat visits, a failed write here
      // shouldn't block the rest of the dashboard from loading.
    }
  }

  let category: CategoryBenchmark = null;
  if (storeData?.primaryGenreId) {
    category = store === "ios"
      ? await fetchIosCategoryPeers(storeData.primaryGenreId, country, storeId)
      : await fetchAndroidCategoryPeers(storeData.primaryGenreId, storeData.primaryGenreName, country, bundleId);
  }

  const snapshots = from && to ? await fetchRatingSnapshots(supabase, appId, from, to) : [];

  const series: SeriesPoint[] = snapshots.map((snap, i) => {
    const prev = i > 0 ? snapshots[i - 1] : null;
    const gainedByStar = diffHistogram(prev?.histogram ?? null, snap.histogram);
    const gainedTotal = prev?.rating_count != null && snap.rating_count != null
      ? snap.rating_count - prev.rating_count
      : null;
    return { date: snap.recorded_on, gainedByStar, gainedTotal, ratingCount: snap.rating_count, avgRating: snap.rating };
  });

  return NextResponse.json({
    current: {
      rating: storeData?.rating ?? null,
      ratingCount: storeData?.ratingCount ?? null,
      ratingHistogram: storeData?.ratingHistogram ?? null,
      primaryGenreName: storeData?.primaryGenreName ?? null,
    },
    category,
    series,
  });
}
