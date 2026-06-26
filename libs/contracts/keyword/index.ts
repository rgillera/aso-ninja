export type Keyword = {
  id: string;
  workspace_id: string;
  term: string;
  created_at: string;
};

export type AppKeyword = {
  id: string;
  app_id: string;
  keyword_id: string;
  tag: string | null;
  added_at: string;
};
