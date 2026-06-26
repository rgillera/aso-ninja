import type { AppStore } from "../app";

export type Review = {
  id: string;
  app_id: string;
  store_review_id: string;
  store: AppStore;
  author: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string | null;
  body: string | null;
  locale: string | null;
  version: string | null;
  reviewed_at: string | null;
  replied_at: string | null;
  reply_body: string | null;
  synced_at: string;
};
