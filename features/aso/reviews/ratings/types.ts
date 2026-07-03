import type { CategoryBenchmark } from "@/libs/contracts";
import { bucketKey, type Granularity } from "../shared/dateBuckets";
import type { RatingHistogram } from "../shared/starColors";

export type { RatingHistogram, Granularity };
export { STAR_COLORS } from "../shared/starColors";

export type CurrentRating = {
  rating: number | null;
  ratingCount: number | null;
  ratingHistogram: RatingHistogram | null;
  primaryGenreName: string | null;
};

export type SeriesPoint = {
  date: string;
  gainedByStar: RatingHistogram | null;
  gainedTotal: number | null;
  ratingCount: number | null;
  avgRating: number | null;
};

export type RatingsResult = {
  current: CurrentRating;
  category: CategoryBenchmark;
  series: SeriesPoint[];
};

export type BucketedPoint = {
  key: string;
  label: string;
  gainedByStar: RatingHistogram | null;
  gainedTotal: number | null;
  ratingCount: number | null;
  avgRating: number | null;
};

export function bucketSeries(series: SeriesPoint[], granularity: Granularity): BucketedPoint[] {
  const buckets = new Map<string, BucketedPoint>();
  for (const point of series) {
    const key = bucketKey(point.date, granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: key, gainedByStar: null, gainedTotal: null, ratingCount: null, avgRating: null };
      buckets.set(key, bucket);
    }
    if (point.gainedByStar) {
      bucket.gainedByStar = {
        "1": (bucket.gainedByStar?.["1"] ?? 0) + point.gainedByStar["1"],
        "2": (bucket.gainedByStar?.["2"] ?? 0) + point.gainedByStar["2"],
        "3": (bucket.gainedByStar?.["3"] ?? 0) + point.gainedByStar["3"],
        "4": (bucket.gainedByStar?.["4"] ?? 0) + point.gainedByStar["4"],
        "5": (bucket.gainedByStar?.["5"] ?? 0) + point.gainedByStar["5"],
      };
    }
    if (point.gainedTotal != null) {
      bucket.gainedTotal = (bucket.gainedTotal ?? 0) + point.gainedTotal;
    }
    // Total ratings and average rating read as "as of this bucket" — last known value wins.
    if (point.ratingCount != null) {
      bucket.ratingCount = point.ratingCount;
    }
    if (point.avgRating != null) {
      bucket.avgRating = point.avgRating;
    }
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}
