import { NextResponse } from "next/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { findRankIdx, computeChance } from "@/libs/keyword-rank-match";
import { getWebPushClient } from "@/libs/webpush";

// Vercel: 300s on Pro, 60s on Hobby (~40 keywords/run on Hobby)
export const maxDuration = 300;

type RawApp = { trackId: number; trackName: string; userRatingCount: number; artworkUrl: string };
type AdminClient = ReturnType<typeof createAdminClient>;

function computeIosVolumeAndDiff(apps: RawApp[], term: string) {
  const kwTokens = term.split(/\s+/).filter(Boolean);
  const titleApps = apps.filter((a) =>
    kwTokens.every((w) => a.trackName.toLowerCase().includes(w))
  );
  const avgTitleRatings =
    titleApps.length === 0
      ? 0
      : titleApps.reduce((s, a) => s + a.userRatingCount, 0) / titleApps.length;
  const volume =
    avgTitleRatings < 1_000
      ? 5
      : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);

  const top5 = apps.slice(0, 5);
  const avgRatings =
    top5.length > 0 ? top5.reduce((s, r) => s + r.userRatingCount, 0) / top5.length : 0;
  const diff =
    avgRatings < 10
      ? 0
      : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(10_000_000)) * 100), 100);

  return { volume, diff };
}

// One entry per keyword whose rank moved enough to be worth a push — fed to
// notifyRankChanges() once the whole cron run is done, so a user tracking
// many keywords gets a single digest push, not one per keyword.
type SignificantChange = { appId: string; appName: string; term: string; previousRank: number; rank: number };

// A change is only "significant" when we have two real ranks to compare —
// first-appearance (previousRank null) and dropping out of results entirely
// (rank null) are common noise, not the kind of move worth waking someone
// up for. Otherwise: a >=5 spot swing, or crossing the top-10 boundary
// either direction, mirrors the threshold discussed for the (shelved) email
// digest — big enough to matter, not so sensitive it fires daily.
function isSignificantRankChange(previousRank: number | null, rank: number | null): boolean {
  if (previousRank === null || rank === null) return false;
  if (Math.abs(previousRank - rank) >= 5) return true;
  return (previousRank > 10 && rank <= 10) || (previousRank <= 10 && rank > 10);
}

// Refreshes rank + chance for every app already tracking `term` in this
// store/country, using the result names this run just fetched — no extra
// network calls. Skips volume/diff/relevancy/opportunity entirely (no AI,
// no rate-limit cost) so this stays a pure DB read + in-memory match + DB
// write, same matching logic (findRankIdx) the live /api/keywords/metrics
// route uses, closing the staleness gap between keyword_metrics.rank and
// keyword_rankings_history.position from up to 7 days down to ~1 day.
async function refreshKeywordMetrics(
  supabase: AdminClient, term: string, store: string, country: string, names: string[],
  changes: SignificantChange[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("keyword_metrics")
    .select("app_id, keyword_id, diff, rank, apps!inner(name, store, country), keywords!inner(term, status)")
    .eq("keywords.term", term)
    .eq("keywords.status", "active")
    .eq("apps.store", store)
    .eq("apps.country", country.toUpperCase());

  if (!rows?.length) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates = (rows as any[]).map((row) => {
    const rankIdx = findRankIdx(names, row.apps.name);
    const rank    = rankIdx >= 0 ? rankIdx + 1 : null;
    const chance  = computeChance(row.diff ?? 0, rank);

    if (isSignificantRankChange(row.rank, rank)) {
      changes.push({ appId: row.app_id, appName: row.apps.name, term, previousRank: row.rank, rank: rank! });
    }

    return { app_id: row.app_id, keyword_id: row.keyword_id, rank, chance, updated_at: new Date().toISOString() };
  });

  await supabase.from("keyword_metrics").upsert(updates, { onConflict: "app_id,keyword_id" });
}

// Sends exactly one push per user for the whole cron run, covering every
// significant change across every app/workspace they belong to — never one
// push per keyword (see isSignificantRankChange's comment for why that
// matters: this is the same "digest, not per-event" reasoning that ruled out
// per-event email for the same feature).
async function notifyRankChanges(supabase: AdminClient, changes: SignificantChange[]) {
  if (!changes.length) return;

  const appIds = [...new Set(changes.map((c) => c.appId))];
  const { data: apps } = await supabase.from("apps").select("id, workspace_id").in("id", appIds);
  const workspaceIdByApp = new Map((apps ?? []).map((a) => [a.id, a.workspace_id]));

  const workspaceIds = [...new Set(workspaceIdByApp.values())];
  if (!workspaceIds.length) return;

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, workspace_id")
    .in("workspace_id", workspaceIds);
  if (!members?.length) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key")
    .in("user_id", [...new Set(members.map((m) => m.user_id))]);
  if (!subs?.length) return;

  const changesByUser = new Map<string, SignificantChange[]>();
  for (const member of members) {
    for (const change of changes) {
      if (workspaceIdByApp.get(change.appId) !== member.workspace_id) continue;
      const list = changesByUser.get(member.user_id) ?? [];
      list.push(change);
      changesByUser.set(member.user_id, list);
    }
  }

  const webpush = getWebPushClient();

  for (const sub of subs) {
    const userChanges = changesByUser.get(sub.user_id);
    if (!userChanges?.length) continue;

    const [first] = userChanges;
    const body = userChanges.length === 1
      ? `"${first.term}" moved from #${first.previousRank} to #${first.rank} for ${first.appName}`
      : `${userChanges.length} keyword rank changes today, including "${first.term}" (#${first.previousRank} → #${first.rank})`;

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title: "Ranking changes", body, url: "/mobile" })
      );
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusCode = (err as any)?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  // Find keywords with historical data but no today's snapshot
  const { data: stale, error } = await supabase.rpc("stale_keywords_today", {
    p_today: today,
    p_limit: 200,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!stale?.length) {
    return NextResponse.json({ refreshed: 0, message: "All keywords up to date" });
  }

  let refreshed = 0;
  let failed = 0;
  let rateLimited = false;
  const changes: SignificantChange[] = [];

  for (const { term, store, country } of stale as { term: string; store: string; country: string }[]) {
    if (rateLimited && store === "ios") continue;

    try {
      if (store === "ios") {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await enqueueAppleRequest(() => fetch(url, { cache: "no-store" } as any));

        if (!res.ok) {
          if (res.status === 403) { rateLimited = true; continue; }
          failed++;
          continue;
        }

        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apps: RawApp[] = (json.results ?? []).map((a: any) => ({
          trackId: a.trackId ?? 0,
          trackName: a.trackName ?? "",
          userRatingCount: a.userRatingCount ?? 0,
          artworkUrl: a.artworkUrl512 ?? a.artworkUrl100 ?? "",
        }));

        const { volume, diff } = computeIosVolumeAndDiff(apps, term);

        await supabase.from("keyword_volume_history").upsert(
          { term, store: "ios", country, score: volume, diff, raw_apps: apps, recorded_on: today },
          { onConflict: "term,store,country,recorded_on" }
        );

        if (apps.length) {
          await supabase.from("keyword_rankings_history").upsert(
            apps.map((a, i) => ({
              keyword: term, store: "ios", country, recorded_on: today,
              position: i + 1, app_id: String(a.trackId || a.trackName),
              app_name: a.trackName, app_icon: a.artworkUrl,
            })),
            { onConflict: "keyword,store,country,recorded_on,app_id" }
          );
        }

        await refreshKeywordMetrics(supabase, term, "ios", country, apps.map((a) => a.trackName), changes);
        refreshed++;
      } else if (store === "android") {
        const gplay = await import("google-play-scraper");
        const api   = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apps: any[] = await api.search({ term, country: country.toLowerCase(), num: 250 });

        const count = apps.length;
        const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const titleMatches = apps.filter((a: any) => kwTokens.every((w) => (a.title ?? "").toLowerCase().includes(w))).length;
        const resultCountScore = Math.min(Math.round((count / 100) * 100), 100);
        const titleMatchScore  = Math.min(Math.round((titleMatches / 30) * 100), 100);
        // See app/api/keywords/metrics/route.ts for why this dropped the
        // Play-suggest-echo signal in favor of title-match/result-count.
        const volume = Math.round(resultCountScore * 0.3 + titleMatchScore * 0.7);

        const top5 = apps.slice(0, 5);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgRatings = top5.length > 0 ? top5.reduce((s: number, r: any) => s + (r.ratings ?? r.reviews ?? 0), 0) / top5.length : 0;
        const diff = avgRatings < 10
          ? 0
          : Math.min(Math.round((Math.log10(avgRatings) / Math.log10(1_000_000)) * 100), 100);

        await supabase.from("keyword_volume_history").upsert(
          { term, store: "android", country, score: volume, diff, recorded_on: today },
          { onConflict: "term,store,country,recorded_on" }
        );

        if (apps.length) {
          await supabase.from("keyword_rankings_history").upsert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            apps.map((a: any, i: number) => ({
              keyword: term, store: "android", country, recorded_on: today,
              position: i + 1, app_id: a.appId ?? a.title, app_name: a.title, app_icon: a.icon,
            })),
            { onConflict: "keyword,store,country,recorded_on,app_id" }
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await refreshKeywordMetrics(supabase, term, "android", country, apps.map((a: any) => a.title ?? ""), changes);
        refreshed++;
      }
    } catch {
      failed++;
    }
  }

  await notifyRankChanges(supabase, changes);

  return NextResponse.json({
    refreshed,
    failed,
    rateLimited,
    total: stale.length,
    notified: changes.length,
    message: rateLimited
      ? `Rate limited after ${refreshed} keywords. Remaining will be picked up tomorrow.`
      : `Refreshed ${refreshed}/${stale.length} keywords.`,
  });
}
