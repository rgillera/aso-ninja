import { createAdminClient } from "@/libs/supabase/admin";
import { fetchDailyDownloads } from "./apple";
import { fetchMonthlyInstalls } from "./google";
import type { StoreCredential } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;
type SyncResult = { ok: true } | { ok: false; error: string };
type DownloadRow = { app_id: string; recorded_on: string; downloads: number };

// Both providers frequently haven't finished generating "yesterday"'s report
// at the time a sync runs (Apple's Sales Report lag is commonly 24-48h+,
// sometimes longer around weekends), and the lag varies day to day. Every
// sync re-checks this whole window and fills in each day that's still
// missing from app_download_history — not just the newest finished day — so
// a day that was skipped because its report came in late gets picked up on
// a later run instead of leaving a permanent gap in the history (and an
// undercounted month in the performance report's monthly totals).
const LOOKBACK_DAYS = 7;

// First sync for an app (no history yet): reach further back so the
// downloads history chart and the current month's export total have
// something to show right away instead of starting from the connect date.
const BACKFILL_DAYS = 30;

function isoDateDaysAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

// Shared by the manual "sync now" route, the connect route, and the daily
// cron — pulls the app's real download total for every day in the window
// that isn't stored yet and upserts them into app_download_history.
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

  const { data: latest } = await admin
    .from("app_download_history")
    .select("recorded_on")
    .eq("app_id", appId)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  const windowDays = latest ? LOOKBACK_DAYS : BACKFILL_DAYS;

  const { data: existingRows } = await admin
    .from("app_download_history")
    .select("recorded_on")
    .eq("app_id", appId)
    .gte("recorded_on", isoDateDaysAgo(windowDays));
  const existing = new Set((existingRows ?? []).map((r) => r.recorded_on));

  const missingDates: string[] = [];
  for (let daysAgo = 1; daysAgo <= windowDays; daysAgo++) {
    const date = isoDateDaysAgo(daysAgo);
    if (!existing.has(date)) missingDates.push(date);
  }

  const fetched: DownloadRow[] = [];
  let fatalError: string | null = null;

  if (credential.provider === "apple") {
    for (const date of missingDates) {
      const result = await fetchDailyDownloads(credential, app.store_id, date, countryCode);
      if (result.ok) {
        fetched.push({ app_id: appId, recorded_on: date, downloads: result.downloads });
      } else if (!result.reportMissing) {
        fatalError = `App Store Connect returned an error (status ${result.status}).`;
        break;
      }
      // reportMissing: not generated yet — a later run picks it up
    }
  } else {
    // Android — Play Console's install stats are one file per month, so
    // group the missing days by month and read each file once.
    const byMonth = new Map<string, string[]>();
    for (const date of missingDates) {
      const yyyyMM = date.slice(0, 7).replace("-", "");
      byMonth.set(yyyyMM, [...(byMonth.get(yyyyMM) ?? []), date]);
    }
    for (const [yyyyMM, dates] of byMonth) {
      const result = await fetchMonthlyInstalls(credential, app.store_id, yyyyMM, countryCode);
      if (!result.ok) {
        if (result.reportMissing) continue;
        fatalError = result.error;
        break;
      }
      for (const date of dates) {
        // A day with no row is either not exported yet or a zero-install
        // day for this country (Play omits those) — either way, nothing to
        // store; it's re-checked on later runs while still in the window.
        const downloads = result.byDate[date];
        if (downloads != null) fetched.push({ app_id: appId, recorded_on: date, downloads });
      }
    }
  }

  // Keep whatever was fetched before a mid-run error, so a provider hiccup
  // on one day doesn't throw away the days that did succeed.
  if (fetched.length) {
    await admin.from("app_download_history").upsert(fetched, { onConflict: "app_id,recorded_on" });
  }

  if (fatalError) {
    await admin.from("app_store_connections")
      .update({ status: "error", last_error: fatalError, updated_at: new Date().toISOString() })
      .eq("app_id", appId);
    return { ok: false, error: fatalError };
  }

  const newestStored = [latest?.recorded_on, ...fetched.map((r) => r.recorded_on)]
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  if (!newestStored) {
    // Every day in the window is still missing and nothing was ever stored —
    // genuinely nothing to sync yet. Leave status/last_synced_on untouched
    // (not an error, just not ready) so this doesn't read as broken; the
    // cron retries daily.
    const source = credential.provider === "apple" ? "App Store Connect" : "Play Console";
    return { ok: false, error: `No ${source} report available in the last ${windowDays} days yet.` };
  }

  await admin.from("app_store_connections")
    .update({ status: "connected", last_error: null, last_synced_on: newestStored, updated_at: new Date().toISOString() })
    .eq("app_id", appId);
  return { ok: true };
}
