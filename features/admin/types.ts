export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  // From user_activity (ActivityHeartbeat) — zero/null for anyone who hasn't
  // used the app since tracking started.
  activeSeconds: number;
  lastActiveAt: string | null;
  // Times they opened /dashboard/subscription (SubscriptionPageViewTracker).
  subscriptionPageViews: number;
  isSuperAdmin: boolean;
  workspaceCount: number;
  appCount: number;
  keywordCount: number;
  planSlug: string;
  planName: string;
};
