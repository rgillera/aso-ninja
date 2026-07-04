export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceAccess = "aso_intelligence" | "market_intelligence";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  access: WorkspaceAccess[];
  joined_at: string;
};
