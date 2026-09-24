export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  isSuperAdmin: boolean;
  workspaceCount: number;
  appCount: number;
  keywordCount: number;
  planSlug: string;
  planName: string;
};
