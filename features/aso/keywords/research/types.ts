export type Keyword = {
  keyword: string;
  volume: number;
  maxVolume: number;
  diff: number;
  chance: number;
  kei: number;
  rank: string;
  growth: number | null;
  starred: boolean;
};

export type RankPill = typeof import("./constants").RANK_PILLS[number];
