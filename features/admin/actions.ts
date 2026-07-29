"use server";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { isSuperAdminEmail } from "@/libs/admin/is-super-admin";
import { searchIosLive, type RawIosApp } from "@/libs/keyword-relevancy";
import { findRankIdx, computeChance } from "@/libs/keyword-rank-match";

type AdminClient = ReturnType<typeof createAdminClient>;

// Every exported action here is reachable directly as its own server
// endpoint regardless of which page rendered the button that calls it — the
// /admin/* pages' notFound() gate does not protect this file on its own.
async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isSuperAdminEmail(user?.email)) throw new Error("Not authorized");
}

export type KeywordRefreshGroup = {
  term: string;
  store: "ios" | "android";
  // Same casing as apps.country (uppercase, e.g. "US") — refreshKeywordAction
  // lowercases it where the store APIs / history tables expect that instead.
  country: string;
  workspaceNames: string[];
  appNames: string[];
};

// Cross-workspace lookup — a keyword's term isn't unique across workspaces,
// and rankings/volume are only meaningful per (term, store, country), so
// results are grouped on that triple rather than listed per keyword row.
export async function searchKeywordsAction(query: string): Promise<KeywordRefreshGroup[]> {
  await requireSuperAdmin();

  const q = query.trim();
  if (q.length < 2) return [];

  const admin = createAdminClient();

  const { data: keywordRows } = await admin
    .from("keywords")
    .select("id, term, workspaces(name)")
    .ilike("term", `%${q}%`)
    .order("term", { ascending: true })
    .limit(30);

  if (!keywordRows?.length) return [];

  const keywordIds = keywordRows.map((k) => k.id);
  const { data: links } = await admin
    .from("app_keywords")
    .select("keyword_id, apps(name, store, country)")
    .in("keyword_id", keywordIds);

  const groups = new Map<string, KeywordRefreshGroup>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of keywordRows as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowLinks = ((links ?? []) as any[]).filter((l) => l.keyword_id === row.id);
    const workspaceName = row.workspaces?.name ?? "Unknown workspace";

    for (const link of rowLinks) {
      const app = link.apps as { name: string; store: string; country: string | null } | null;
      // A keyword with no linked app has no store/country to refresh against.
      if (!app?.country) continue;

      const key = `${row.term}|${app.store}|${app.country}`;
      const existing = groups.get(key);
      if (existing) {
        if (!existing.workspaceNames.includes(workspaceName)) existing.workspaceNames.push(workspaceName);
        if (!existing.appNames.includes(app.name)) existing.appNames.push(app.name);
      } else {
        groups.set(key, {
          term: row.term,
          store: app.store as "ios" | "android",
          country: app.country,
          workspaceNames: [workspaceName],
          appNames: [app.name],
        });
      }
    }
  }

  return [...groups.values()].sort((a, b) => a.term.localeCompare(b.term));
}

// Mirrors computeIosVolumeAndDiff in app/api/cron/refresh-keywords/route.ts —
// duplicated rather than imported since that function is module-private, and
// this admin action deliberately follows the cron's formula (the ongoing
// writer of these same shared tables) rather than the live metrics route's
// slightly different one.
function computeIosVolumeAndDiff(apps: RawIosApp[], term: string) {
  const kwTokens = term.split(/\s+/).filter(Boolean);
  const titleApps = apps.filter((a) => kwTokens.every((w) => a.trackName.toLowerCase().includes(w)));
  const avgTitleRatings = titleApps.length === 0
    ? 0
    : titleApps.reduce((s, a) => s + a.userRatingCount, 0) / titleApps.length;
  const volume = avgTitleRatings < 1_000
    ? 5
    : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

  const top5 = apps.slice(0, 5);
  const avgRatings = top5.length > 0 ? top5.reduce((s, r) => s + r.userRatingCount, 0) / top5.length : 0;
  const diff = avgRatings < 10
    ? 0
    : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(10_000_000)) * 100), 100);

  return { volume, diff };
}

// Mirrors the android branch of app/api/cron/refresh-keywords/route.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeAndroidVolumeAndDiff(apps: any[], term: string) {
  const count = apps.length;
  const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleMatches = apps.filter((a: any) => kwTokens.every((w) => (a.title ?? "").toLowerCase().includes(w))).length;
  const resultCountScore = Math.min(Math.round((count / 100) * 100), 100);
  const titleMatchScore = Math.min(Math.round((titleMatches / 30) * 100), 100);
  const volume = Math.round(resultCountScore * 0.3 + titleMatchScore * 0.7);

  const top5 = apps.slice(0, 5);
  const avgRatings = top5.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? top5.reduce((s: number, r: any) => s + (r.ratings ?? r.reviews ?? 0), 0) / top5.length
    : 0;
  const diff = avgRatings < 10
    ? 0
    : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(1_000_000)) * 100), 100);

  return { volume, diff };
}

// Refreshes keyword_metrics.rank/chance (the per-app "current rank" cache)
// for every app already tracking this term/store/country, using the result
// names this refresh just fetched — same matching logic the cron uses via
// refreshKeywordMetrics, and just as deliberately narrow: only rank/chance
// are touched, never relevancy/opportunity, so a manual admin refresh can
// never clobber a keyword's existing (possibly Gemini-scored) relevancy data.
async function syncTrackedAppRanks(admin: AdminClient, term: string, store: string, countryUpper: string, resultNames: string[]) {
  const { data: rows } = await admin
    .from("keyword_metrics")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("app_id, keyword_id, diff, apps!inner(name, store, country), keywords!inner(term, status)" as any)
    .eq("keywords.term", term)
    .eq("keywords.status", "active")
    .eq("apps.store", store)
    .eq("apps.country", countryUpper);

  if (!rows?.length) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates = (rows as any[]).map((row) => {
    const rankIdx = findRankIdx(resultNames, row.apps.name);
    const rank = rankIdx >= 0 ? rankIdx + 1 : null;
    const chance = computeChance(row.diff ?? 0, rank);
    return { app_id: row.app_id, keyword_id: row.keyword_id, rank, chance, updated_at: new Date().toISOString() };
  });

  await admin.from("keyword_metrics").upsert(updates, { onConflict: "app_id,keyword_id" });
}

export type RefreshResult =
  | { ok: true; resultsCount: number; recordedOn: string }
  | { ok: false; error: string };

// Forces a fresh live rank + volume fetch for one (term, store, country)
// triple, bypassing whatever staleness state the daily cron's fairness
// rotation left it in — writes keyword_rankings_history +
// keyword_volume_history (and syncs tracked apps' keyword_metrics rank/chance),
// exactly as the cron does for this one keyword, on demand.
export async function refreshKeywordAction(term: string, store: "ios" | "android", country: string): Promise<RefreshResult> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const normTerm = term.toLowerCase().trim();
  // keyword_volume_history/keyword_rankings_history store country lowercase
  // (matches the store APIs' expected param); apps.country is stored
  // uppercase — see comment on KeywordRefreshGroup.country.
  const countryLower = country.toLowerCase();
  const countryUpper = country.toUpperCase();
  const today = new Date().toISOString().split("T")[0];

  if (store === "ios") {
    const result = await searchIosLive(normTerm, countryLower);
    if (result === "rate_limited") return { ok: false, error: "Apple rate-limited this request — try again in a minute." };
    if (result === null) return { ok: false, error: "iTunes search failed." };

    const { volume, diff } = computeIosVolumeAndDiff(result, normTerm);

    await admin.from("keyword_volume_history").upsert(
      { term: normTerm, store: "ios", country: countryLower, score: volume, diff, raw_apps: result, recorded_on: today },
      { onConflict: "term,store,country,recorded_on" }
    );

    if (result.length) {
      await admin.from("keyword_rankings_history").upsert(
        result.map((a, i) => ({
          keyword: normTerm, store: "ios", country: countryLower, recorded_on: today,
          position: i + 1, app_id: String(a.trackId || a.trackName),
          app_name: a.trackName, app_icon: a.artworkUrl,
        })),
        { onConflict: "keyword,store,country,recorded_on,app_id" }
      );
      await syncTrackedAppRanks(admin, normTerm, "ios", countryUpper, result.map((a) => a.trackName));
    }

    return { ok: true, resultsCount: result.length, recordedOn: today };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apps: any[];
  try {
    const gplay = await import("google-play-scraper");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (gplay.default ?? gplay) as any;
    apps = await api.search({ term: normTerm, country: countryLower, num: 250 });
  } catch {
    return { ok: false, error: "Google Play search failed." };
  }

  const { volume, diff } = computeAndroidVolumeAndDiff(apps, normTerm);

  await admin.from("keyword_volume_history").upsert(
    { term: normTerm, store: "android", country: countryLower, score: volume, diff, recorded_on: today },
    { onConflict: "term,store,country,recorded_on" }
  );

  if (apps.length) {
    await admin.from("keyword_rankings_history").upsert(
      apps.map((a, i) => ({
        keyword: normTerm, store: "android", country: countryLower, recorded_on: today,
        position: i + 1, app_id: a.appId ?? a.title, app_name: a.title, app_icon: a.icon,
      })),
      { onConflict: "keyword,store,country,recorded_on,app_id" }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await syncTrackedAppRanks(admin, normTerm, "android", countryUpper, apps.map((a: any) => a.title ?? ""));
  }

  return { ok: true, resultsCount: apps.length, recordedOn: today };
}
