export type AppStore = "ios" | "android";

export type App = {
  id: string;
  workspace_id: string;
  name: string;
  store: AppStore;
  bundle_id: string;
  store_id: string;
  icon_url: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  // Frozen when this app is beyond the workspace plan's app_limit after a
  // downgrade — see reconcile_app_limits in
  // supabase/migrations/20260713000001_plan_limit_reconciliation.sql.
  // Optional: only populated where the caller selected it; synthetic/preview
  // App objects elsewhere in the app never have it, and are never frozen.
  status?: "active" | "frozen";
};
