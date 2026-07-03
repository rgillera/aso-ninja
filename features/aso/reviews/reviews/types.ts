import { bucketKey, type Granularity } from "../shared/dateBuckets";
import type { RatingHistogram } from "../shared/starColors";

export type { Granularity, RatingHistogram };
export { STAR_COLORS } from "../shared/starColors";

export type ReviewStats = {
  avgRating: number | null;
  avgRatingDeltaPct: number | null;
  totalNew: number;
  totalNewDeltaPct: number | null;
  starDistribution: RatingHistogram;
};

export type SeriesPoint = {
  date: string;
  byStar: RatingHistogram;
  avgRating: number | null;
};

export type GrowthRow = {
  label: string;
  gained: number;
  absoluteGrowth: number;
  percentGrowth: number | null;
};

export type ReviewItem = {
  id: string;
  author: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string | null;
  reviewedAt: string | null;
  version: string | null;
  replyBody: string | null;
};

export type ReviewsResult = {
  stats: ReviewStats;
  series: SeriesPoint[];
  growth: GrowthRow[];
  reviews: ReviewItem[];
};

export type BucketedPoint = {
  key: string;
  label: string;
  byStar: RatingHistogram;
  avgRating: number | null;
};

export function bucketSeries(series: SeriesPoint[], granularity: Granularity): BucketedPoint[] {
  const buckets = new Map<string, BucketedPoint>();
  for (const point of series) {
    const key = bucketKey(point.date, granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: key, byStar: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, avgRating: null };
      buckets.set(key, bucket);
    }
    bucket.byStar = {
      "1": bucket.byStar["1"] + point.byStar["1"],
      "2": bucket.byStar["2"] + point.byStar["2"],
      "3": bucket.byStar["3"] + point.byStar["3"],
      "4": bucket.byStar["4"] + point.byStar["4"],
      "5": bucket.byStar["5"] + point.byStar["5"],
    };
    // Average rating reads as "as of this bucket" — last known value wins.
    if (point.avgRating != null) bucket.avgRating = point.avgRating;
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}
