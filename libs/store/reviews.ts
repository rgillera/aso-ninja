import { unstable_cache } from "next/cache";
import { itunesFetch } from "./appstore";

const CACHE_REVALIDATE_SECONDS = 6 * 60 * 60;

export type FetchedReview = {
  storeReviewId: string;
  author: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string | null;
  reviewedAt: string | null;
  version: string | null;
};

function toRating(n: unknown): (1 | 2 | 3 | 4 | 5) | null {
  const v = Number(n);
  return v >= 1 && v <= 5 ? (v as 1 | 2 | 3 | 4 | 5) : null;
}

// Apple's public customer-reviews RSS feed — real, unauthenticated, paginated
// ~50 reviews/page. Not exposed by the iTunes lookup API used elsewhere in
// this codebase, hence the separate fetch here rather than folding into
// fetchIosStoreData.
async function fetchIosReviewsImpl(storeId: string, country: string, maxPages: number): Promise<FetchedReview[]> {
  const reviews: FetchedReview[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await itunesFetch(
      `https://itunes.apple.com/${country.toLowerCase()}/rss/customerreviews/id=${storeId}/sortBy=mostRecent/page=${page}/json`
    );
    if (!res) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json().catch(() => null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
    if (!entries.length) break;

    for (const entry of entries) {
      const rating = toRating(entry["im:rating"]?.label);
      if (rating === null) continue; // Apple sometimes includes a non-review app-summary entry
      const idLabel = entry.id?.label;
      if (!idLabel) continue;
      reviews.push({
        storeReviewId: String(idLabel),
        author: entry.author?.name?.label ?? null,
        rating,
        title: entry.title?.label ?? null,
        body: entry.content?.label ?? null,
        reviewedAt: entry.updated?.label ?? null,
        version: entry["im:version"]?.label ?? null,
      });
    }
  }
  return reviews;
}

const cachedFetchIosReviews = unstable_cache(fetchIosReviewsImpl, ["ios-reviews"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchIosReviews(storeId: string, country: string, maxPages = 10): Promise<FetchedReview[]> {
  try {
    return await cachedFetchIosReviews(storeId, country, maxPages);
  } catch {
    return [];
  }
}

async function fetchAndroidReviewsImpl(bundleId: string, country: string, num: number): Promise<FetchedReview[]> {
  const gplay = await import("google-play-scraper");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api: any = gplay.default ?? gplay;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data }: { data: any[] } = await api.reviews({
    appId: bundleId,
    country: country.toLowerCase(),
    sort: api.sort.NEWEST,
    num,
  });

  return (data ?? [])
    .map((r) => {
      const rating = toRating(r.score);
      if (rating === null) return null;
      return {
        storeReviewId: String(r.id),
        author: r.userName ?? null,
        rating,
        title: r.title ?? null,
        body: r.text ?? null,
        reviewedAt: r.date ?? null,
        version: r.version ?? null,
      } satisfies FetchedReview;
    })
    .filter((r): r is FetchedReview => r !== null);
}

const cachedFetchAndroidReviews = unstable_cache(fetchAndroidReviewsImpl, ["android-reviews"], { revalidate: CACHE_REVALIDATE_SECONDS });

export async function fetchAndroidReviews(bundleId: string, country: string, num = 300): Promise<FetchedReview[]> {
  try {
    return await cachedFetchAndroidReviews(bundleId, country, num);
  } catch {
    return [];
  }
}
