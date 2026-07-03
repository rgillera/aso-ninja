import { createClient } from "@/libs/supabase/server";
import type { ChartApp } from "@/libs/contracts";

// Reads from market_apps — the catalog /api/cron/crawl-market-apps
// accumulates over time — rather than hitting Apple/Play live. Used where no
// live equivalent exists (Google Play has no "new apps" feed at all).
export async function fetchNewlyDiscoveredApps(
  store: "ios" | "android",
  category: string | null,
  limit: number
): Promise<ChartApp[] | null> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("market_apps")
      .select("store, store_id, bundle_id, name, developer, icon_url, price, price_label, genre, url, rating, rating_count, app_updated_at, first_seen_at")
      .eq("store", store)
      .order("first_seen_at", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("last_category", category);

    const { data, error } = await query;
    if (error) return null;

    return (data ?? []).map((row, i) => ({
      rank: i + 1,
      store: row.store as "ios" | "android",
      storeId: row.store_id,
      bundleId: row.bundle_id ?? undefined,
      name: row.name,
      developer: row.developer ?? "",
      iconUrl: row.icon_url ?? "",
      price: row.price ?? 0,
      priceLabel: row.price_label ?? "",
      genre: row.genre ?? "",
      url: row.url ?? "",
      rating: row.rating,
      ratingCount: row.rating_count,
      lastUpdatedAt: row.app_updated_at ? new Date(row.app_updated_at).getTime() : null,
    }));
  } catch {
    return null;
  }
}
