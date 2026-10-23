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

export type AdminCancellationRow = {
  id: string;
  userId: string;
  email: string;
  // Plan they were on when they canceled; null if the plan row is gone.
  planName: string | null;
  reason: string;
  // Answer to the reason's follow-up question ("What do you need?" etc.).
  reasonDetail: string | null;
  recommendation: string | null;
  createdAt: string;
};

// "Free Plan" -> "Free", "Pro+ Plan" -> "Pro+"; names without the suffix
// (e.g. "Enterprise") pass through unchanged.
export function shortPlanName(name: string): string {
  return name.replace(/\s+Plan$/i, "");
}

export type AdminCertificationAttemptRow = {
  id: string;
  userId: string;
  email: string;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  total: number;
  passed: boolean | null;
  timedOut: boolean;
};
