import { createClient } from "@/libs/supabase/server";
import { fetchIosReviews, fetchAndroidReviews } from "./reviews";
import type { AppStore } from "@/libs/contracts";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Best-effort: pulls the store's real recent-review feed and upserts it into
// the `reviews` table. Callers should wrap this in try/catch — a sync failure
// shouldn't blank the page if previously-synced rows already exist.
export async function syncReviews(
  supabase: SupabaseClient,
  appId: string,
  store: AppStore,
  country: string,
  storeId: string,
  bundleId: string
): Promise<void> {
  const fetched = store === "ios"
    ? await fetchIosReviews(storeId, country)
    : await fetchAndroidReviews(bundleId, country);

  if (!fetched.length) return;

  const rows = fetched.map((r) => ({
    app_id: appId,
    store_review_id: r.storeReviewId,
    store,
    author: r.author,
    rating: r.rating,
    title: r.title,
    body: r.body,
    locale: null,
    version: r.version,
    reviewed_at: r.reviewedAt,
    replied_at: null,
    reply_body: null,
    synced_at: new Date().toISOString(),
  }));

  await supabase.from("reviews").upsert(rows, { onConflict: "app_id,store_review_id" });
}
