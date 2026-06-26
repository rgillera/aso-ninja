export type AlertCondition = "dropped_below" | "improved_above";

export type RankAlert = {
  id: string;
  app_id: string;
  keyword_id: string;
  condition: AlertCondition;
  threshold: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};
