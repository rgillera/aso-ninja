import type { PlanSlug } from "@/libs/contracts";

const PLAN_ORDER: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  enterprise: 3,
};

export function isPlanAtLeast(planSlug: PlanSlug, minimum: PlanSlug): boolean {
  return PLAN_ORDER[planSlug] >= PLAN_ORDER[minimum];
}
