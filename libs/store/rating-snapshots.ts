import { createClient } from "@/libs/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type RatingHistogram = Record<"1" | "2" | "3" | "4" | "5", number>;

export type RatingSnapshotRow = {
  recorded_on: string;
  rating: number | null;
  rating_count: number | null;
  histogram: RatingHistogram | null;
};

// Best-effort: the App Store/Play Store never expose rating history, only a
// live snapshot, so this is the only way this app ever accumulates history —
// one row per app per day, recorded whenever the Ratings dashboard is viewed
// (same convention as keyword_rankings_history). Callers should swallow
// errors here rather than fail the request over a snapshot write.
//
// Note: the rating/ratingCount passed in come from fetchIosStoreData /
// fetchAndroidStoreData, which are cached for 6h — "today's" snapshot can lag
// the true live value by up to that long. Same tradeoff the benchmark page
// already accepts; not worth bypassing the cache for.
export async function recordRatingSnapshot(
  supabase: SupabaseClient,
  appId: string,
  rating: number | null,
  ratingCount: number | null,
  histogram: RatingHistogram | null
): Promise<void> {
  const recordedOn = new Date().toISOString().slice(0, 10);
  await supabase
    .from("rating_snapshots")
    .upsert(
      { app_id: appId, recorded_on: recordedOn, rating, rating_count: ratingCount, histogram },
      { onConflict: "app_id,recorded_on" }
    );
}

export async function fetchRatingSnapshots(
  supabase: SupabaseClient,
  appId: string,
  from: string,
  to: string
): Promise<RatingSnapshotRow[]> {
  const { data } = await supabase
    .from("rating_snapshots")
    .select("recorded_on, rating, rating_count, histogram")
    .eq("app_id", appId)
    .gte("recorded_on", from)
    .lte("recorded_on", to)
    .order("recorded_on", { ascending: true });
  return (data ?? []) as RatingSnapshotRow[];
}
