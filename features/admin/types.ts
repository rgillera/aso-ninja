export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  appCount: number;
  keywordCount: number;
  planSlug: string;
  planName: string;
};
