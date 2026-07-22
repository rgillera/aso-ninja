export type Keyword = {
  keyword: string;
  volume: number;
  diff: number;
  chance: number;
  opportunity?: number | null;
  rank: number | null;
  starred: boolean;
  loading?: boolean;
  results?: number;
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

export type DownloadsConnection = { connected: boolean; pending: boolean };

export type RankPill = typeof import("./constants").RANK_PILLS[number];
