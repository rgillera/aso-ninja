import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { PLANS, type PlanId } from "./plans";

type Props = {
  currentPlanId: PlanId;
};

function nameColor(planId: PlanId) {
  if (planId === "pro" || planId === "pro_plus") return "text-red-500";
  if (planId === "enterprise") return "text-amber-400";
  return "text-white";
}

export default function SubscriptionPage({ currentPlanId }: Props) {
  const currentPlan = PLANS.find((p) => p.id === currentPlanId);

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">Subscription</h1>
          <p className="mt-1 text-sm text-gray-400">
            You&apos;re currently on the <span className="text-gray-200 font-medium">{currentPlan?.name}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl p-6 ring-1 ${
                  isCurrent
                    ? "bg-[#1a1d24] ring-indigo-500/40"
                    : "bg-[#1a1d24] ring-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-base font-semibold ${nameColor(plan.id)}`}>{plan.name}</h2>
                  {plan.badge && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-gray-300">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.cadence && <span className="text-xs text-gray-500">{plan.cadence}</span>}
                </div>

                <p className="mt-3 text-sm text-gray-400 leading-relaxed">{plan.description}</p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon className="size-4 shrink-0 mt-0.5 text-indigo-400" aria-hidden="true" />
                      <span className="text-xs text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent}
                  className={`mt-6 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isCurrent
                      ? "bg-white/[0.06] text-gray-500 cursor-default"
                      : "bg-indigo-500 text-white hover:bg-indigo-400"
                  }`}
                >
                  {isCurrent ? "Current plan" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
