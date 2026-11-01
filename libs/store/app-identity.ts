import type { SupabaseClient } from "@supabase/supabase-js";
import { itunesFetch } from "@/libs/store/appstore";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";

// apps.name / icon_url are copied from the store when an app is followed and
// never re-read otherwise, so a renamed app kept its old title in the header,
// relevancy scoring, AI suggestions, etc. This re-reads both from the store
// and updates every apps row for that listing (all workspaces) when they've
// changed. Icon URLs use the same size suffixes as search/lookup, so an
// unchanged icon compares equal and isn't rewritten.

export type IdentityApp = { store: "ios" | "android"; store_id: string; bundle_id: string; country: string | null };
type Identity = { name: string; iconUrl: string | null };

// iTunes lookup takes a comma-separated id list; well under its URL limit.
const IOS_LOOKUP_BATCH = 150;

async function fetchIosIdentities(storeIds: string[], country: string): Promise<Map<string, Identity>> {
  const out = new Map<string, Identity>();
  for (let i = 0; i < storeIds.length; i += IOS_LOOKUP_BATCH) {
    const ids = storeIds.slice(i, i + IOS_LOOKUP_BATCH).join(",");
    const res = await enqueueAppleRequest(() => itunesFetch(`https://itunes.apple.com/lookup?id=${ids}&country=${country.toLowerCase()}`));
    if (!res) continue;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = (await res.json()).results ?? [];
      for (const r of results) {
        if (!r.trackId || !r.trackName) continue;
        out.set(String(r.trackId), {
          name: r.trackName,
          iconUrl: r.artworkUrl100?.replace("100x100bb", "200x200bb") ?? null,
        });
      }
    } catch { /* treat as not found; retried next run */ }
  }
  return out;
}

async function fetchAndroidIdentity(bundleId: string, country: string): Promise<Identity | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (api as any).app({ appId: bundleId, country: country.toLowerCase() });
    if (!r?.title) return null;
    const icon = r.icon ? (r.icon.startsWith("//") ? "https:" + r.icon : r.icon) + "=s200" : null;
    return { name: r.title, iconUrl: icon };
  } catch {
    return null;
  }
}

const listingKey = (a: IdentityApp) =>
  `${a.store}:${a.store === "ios" ? a.store_id : a.bundle_id}:${(a.country ?? "US").toUpperCase()}`;

// Returns how many listings had a new name or icon. A listing the store
// didn't return (lookup failed, app pulled) is left as is, but still marked
// synced so a dead listing isn't retried every run; the cron revisits it the
// next day.
export async function syncAppIdentities(admin: SupabaseClient, apps: IdentityApp[]): Promise<{ checked: number; changed: number }> {
  const listings = new Map<string, IdentityApp>();
  for (const a of apps) {
    if (a.store === "ios" ? a.store_id : a.bundle_id) listings.set(listingKey(a), a);
  }

  const found = new Map<string, Identity>();

  const iosByCountry = new Map<string, string[]>();
  for (const a of listings.values()) {
    if (a.store !== "ios") continue;
    const c = (a.country ?? "US").toUpperCase();
    iosByCountry.set(c, [...(iosByCountry.get(c) ?? []), a.store_id]);
  }
  for (const [country, ids] of iosByCountry) {
    const byId = await fetchIosIdentities(ids, country);
    for (const [id, identity] of byId) found.set(`ios:${id}:${country}`, identity);
  }

  for (const a of listings.values()) {
    if (a.store !== "android") continue;
    const identity = await fetchAndroidIdentity(a.bundle_id, a.country ?? "US");
    if (identity) found.set(listingKey(a), identity);
  }

  const now = new Date().toISOString();
  let changed = 0;
  for (const [key, a] of listings) {
    const idColumn = a.store === "ios" ? "store_id" : "bundle_id";
    const { data: rows } = await admin
      .from("apps")
      .select("id, name, icon_url")
      .eq("store", a.store)
      .eq("country", (a.country ?? "US").toUpperCase())
      .eq(idColumn, a.store === "ios" ? a.store_id : a.bundle_id);
    if (!rows?.length) continue;

    const identity = found.get(key);
    // A missing icon from the store keeps the one already stored.
    const stale = identity
      ? rows.filter((r) => r.name !== identity.name || (identity.iconUrl && r.icon_url !== identity.iconUrl))
      : [];
    const fresh = rows.filter((r) => !stale.includes(r));

    if (stale.length) {
      await admin
        .from("apps")
        .update({ name: identity!.name, ...(identity!.iconUrl && { icon_url: identity!.iconUrl }), updated_at: now, identity_synced_at: now })
        .in("id", stale.map((r) => r.id));
      changed++;
    }
    if (fresh.length) {
      await admin.from("apps").update({ identity_synced_at: now }).in("id", fresh.map((r) => r.id));
    }
  }

  return { checked: listings.size, changed };
}
