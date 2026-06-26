export type AppStore = "ios" | "android";

export type App = {
  id: string;
  workspace_id: string;
  name: string;
  store: AppStore;
  bundle_id: string;
  store_id: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
};
