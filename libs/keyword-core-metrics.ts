import type { createClient } from "@/libs/supabase/server";
import { resolveIosVolume, resolveAndroidVolume } from "@/libs/keyword-autocomplete";
import { computeAndroidTitleVolume, difficultyFromRatings, recomputeOpportunity } from "@/libs/keyword-volume";
import { computeChance } from "@/libs/keyword-rank-match";
import { createAdminClient } from "@/libs/supabase/admin";
import { type RawIosApp, getCachedIosSearch, searchIosLive } from "@/libs/keyword-relevancy";
import { isRestrictedSearch } from "@/libs/keyword-restricted";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// The app-agnostic half of a keyword check: run the store search, score
// volume (popularity) and difficulty, and persist today's snapshot. Shared by
// /api/keywords/metrics (which layers rank/chance/relevancy for one app on
// top) and /api/keywords/inspect (Keyword Inspector, no app at all), so a
// keyword always shows the same popularity/difficulty in both places.
// restricted: the store hides this term's results (see libs/keyword-restricted.ts).
export type CoreMetrics<TApp> = { volume: number; diff: number; results: number; restricted: boolean; apps: TApp[] };

// Average rating count of the top 5 results, on the shared difficulty scale
// (difficultyFromRatings). Rating *count* (install signal), not star rating:
// star ratings cluster at 4.0–4.5 for virtually every app, which would make
// every keyword look hard.
function computeDiff(ratingCounts: number[]) {
  const avg = ratingCounts.length > 0 ? ratingCounts.reduce((s, n) => s + n, 0) / ratingCounts.length : 0;
  return difficultyFromRatings(avg);
}

// Every app tracking this term in this storefront gets the fresh volume and
// difficulty in its keyword_metrics row, so Keyword Research's table matches
// the Inspector without waiting for the refresh cron, which skips a term
// whose snapshot this check just wrote (see stale_keywords_for_refresh).
// Admin client: the rows belong to other workspaces too. Rank stays as
// stored (Chance is rescored with it): the cron owns rank, since it also
// sends the rank-change pushes. Frozen links are left alone, as in the cron.
// A restricted term (store hides its results) gets Chance 0 here too, so a
// row scored before the store started hiding it doesn't keep its old Chance.
async function syncTrackedRows(term: string, store: "ios" | "android", country: string, volume: number, diff: number, results: number) {
  const restricted = isRestrictedSearch(results, volume);
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("keyword_metrics")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("app_id, keyword_id, volume, diff, chance, results, rank, relevancy, relevancy_scored, opportunity, apps!inner(store, country, status), keywords!inner(term, status)" as any)
    .eq("keywords.term", term.toLowerCase().trim())
    .eq("keywords.status", "active")
    .eq("apps.status", "active")
    .eq("apps.store", store)
    .eq("apps.country", country.toUpperCase());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stale = ((rows ?? []) as any[]).filter((r) =>
    r.volume !== volume || r.diff !== diff || r.results !== results || r.chance !== computeChance(diff, r.rank, restricted));
  if (!stale.length) return;

  const { data: frozenLinks } = await admin
    .from("app_keywords")
    .select("app_id, keyword_id")
    .eq("status", "frozen")
    .in("app_id", [...new Set(stale.map((r) => r.app_id))])
    .in("keyword_id", [...new Set(stale.map((r) => r.keyword_id))]);
  const frozen = new Set((frozenLinks ?? []).map((l) => `${l.app_id}:${l.keyword_id}`));

  const updates = stale.filter((r) => !frozen.has(`${r.app_id}:${r.keyword_id}`)).map((r) => {
    const chance = computeChance(diff, r.rank, restricted);
    return {
      app_id: r.app_id, keyword_id: r.keyword_id, volume, diff, chance, results,
      opportunity: recomputeOpportunity(r, volume, chance), updated_at: new Date().toISOString(),
    };
  });
  if (updates.length) await admin.from("keyword_metrics").upsert(updates, { onConflict: "app_id,keyword_id" });
}

async function persistIosSearch(
  supabase: SupabaseClient, term: string, country: string,
  apps: RawIosApp[], volume: number, diff: number
) {
  const today = new Date().toISOString().split("T")[0];
  const normTerm = term.toLowerCase().trim();
  await supabase.from("keyword_volume_history").upsert(
    { term: normTerm, store: "ios", country, score: volume, diff, raw_apps: apps, recorded_on: today },
    { onConflict: "term,store,country,recorded_on" }
  );
  if (apps.length) {
    // Same write the manual/automatic client-side live search performs —
    // doing it here too means a successful metrics fetch already covers
    // today's rank history for every app in the results, not just this one.
    await supabase.from("keyword_rankings_history").upsert(
      apps.map((a, i) => ({
        keyword: normTerm, store: "ios", country, recorded_on: today,
        position: i + 1, app_id: String(a.trackId || a.trackName),
        app_name: a.trackName, app_icon: a.artworkUrl,
      })),
      { onConflict: "keyword,store,country,recorded_on,app_id" }
    );
  }
}

// The search itself must stay serial for Apple's per-IP rate limit
// (searchIosLive goes through enqueueAppleRequest) — callers checking many
// terms loop over this rather than running it concurrently.
export async function fetchIosCoreMetrics(
  supabase: SupabaseClient, term: string, country: string
): Promise<CoreMetrics<RawIosApp> | null | "rate_limited"> {
  try {
    let apps: RawIosApp[] | null = await getCachedIosSearch(supabase, term, country);

    if (!apps) {
      const result = await searchIosLive(term, country);
      if (result === "rate_limited") return "rate_limited";
      if (result === null) return null;
      apps = result;
    }

    const kwTokens = term.toLowerCase().split(/\s+/).filter(Boolean);
    const titleApps = apps.filter((a) => kwTokens.every((w) => a.trackName.toLowerCase().includes(w)));
    const avgTitleRatings = titleApps.length === 0
      ? 0
      : titleApps.reduce((s, a) => s + a.userRatingCount, 0) / titleApps.length;
    const ratingVolume = avgTitleRatings < 1_000
      ? 5
      : Math.min(Math.round((Math.log10(avgTitleRatings) / Math.log10(10_000_000)) * 100), 100);
    // Autocomplete popularity when available; rating-count estimate otherwise
    // (unsupported country, Apple hints error) — see libs/keyword-autocomplete.ts.
    const volume = await resolveIosVolume(supabase, term, country, ratingVolume, { apps });
    const diff = computeDiff(apps.slice(0, 5).map((a) => a.userRatingCount));

    // Persist on every check, not just a fresh iTunes call — a cache hit still
    // has a full apps[] result set to record into keyword_rankings_history, and
    // the upsert is keyed on (term/keyword,store,country,recorded_on[,app_id]),
    // so re-writing the same day's data here is a no-op, not a duplicate.
    await persistIosSearch(supabase, term, country, apps, volume, diff);
    // No results means no top-5 ratings to score diff from, unless the store
    // is hiding a popular term's results: then tracked rows still need
    // Chance 0 (see libs/keyword-restricted.ts).
    const restricted = isRestrictedSearch(apps.length, volume);
    if (apps.length || restricted) await syncTrackedRows(term, "ios", country, volume, diff, apps.length).catch(() => {});

    return { volume, diff, results: apps.length, restricted, apps };
  } catch {
    return null;
  }
}

// Same write persistIosSearch performs for iOS — apps[] here already has
// appId/title/icon for every result, so there's no reason Android's
// keyword_rankings_history should depend on a separate manual live search.
async function persistAndroidSearch(
  supabase: SupabaseClient, term: string, country: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apps: any[], volume: number
) {
  const today = new Date().toISOString().split("T")[0];
  const normTerm = term.toLowerCase().trim();
  await supabase.from("keyword_volume_history").upsert(
    { term: normTerm, store: "android", country, score: volume, recorded_on: today },
    { onConflict: "term,store,country,recorded_on" }
  );
  if (!apps.length) return;
  await supabase.from("keyword_rankings_history").upsert(
    apps.map((a, i) => ({
      keyword: normTerm, store: "android", country, recorded_on: today,
      position: i + 1, app_id: a.appId ?? a.title, app_name: a.title, app_icon: a.icon,
    })),
    { onConflict: "keyword,store,country,recorded_on,app_id" }
  );
}

// google-play-scraper has no per-IP restriction like Apple's, so callers can
// run this concurrently across terms.
export async function fetchAndroidCoreMetrics(
  supabase: SupabaseClient, term: string, country: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<CoreMetrics<any> | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api   = (gplay.default ?? gplay) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const normCountry = country.toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: any[] = await api.search({ term, country: normCountry, num: 250 });

    // Play suggest popularity (letter-by-letter, same walk as iOS), with the
    // title-match/result-count estimate as fallback — see libs/keyword-autocomplete.ts.
    const volume = await resolveAndroidVolume(supabase, term, country, computeAndroidTitleVolume(apps, term));

    // Plain search() results never carry ratings/reviews (only score/scoreText) —
    // those fields only come back from the full app-detail lookup, so fetch it
    // for just the top 5 rather than paying that cost for every result.
    // A failed detail lookup (transient error, rate limit) isn't the same
    // signal as "0 ratings" — null so it's excluded from the average instead
    // of dragging diff down for reasons unrelated to actual competition.
    const top5RatingCounts = await Promise.all(
      apps.slice(0, 5).map(async (r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
          const full: any = await api.app({ appId: r.appId, country: normCountry, lang: "en" }); // eslint-disable-line @typescript-eslint/no-explicit-any
          return (full?.ratings ?? full?.reviews ?? 0) as number;
        } catch {
          return null;
        }
      })
    );
    const resolvedRatingCounts = top5RatingCounts.filter((n): n is number => n !== null);
    const diff = computeDiff(resolvedRatingCounts);

    // Re-writing the same day's data is a no-op via the upsert's onConflict key, not a duplicate.
    await persistAndroidSearch(supabase, term, normCountry, apps, volume);
    // Every top-5 detail lookup failing scores diff from 0 ratings, which
    // says nothing about competition: leave the tracked rows alone then.
    const restricted = isRestrictedSearch(apps.length, volume);
    if (resolvedRatingCounts.length || restricted) await syncTrackedRows(term, "android", country, volume, diff, apps.length).catch(() => {});

    return { volume, diff, results: apps.length, restricted, apps };
  } catch {
    return null;
  }
}
