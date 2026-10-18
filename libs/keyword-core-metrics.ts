import type { createClient } from "@/libs/supabase/server";
import { resolveIosVolume, resolveAndroidVolume } from "@/libs/keyword-autocomplete";
import { computeAndroidTitleVolume, difficultyFromRatings } from "@/libs/keyword-volume";
import { type RawIosApp, getCachedIosSearch, searchIosLive } from "@/libs/keyword-relevancy";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// The app-agnostic half of a keyword check: run the store search, score
// volume (popularity) and difficulty, and persist today's snapshot. Shared by
// /api/keywords/metrics (which layers rank/chance/relevancy for one app on
// top) and /api/keywords/inspect (Keyword Inspector, no app at all), so a
// keyword always shows the same popularity/difficulty in both places.
export type CoreMetrics<TApp> = { volume: number; diff: number; results: number; apps: TApp[] };

// Average rating count of the top 5 results, on the shared difficulty scale
// (difficultyFromRatings). Rating *count* (install signal), not star rating:
// star ratings cluster at 4.0–4.5 for virtually every app, which would make
// every keyword look hard.
function computeDiff(ratingCounts: number[]) {
  const avg = ratingCounts.length > 0 ? ratingCounts.reduce((s, n) => s + n, 0) / ratingCounts.length : 0;
  return difficultyFromRatings(avg);
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

    return { volume, diff, results: apps.length, apps };
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
    const diff = computeDiff(top5RatingCounts.filter((n): n is number => n !== null));

    // Re-writing the same day's data is a no-op via the upsert's onConflict key, not a duplicate.
    await persistAndroidSearch(supabase, term, normCountry, apps, volume);

    return { volume, diff, results: apps.length, apps };
  } catch {
    return null;
  }
}
