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
  // One day's real total app downloads (from a connected App Store Connect /
  // Play Console account) apportioned across tracked keywords by volume + rank.
  // null when this keyword isn't ranked (no share of downloads attributed);
  // undefined when the app isn't connected or hasn't synced yet — see
  // DownloadsConnection in KeywordTable.tsx for which state applies.
  estimatedDownloads?: number | null;
};

// bundleHasCredential: true when this app's bundle already has App Store
// Connect / Play Console credentials connected under another country, even
// though `connected` is false for this one. Distinguishes "just follow this
// app, it'll auto-connect" from "needs credentials entered from scratch" —
// see app/api/keywords/list/route.ts. asOf: the YYYY-MM-DD day the
// per-keyword estimates are split from (estimates are per day, not totals).
export type DownloadsConnection = { connected: boolean; pending: boolean; bundleHasCredential?: boolean; asOf?: string | null };

export type RankPill = typeof import("./constants").RANK_PILLS[number];
