export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceAccess = "aso_intelligence" | "market_intelligence" | "asa_intelligence";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  // Frozen when this workspace is beyond the owner's plan's workspace_limit
  // after a downgrade — see reconcile_workspace_limits in
  // supabase/migrations/20260714000004_workspace_freeze.sql.
  status?: "active" | "frozen";
  // While set and in the future, apps over the Free plan's app limit stay
  // active (the workspace already had them when the limit dropped to 1).
  // See supabase/migrations/20261017000002_free_app_limit_grace.sql.
  app_limit_grace_until?: string | null;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  access: WorkspaceAccess[];
  joined_at: string;
  // Frozen when this member is beyond the workspace plan's member_limit
  // after a downgrade — see reconcile_member_limits in
  // supabase/migrations/20260713000001_plan_limit_reconciliation.sql.
  // Owners are never frozen.
  status?: "active" | "frozen";
};
