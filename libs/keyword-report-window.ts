import type { PlanSlug } from "@/libs/contracts";

// The "Export Report" rolling month window
// (features/aso/keywords/performance/exportReport.ts) — always shows a full
// year of month tabs, regardless of plan; which of those tabs actually carry
// data (vs. a locked "upgrade to see this" tab) is gated by
// REPORT_MONTHS_BY_PLAN below.
export const REPORT_MONTHS = 12;

// How many of REPORT_MONTHS' tabs, counting back from the current month, a
// given plan unlocks — mirrors plans.history_retention_days in
// supabase/migrations/20260909000002_plan_aware_rankings_retention.sql
// (30/30/180/365/365 days ≈ 1/1/6/12/12 months). Keep these two in sync: the
// DB value is what the underlying rank history actually survives to, this is
// just how the export presents that same entitlement.
export const REPORT_MONTHS_BY_PLAN: Record<PlanSlug, number> = {
  free: 1,
  basic: 1,
  pro: 6,
  pro_plus: 12,
  enterprise: 12,
};
