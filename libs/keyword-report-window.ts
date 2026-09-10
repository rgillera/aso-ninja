import type { PlanSlug } from "@/libs/contracts";

// The "Export Report" rolling month window
// (features/aso/keywords/performance/exportReport.ts) — always shows a full
// year of month tabs, regardless of plan; which of those tabs actually carry
// data (vs. a locked "upgrade to see this" tab) is gated by
// HISTORY_MONTHS_BY_PLAN below.
export const REPORT_MONTHS = 12;

// How many months of keyword history a given plan can see — shared by the
// Export Report, the Volume History panel, and the Rank History panel, so
// "how far back can this workspace look" means the same thing everywhere
// instead of three routes each guessing their own number. Mirrors
// plans.history_retention_days in
// supabase/migrations/20260909000002_plan_aware_rankings_retention.sql
// (30/30/180/365/365 days ≈ 1/1/6/12/12 months). Keep these two in sync: the
// DB value is what the underlying rank history actually survives to, this is
// just how each of those UIs presents that same entitlement.
export const HISTORY_MONTHS_BY_PLAN: Record<PlanSlug, number> = {
  free: 1,
  basic: 1,
  pro: 6,
  pro_plus: 12,
  enterprise: 12,
};

// Which plan a viewer currently entitled to `unlockedMonths` of history
// would need to upgrade to in order to see more — shared by every "upgrade
// to see the rest" prompt (the Export Report's locked tabs, Volume History,
// Rank History) so they all point at the same next tier instead of each
// re-deriving it. Only two thresholds exist above Free/Basic's 1 month, so
// this is just "which side of each one `unlockedMonths` falls on".
export function planNeededForMoreHistory(unlockedMonths: number): "Pro" | "Pro+" {
  return unlockedMonths < HISTORY_MONTHS_BY_PLAN.pro ? "Pro" : "Pro+";
}
