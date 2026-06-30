import type { AppSearchResult } from "@/app/api/keywords/search/route";

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

// Fetches live App/Play Store rankings for a keyword and persists them to
// keyword_rankings_history. iOS goes straight to Apple's CDN from the browser
// (server-side requests get 403'd); Android goes through our server route
// since google-play-scraper is Node-only.
export async function fetchLiveSearchResults(
  keyword: string,
  store: "ios" | "android",
  country: string
): Promise<AppSearchResult[]> {
  return enqueue(() => fetchLiveSearchResultsInner(keyword, store, country));
}

async function fetchLiveSearchResultsInner(
  keyword: string,
  store: "ios" | "android",
  country: string,
  attempt = 0
): Promise<AppSearchResult[]> {
  if (store === "ios") {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=software&limit=20&country=${country}`;
    const res = await fetch(url);
    if (!res.ok) {
      // A short retry isn't enough headroom for Apple's actual cooldown once
      // tripped — back off several seconds and double it on a second try.
      if ((res.status === 403 || res.status === 429) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 12000 * (attempt + 1)));
        return fetchLiveSearchResultsInner(keyword, store, country, attempt + 1);
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
      body: JSON.stringify({ keyword, store, country, apps }),
    });
    return apps;
  }

  const res = await fetch(`/api/keywords/search?term=${encodeURIComponent(keyword)}&store=${store}&country=${country}`);
  if (!res.ok) throw new Error(`search route failed: ${res.status}`);
  const data = await res.json();
  return data.apps ?? [];
}
