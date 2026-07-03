import { unstable_cache } from "next/cache";
import type { AppSearchResult, StoreData, CategoryBenchmark } from "@/libs/contracts";
import { average, median } from "./benchmark-utils";

// Benchmark data (peer descriptions, screenshots, ratings...) doesn't meaningfully
// shift minute to minute, so results are cached for a few hours. This is the main
// lever against tripping Apple/Google's rate limits under concurrent traffic.
const CACHE_REVALIDATE_SECONDS = 6 * 60 * 60;

const SCRAPE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function itunesFetch(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await fetch(url, { next: { revalidate: 60 } } as any);
      if (res.ok) return res;
      if (res.status === 429 || res.status === 503) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      return null; // non-retryable error
    } catch {
      if (attempt < 2) await sleep(400 * (attempt + 1));
    }
  }
  return null;
}

// Returns null when the API is unavailable (so callers can show an error).
// Returns [] when the API works but there are no matching results.
export async function searchAppStore(
  q: string,
  country: string
): Promise<AppSearchResult[] | null> {
  const res = await itunesFetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=software&country=${country}&limit=15`
  );
  if (!res) return null;
  try {
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((r: any) => ({
      name: r.trackName,
      store: "ios" as const,
      bundleId: r.bundleId,
      storeId: String(r.trackId),
      iconUrl: r.artworkUrl100?.replace("100x100bb", "200x200bb") ?? "",
      developer: r.sellerName ?? r.artistName ?? "",
    }));
  } catch {
    return null;
  }
}

export async function lookupAppStore(storeId: string): Promise<AppSearchResult | null> {
  const res = await itunesFetch(`https://itunes.apple.com/lookup?id=${storeId}`);
  if (!res) return null;
  try {
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = data.results?.[0];
    if (!r) return null;
    return {
      name: r.trackName,
      store: "ios",
      bundleId: r.bundleId,
      storeId: String(r.trackId),
      iconUrl: r.artworkUrl100?.replace("100x100bb", "200x200bb") ?? "",
      developer: r.sellerName ?? r.artistName ?? "",
    };
  } catch {
    return null;
  }
}

// The public iTunes lookup API has no reliable "subtitle" field — the marketing
// subtitle shown under the app name only exists in the store page's embedded
// JSON, tied to the exact title text. Apps without one set just won't match.
function extractIosSubtitle(html: string, trackName: string): string {
  try {
    const escaped = trackName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`"title":"${escaped}","isIOSBinaryMacOSCompatible":(?:true|false),"useAdsLocale":(?:true|false),"subtitle":"((?:[^"\\\\]|\\\\.)*)"`);
    const m = html.match(re);
    return m ? JSON.parse(`"${m[1]}"`) : "";
  } catch {
    return "";
  }
}

// Scrapes the public app page for the screenshot set and preview-video presence —
// neither is exposed by the iTunes lookup/search API.
async function scrapeIosAppPage(storeId: string, country: string): Promise<{ screenshotUrls: string[]; hasPreviewVideo: boolean; html: string }> {
  try {
    const res = await fetch(`https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`, {
      headers: { "User-Agent": SCRAPE_UA }, cache: "no-store",
    });
    const html = await res.text();
    const re = /(https:\/\/is\d+-?ssl\.mzstatic\.com\/image\/thumb\/[^"'\s]+\/)(\d{2,4}x\d{3,4}bb(?:-\d+)?\.(?:webp|jpg|png))/g;
    const EXCLUDE = /Placeholder|AppIcon|Features|\{w\}x\{h\}/i;
    const seen = new Set<string>(); const screenshotUrls: string[] = []; let m;
    while ((m = re.exec(html)) !== null) {
      const base = m[1]; if (EXCLUDE.test(base)) continue;
      const [w, h] = m[2].split("x").map(Number); if (h <= w) continue;
      if (!seen.has(base)) { seen.add(base); screenshotUrls.push(`${base}300x650bb.webp`); }
      if (screenshotUrls.length >= 6) break;
    }
    const hasPreviewVideo = /"videoUrl":"https?:\/\/[^"]+"/.test(html);
    return { screenshotUrls, hasPreviewVideo, html };
  } catch {
    return { screenshotUrls: [], hasPreviewVideo: false, html: "" };
  }
}

async function fetchIosStoreDataImpl(storeId: string, country: string): Promise<StoreData> {
  const [apiRes, page] = await Promise.all([
    itunesFetch(`https://itunes.apple.com/lookup?id=${storeId}&country=${country}`),
    scrapeIosAppPage(storeId, country),
  ]);
  const json = await apiRes?.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = json?.results?.[0];
  if (!r) return null;
  const subtitle = (page.html ? extractIosSubtitle(page.html, r.trackName ?? "") : "") || ((r.subtitle ?? "") as string);
  return {
    name: (r.trackName ?? "") as string,
    screenshotUrls: page.screenshotUrls,
    subtitle,
    description: (r.description ?? "") as string,
    releaseNotes: (r.releaseNotes ?? "") as string,
    rating: r.averageUserRating as number | undefined,
    ratingCount: r.userRatingCount as number | undefined,
    primaryGenreName: (r.primaryGenreName ?? "") as string,
    primaryGenreId: r.genreIds?.[0] as string | undefined,
    contentAdvisoryRating: (r.contentAdvisoryRating ?? "") as string,
    version: (r.version ?? "") as string,
    hasPreviewVideo: page.hasPreviewVideo,
    lastUpdatedAt: r.currentVersionReleaseDate ? new Date(r.currentVersionReleaseDate as string).getTime() : undefined,
    languageCount: Array.isArray(r.languageCodesISO2A) ? r.languageCodesISO2A.length : undefined,
  };
}

// Cached per app (not per caller) — the same peer app looked up by two different
// benchmark requests (e.g. as each other's category peer) shares one cache entry.
const cachedFetchIosStoreData = unstable_cache(fetchIosStoreDataImpl, ["ios-store-data"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchIosStoreData(storeId: string, country: string): Promise<StoreData> {
  try {
    return await cachedFetchIosStoreData(storeId, country);
  } catch {
    return null;
  }
}

async function fetchIosGenreTopIdsImpl(genreId: string, country: string, limit: number): Promise<{ ids: string[]; genreName: string }> {
  const feedRes = await fetch(
    `https://itunes.apple.com/${country.toLowerCase()}/rss/topfreeapplications/limit=${limit}/genre=${genreId}/json`,
    { cache: "no-store" }
  );
  const feedJson = await feedRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = feedJson?.feed?.entry ?? [];
  const ids = entries
    .map((e) => e.id?.attributes?.["im:id"] as string | undefined)
    .filter((id): id is string => !!id);
  return { ids, genreName: entries[0]?.category?.attributes?.label ?? "" };
}

const cachedFetchIosGenreTopIds = unstable_cache(fetchIosGenreTopIdsImpl, ["ios-genre-top-ids"], { revalidate: CACHE_REVALIDATE_SECONDS });

// Averages description length, screenshot count, and preview-video presence across
// the top apps in the same genre (via the public iTunes "top free" RSS feed) so a
// single app's metadata can be benchmarked against its category.
export async function fetchIosCategoryPeers(
  genreId: string,
  country: string,
  excludeStoreId: string,
  limit = 8
): Promise<CategoryBenchmark> {
  try {
    const { ids, genreName } = await cachedFetchIosGenreTopIds(genreId, country, limit + 3);
    const peerIds = ids.filter((id) => id !== excludeStoreId).slice(0, limit);

    if (peerIds.length === 0) return null;

    const peers = await Promise.all(
      peerIds.map(async (id) => {
        const data = await fetchIosStoreData(id, country);
        if (!data) return null;
        return {
          titleLength: (data.name ?? "").length,
          subtitleLength: data.subtitle.length,
          descriptionLength: data.description.length,
          screenshotCount: data.screenshotUrls.length,
          hasPreviewVideo: !!data.hasPreviewVideo,
          rating: data.rating,
          ratingCount: data.ratingCount,
          daysSinceUpdate: data.lastUpdatedAt ? (Date.now() - data.lastUpdatedAt) / 86_400_000 : undefined,
          languageCount: data.languageCount,
        };
      })
    );

    const valid = peers.filter((p): p is NonNullable<typeof p> => !!p);
    if (valid.length === 0) return null;

    const ratings = valid.map((p) => p.rating).filter((r): r is number => typeof r === "number" && r > 0);
    const ratingCounts = valid.map((p) => p.ratingCount).filter((n): n is number => typeof n === "number" && n > 0);
    const daysSinceUpdates = valid.map((p) => p.daysSinceUpdate).filter((n): n is number => typeof n === "number");
    const languageCounts = valid.map((p) => p.languageCount).filter((n): n is number => typeof n === "number");

    return {
      genreName,
      peerCount: valid.length,
      avgTitleLength: Math.round(valid.reduce((s, p) => s + p.titleLength, 0) / valid.length),
      avgSubtitleLength: Math.round(valid.reduce((s, p) => s + p.subtitleLength, 0) / valid.length),
      avgDescriptionLength: Math.round(valid.reduce((s, p) => s + p.descriptionLength, 0) / valid.length),
      avgScreenshotCount: Math.round(valid.reduce((s, p) => s + p.screenshotCount, 0) / valid.length),
      pctWithPreviewVideo: Math.round((valid.filter((p) => p.hasPreviewVideo).length / valid.length) * 100),
      avgRating: ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
      avgDaysSinceUpdate: daysSinceUpdates.length ? Math.round(average(daysSinceUpdates)!) : null,
      medianRatingCount: median(ratingCounts),
      avgLanguageCount: languageCounts.length ? Math.round(average(languageCounts)!) : null,
    };
  } catch {
    return null;
  }
}
