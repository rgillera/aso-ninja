export type StoreData = {
  name?: string;
  screenshotUrls: string[];
  subtitle: string;
  description: string;
  releaseNotes: string;
  rating?: number;
  ratingCount?: number;
  // Per-star breakdown — only available from Google Play's scraper. Apple's
  // public APIs expose no per-star data at all, so this stays undefined for iOS.
  ratingHistogram?: Record<"1" | "2" | "3" | "4" | "5", number>;
  primaryGenreName: string;
  primaryGenreId?: string;
  contentAdvisoryRating: string;
  version?: string;
  hasPreviewVideo?: boolean;
  lastUpdatedAt?: number;
  languageCount?: number;
} | null;

export type CategoryBenchmark = {
  genreName: string;
  peerCount: number;
  avgTitleLength: number;
  avgSubtitleLength: number;
  avgDescriptionLength: number;
  avgScreenshotCount: number;
  pctWithPreviewVideo: number;
  avgRating: number | null;
  avgDaysSinceUpdate: number | null;
  medianRatingCount: number | null;
  avgLanguageCount: number | null;
} | null;
