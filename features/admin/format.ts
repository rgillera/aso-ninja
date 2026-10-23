// Shared by the admin Users and Engagement pages.

export const PLAN_BADGE_CLASSES: Record<string, string> = {
  free: "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600",
  basic: "bg-sky-500/10 text-sky-400 light:text-sky-700",
  pro: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700",
  pro_plus: "bg-violet-500/10 text-violet-400 light:text-violet-700",
  enterprise: "bg-amber-500/10 text-amber-400 light:text-amber-700",
};

export const PLAN_BADGE_FALLBACK = "bg-white/[0.06] light:bg-black/[0.05] text-gray-400 light:text-gray-600";

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
