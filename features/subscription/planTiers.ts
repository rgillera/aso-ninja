import type { PlanSlug } from "@/libs/contracts";

const PLAN_ORDER: Record<PlanSlug, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  pro_plus: 3,
  enterprise: 4,
};

export function isPlanAtLeast(planSlug: PlanSlug, minimum: PlanSlug): boolean {
  return PLAN_ORDER[planSlug] >= PLAN_ORDER[minimum];
}

// Shared plan-tier badge styling — used anywhere a workspace's current plan
// shows as a small colored pill (the sidebar footer's old spot, Workspace
// Settings' Plan section, ...), so the color/label for a given tier stays
// the same wherever it shows up instead of drifting between copies.
export const PLAN_BADGE: Record<PlanSlug, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-white/5 light:bg-black/[0.05] text-gray-400 light:text-gray-600" },
  basic: { label: "Basic", className: "bg-emerald-500/10 text-emerald-500 light:text-emerald-700" },
  pro: { label: "Pro", className: "bg-violet-500/10 text-violet-400 light:text-violet-700" },
  pro_plus: { label: "Pro+", className: "bg-amber-500/10 text-amber-500 light:text-amber-700" },
  enterprise: { label: "Enterprise", className: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700" },
};
