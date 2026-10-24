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
  // Return visits (heartbeat after a 30+ min gap) and distinct UTC days with
  // use; see supabase/migrations/20261023000003_user_activity_visits.sql.
  visitCount: number;
  activeDays: number;
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

// Admin Engagement page (app/admin/page.tsx). Shapes mirror the RPCs in
// supabase/migrations/20261023000004_engagement_insights.sql.
export type DailyActiveUsers = { day: string; users: number };

export type RetentionCohort = {
  cohortWeek: string;
  users: number;
  // Each rate counts only users whose window has passed; null when none have.
  d1: { hit: number; eligible: number };
  w1: { hit: number; eligible: number };
  w4: { hit: number; eligible: number };
};

export type UserMilestones = {
  userId: string;
  email: string;
  createdAt: string;
  firstAppAt: string | null;
  firstKeywordAt: string | null;
  firstCompetitorAt: string | null;
  firstInspectAt: string | null;
  tourCompletedAt: string | null;
  pricingViews: number;
  firstCheckoutAt: string | null;
  lastCheckoutAt: string | null;
  lastCheckoutPlan: string | null;
  paidAt: string | null;
  planSlug: string;
  // Other features, first use (see 20261023000005_engagement_recent_and_features.sql).
  firstCombinationAt: string | null;
  firstAiPromptAt: string | null;
  firstStoreLinkAt: string | null;
  firstAsaLinkAt: string | null;
  firstInviteAt: string | null;
  firstPushAt: string | null;
  firstCertificationAt: string | null;
};

export type RecentActiveUser = {
  userId: string;
  email: string;
  createdAt: string;
  planSlug: string;
  planName: string;
  lastActiveAt: string;
  visits7d: number;
  activeDays7d: number;
  activeSeconds7d: number;
  visitCount: number;
  activeSeconds: number;
  // All-time opens of /dashboard/subscription. The last-open time is null
  // for views from before 20261024000005_subscription_page_view_at.sql.
  pricingViews: number;
  lastPricingViewAt: string | null;
};

export type PayingUserEngagement = {
  userId: string;
  email: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastActiveAt: string | null;
  visitsLast14: number;
  visitsPrev14: number;
  activeDaysLast14: number;
};
