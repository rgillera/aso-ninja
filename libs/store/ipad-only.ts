import { createAdminClient } from "@/libs/supabase/admin";
import { itunesFetch } from "@/libs/store/appstore";
import type { RawIosApp } from "@/libs/keyword-relevancy";
import { isIpadOnlyListing } from "@/libs/store/ipad-devices";
import { searchIosLive } from "@/libs/keyword-relevancy";
import { computeChance } from "@/libs/keyword-rank-match";
import { recomputeOpportunity } from "@/libs/keyword-volume";

// Only rank comes from iPad search (see libs/store/ipad-devices.ts): volume
// and difficulty stay on the shared iPhone search, since popularity
// (autocomplete) isn't split by device anyway.

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

// Cached keyword_metrics rows (7-day TTL) for an iPad-only app can be missing
// a rank it really has: scored before the app was known to be iPad-only (rank
// came from iPhone search, where it never appears), or its iPad search was
// rate-limited at the time. Re-checks just those terms against iPad search and
// patches rank/chance/opportunity in place — no relevancy re-score. Runs after
// the response (see the metrics route); a term already checked today (its
// rankings_history row, real or "not found") is skipped, so each term costs
// at most one search a day. Budgeted to stay inside the function's lifetime;
// whatever it doesn't reach is picked up on a later load.
const MISSING_RANK_BUDGET_MS = 50 * 1000;

export async function refreshMissingIpadRanks(
  app: { id: string; store_id: string; name: string; icon_url: string | null; country: string | null },
  terms: string[]
) {
  if (!terms.length) return;
  const supabase = createAdminClient();
  const country = (app.country ?? "US").toLowerCase();
  const today = new Date().toISOString().split("T")[0];
  const startedAt = Date.now();

  const { data: checked } = await supabase
    .from("keyword_rankings_history")
    .select("keyword")
    .eq("store", "ios").eq("country", country).eq("recorded_on", today).eq("app_id", app.store_id)
    .in("keyword", terms);
  const checkedToday = new Set((checked ?? []).map((r) => r.keyword as string));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("keyword_metrics")
    .select("keyword_id, diff, volume, relevancy, relevancy_scored, opportunity, keywords!inner(term)")
    .eq("app_id", app.id)
    .is("rank", null)
    .in("keywords.term", terms);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (rows ?? []) as any[]) {
    if (Date.now() - startedAt > MISSING_RANK_BUDGET_MS) break;
    const term = row.keywords?.term as string | undefined;
    if (!term || checkedToday.has(term)) continue;
    const ipadApps = await searchIosLive(term, country, "ipad");
    if (ipadApps === "rate_limited") break;
    if (!ipadApps) continue;
    const rank = await persistIpadRank(supabase, { term, country, storeId: app.store_id, appName: app.name, appIcon: app.icon_url }, ipadApps);
    if (rank === null) continue;
    const chance = computeChance(row.diff ?? 0, rank);
    await supabase
      .from("keyword_metrics")
      .update({ rank, chance, opportunity: recomputeOpportunity(row, row.volume ?? 0, chance) })
      .eq("app_id", app.id).eq("keyword_id", row.keyword_id);
  }
}
