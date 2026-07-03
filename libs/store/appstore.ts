import { unstable_cache } from "next/cache";
import type { AppSearchResult, StoreData, CategoryBenchmark, ChartApp } from "@/libs/contracts";
import { average, median } from "./benchmark-utils";
import { CATEGORY_MAP } from "@/libs/categories";

// Benchmark data (peer descriptions, screenshots, ratings...) doesn't meaningfully
// shift minute to minute, so results are cached for a few hours. This is the main
// lever against tripping Apple/Google's rate limits under concurrent traffic.
const CACHE_REVALIDATE_SECONDS = 6 * 60 * 60;

const SCRAPE_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function itunesFetch(url: string): Promise<Response | null> {
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

export type ChartType = "free" | "paid" | "grossing" | "new";

const CHART_FEED_BASE: Record<ChartType, string> = {
  free: "topfreeapplications",
  paid: "toppaidapplications",
  grossing: "topgrossingapplications",
  new: "newapplications",
};

// "new" has no iPhone/iPad variant on Apple's feed — it's a single universal
// list of recently-released apps, so the device filter doesn't apply to it.
function chartFeedName(device: "iphone" | "ipad", chart: ChartType): string {
  const base = CHART_FEED_BASE[chart];
  return chart !== "new" && device === "ipad" ? base.replace(/applications$/, "ipadapplications") : base;
}

// Apple's top-charts RSS feed carries rank/name/price/genre but not rating or
// update date — those live only in the lookup API, so they're fetched separately
// and merged in below.
async function fetchTopChartsImpl(
  country: string,
  device: "iphone" | "ipad",
  chart: ChartType,
  genreId: string | null,
  limit: number
): Promise<ChartApp[]> {
  const feed = chartFeedName(device, chart);
  // Apple's "newapplications" feed silently ignores both the genre and limit
  // path segments — it always returns its own fixed, unfiltered list of the
  // newest ~100 apps store-wide. So for "new", genre/limit are applied below
  // in-process instead of relying on the feed to honor them.
  const genrePart = chart !== "new" && genreId ? `/genre=${genreId}` : "";
  const feedRes = await fetch(
    `https://itunes.apple.com/${country.toLowerCase()}/rss/${feed}/limit=${limit}${genrePart}/json`,
    { cache: "no-store" }
  );
  if (!feedRes.ok) return [];
  const feedJson = await feedRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = feedJson?.feed?.entry;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let entries: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (chart === "new" && genreId) {
    const genreName = CATEGORY_MAP[genreId];
    entries = entries.filter((e) => e.category?.attributes?.label === genreName);
  }
  if (chart === "new") entries = entries.slice(0, limit);

  return entries.map((e, i) => {
    // "link" is a single object when the app has only the store-page link, but an
    // array (store page + preview-video asset) when it also has a video preview.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const links: any[] = Array.isArray(e.link) ? e.link : e.link ? [e.link] : [];
    const storeLink = links.find((l) => l.attributes?.rel === "alternate")?.attributes?.href;

    return {
      rank: i + 1,
      store: "ios" as const,
      storeId: e.id?.attributes?.["im:id"] ?? "",
      bundleId: e.id?.attributes?.["im:bundleId"] as string | undefined,
      name: e["im:name"]?.label ?? "",
      developer: e["im:artist"]?.label ?? "",
      iconUrl: e["im:image"]?.[e["im:image"].length - 1]?.label ?? "",
      price: parseFloat(e["im:price"]?.attributes?.amount ?? "0") || 0,
      priceLabel: e["im:price"]?.label ?? "Free",
      genre: e.category?.attributes?.label ?? "",
      url: storeLink ?? e.id?.label ?? "",
      rating: null,
      ratingCount: null,
      lastUpdatedAt: null,
    };
  });
}

const cachedFetchTopCharts = unstable_cache(fetchTopChartsImpl, ["ios-top-charts"], { revalidate: CACHE_REVALIDATE_SECONDS });

type AppLookupExtras = { rating: number | null; ratingCount: number | null; lastUpdatedAt: number | null };

async function fetchAppLookupExtrasImpl(ids: string[], country: string): Promise<Record<string, AppLookupExtras>> {
  if (ids.length === 0) return {};
  const res = await itunesFetch(`https://itunes.apple.com/lookup?id=${ids.join(",")}&country=${country}`);
  if (!res) return {};
  try {
    const data = await res.json();
    const out: Record<string, AppLookupExtras> = {};
    for (const r of data.results ?? []) {
      out[String(r.trackId)] = {
        rating: typeof r.averageUserRating === "number" ? r.averageUserRating : null,
        ratingCount: typeof r.userRatingCount === "number" ? r.userRatingCount : null,
        lastUpdatedAt: r.currentVersionReleaseDate ? new Date(r.currentVersionReleaseDate).getTime() : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

const cachedFetchAppLookupExtras = unstable_cache(fetchAppLookupExtrasImpl, ["ios-app-lookup-extras"], { revalidate: CACHE_REVALIDATE_SECONDS });

// Public iTunes top-charts feed — a real, always-current list of the top (or
// newest) apps per country/category/device/chart-type. No download or revenue
// figures: Apple doesn't expose those for apps you don't own, so rank stands
// in for them.
export async function fetchTopCharts(opts: {
  country: string;
  device: "iphone" | "ipad";
  chart: ChartType;
  genreId?: string | null;
  limit?: number;
}): Promise<ChartApp[] | null> {
  try {
    const { country, device, chart, genreId = null, limit = 100 } = opts;
    const apps = await cachedFetchTopCharts(country, device, chart, genreId, limit);
    if (apps.length === 0) return apps;

    const extras = await cachedFetchAppLookupExtras(apps.map((a) => a.storeId), country);
    return apps.map((a) => ({ ...a, ...extras[a.storeId] }));
  } catch {
    return null;
  }
}

// The developer's privacy policy is a real link Apple embeds on the app's own
// store page (as "Developer's Privacy Policy") — it's not in the iTunes API,
// so it takes a page scrape. Not fetched for every chart row up front (that'd
// be one request per app); only looked up on demand when a row is clicked.
async function fetchIosPrivacyPolicyUrlImpl(storeId: string, country: string): Promise<string | null> {
  try {
    const res = await fetch(`https://apps.apple.com/${country.toLowerCase()}/app/id${storeId}`, {
      headers: { "User-Agent": SCRAPE_UA },
      cache: "no-store",
    });
    const html = await res.text();
    const tagMatch = html.match(/<a[^>]*aria-label="Developer(?:’|'|&#8217;)s Privacy Policy"[^>]*>/);
    if (!tagMatch) return null;
    const hrefMatch = tagMatch[0].match(/href="([^"]+)"/);
    return hrefMatch ? hrefMatch[1] : null;
  } catch {
    return null;
  }
}

const cachedFetchIosPrivacyPolicyUrl = unstable_cache(fetchIosPrivacyPolicyUrlImpl, ["ios-privacy-policy-url"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchIosPrivacyPolicyUrl(storeId: string, country: string): Promise<string | null> {
  try {
    return await cachedFetchIosPrivacyPolicyUrl(storeId, country);
  } catch {
    return null;
  }
}
