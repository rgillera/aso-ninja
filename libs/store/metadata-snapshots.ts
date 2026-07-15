import { createClient } from "@/libs/supabase/server";
import type { StoreData } from "@/libs/contracts";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type MetadataSnapshotRow = {
  recorded_on: string;
  version: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  screenshot_urls: string[] | null;
  has_preview_video: boolean | null;
  category: string | null;
  age_rating: string | null;
  language_count: number | null;
};

// Best-effort: the App Store/Play Store never expose listing history, only a
// live snapshot, so this is the only way this app ever accumulates history —
// one row per app per day, recorded whenever the Timeline dashboard is viewed
// (same convention as rating_snapshots / keyword_rankings_history). Callers
// should swallow errors here rather than fail the request over a snapshot
// write.
export async function recordMetadataSnapshot(
  supabase: SupabaseClient,
  appId: string,
  storeData: StoreData
): Promise<void> {
  if (!storeData) return;
  const recordedOn = new Date().toISOString().slice(0, 10);
  await supabase
    .from("metadata_snapshots")
    .upsert(
      {
        app_id: appId,
        recorded_on: recordedOn,
        version: storeData.version ?? null,
        title: storeData.name ?? null,
        subtitle: storeData.subtitle,
        description: storeData.description,
        screenshot_urls: storeData.screenshotUrls,
        has_preview_video: storeData.hasPreviewVideo ?? null,
        category: storeData.primaryGenreName,
        age_rating: storeData.contentAdvisoryRating,
        language_count: storeData.languageCount ?? null,
      },
      { onConflict: "app_id,recorded_on" }
    );
}

export async function fetchMetadataSnapshots(
  supabase: SupabaseClient,
  appId: string,
  from: string,
  to: string
): Promise<MetadataSnapshotRow[]> {
  const { data } = await supabase
    .from("metadata_snapshots")
    .select("recorded_on, version, title, subtitle, description, screenshot_urls, has_preview_video, category, age_rating, language_count")
    .eq("app_id", appId)
    .gte("recorded_on", from)
    .lte("recorded_on", to)
    .order("recorded_on", { ascending: true });
  return (data ?? []) as MetadataSnapshotRow[];
}
