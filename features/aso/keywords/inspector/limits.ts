import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";

// Keyword Inspector is Pro and above, which includes the signup Pro trial
// (it reads as Pro, see get_effective_plan). Enforced by
// app/api/keywords/inspect; the page only shows the lock.
export function canUseInspector(planSlug: PlanSlug) {
  return isPlanAtLeast(planSlug, "pro");
}

// The relevancy column on the Inspector's top results is Pro and above, same
// as the Inspector itself, so the signup trial (Pro) gets it too. Enforced by
// app/api/keywords/inspect/relevancy, which scores this many top results.
export const RELEVANCY_APPS_LIMIT = 10;

export function canUseInspectorRelevancy(planSlug: PlanSlug) {
  return isPlanAtLeast(planSlug, "pro");
}
