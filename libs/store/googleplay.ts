import { unstable_cache } from "next/cache";
import type { AppSearchResult, StoreData, CategoryBenchmark, ChartApp } from "@/libs/contracts";
import { average, median } from "./benchmark-utils";
import { ANDROID_CATEGORY_MAP } from "@/libs/categories";

// Benchmark data (peer descriptions, screenshots, ratings...) doesn't meaningfully
// shift minute to minute, so results are cached for a few hours. This is the main
// lever against tripping Play Store scraping rate limits under concurrent traffic.
const CACHE_REVALIDATE_SECONDS = 6 * 60 * 60;

function ensureHttps(url: string): string {
  return url.startsWith("//") ? "https:" + url : url;
}

// Play Store's "summary" (short description) field comes back with raw HTML
// entities (e.g. "&amp;") — description doesn't have this issue, summary does.
function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

export async function searchPlayStore(
  q: string,
  country: string
): Promise<AppSearchResult[]> {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await (api as any).search({
      term: q,
      country: country.toLowerCase(),
      num: 15,
    });
    return results.map((r) => ({
      name: r.title,
      store: "android" as const,
      bundleId: r.appId,
      storeId: r.appId,
      iconUrl: r.icon ? ensureHttps(r.icon) + "=s200" : "",
      developer: r.developer ?? "",
    }));
  } catch {
    return [];
  }
}

export async function lookupPlayStore(bundleId: string): Promise<AppSearchResult | null> {
  try {
    const gplay = await import("google-play-scraper");
    const api = gplay.default ?? gplay;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (api as any).app({ appId: bundleId });
    return {
      name: r.title,
      store: "android",
      bundleId: r.appId,
      storeId: r.appId,
      iconUrl: r.icon ? ensureHttps(r.icon) + "=s200" : "",
      developer: r.developer ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchAndroidStoreDataImpl(bundleId: string, country: string): Promise<StoreData> {
  const gplay = await import("google-play-scraper");
  const api = gplay.default ?? gplay;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = await (api as any).app({ appId: bundleId, country: country.toLowerCase() });
  return {
    name: (r.title ?? "") as string,
    screenshotUrls: (r.screenshots ?? []).map((url: string) => ensureHttps(url)),
    subtitle: decodeHtmlEntities((r.summary ?? "") as string),
    description: (r.description ?? "") as string,
    releaseNotes: (r.recentChanges ?? "") as string,
    rating: r.score as number | undefined,
    ratingCount: r.ratings as number | undefined,
    ratingHistogram: r.histogram as NonNullable<StoreData>["ratingHistogram"],
    primaryGenreName: (r.genre ?? "") as string,
    primaryGenreId: r.genreId as string | undefined,
    contentAdvisoryRating: (r.contentRating ?? "") as string,
    version: (r.version ?? "") as string,
    hasPreviewVideo: !!r.video,
    lastUpdatedAt: typeof r.updated === "number" ? r.updated : undefined,
  };
}

// Cached per app (not per caller) — the same peer app looked up by two different
// benchmark requests (e.g. as each other's category peer) shares one cache entry.
const cachedFetchAndroidStoreData = unstable_cache(fetchAndroidStoreDataImpl, ["android-store-data"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchAndroidStoreData(bundleId: string, country: string): Promise<StoreData> {
  try {
    return await cachedFetchAndroidStoreData(bundleId, country);
  } catch {
    return null;
  }
}

async function fetchAndroidGenreTopIdsImpl(genreId: string, country: string, limit: number): Promise<string[]> {
  const gplay = await import("google-play-scraper");
  const api = gplay.default ?? gplay;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topFree = (api as any).collection.TOP_FREE;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const top: any[] = await (api as any).list({
    category: genreId,
    collection: topFree,
    country: country.toLowerCase(),
    num: limit,
  });
  return top.map((a) => a.appId as string).filter(Boolean);
}

const cachedFetchAndroidGenreTopIds = unstable_cache(fetchAndroidGenreTopIdsImpl, ["android-genre-top-ids"], { revalidate: CACHE_REVALIDATE_SECONDS });

// Averages description length, screenshot count, and preview-video presence across
// the top free apps in the same Play Store category (genreId doubles as the
// category constant gplay's list() expects, e.g. "HEALTH_AND_FITNESS") — more
// consistently populated than the "similar apps" carousel, which many apps lack.
export async function fetchAndroidCategoryPeers(
  genreId: string,
  genreName: string,
  country: string,
  excludeBundleId: string,
  limit = 8
): Promise<CategoryBenchmark> {
  try {
    const ids = await cachedFetchAndroidGenreTopIds(genreId, country, limit + 3);
    const peerIds = ids.filter((id) => id !== excludeBundleId).slice(0, limit);
    if (peerIds.length === 0) return null;

    const peers = await Promise.all(
      peerIds.map(async (id) => {
        const data = await fetchAndroidStoreData(id, country);
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
        };
      })
    );

    const valid = peers.filter((p): p is NonNullable<typeof p> => !!p);
    if (valid.length === 0) return null;

    const ratings = valid.map((p) => p.rating).filter((r): r is number => typeof r === "number" && r > 0);
    const ratingCounts = valid.map((p) => p.ratingCount).filter((n): n is number => typeof n === "number" && n > 0);
    const daysSinceUpdates = valid.map((p) => p.daysSinceUpdate).filter((n): n is number => typeof n === "number");

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
      avgLanguageCount: null,
    };
  } catch {
    return null;
  }
}

export type ChartType = "free" | "paid" | "grossing";

// google-play-scraper's `category` enum values, not arbitrary labels — must
// match ANDROID_CATEGORIES ids in libs/categories.ts exactly.
const ANDROID_COLLECTION: Record<ChartType, string> = {
  free: "TOP_FREE",
  paid: "TOP_PAID",
  grossing: "GROSSING",
};

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Play's chart list (unlike Apple's) caps at 200 apps regardless of the `num`
// requested — confirmed empirically, google-play-scraper has no continuation
// token for list() the way it does for search(). Deliberately using the
// lightweight (non-fullDetail) list call: fullDetail issues one extra request
// per app (up to 200 concurrent Play Store hits), which is both slow and a
// good way to get rate-limited. That trade-off costs rating count and last-
// updated date, which the light list doesn't return.
async function fetchAndroidTopChartsImpl(
  country: string,
  categoryId: string | null,
  chart: ChartType,
  limit: number
): Promise<ChartApp[]> {
  const gplay = await import("google-play-scraper");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = gplay.default ?? gplay;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = await api.list({
    collection: api.collection[ANDROID_COLLECTION[chart]],
    category: categoryId ? api.category[categoryId] : api.category.APPLICATION,
    country: country.toLowerCase(),
    num: limit,
  });

  const genreLabel = categoryId ? (ANDROID_CATEGORY_MAP[categoryId] ?? "") : "";

  return results.map((r, i) => {
    const price = typeof r.price === "number" ? r.price : 0;
    const currency = typeof r.currency === "string" ? r.currency : "USD";
    return {
      rank: i + 1,
      store: "android" as const,
      storeId: r.appId,
      bundleId: r.appId,
      name: r.title ?? "",
      developer: r.developer ?? "",
      iconUrl: r.icon ? ensureHttps(r.icon) : "",
      price,
      priceLabel: r.free ? "Free" : formatPrice(price, currency),
      genre: genreLabel,
      url: r.url ?? `https://play.google.com/store/apps/details?id=${r.appId}&hl=en&gl=${country.toLowerCase()}`,
      rating: typeof r.score === "number" ? r.score : null,
      ratingCount: null,
      lastUpdatedAt: null,
    };
  });
}

const cachedFetchAndroidTopCharts = unstable_cache(fetchAndroidTopChartsImpl, ["android-top-charts"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchAndroidTopCharts(opts: {
  country: string;
  category?: string | null;
  chart: ChartType;
  limit?: number;
}): Promise<ChartApp[] | null> {
  try {
    const { country, category = null, chart, limit = 200 } = opts;
    return await cachedFetchAndroidTopCharts(country, category, chart, limit);
  } catch {
    return null;
  }
}

// Unlike iOS (which needs an HTML scrape + regex), Play's app() detail
// response has a real, structured privacyPolicy field — looked up on demand
// when a row is clicked, same as the iOS path.
async function fetchAndroidPrivacyPolicyUrlImpl(bundleId: string, country: string): Promise<string | null> {
  try {
    const gplay = await import("google-play-scraper");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api: any = gplay.default ?? gplay;
    const r = await api.app({ appId: bundleId, country: country.toLowerCase() });
    return typeof r.privacyPolicy === "string" && r.privacyPolicy ? r.privacyPolicy : null;
  } catch {
    return null;
  }
}

const cachedFetchAndroidPrivacyPolicyUrl = unstable_cache(fetchAndroidPrivacyPolicyUrlImpl, ["android-privacy-policy-url"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchAndroidPrivacyPolicyUrl(bundleId: string, country: string): Promise<string | null> {
  try {
    return await cachedFetchAndroidPrivacyPolicyUrl(bundleId, country);
  } catch {
    return null;
  }
}
