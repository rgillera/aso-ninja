import { isPlanAtLeast } from "@/features/subscription/planTiers";
import type { PlanSlug } from "@/libs/contracts";

// Keyword Inspector is open to every signed-in user. Below Pro it's capped at
// this many lookups a day (UTC), counted per user. Every inspection is one
// lookup, the same keyword again included. Enforced by app/api/keywords/inspect
// (keyword_inspector_lookups); the page only displays it.
export const FREE_DAILY_INSPECTIONS = 3;

// null = unlimited.
export function inspectorDailyLimit(planSlug: PlanSlug): number | null {
  return isPlanAtLeast(planSlug, "pro") ? null : FREE_DAILY_INSPECTIONS;
}

// Today's allowance as the page shows it. null limit = unlimited.
export type InspectorUsage = { used: number; limit: number | null };
