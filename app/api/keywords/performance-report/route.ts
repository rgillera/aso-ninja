import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";
import { enqueueAppleRequest } from "@/libs/apple-rate-limiter";
import { computeIosVolumeAndDiff } from "@/libs/keyword-volume";
import { computeWeight } from "@/libs/keyword-downloads-apportionment";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
import { REPORT_MONTHS } from "@/libs/keyword-report-window";

// Lets the background catch-up pass below (kicked off via `after()`) keep
// running past a normal request's lifetime — same ceiling refresh-keywords
// uses, since this does the same kind of work (a live Apple/Play search per
// term, paced by the same rate limiter).
export const maxDuration = 300;

// A single Export Report click might be missing this month's data for
// several terms at once (e.g. right after stale_keywords_for_refresh
// started covering never-checked keywords — see that migration). Doesn't
// block the response (see the `after()` call in GET below) — it runs once
// the report has already been sent back, so exporting stays exactly as
// fast as it is today; the payoff is the *next* export (or page load)
// having this month filled in instead of waiting for these terms' turn in
// the cron's fairness queue. A generous but finite budget, same idea as
// refresh-keywords' TIME_BUDGET_MS, so a large gap list can't run forever.
const BACKFILL_BUDGET_MS = 4 * 60 * 1000;

async function backfillCurrentMonth(terms: string[], store: string, country: string, today: string) {
  const supabase = createAdminClient();
  const startedAt = Date.now();

  for (const term of terms) {
    if (Date.now() - startedAt > BACKFILL_BUDGET_MS) break;

    try {
      if (store === "ios") {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=200&country=${country}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await enqueueAppleRequest(() => fetch(url, { cache: "no-store" } as any));
        if (!res.ok) {
          // A 403 means Apple is throttling us globally right now, not
          // just for this term — stop rather than burning the rest of the
          // budget on more guaranteed 403s. Any other bad response just
          // skips this one term; it stays "No data yet" until the refresh
          // cron's own retry/backoff (refresh-keywords) picks it up.
          if (res.status === 403) break;
          continue;
        }

        const json = await res.json();
        const apps: { trackId: number; trackName: string; userRatingCount: number; artworkUrl: string }[] =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (json.results ?? []).map((a: any) => ({
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
      } else if (store === "android") {
        const gplay = await import("google-play-scraper");
        const api = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apps: any[] = await api.search({ term, country: country.toLowerCase(), num: 250 });

        const count = apps.length;
        const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const titleMatches = apps.filter((a: any) => kwTokens.every((w) => (a.title ?? "").toLowerCase().includes(w))).length;
        const resultCountScore = Math.min(Math.round((count / 100) * 100), 100);
        const titleMatchScore  = Math.min(Math.round((titleMatches / 30) * 100), 100);
        const volume = Math.round(resultCountScore * 0.3 + titleMatchScore * 0.7);

        // Skips the diff calc (needs a per-app detail lookup the cron pays
        // for — see refresh-keywords) since the Export Report never reads
        // it; this pass exists only to close the report's volume/rank gap.
        await supabase.from("keyword_volume_history").upsert(
          { term, store: "android", country, score: volume, recorded_on: today },
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
      }
    } catch {
      // Best-effort — this pass never needs to be complete, it just gives
      // the next export (or page load) a head start over waiting for the
      // cron's next tick.
    }
  }
}

export type MonthlyKeywordStats = {
  // Average search volume score across this keyword's daily readings this
  // calendar month (at most one row/day — see the recorded_on upsert key in
  // the refresh cron). Volume is a computed score off fairly stable inputs,
  // so averaging smooths out an occasional bad-day reading (a partial scrape,
  // a transient API hiccup) instead of letting one glitch define the month.
  avgVolume: number | null;
  // Best (lowest/numerically smallest) rank position recorded this month.
  // #1 is the best possible rank, so "highest ranking" means the smallest
  // number here, not the largest. Unlike volume this is deliberately not
  // averaged — rank is genuinely volatile day to day, so "best position
  // reached" is the meaningful monthly signal. null means no numeric rank
  // was ever recorded this month (every check that month came back
  // "unranked").
  bestRank: number | null;
  // This app's modeled share of its real total downloads that month,
  // apportioned across every tracked keyword by that month's own volume +
  // rank (see libs/keyword-downloads-apportionment.ts — same formula the
  // live Est. Downloads column uses, but weighted by THIS month's numbers
  // rather than today's, since a past month gets printed into a static
  // file with no chance to re-weight later). null when unranked that month
  // (no share to attribute), or when there's no real download total for
  // that month at all (below Pro, no connection yet, or not synced) —
  // never a bare 0, which would misread as "confirmed zero downloads."
  estimatedDownloads: number | null;
};

// Keyed by term, then by "YYYY-MM" for every month that term has any real
// volume or rank data for.
export type PerformanceReportResult = Record<string, Record<string, MonthlyKeywordStats>>;

// Keeps each batch's PostgREST `in.(...)` filter well under the ~16KB
// URL/header ceiling both Next.js and PostgREST enforce on the request line
// (verified directly: a single unbatched `.in()` call started failing with
// a plain 414/431 somewhere between 800-1000 real-length keywords, nowhere
// close to what an unlimited-keyword paid plan can actually reach — see
// 20260721000001_unlimited_paid_keywords.sql). 250 keeps even long
// multi-word phrases far under that regardless of how many batches it takes.
const QUERY_BATCH_SIZE = 250;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Resolves whether this export is entitled to Est. Downloads (Pro and up,
// same gate the live column uses — see app/api/keywords/list/route.ts) and,
// if so, this app's real download totals summed to one number per calendar
// month. appId is the internal apps.id (not storeId, which identifies the
// app on the store, not in our own DB) — absent for a previewed-but-not-
// yet-tracked app, which can't have downloads to apportion anyway.
//
// Uses the request-scoped (RLS'd) client, not the admin client: a caller
// passing an appId from a workspace they don't belong to just gets no app
// row back rather than needing an explicit membership check here.
async function loadDownloadsAccess(
  supabase: Awaited<ReturnType<typeof createClient>>, appId: string
): Promise<{ hasAccess: boolean; monthlyTotals: Record<string, number> }> {
  if (!appId) return { hasAccess: false, monthlyTotals: {} };

  const { data: app } = await supabase.from("apps").select("workspace_id").eq("id", appId).maybeSingle();
  if (!app) return { hasAccess: false, monthlyTotals: {} };

  const planState = await getWorkspacePlanState(app.workspace_id);
  const planSlug = planState && !("error" in planState) ? planState.plan.slug : "free";
  const hasAccess = isPlanAtLeast(planSlug, "pro");
  if (!hasAccess) return { hasAccess: false, monthlyTotals: {} };

  const since = new Date();
  since.setMonth(since.getMonth() - REPORT_MONTHS);
  const { data: downloadRows } = await supabase
    .from("app_download_history")
    .select("recorded_on, downloads")
    .eq("app_id", appId)
    .gte("recorded_on", since.toISOString().split("T")[0]);

  // Rows come back empty (not an error) for a Pro workspace that's simply
  // never connected a store account, or connected but not synced yet —
  // monthlyTotals stays {} either way, which the caller already reads as
  // "no real total for this month" per keyword, same as a genuine gap.
  const monthlyTotals: Record<string, number> = {};
  for (const row of downloadRows ?? []) {
    const month = row.recorded_on.slice(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] ?? 0) + row.downloads;
  }
  return { hasAccess, monthlyTotals };
}

// POST /api/keywords/performance-report — body: { terms: string[], store, country, storeId, appId }
//
// Powers the "Export Report" button on Keyword Performance. POST + a JSON
// body rather than GET + query string specifically because terms is
// unbounded (paid plans track keywords with no cap — see
// 20260721000001_unlimited_paid_keywords.sql) and a query string carrying
// thousands of keywords blows past request-line/header size limits long
// before it blows past anything about actual keyword volume.
//
// Rolls the full volume/rank history for each tracked keyword up to one
// entry per calendar month (see MonthlyKeywordStats for why it's the
// month's best value, not its last). The client turns this into one Excel
// tab per month (a fixed rolling window — see exportReport.ts), each
// showing that month's rank change vs. the month before it.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as
    { terms?: string[]; store?: string; country?: string; storeId?: string; appId?: string } | null;
  const store    = body?.store ?? "ios";
  const country  = (body?.country ?? "us").toLowerCase();
  const ourAppId = body?.storeId ?? "";
  const appId    = body?.appId ?? "";

  const terms = [...new Set((body?.terms ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (!terms.length) return NextResponse.json({});

  const supabase = await createClient();
  const termBatches = chunk(terms, QUERY_BATCH_SIZE);

  const [volRows, rankRows, downloadsAccess] = await Promise.all([
    Promise.all(
      termBatches.map((batch) =>
        supabase
          .from("keyword_volume_history")
          .select("term, score, recorded_on")
          .in("term", batch)
          .eq("store", store)
          .eq("country", country)
      )
    ).then((results) => results.flatMap((r) => r.data ?? [])),
    // Only our own app's rank belongs in this report — skip the query
    // entirely when we don't have a store_id to filter on (a
    // previewed-but-not-yet-tracked app).
    ourAppId
      ? Promise.all(
          termBatches.map((batch) =>
            supabase
              .from("keyword_rankings_history")
              .select("keyword, recorded_on, position")
              .in("keyword", batch)
              .eq("store", store)
              .eq("country", country)
              .eq("app_id", ourAppId)
          )
        ).then((results) => results.flatMap((r) => r.data ?? []))
      : Promise.resolve([] as { keyword: string; recorded_on: string; position: number | null }[]),
    loadDownloadsAccess(supabase, appId),
  ]);

  const monthOf = (recordedOn: string) => recordedOn.slice(0, 7); // "YYYY-MM"
  const today = new Date().toISOString().split("T")[0];

  // Accumulates a running sum/count per term+month so the average can be
  // taken once at the end, rather than trying to maintain a running average
  // per row.
  type Accum = { volSum: number; volCount: number; bestRank: number | null };
  const accum: Record<string, Record<string, Accum>> = {};
  for (const term of terms) accum[term] = {};

  for (const row of volRows) {
    const bucket = accum[row.term] ?? (accum[row.term] = {});
    const month = monthOf(row.recorded_on);
    const entry = bucket[month] ?? (bucket[month] = { volSum: 0, volCount: 0, bestRank: null });
    if (row.score != null) {
      entry.volSum += row.score;
      entry.volCount += 1;
    }
  }

  for (const row of rankRows) {
    // A null position is the "checked, not found in results" marker — no
    // numeric rank to compare, so it can't set a month's best.
    if (row.position == null) continue;
    const bucket = accum[row.keyword] ?? (accum[row.keyword] = {});
    const month = monthOf(row.recorded_on);
    const entry = bucket[month] ?? (bucket[month] = { volSum: 0, volCount: 0, bestRank: null });
    if (entry.bestRank === null || row.position < entry.bestRank) {
      entry.bestRank = row.position;
    }
  }

  const result: PerformanceReportResult = {};
  for (const term of terms) {
    result[term] = {};
    for (const [month, entry] of Object.entries(accum[term])) {
      result[term][month] = {
        avgVolume: entry.volCount ? Math.round(entry.volSum / entry.volCount) : null,
        bestRank: entry.bestRank,
        estimatedDownloads: null, // filled in below, per month, once every term's entry exists
      };
    }
  }

  // Splits each month's real download total across every term ranked that
  // month, weighted by that month's own volume + rank — never today's, since
  // a keyword's current ranking can be nothing like what it was in a month
  // this report is about to print as fixed, final numbers (see
  // MonthlyKeywordStats.estimatedDownloads). Skipped entirely off-Pro or
  // with no download rows for a given month.
  if (downloadsAccess.hasAccess) {
    const monthsSeen = new Set<string>();
    for (const term of terms) for (const month of Object.keys(result[term])) monthsSeen.add(month);

    for (const month of monthsSeen) {
      const monthlyTotal = downloadsAccess.monthlyTotals[month];
      if (monthlyTotal == null) continue; // no real download total recorded for this month at all

      const weights = terms.map((term) => {
        const stats = result[term][month];
        return stats ? computeWeight({ volume: stats.avgVolume ?? 0, rank: stats.bestRank }) : 0;
      });
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      if (totalWeight <= 0) continue; // nothing ranked this month — no share to attribute

      terms.forEach((term, i) => {
        if (weights[i] <= 0) return; // unranked this month — no share
        result[term][month].estimatedDownloads = Math.round(monthlyTotal * (weights[i] / totalWeight));
      });
    }
  }

  // Terms this export would show as either "No data yet" (no entry at all
  // this month) or "-" (an entry exists — e.g. rank got checked — but
  // avgVolume specifically is null because no volume row landed this
  // month) in exportReport.ts. bestRank being null does NOT belong here:
  // that's "checked, genuinely unranked" — a real, complete answer
  // (rendered "Unranked"), not a gap — so a term with a volume score and a
  // null rank is left alone rather than re-fetched for no reason. Only
  // meaningful when we have an app to rank against; without ourAppId
  // there's no "our own rank" to fill in regardless.
  const currentMonth = monthOf(today);
  const catchingUp = ourAppId
    ? terms.filter((t) => {
        const stats = result[t]?.[currentMonth];
        return !stats || stats.avgVolume === null;
      })
    : [];
  if (catchingUp.length) {
    after(() => backfillCurrentMonth(catchingUp, store, country, today));
  }

  return NextResponse.json({
    ...result,
    // Same "_"-prefixed sideband convention as /api/keywords/metrics
    // (_rateLimited, _aiDown) — lets the client show a plain-language
    // heads-up without it being mistaken for a real month's data.
    ...(catchingUp.length ? { _catchingUp: catchingUp } : {}),
    // Tells exportReport.ts whether to render the Est. Downloads column at
    // all — a below-Pro workspace gets no column rather than one full of
    // dashes (entitlement was already checked server-side above; this is
    // just what the client renders, not a second gate).
    _downloadsAccess: downloadsAccess.hasAccess,
  });
}
