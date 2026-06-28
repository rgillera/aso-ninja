export type StoreData = {
  screenshotUrls: string[];
  subtitle: string;
  description: string;
  releaseNotes: string;
  rating?: number;
  ratingCount?: number;
  primaryGenreName: string;
  contentAdvisoryRating: string;
  version?: string;
} | null;
