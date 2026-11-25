import type { AppSearchResult } from "@/app/api/keywords/search/route";
import { isIpadOnlyListing } from "@/libs/store/ipad-devices";

// Every caller (Research's per-add background search, Performance's, the
// LiveSearchPanel's manual button, multiple "+ Analyze all" clicks fired in
// quick succession) used to run its own independent setTimeout loop. Those
// loops could overlap — e.g. two "Analyze all" clicks a few seconds apart —
// which multiplies the actual request rate hitting Apple's iTunes search
// endpoint and trips its (undocumented, ~20/min/IP) rate limit for the whole
// burst, even though any single loop on its own stayed well under it. Routing
// every call through one shared queue, app-wide, keeps the real network rate
// capped no matter how many callers ask for searches at once.
let queue: Promise<void> = Promise.resolve();
const MIN_GAP_MS = 3500;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, MIN_GAP_MS)),
    () => new Promise((r) => setTimeout(r, MIN_GAP_MS))
  );
  return run;
}

// ipadOnly: rank against iPad search (entity=iPadSoftware) instead, since an
// iPad-only app never appears in iPhone results. Only the tracked app's own
// row from that search gets stored — see the POST in /api/keywords/search.
export type TrackedApp = { id: string; name: string; icon: string; ipadOnly?: boolean };

// Whether to rank this app against iPad search. Uses apps.ipad_only when the
// server has resolved it; a previewed app (no apps row) or one not resolved
// yet gets one browser-side iTunes lookup, cached for the session. A failed
// lookup reads as false and isn't cached, so the next search retries.
const ipadOnlyCache = new Map<string, boolean>();

export async function resolveIpadOnlyClient(
  app: { store: string; store_id?: string; country?: string | null; ipad_only?: boolean | null } | undefined
): Promise<boolean> {
  if (app?.store !== "ios" || !app.store_id) return false;
  if (app.ipad_only === true || app.ipad_only === false) return app.ipad_only;
  const key = `${app.store_id}:${(app.country ?? "us").toLowerCase()}`;
  const cached = ipadOnlyCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${app.store_id}&country=${(app.country ?? "us").toLowerCase()}`);
    const r = res.ok ? (await res.json()).results?.[0] : null;
    if (!r) return false;
    const ipadOnly = isIpadOnlyListing(r);
    ipadOnlyCache.set(key, ipadOnly);
    return ipadOnly;
  } catch {
    return false;
  }
}

// Fetches live App/Play Store rankings for a keyword and persists them to
// keyword_rankings_history. iOS goes straight to Apple's CDN from the browser
// (server-side requests get 403'd); Android goes through our server route
// since google-play-scraper is Node-only.
//
// trackedApp (optional): when the caller is checking rank for a specific
// tracked app, pass its identity so the server can record a "checked, not
// found" marker when it's absent from the results — without this, a keyword
// genuinely outside the search window leaves no row at all, indistinguishable
// from "never checked", and would retry forever.
//
// fullDetail (optional, Android only): asks the server for real rating
// counts instead of always-0. google-play-scraper's search() only returns
// that field in "full detail" mode, which costs one extra Play Store request
// per result (up to 20 here) — fine for a one-off, user-facing lookup like
// LiveSearchPanel, too expensive to default on for bulk background rank
// checks (which only need `position` anyway).
export async function fetchLiveSearchResults(
  keyword: string,
  store: "ios" | "android",
  country: string,
  trackedApp?: TrackedApp,
  fullDetail = false
): Promise<AppSearchResult[]> {
  return enqueue(() => fetchLiveSearchResultsInner(keyword, store, country, trackedApp, fullDetail));
}

async function fetchLiveSearchResultsInner(
  keyword: string,
  store: "ios" | "android",
  country: string,
  trackedApp?: TrackedApp,
  fullDetail = false,
  attempt = 0
): Promise<AppSearchResult[]> {
  if (store === "ios") {
    // limit=200, the same window the refresh cron (and Export Report's
    // catch-up) rank against. With only the top 20, a tracked app sitting at
    // e.g. #53 got recorded as "checked, not found" and the table flipped it
    // to "Unranked" while Rank History still showed #53 from the cron. Still
    // one request either way, so this doesn't add to the rate-limited queue.
    // LiveSearchPanel trims what it displays back to the top 20.
    const entity = trackedApp?.ipadOnly ? "iPadSoftware" : "software";
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=${entity}&limit=200&country=${country}`;
    const res = await fetch(url);
    if (!res.ok) {
      // A short retry isn't enough headroom for Apple's actual cooldown once
      // tripped — back off several seconds and double it on a second try.
      if ((res.status === 403 || res.status === 429) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 12000 * (attempt + 1)));
        return fetchLiveSearchResultsInner(keyword, store, country, trackedApp, fullDetail, attempt + 1);
      }
      throw new Error(`itunes search failed: ${res.status}`);
    }
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = data.results ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apps: AppSearchResult[] = results.map((a: any, i: number) => ({
      position:       i + 1,
      trackId:        (a.trackId ?? 0) as number,
      name:           (a.trackName ?? "") as string,
      subtitle:       (a.trackSubtitle ?? a.primaryGenreName ?? "") as string,
      developer:      (a.artistName ?? "") as string,
      icon:           (a.artworkUrl512 ?? a.artworkUrl100 ?? "") as string,
      rating:         (a.averageUserRating ?? 0) as number,
      ratingCount:    (a.userRatingCount ?? 0) as number,
      price:          (a.formattedPrice ?? "Free") as string,
      inAppPurchases: !!(a.minimumOsVersion) && (a.trackPrice === 0 || a.trackPrice === undefined),
      screenshotUrls: [],
    }));
    await fetch("/api/keywords/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, store, country, apps, trackedApp }),
    });
    return apps;
  }

  const trackedQuery = trackedApp
    ? `&trackedId=${encodeURIComponent(trackedApp.id)}&trackedName=${encodeURIComponent(trackedApp.name)}&trackedIcon=${encodeURIComponent(trackedApp.icon)}`
    : "";
  const detailQuery = fullDetail ? "&detail=full" : "";
  const res = await fetch(`/api/keywords/search?term=${encodeURIComponent(keyword)}&store=${store}&country=${country}${trackedQuery}${detailQuery}`);
  if (!res.ok) throw new Error(`search route failed: ${res.status}`);
  const data = await res.json();
  return data.apps ?? [];
}
