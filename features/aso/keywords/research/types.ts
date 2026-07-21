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
};

export type RankPill = typeof import("./constants").RANK_PILLS[number];
