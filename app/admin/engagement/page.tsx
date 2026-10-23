import { createAdminClient } from "@/libs/supabase/admin";
import AdminEngagementPage from "@/features/admin/AdminEngagementPage";
import { shortPlanName, type DailyActiveUsers, type PayingUserEngagement, type RecentActiveUser, type RetentionCohort, type UserMilestones } from "@/features/admin/types";
import { isSuperAdminEmail, superAdminEmails } from "@/libs/admin/is-super-admin";
import { fetchAllRows } from "@/libs/supabase/fetch-all";

const DAILY_DAYS = 30;
const COHORT_WEEKS = 8;
const RECENT_DAYS = 7;

type MilestoneRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  first_app_at: string | null;
  first_keyword_at: string | null;
  first_competitor_at: string | null;
  first_inspect_at: string | null;
  tour_completed_at: string | null;
  pricing_views: number;
  first_checkout_at: string | null;
  last_checkout_at: string | null;
  last_checkout_plan: string | null;
  paid_at: string | null;
  plan_slug: string;
  first_combination_at: string | null;
  first_ai_prompt_at: string | null;
  first_store_link_at: string | null;
  first_asa_link_at: string | null;
  first_invite_at: string | null;
  first_push_at: string | null;
  first_certification_at: string | null;
};

type RecentRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  plan_slug: string;
  plan_name: string | null;
  last_active_at: string;
  visits_7d: number;
  active_days_7d: number;
  active_seconds_7d: number;
  visit_count: number;
  active_seconds: number;
};

type PayingRow = {
  user_id: string;
  email: string | null;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_active_at: string | null;
  visits_last_14: number;
  visits_prev_14: number;
  active_days_last_14: number;
};

export default async function Page() {
  const admin = createAdminClient();
  // Super admins' own use of the app shouldn't count as engagement.
  const exclude = superAdminEmails();

  const [totals, daily, cohorts, milestones, paying, recent] = await Promise.all([
    admin.rpc("admin_active_user_totals", { p_exclude_emails: exclude }).single<{ dau: number; wau: number; mau: number }>(),
    admin.rpc("admin_daily_active_users", { p_days: DAILY_DAYS, p_exclude_emails: exclude }),
    admin.rpc("admin_retention_cohorts", { p_weeks: COHORT_WEEKS, p_exclude_emails: exclude }),
    fetchAllRows<MilestoneRow>((from, to) => admin.rpc("admin_user_milestones").range(from, to)),
    admin.rpc("admin_paying_user_engagement"),
    fetchAllRows<RecentRow>((from, to) =>
      admin.rpc("admin_recent_active_users", { p_days: RECENT_DAYS, p_exclude_emails: exclude }).range(from, to)
    ),
  ]);
  for (const r of [totals, daily, cohorts, milestones, paying, recent]) {
    if (r.error) throw r.error;
  }

  const dailyActive: DailyActiveUsers[] = (daily.data as { day: string; users: number }[]).map((d) => ({ day: d.day, users: d.users }));

  const retention: RetentionCohort[] = (
    cohorts.data as {
      cohort_week: string;
      users: number;
      d1_eligible: number;
      d1: number;
      w1_eligible: number;
      w1: number;
      w4_eligible: number;
      w4: number;
    }[]
  ).map((c) => ({
    cohortWeek: c.cohort_week,
    users: c.users,
    d1: { hit: c.d1, eligible: c.d1_eligible },
    w1: { hit: c.w1, eligible: c.w1_eligible },
    w4: { hit: c.w4, eligible: c.w4_eligible },
  }));

  const users: UserMilestones[] = milestones.data
    .filter((m) => !isSuperAdminEmail(m.email))
    .map((m) => ({
      userId: m.user_id,
      email: m.email ?? "(no email)",
      createdAt: m.created_at,
      firstAppAt: m.first_app_at,
      firstKeywordAt: m.first_keyword_at,
      firstCompetitorAt: m.first_competitor_at,
      firstInspectAt: m.first_inspect_at,
      tourCompletedAt: m.tour_completed_at,
      pricingViews: m.pricing_views,
      firstCheckoutAt: m.first_checkout_at,
      lastCheckoutAt: m.last_checkout_at,
      lastCheckoutPlan: m.last_checkout_plan,
      paidAt: m.paid_at,
      planSlug: m.plan_slug,
      firstCombinationAt: m.first_combination_at,
      firstAiPromptAt: m.first_ai_prompt_at,
      firstStoreLinkAt: m.first_store_link_at,
      firstAsaLinkAt: m.first_asa_link_at,
      firstInviteAt: m.first_invite_at,
      firstPushAt: m.first_push_at,
      firstCertificationAt: m.first_certification_at,
    }));

  const recentActive: RecentActiveUser[] = recent.data.map((r) => ({
    userId: r.user_id,
    email: r.email ?? "(no email)",
    createdAt: r.created_at,
    planSlug: r.plan_slug,
    planName: r.plan_name ? shortPlanName(r.plan_name) : "Free",
    lastActiveAt: r.last_active_at,
    visits7d: r.visits_7d,
    activeDays7d: r.active_days_7d,
    activeSeconds7d: r.active_seconds_7d,
    visitCount: r.visit_count,
    activeSeconds: r.active_seconds,
  }));

  const payingUsers: PayingUserEngagement[] = (paying.data as PayingRow[])
    .filter((p) => !isSuperAdminEmail(p.email))
    .map((p) => ({
      userId: p.user_id,
      email: p.email ?? "(no email)",
      planName: shortPlanName(p.plan_name),
      status: p.status,
      currentPeriodEnd: p.current_period_end,
      cancelAtPeriodEnd: p.cancel_at_period_end,
      lastActiveAt: p.last_active_at,
      visitsLast14: p.visits_last_14,
      visitsPrev14: p.visits_prev_14,
      activeDaysLast14: p.active_days_last_14,
    }));

  return (
    <AdminEngagementPage
      totals={totals.data!}
      dailyActive={dailyActive}
      retention={retention}
      users={users}
      payingUsers={payingUsers}
      recentActive={recentActive}
      recentDays={RECENT_DAYS}
    />
  );
}
