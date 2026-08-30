export type Keyword = {
  keyword: string;
  volume: number;
  diff: number;
  chance: number;
  opportunity?: number | null;
  rank: number | null;
  starred: boolean;
  loading?: boolean;
  results?: number | null;
  relevancy?: number | null;
  aiDown?: boolean;
  frozen?: boolean;
  // Real total app downloads (from a connected App Store Connect / Play
  // Console account) apportioned across tracked keywords by volume + rank.
  // null when this keyword isn't ranked (no share of downloads attributed);
  // undefined when the app isn't connected or hasn't synced yet — see
  // DownloadsConnection in KeywordTable.tsx for which state applies.
  estimatedDownloads?: number | null;
};

// bundleHasCredential: true when this app's bundle already has App Store
// Connect / Play Console credentials connected under another country, even
// though `connected` is false for this one. Distinguishes "just follow this
// app, it'll auto-connect" from "needs credentials entered from scratch" —
// see app/api/keywords/list/route.ts.
export type DownloadsConnection = { connected: boolean; pending: boolean; bundleHasCredential?: boolean };

export type RankPill = typeof import("./constants").RANK_PILLS[number];

// The 5-step coach mark that walks a first-timer across this page right
// after onboarding hands off here — see the `tourStep` prop on
// KeywordSuggestionsPanel and KeywordTable, and handleFinish in
// OnboardingWizard.tsx for how it's kicked off. Centralized (rather than
// each component keeping its own list) so the "N of 5" label a step shows
// agrees no matter which component is rendering it, and so adding/reordering
// a step only means editing this one array.
export const TOUR_STEPS = ["suggestions", "table", "addKeyword", "volume", "opportunity"] as const;
export type TourStep = typeof TOUR_STEPS[number];
