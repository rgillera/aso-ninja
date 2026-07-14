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
