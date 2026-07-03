export type StoreData = {
  name?: string;
  screenshotUrls: string[];
  subtitle: string;
  description: string;
  releaseNotes: string;
  rating?: number;
  ratingCount?: number;
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
