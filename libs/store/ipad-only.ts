import { createAdminClient } from "@/libs/supabase/admin";
import { itunesFetch } from "@/libs/store/appstore";
import type { RawIosApp } from "@/libs/keyword-relevancy";

// iPad-only apps never appear in entity=software (iPhone) search results, so
// rank for them has to come from a separate entity=iPadSoftware search. Only
// rank does: volume and difficulty stay on the shared iPhone search, since
// popularity (autocomplete) isn't split by device anyway.
export function isIpadOnlyListing(r: { supportedDevices?: string[] }): boolean {
  const devices = r.supportedDevices ?? [];
  return devices.some((d) => d.startsWith("iPad")) && !devices.some((d) => d.startsWith("iPhone") || d.startsWith("iPod"));
}

type IpadOnlyApp = { id: string; store: string; store_id: string; country: string | null; ipad_only?: boolean | null };

// apps.ipad_only starts out null (not checked). Resolves it once from the
// iTunes lookup and stores it; a failed lookup returns false without storing,
// so the next call tries again.
export async function resolveIpadOnly(app: IpadOnlyApp): Promise<boolean> {
  if (app.store !== "ios" || !app.store_id) return false;
  if (app.ipad_only === true || app.ipad_only === false) return app.ipad_only;
  const res = await itunesFetch(`https://itunes.apple.com/lookup?id=${app.store_id}&country=${(app.country ?? "US").toLowerCase()}`);
  if (!res) return false;
  try {
    const r = (await res.json()).results?.[0];
    if (!r) return false;
    const ipadOnly = isIpadOnlyListing(r);
    await createAdminClient().from("apps").update({ ipad_only: ipadOnly }).eq("id", app.id);
    return ipadOnly;
  } catch {
    return false;
  }
}

// Writes ONLY the tracked app's row from an iPad search. Everyone else's
// position in it is an iPad rank, and storing those under store "ios" would
// overwrite the iPhone ranks other apps track for the same keyword/day. The
// tracked app itself never shows up in an iPhone search, so its row can't
// collide with one. Missing from the results → the same "checked, not found"
// marker (null position, insert-only) the live search path records.
export async function persistIpadRank(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  row: { term: string; country: string; storeId: string; appName: string; appIcon: string | null },
  apps: RawIosApp[]
): Promise<number | null> {
  const idx = apps.findIndex((a) => String(a.trackId) === row.storeId);
  const found = idx >= 0 ? apps[idx] : null;
  const base = {
    keyword: row.term.toLowerCase().trim(), store: "ios", country: row.country.toLowerCase(),
    recorded_on: new Date().toISOString().split("T")[0], app_id: row.storeId,
    app_name: found?.trackName || row.appName, app_icon: found?.artworkUrl || row.appIcon || "",
  };
  await supabase
    .from("keyword_rankings_history")
    .upsert({ ...base, position: found ? idx + 1 : null }, { onConflict: "keyword,store,country,recorded_on,app_id", ignoreDuplicates: !found });
  return found ? idx + 1 : null;
}
