import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";

// Keyword Inspector is Pro and above, which includes the signup Pro trial
// (it reads as Pro, see get_effective_plan). Enforced by
// app/api/keywords/inspect; the page only shows the lock.
export function canUseInspector(planSlug: PlanSlug) {
  return isPlanAtLeast(planSlug, "pro");
}
