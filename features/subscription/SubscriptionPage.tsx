"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/20/solid";
import { PLANS, type PlanId } from "./plans";
import { UpgradeButton } from "./UpgradeButton";
import type { WorkspaceUsage } from "@/libs/contracts";

// Stripe redirects back here as soon as checkout completes, but the plan
// upgrade itself lands a moment later via webhook. Poll a few times so the
// page catches up without the user having to refresh manually.
function useRefreshUntilUpgraded(success: boolean) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!success) return;

    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 6) {
        clearInterval(id);
        router.replace(pathname);
      }
    }, 1500);

    return () => clearInterval(id);
  }, [success, router, pathname]);
}

type Props = {
  currentPlanId: PlanId;
  workspaceId: string;
  usage?: WorkspaceUsage;
  pendingCancellation?: { currentPeriodEnd: string | null } | null;
  hasUsedTrial?: boolean;
};

type Billing = "monthly" | "yearly";

function nameColor(planId: PlanId) {
  if (planId === "basic") return "text-emerald-500";
  if (planId === "pro") return "text-red-500";
  if (planId === "pro_plus") return "text-violet-400";
  if (planId === "enterprise") return "text-amber-400";
  return "text-white";
}

// Whole-dollar amounts drop the decimals ("$149" not "$149.00"); anything
// with cents keeps two decimal places ("$12.49").
function formatPrice(cents: number) {
  const dollars = cents / 100;
  return cents % 100 === 0
    ? `$${dollars.toLocaleString()}`
    : `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function UsageBar({ label, used, limit, frozen }: { label: string; used: number; limit: number | null; frozen?: number }) {
  const pct = limit === null ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          {limit === null ? used.toLocaleString() : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
          {!!frozen && <span className="ml-1.5 text-amber-500">({frozen.toLocaleString()} paused)</span>}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06]">
        {limit !== null && (
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function SubscriptionPage({
  currentPlanId,
  workspaceId,
  usage,
  pendingCancellation,
  hasUsedTrial,
}: Props) {
  const currentPlan = PLANS.find((p) => p.id === currentPlanId);
  const currentPlanIndex = PLANS.findIndex((p) => p.id === currentPlanId);
  // Managed ASO is a done-for-you service, not a self-serve tier — it gets a
  // "talk to us" banner below the grid instead of a card (see PortalPricing.tsx,
  // which does the same thing on the marketing pricing page).
  const sellablePlans = PLANS.filter((plan) => plan.id !== "enterprise");
  const frozenTotal = usage
    ? usage.keyword_frozen_count + usage.app_frozen_count + usage.member_frozen_count
    : 0;
  const [billing, setBilling] = useState<Billing>("yearly");
  const searchParams = useSearchParams();
  useRefreshUntilUpgraded(searchParams.get("success") === "1");

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[85rem] px-6 py-10">
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

        {frozenTotal > 0 && (
          <div className="mb-8 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-300">
            {frozenTotal.toLocaleString()} {frozenTotal === 1 ? "item is" : "items are"} paused because they exceed
            your plan&apos;s limits — upgrade to resume tracking them.
          </div>
        )}

        <div className="mb-8 inline-flex items-center gap-1 rounded-lg bg-white/[0.06] p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              billing === "monthly" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              billing === "yearly" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Yearly
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              2 months free
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" style={{ paddingTop: "1rem" }}>
          {sellablePlans.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId;
            const isPopular = plan.id === "pro";
            const isDowngrade = index < currentPlanIndex;
            const isFree = plan.priceMonthlyCents === 0;
            const displayCents = isFree
              ? 0
              : billing === "yearly"
                ? Math.round(plan.priceYearlyCents / 12)
                : plan.priceMonthlyCents;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 ring-1 ${
                  isCurrent
                    ? "bg-[#1a1d24] ring-indigo-500/40"
                    : isPopular
                      ? "bg-[#1a1d24] ring-indigo-500/40"
                      : "bg-[#1a1d24] ring-white/[0.08]"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-yellow-900 shadow-lg shadow-yellow-900/30">
                      ★ Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-base font-semibold ${nameColor(plan.id)}`}>{plan.name}</h2>
                  {plan.badge && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-gray-300">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white">
                    {isFree ? "Free" : formatPrice(displayCents)}
                  </span>
                  {!isFree && <span className="text-xs text-gray-500">/ mo</span>}
                </div>
                {!isFree && billing === "yearly" && (
                  <p className="mt-1 text-xs text-gray-500">
                    billed annually as {formatPrice(plan.priceYearlyCents)}
                  </p>
                )}

                <p className="mt-3 text-sm text-gray-400 leading-relaxed">{plan.description}</p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon className="size-4 shrink-0 mt-0.5 text-indigo-400" aria-hidden="true" />
                      <span className="text-xs text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent && usage && (
                  <div className="mt-5 space-y-3 border-t border-white/[0.08] pt-5">
                    <UsageBar label="Keywords" used={usage.keyword_count} limit={usage.keyword_limit} frozen={usage.keyword_frozen_count} />
                    <UsageBar label="Apps" used={usage.app_count} limit={usage.app_limit} frozen={usage.app_frozen_count} />
                    <UsageBar label="Members" used={usage.member_count} limit={usage.member_limit} frozen={usage.member_frozen_count} />
                    <UsageBar label="Workspaces" used={usage.workspace_count} limit={usage.workspace_limit} />
                  </div>
                )}

                {isCurrent && pendingCancellation && (
                  <p className="mt-4 text-xs text-amber-400">
                    {pendingCancellation.currentPeriodEnd
                      ? `Switches to Free on ${formatDate(pendingCancellation.currentPeriodEnd)}`
                      : "Switches to Free at the end of your billing period"}
                  </p>
                )}

                <UpgradeButton
                  planSlug={plan.id}
                  workspaceId={workspaceId}
                  isCurrent={isCurrent}
                  isDowngrade={isDowngrade}
                  billing={billing}
                  trialDays={hasUsedTrial ? undefined : plan.trialDays}
                  initialScheduledFor={
                    plan.id === "free" ? (pendingCancellation ? pendingCancellation.currentPeriodEnd : undefined) : undefined
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-between gap-3 rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] px-6 py-5 sm:flex-row">
          <p className="text-sm text-gray-300">
            {currentPlanId === "enterprise" ? (
              <>You&apos;re on <span className="text-amber-400 font-medium">Managed ASO</span>.</>
            ) : (
              <>Need more apps, seats, or a hands-on team? <span className="text-gray-500">Managed ASO adds a dedicated growth manager and ASO specialist.</span></>
            )}
          </p>
          <a
            href={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ?? "mailto:hello@appaso.io"}
            target={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ? "_blank" : undefined}
            rel={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ? "noopener noreferrer" : undefined}
            className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            {currentPlanId === "enterprise" ? "Book a call" : "Talk to us"}
          </a>
        </div>
      </div>
    </main>
  );
}
