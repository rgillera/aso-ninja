import type { AppStore } from "../app";

export type KeywordRank = {
  id: string;
  app_id: string;
  keyword_id: string;
  store: AppStore;
  rank: number | null;
  rank_change: number | null;
  tracked_on: string;
};
