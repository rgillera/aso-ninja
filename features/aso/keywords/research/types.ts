export type Keyword = {
  keyword: string;
  volume: number;
  diff: number;
  chance: number;
  opportunity?: number;
  rank: number | null;
  starred: boolean;
  loading?: boolean;
  results?: number;
  relevancy?: number;
  aiDown?: boolean;
};

export type RankPill = typeof import("./constants").RANK_PILLS[number];
