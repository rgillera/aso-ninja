import Link from "next/link";
import { CheckCircleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { PlanSlug } from "@/libs/contracts";
import type { ComponentType } from "react";

const TIER_LABEL: Partial<Record<PlanSlug, string>> = {
  basic: "Basic",
  pro: "Pro",
  pro_plus: "Pro+",
  enterprise: "Enterprise",
};

const TIER_COLOR: Partial<Record<PlanSlug, { icon: string; ring: string; button: string; check: string }>> = {
  basic: {
    icon: "text-emerald-500 light:text-emerald-700",
    ring: "bg-emerald-500/10",
    button: "bg-emerald-500/10 text-emerald-500 light:text-emerald-700 hover:bg-emerald-500/20",
    check: "text-emerald-500/80 light:text-emerald-700",
  },
  pro: {
    icon: "text-violet-400 light:text-violet-700",
    ring: "bg-violet-500/10",
    button: "bg-violet-500/10 text-violet-400 light:text-violet-700 hover:bg-violet-500/20",
    check: "text-violet-400/80 light:text-violet-700",
  },
  pro_plus: {
    icon: "text-amber-500 light:text-amber-700",
    ring: "bg-amber-500/10",
    button: "bg-amber-500/10 text-amber-500 light:text-amber-700 hover:bg-amber-500/20",
    check: "text-amber-500/80 light:text-amber-700",
  },
  enterprise: {
    icon: "text-indigo-400 light:text-indigo-700",
    ring: "bg-indigo-500/10",
    button: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700 hover:bg-indigo-500/20",
    check: "text-indigo-400/80 light:text-indigo-700",
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
    <div className="mx-6 mt-6 rounded-2xl bg-[#1a1d24] light:bg-white flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className={`relative flex size-16 items-center justify-center rounded-2xl ${color.ring}`}>
        <Icon className={`size-8 ${color.icon}`} />
        <span className={`absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-[#1a1d24] light:bg-white`}>
          <LockClosedIcon className={`size-3 ${color.icon}`} />
        </span>
      </div>

      <p className="mt-4 text-base font-semibold text-white light:text-gray-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>

      {benefits.length > 0 && (
        <ul className="mt-5 flex flex-col items-start gap-2 text-left">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-gray-400 light:text-gray-600">
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
        Upgrade to {TIER_LABEL[minPlan] ?? "Enterprise"}
      </Link>
    </div>
  );
}
