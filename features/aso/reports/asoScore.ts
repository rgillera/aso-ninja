import type { StoreData, CategoryBenchmark } from "@/libs/contracts";
import { daysSince } from "@/libs/store/benchmark-utils";
import type { ScoreSummaryItem, ScoreTag } from "./ReportAsoScore";

// Exported so the detailed metadata comparison view (ReportMetadataComparison)
// can color its per-metric badges with the exact same thresholds that feed
// into this score, instead of drifting out of sync with a second copy.
export function toneFor(percent: number): ScoreTag["tone"] {
  return percent >= 80 ? "emerald" : percent >= 60 ? "amber" : "rose";
}

// Scores a metric against its category peer average when one is available,
// otherwise against a fixed ASO best-practice reference (e.g. no benchmark
// exists yet for this genre/country pair). `invert` is for metrics where
// lower is better, like days since the last update.
export function scoreVsBenchmark(value: number, avg: number | null | undefined, fallbackTarget: number, invert = false): number {
  const target = avg && avg > 0 ? avg : fallbackTarget;
  const ratio = invert ? target / Math.max(value, 1) : value / target;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

export function boolScore(value: boolean): number {
  return value ? 100 : 0;
}

// Fixed ASO best-practice references used whenever no category benchmark is
// available yet — the same fallbacks computeAsoScoreSummary scores against.
export const ASO_REFERENCE = {
  titleLength: 30,
  subtitleLength: 30,
  descriptionLength: 500,
  screenshotCount: 3,
  rating: 4.2,
  reviewCount: 100,
  daysSinceUpdate: 90,
  languageCount: 3,
} as const;

const EMPTY_ITEMS: ScoreSummaryItem[] = [
  { label: "App Texts", percent: 0, tags: [{ label: "No store data", tone: "rose" }] },
  { label: "App Visuals", percent: 0, tags: [{ label: "No store data", tone: "rose" }] },
  { label: "App Details", percent: 0, tags: [{ label: "No store data", tone: "rose" }] },
];

export function computeAsoScoreSummary(
  storeData: StoreData,
  appName: string,
  benchmark: CategoryBenchmark,
  isIos: boolean
): ScoreSummaryItem[] {
  if (!storeData) return EMPTY_ITEMS;

  const titleScore = scoreVsBenchmark((storeData.name || appName).length, benchmark?.avgTitleLength, ASO_REFERENCE.titleLength);
  const subtitleScore = scoreVsBenchmark(storeData.subtitle.length, benchmark?.avgSubtitleLength, ASO_REFERENCE.subtitleLength);
  const descriptionScore = scoreVsBenchmark(storeData.description.length, benchmark?.avgDescriptionLength, ASO_REFERENCE.descriptionLength);
  const releaseNotesScore = boolScore(storeData.releaseNotes.trim().length > 0);
  const appTextsPercent = Math.round((titleScore + subtitleScore + descriptionScore + releaseNotesScore) / 4);
  const appTexts: ScoreSummaryItem = {
    label: "App Texts",
    percent: appTextsPercent,
    tags: [
      { label: "Title", tone: toneFor(titleScore) },
      { label: "Subtitle", tone: toneFor(subtitleScore) },
      { label: "Description", tone: toneFor(descriptionScore) },
      { label: "Release Notes", tone: toneFor(releaseNotesScore) },
    ],
  };

  const screenshotScore = scoreVsBenchmark(storeData.screenshotUrls.length, benchmark?.avgScreenshotCount, ASO_REFERENCE.screenshotCount);
  const videoScore = boolScore(!!storeData.hasPreviewVideo);
  const appVisualsPercent = Math.round((screenshotScore + videoScore) / 2);
  const appVisuals: ScoreSummaryItem = {
    label: "App Visuals",
    percent: appVisualsPercent,
    tags: [
      { label: "Screenshots", tone: toneFor(screenshotScore) },
      { label: "Preview Video", tone: toneFor(videoScore) },
    ],
  };

  const ratingScore = scoreVsBenchmark(storeData.rating ?? 0, benchmark?.avgRating, ASO_REFERENCE.rating);
  const reviewCountScore = scoreVsBenchmark(storeData.ratingCount ?? 0, benchmark?.medianRatingCount ?? undefined, ASO_REFERENCE.reviewCount);
  const freshnessScore = scoreVsBenchmark(daysSince(storeData.lastUpdatedAt) ?? 365, benchmark?.avgDaysSinceUpdate ?? undefined, ASO_REFERENCE.daysSinceUpdate, true);
  const appDetailsScores = [ratingScore, reviewCountScore, freshnessScore];
  const appDetailsTags: ScoreTag[] = [
    { label: "Reviews and Ratings", tone: toneFor(Math.round((ratingScore + reviewCountScore) / 2)) },
    { label: "Recently Updated", tone: toneFor(freshnessScore) },
  ];

  if (isIos) {
    const localizationScore = scoreVsBenchmark(storeData.languageCount ?? 1, benchmark?.avgLanguageCount ?? undefined, ASO_REFERENCE.languageCount);
    appDetailsScores.push(localizationScore);
    appDetailsTags.push({ label: "Localization", tone: toneFor(localizationScore) });
  }

  const appDetails: ScoreSummaryItem = {
    label: "App Details",
    percent: Math.round(appDetailsScores.reduce((sum, s) => sum + s, 0) / appDetailsScores.length),
    tags: appDetailsTags,
  };

  return [appTexts, appVisuals, appDetails];
}
