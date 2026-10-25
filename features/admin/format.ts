// Shared by the admin Users and Engagement pages.

export const PLAN_BADGE_CLASSES: Record<string, string> = {
  free: "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600",
  basic: "bg-sky-500/10 text-sky-400 light:text-sky-700",
  pro: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700",
  pro_plus: "bg-violet-500/10 text-violet-400 light:text-violet-700",
  enterprise: "bg-amber-500/10 text-amber-400 light:text-amber-700",
  // Signup Pro trial: still on the free plan, but get_effective_plan reads Pro.
  pro_trial: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700 ring-1 ring-inset ring-indigo-500/30",
};

export const PLAN_BADGE_FALLBACK = "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600";

export function planBadgeClass(u: { planSlug: string; proTrialEndsAt: string | null }): string {
  return PLAN_BADGE_CLASSES[u.proTrialEndsAt ? "pro_trial" : u.planSlug] ?? PLAN_BADGE_FALLBACK;
}

export function proTrialTitle(proTrialEndsAt: string | null): string | undefined {
  return proTrialEndsAt ? `Pro trial ends ${new Date(proTrialEndsAt).toLocaleString()}` : undefined;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
