import { createAdminClient } from "@/libs/supabase/admin";
import { fetchDailyDownloads } from "./apple";
import { fetchDailyInstalls } from "./google";
import type { StoreCredential } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;
type SyncResult = { ok: true } | { ok: false; error: string };

// Both providers frequently haven't finished generating "yesterday"'s report
// at the time a sync runs (Apple's Sales Report lag is commonly 24-48h+,
// sometimes longer around weekends) — trying only yesterday would leave a
// freshly-connected app stuck with no data, and no indication why, for
// however long that lag lasts. Stepping back up to a week finds the most
// recent day that actually has a finished report, matching the same 7-day
// window the connect-time credential test already relies on being safe.
const LOOKBACK_DAYS = 7;

function isoDateDaysAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

// Shared by the manual "sync now" route and the daily cron — pulls the
// app's real download total for the most recent day either provider has a
// finished report for, and upserts it into app_download_history.
export async function syncAppDownloads(appId: string, admin: AdminClient): Promise<SyncResult> {
  const { data: app } = await admin.from("apps").select("id, store, store_id, country").eq("id", appId).maybeSingle();
  if (!app) return { ok: false, error: "App not found" };
  // country is nullable (rows created before 20260627000007_apps_country, or
  // via the legacy createAppAction path) — default to US, same fallback
  // app/api/keywords/list/route.ts uses for a missing country param.
  const countryCode = app.country ?? "US";

  const { data: credentialRaw, error: credError } = await admin.rpc("get_app_store_credential", { p_app_id: appId });
  if (credError) return { ok: false, error: credError.message };
  if (!credentialRaw) return { ok: false, error: "No credential stored for this app" };
  const credential = credentialRaw as StoreCredential;

  if (credential.provider === "apple") {
    for (let daysAgo = 1; daysAgo <= LOOKBACK_DAYS; daysAgo++) {
      const date = isoDateDaysAgo(daysAgo);
      const result = await fetchDailyDownloads(credential, app.store_id, date, countryCode);

      if (!result.ok) {
        if (result.reportMissing) continue; // try one day further back
        const message = `App Store Connect returned an error (status ${result.status}).`;
        await admin.from("app_store_connections")
          .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
          .eq("app_id", appId);
        return { ok: false, error: message };
      }

      await admin.from("app_download_history").upsert(
        { app_id: appId, recorded_on: date, downloads: result.downloads },
        { onConflict: "app_id,recorded_on" }
      );
      await admin.from("app_store_connections")
        .update({ status: "connected", last_error: null, last_synced_on: date, updated_at: new Date().toISOString() })
        .eq("app_id", appId);
      return { ok: true };
    }

    // Every day in the lookback window is still missing — genuinely nothing
    // to sync yet. Leave status/last_synced_on untouched (not an error, just
    // not ready) so this doesn't read as broken; the cron retries daily.
    return { ok: false, error: `No App Store Connect report available in the last ${LOOKBACK_DAYS} days yet.` };
  }

  // Android — Play Console's install stats are monthly; fetchDailyInstalls
  // recomputes which month's file to read per date, so stepping back across
  // a month boundary (e.g. testing near the 1st) is handled automatically.
  for (let daysAgo = 1; daysAgo <= LOOKBACK_DAYS; daysAgo++) {
    const date = isoDateDaysAgo(daysAgo);
    const result = await fetchDailyInstalls(credential, app.store_id, date, countryCode);

    if (!result.ok) {
      if (result.reportMissing) continue;
      await admin.from("app_store_connections")
        .update({ status: "error", last_error: result.error, updated_at: new Date().toISOString() })
        .eq("app_id", appId);
      return { ok: false, error: result.error };
    }

    await admin.from("app_download_history").upsert(
      { app_id: appId, recorded_on: date, downloads: result.downloads },
      { onConflict: "app_id,recorded_on" }
    );
    await admin.from("app_store_connections")
      .update({ status: "connected", last_error: null, last_synced_on: date, updated_at: new Date().toISOString() })
      .eq("app_id", appId);
    return { ok: true };
  }

  return { ok: false, error: `No Play Console report available in the last ${LOOKBACK_DAYS} days yet.` };
}
