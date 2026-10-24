"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon, SparklesIcon } from "@heroicons/react/20/solid";
import { SELLABLE_PLANS, type PlanId } from "@/features/subscription/plans";
import PortalEyebrow from "./PortalEyebrow";

type Variant = "default" | "featured" | "premium";

const variantByPlan: Record<PlanId, Variant> = {
  free: "default",
  basic: "default",
  pro: "featured",
  pro_plus: "default",
  enterprise: "premium",
};

// Whole-dollar amounts drop the decimals ("$149" not "$149.00"); anything
// with cents keeps two decimal places ("$14.99").
function formatPrice(cents: number) {
  const dollars = cents / 100;
  return cents % 100 === 0
    ? `$${dollars.toLocaleString()}`
    : `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const salesUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const plans = SELLABLE_PLANS.map((plan) => {
  const isFree = plan.priceMonthlyCents === 0;
  return {
    id: plan.id,
    name: plan.name.replace(/ Plan$/, ""),
    monthly: {
      price: isFree ? "Free" : formatPrice(plan.priceMonthlyCents),
      signupHref: `/signup?plan=${plan.id}&next=${encodeURIComponent("/dashboard/subscription?billing=monthly")}`,
    },
    yearly: {
      price: isFree ? "Free" : formatPrice(Math.round(plan.priceYearlyCents / 12)),
      signupHref: `/signup?plan=${plan.id}&next=${encodeURIComponent("/dashboard/subscription?billing=yearly")}`,
    },
    yearlyTotal: isFree ? null : formatPrice(plan.priceYearlyCents),
    yearlySavings: isFree ? null : formatPrice(plan.priceMonthlyCents * 12 - plan.priceYearlyCents),
    description: plan.description,
    badge: plan.badge,
    // The "Includes all in X plan, plus:" line is a heading for the list,
    // not a feature of its own, so it's pulled out and shown without a check.
    includes: plan.features.find((f) => f.startsWith("Includes all")) ?? null,
    features: plan.features.filter((f) => !f.startsWith("Includes all")),
    trialDays: plan.trialDays,
    signupCta: isFree ? "Create free account" : plan.trialDays ? `Try free for ${plan.trialDays} days` : "Upgrade now",
    variant: variantByPlan[plan.id],
    contactSales: !!plan.contactSales,
  };
});

const cardStyles: Record<Variant, {
  card: string;
  title: string;
  subtitle: string;
  price: string;
  desc: string;
  check: string;
  feature: string;
  cta: string;
  badge: string;
  divider: string;
  muted: string;
}> = {
  default: {
    card: "bg-white shadow-clay ring-1 ring-black/5 transition-shadow hover:shadow-clay-lg",
    title: "text-gray-900",
    subtitle: "text-gray-500",
    price: "text-gray-900",
    desc: "text-gray-600",
    check: "text-indigo-600",
    feature: "text-gray-700",
    cta: "bg-indigo-600 text-white hover:bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700",
    divider: "border-gray-950/10",
    muted: "text-gray-500",
  },
  featured: {
    card: "bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-400/40 shadow-2xl shadow-indigo-500/30 lg:-my-4 lg:py-10",
    title: "text-white",
    subtitle: "text-indigo-200",
    price: "text-white",
    desc: "text-indigo-100",
    check: "text-white",
    feature: "text-indigo-50",
    cta: "bg-white text-indigo-600 hover:bg-indigo-50",
    badge: "bg-white/20 text-white",
    divider: "border-white/20",
    muted: "text-indigo-200",
  },
  premium: {
    card: "bg-gradient-to-br from-gray-900 to-indigo-950 shadow-clay-lg",
    title: "text-white",
    subtitle: "text-gray-400",
    price: "text-white",
    desc: "text-gray-400",
    check: "text-emerald-400",
    feature: "text-gray-300",
    cta: "bg-white/[0.08] text-white ring-1 ring-white/15 hover:bg-white/[0.13]",
    badge: "bg-white/10 text-gray-300",
    divider: "border-white/10",
    muted: "text-gray-400",
  },
};

export default function PortalPricing({ isAuthenticated }: { isAuthenticated: boolean }) {
  // Yearly first: the per-month price is the lower anchor visitors see.
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="relative isolate overflow-hidden bg-gray-50 py-24 sm:py-32">
      {/* Soft glow behind the featured card, same treatment as the hero. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 h-[32rem] w-[56rem] max-w-full -translate-x-1/2 -translate-y-1/4 rounded-full bg-indigo-400/15 blur-3xl"
      />

      <div className="mx-auto max-w-[90rem] px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <PortalEyebrow>Pricing</PortalEyebrow>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
            Simple,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">transparent pricing</span>
          </h2>
          <p className="mt-6 text-balance text-lg text-gray-600">
            Start free. Scale as you grow, from solo indie devs to global publishing teams.
          </p>

          {/* Billing toggle: two equal-width segments with one pill that
              slides between them. */}
          <div className="relative mt-10 inline-grid grid-cols-2 rounded-full bg-white p-1 shadow-clay-inset ring-1 ring-black/5">
            <span
              aria-hidden="true"
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-indigo-600 shadow-clay-sm transition-transform duration-300 ease-out ${
                yearly ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              aria-pressed={!yearly}
              onClick={() => setYearly(false)}
              className={`relative rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                !yearly ? "text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={yearly}
              onClick={() => setYearly(true)}
              className={`relative flex items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                yearly ? "text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Yearly
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${yearly ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-6 pt-4 lg:mt-20 lg:max-w-7xl lg:grid-cols-4 lg:items-stretch">
          {plans.map((plan) => {
            const billing = yearly ? plan.yearly : plan.monthly;
            const s = cardStyles[plan.variant];
            const isFree = plan.name === "Free";
            // Enterprise is priced per deal, so it books a call instead of
            // signing up (UpgradeButton.tsx does the same in the dashboard).
            const href = plan.contactSales
              ? salesUrl ?? "mailto:hello@appaso.io"
              : isAuthenticated
              ? isFree
                ? "/dashboard"
                : "/dashboard/subscription"
              : billing.signupHref;
            const cta = plan.contactSales
              ? "Talk to us"
              : isAuthenticated
              ? isFree
                ? "Go to dashboard"
                : plan.trialDays
                  ? `Try free for ${plan.trialDays} days`
                  : "Upgrade now"
              : plan.signupCta;
            // One line under the price on every card, so the cards stay the
            // same height when the billing toggle flips.
            const priceNote = plan.contactSales
              ? "Tailored to your portfolio"
              : isFree
              ? "No credit card required"
              : yearly
              ? `${plan.yearlyTotal} billed yearly · save ${plan.yearlySavings}`
              : `or ${plan.yearly.price}/mo billed yearly`;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl p-8 ${s.card}`}
              >
                {plan.variant === "featured" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-indigo-600 shadow-clay-sm ring-1 ring-black/5">
                      <SparklesIcon className="size-3.5" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-lg font-semibold ${s.title}`}>{plan.name}</h3>
                  {plan.badge && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${s.badge}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className={`mt-2 min-h-12 text-sm leading-6 ${s.desc}`}>{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-x-1.5">
                  <span className={`text-5xl font-semibold tracking-tight tabular-nums ${s.price}`}>
                    {plan.contactSales ? "Custom" : billing.price}
                  </span>
                  {!isFree && !plan.contactSales && (
                    <span className={`text-sm font-medium ${s.subtitle}`}>/mo</span>
                  )}
                </div>
                <p className={`mt-2 text-xs font-medium ${s.subtitle}`}>{priceNote}</p>

                <a
                  href={href}
                  target={plan.contactSales && salesUrl ? "_blank" : undefined}
                  rel={plan.contactSales && salesUrl ? "noopener noreferrer" : undefined}
                  className={`group mt-8 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${s.cta}`}
                >
                  {cta}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>

                <div className={`mt-8 flex-1 border-t pt-8 ${s.divider}`}>
                  {plan.includes && (
                    <p className={`mb-4 text-xs font-semibold uppercase tracking-wider ${s.muted}`}>{plan.includes}</p>
                  )}
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <CheckIcon className={`mt-0.5 size-5 shrink-0 ${s.check}`} aria-hidden="true" />
                        <span className={`text-sm ${s.feature}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
