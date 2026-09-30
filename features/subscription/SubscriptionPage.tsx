"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon, SparklesIcon } from "@heroicons/react/20/solid";
import { PLANS, SELLABLE_PLANS, type PlanId } from "./plans";
import { UpgradeButton, type CardTone } from "./UpgradeButton";
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
};

type Billing = "monthly" | "yearly";

// Same three card treatments as the marketing pricing cards (PortalPricing.tsx),
// with dark-theme counterparts since the dashboard defaults to dark. Text
// sizes stay dashboard-sized; only the colors carry over.
const toneByPlan: Record<PlanId, CardTone> = {
  free: "default",
  basic: "default",
  pro: "featured",
  pro_plus: "default",
  enterprise: "premium",
};

const cardStyles: Record<CardTone, {
  card: string;
  title: string;
  subtitle: string;
  desc: string;
  check: string;
  feature: string;
  badge: string;
  divider: string;
}> = {
  default: {
    card: "bg-[#1a1d24] light:bg-white ring-1 ring-white/[0.08] light:ring-black/5 light:shadow-sm",
    title: "text-white light:text-gray-900",
    subtitle: "text-gray-500",
    desc: "text-gray-400 light:text-gray-600",
    check: "text-indigo-400 light:text-indigo-600",
    feature: "text-gray-300 light:text-gray-700",
    badge: "bg-indigo-500/15 text-indigo-300 light:bg-indigo-50 light:text-indigo-700",
    divider: "border-white/[0.08] light:border-black/[0.08]",
  },
  featured: {
    card: "bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-400/40 shadow-lg shadow-indigo-900/30",
    title: "text-white",
    subtitle: "text-indigo-200",
    desc: "text-indigo-100",
    check: "text-white",
    feature: "text-indigo-50",
    badge: "bg-white/20 text-white",
    divider: "border-white/20",
  },
  premium: {
    card: "bg-gradient-to-br from-gray-900 to-indigo-950 ring-1 ring-white/[0.08] shadow-lg",
    title: "text-white",
    subtitle: "text-gray-400",
    desc: "text-gray-400",
    check: "text-emerald-400",
    feature: "text-gray-300",
    badge: "bg-white/10 text-gray-300",
    divider: "border-white/10",
  },
};

// Whole-dollar amounts drop the decimals ("$149" not "$149.00"); anything
// with cents keeps two decimal places ("$12.49").
function formatPrice(cents: number) {
  const dollars = cents / 100;
  return cents % 100 === 0
    ? `$${dollars.toLocaleString()}`
    : `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function UsageBar({ label, used, limit, frozen, onColor }: { label: string; used: number; limit: number | null; frozen?: number; onColor?: boolean }) {
  const pct = limit === null ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  return (
    <div>
      <div className={`flex items-center justify-between text-xs ${onColor ? "text-indigo-100" : "text-gray-400 light:text-gray-600"}`}>
        <span>{label}</span>
        <span>
          {limit === null ? used.toLocaleString() : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
          {!!frozen && <span className="ml-1.5 text-amber-500 light:text-amber-700">({frozen.toLocaleString()} paused)</span>}
        </span>
      </div>
      <div className={`mt-1.5 h-1.5 rounded-full ${onColor ? "bg-white/20" : "bg-white/[0.06] light:bg-black/[0.05]"}`}>
        {limit !== null && (
          <div
            className={`h-full rounded-full ${onColor ? "bg-white" : "bg-indigo-500"}`}
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
}: Props) {
  const currentPlan = PLANS.find((p) => p.id === currentPlanId);
  const currentPlanIndex = PLANS.findIndex((p) => p.id === currentPlanId);
  // A retired plan (Basic) only shows up for a workspace still subscribed to it.
  const sellablePlans = PLANS.filter(
    (plan) => SELLABLE_PLANS.includes(plan) || (plan.retired && plan.id === currentPlanId)
  );
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
            className="text-sm text-gray-500 hover:text-white light:hover:text-gray-900 transition-colors"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white light:text-gray-900">Subscription</h1>
          <p className="mt-1 text-sm text-gray-400 light:text-gray-600">
            You&apos;re currently on the <span className="text-gray-200 light:text-gray-800 font-medium">{currentPlan?.name}</span>.
          </p>
        </div>

        {frozenTotal > 0 && (
          <div className="mb-8 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-300 light:text-amber-700">
            {frozenTotal.toLocaleString()} {frozenTotal === 1 ? "item is" : "items are"} paused because they exceed
            your plan&apos;s limits — upgrade to resume tracking them.
          </div>
        )}

        <div className="mb-8 inline-flex items-center gap-1 rounded-full bg-white/[0.06] light:bg-white p-1 light:shadow-sm light:ring-1 light:ring-black/5">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              billing === "monthly"
                ? "bg-indigo-500 light:bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 light:text-gray-500 hover:text-gray-200 light:hover:text-gray-900"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              billing === "yearly"
                ? "bg-indigo-500 light:bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 light:text-gray-500 hover:text-gray-200 light:hover:text-gray-900"
            }`}
          >
            Yearly
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                billing === "yearly"
                  ? "bg-white/20 text-white"
                  : "bg-indigo-500/15 light:bg-indigo-50 text-indigo-300 light:text-indigo-600"
              }`}
            >
              Save up to 25%
            </span>
          </button>
        </div>

        <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 ${sellablePlans.length > 4 ? "xl:grid-cols-5" : ""}`} style={{ paddingTop: "1rem" }}>
          {sellablePlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isPopular = plan.id === "pro";
            const isDowngrade = PLANS.indexOf(plan) < currentPlanIndex;
            const isFree = plan.priceMonthlyCents === 0;
            const displayCents = isFree
              ? 0
              : billing === "yearly"
                ? Math.round(plan.priceYearlyCents / 12)
                : plan.priceMonthlyCents;

            const tone = toneByPlan[plan.id];
            const c = cardStyles[tone];

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 ${c.card} ${
                  isCurrent && tone === "default" ? "!ring-indigo-500/60" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm ring-1 ring-black/5">
                      <SparklesIcon className="size-3.5" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h2 className={`text-base font-semibold ${c.title}`}>{plan.name.replace(/ Plan$/, "")}</h2>
                  {plan.badge && (
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${c.badge}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold ${c.title}`}>
                    {plan.contactSales ? "Custom" : isFree ? "Free" : formatPrice(displayCents)}
                  </span>
                  {!isFree && !plan.contactSales && (
                    <span className={`text-xs ${c.subtitle}`}>/ mo{billing === "yearly" && " · billed yearly"}</span>
                  )}
                </div>
                {!isFree && !plan.contactSales && billing === "yearly" && (
                  <p className={`mt-1 text-xs font-semibold ${c.subtitle}`}>
                    Save {formatPrice(plan.priceMonthlyCents * 12 - plan.priceYearlyCents)} a year
                  </p>
                )}

                <p className={`mt-3 text-sm leading-relaxed ${c.desc}`}>{plan.description}</p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon className={`size-4 shrink-0 mt-0.5 ${c.check}`} aria-hidden="true" />
                      <span className={`text-xs ${c.feature}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent && usage && (
                  <div className={`mt-5 space-y-3 border-t pt-5 ${c.divider}`}>
                    <UsageBar onColor={tone !== "default"} label="Keywords" used={usage.keyword_count} limit={usage.keyword_limit} frozen={usage.keyword_frozen_count} />
                    <UsageBar onColor={tone !== "default"} label="Apps" used={usage.app_count} limit={usage.app_limit} frozen={usage.app_frozen_count} />
                    <UsageBar onColor={tone !== "default"} label="Members" used={usage.member_count} limit={usage.member_limit} frozen={usage.member_frozen_count} />
                    <UsageBar onColor={tone !== "default"} label="Workspaces" used={usage.workspace_count} limit={usage.workspace_limit} />
                  </div>
                )}

                {isCurrent && pendingCancellation && (
                  <p className={`mt-4 text-xs ${tone === "default" ? "text-amber-400 light:text-amber-700" : "text-amber-200"}`}>
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
                  trialDays={plan.trialDays}
                  tone={tone}
                  initialScheduledFor={
                    plan.id === "free" ? (pendingCancellation ? pendingCancellation.currentPeriodEnd : undefined) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
