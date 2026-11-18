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
  release_notes: string | null;
};

// Identifies the real store listing a snapshot belongs to — NOT a
// particular workspace's `apps` row. Two different workspaces following the
// same real app resolve to the same key here and therefore share the same
// history (see 20260903000002_share_metadata_snapshots_by_listing.sql).
// `appId`, when passed, is recorded only as a "last recorded via"
// breadcrumb — it plays no part in identifying or deduplicating the row.
export type MetadataListingKey = {
  appId?: string | null;
  store: "ios" | "android";
  storeId: string | null;
  bundleId: string | null;
  country: string;
};

// Best-effort: the App Store/Play Store never expose listing history, only a
// live snapshot, so this is the only way this app ever accumulates history —
// one row per real listing per day, recorded whenever any workspace tracking
// it views its Timeline dashboard (same convention as rating_snapshots /
// keyword_rankings_history). Callers should swallow errors here rather than
// fail the request over a snapshot write.
export async function recordMetadataSnapshot(
  supabase: SupabaseClient,
  listing: MetadataListingKey,
  storeData: StoreData
): Promise<void> {
  if (!storeData) return;
  const recordedOn = new Date().toISOString().slice(0, 10);
  const row = {
    app_id: listing.appId ?? null,
    store: listing.store,
    store_id: listing.storeId ?? "",
    bundle_id: listing.bundleId ?? "",
    country: listing.country,
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
    release_notes: storeData.releaseNotes || null,
  };
  const onConflict = "store,country,store_id,bundle_id,recorded_on";
  const { error } = await supabase.from("metadata_snapshots").upsert(row, { onConflict });
  // Until 20261119000001 (release_notes) is applied, PostgREST rejects the
  // whole row over the unknown column; save it without release notes rather
  // than lose the day's snapshot.
  if (error && isMissingReleaseNotes(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { release_notes, ...withoutNotes } = row;
    await supabase.from("metadata_snapshots").upsert(withoutNotes, { onConflict });
  }
}

function isMissingReleaseNotes(error: { message?: string }): boolean {
  return !!error.message?.includes("release_notes");
}

const SNAPSHOT_COLUMNS = "recorded_on, version, title, subtitle, description, screenshot_urls, has_preview_video, category, age_rating, language_count";

export async function fetchMetadataSnapshots(
  supabase: SupabaseClient,
  listing: MetadataListingKey,
  from: string,
  to: string
): Promise<MetadataSnapshotRow[]> {
  const query = (columns: string) => supabase
    .from("metadata_snapshots")
    .select(columns)
    .eq("store", listing.store)
    .eq("country", listing.country)
    .eq("store_id", listing.storeId ?? "")
    .eq("bundle_id", listing.bundleId ?? "")
    .gte("recorded_on", from)
    .lte("recorded_on", to)
    .order("recorded_on", { ascending: true });
  let { data, error } = await query(`${SNAPSHOT_COLUMNS}, release_notes`);
  // Same fallback as recordMetadataSnapshot: before the migration, read
  // without release notes instead of returning no history at all.
  if (error && isMissingReleaseNotes(error)) ({ data, error } = await query(SNAPSHOT_COLUMNS));
  return ((data ?? []) as unknown as MetadataSnapshotRow[]).map((r) => ({ ...r, release_notes: r.release_notes ?? null }));
}
