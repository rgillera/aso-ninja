import Link from "next/link";
import { CheckCircleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { PlanSlug } from "@/libs/contracts";
import type { ComponentType } from "react";

const TIER_LABEL: Partial<Record<PlanSlug, string>> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Managed ASO",
};

const TIER_COLOR: Partial<Record<PlanSlug, { icon: string; ring: string; button: string; check: string }>> = {
  basic: {
    icon: "text-emerald-500",
    ring: "bg-emerald-500/10",
    button: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
    check: "text-emerald-500/80",
  },
  pro: {
    icon: "text-red-500",
    ring: "bg-red-500/10",
    button: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    check: "text-red-500/80",
  },
  enterprise: {
    icon: "text-amber-400",
    ring: "bg-amber-400/10",
    button: "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20",
    check: "text-amber-400/80",
  },
};

export function FeatureLocked({
  title,
  description,
  minPlan,
  icon: Icon = LockClosedIcon,
  benefits = [],
}: {
  title: string;
  description: string;
  minPlan: PlanSlug;
  /** Feature-specific icon shown in the badge circle — defaults to a plain lock. */
  icon?: ComponentType<{ className?: string }>;
  /** Short list of what unlocking this screen gets the user. */
  benefits?: string[];
}) {
  const color = TIER_COLOR[minPlan] ?? TIER_COLOR.enterprise!;
  return (
    <div className="mx-6 mt-6 rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.07] flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className={`relative flex size-16 items-center justify-center rounded-2xl ${color.ring}`}>
        <Icon className={`size-8 ${color.icon}`} />
        <span className={`absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-[#1a1d24] ring-1 ring-white/[0.07]`}>
          <LockClosedIcon className={`size-3 ${color.icon}`} />
        </span>
      </div>

      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>

      {benefits.length > 0 && (
        <ul className="mt-5 flex flex-col items-start gap-2 text-left">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-gray-400">
              <CheckCircleIcon className={`mt-0.5 size-4 shrink-0 ${color.check}`} />
              {benefit}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/dashboard/subscription"
        className={`mt-6 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${color.button}`}
      >
        Upgrade to {TIER_LABEL[minPlan] ?? "Managed ASO"}
      </Link>
    </div>
  );
}
