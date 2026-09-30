"use client";

import { useState } from "react";
import { CheckIcon, SparklesIcon } from "@heroicons/react/20/solid";
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
      signupHref: `/signup?plan=${plan.id}&billing=monthly&next=/dashboard/subscription`,
    },
    yearly: {
      price: isFree ? "Free" : formatPrice(Math.round(plan.priceYearlyCents / 12)),
      signupHref: `/signup?plan=${plan.id}&billing=yearly&next=/dashboard/subscription`,
    },
    yearlySavings: isFree ? null : formatPrice(plan.priceMonthlyCents * 12 - plan.priceYearlyCents),
    description: plan.description,
    badge: plan.badge,
    features: plan.features,
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
}> = {
  default: {
    card: "bg-white shadow-clay ring-1 ring-black/5",
    title: "text-gray-900",
    subtitle: "text-gray-500",
    price: "text-gray-900",
    desc: "text-gray-600",
    check: "text-indigo-600",
    feature: "text-gray-700",
    cta: "bg-indigo-600 text-white shadow-clay-btn hover:bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700",
  },
  featured: {
    card: "bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-400/40 shadow-clay-lg",
    title: "text-white",
    subtitle: "text-indigo-200",
    price: "text-white",
    desc: "text-indigo-100",
    check: "text-white",
    feature: "text-indigo-50",
    cta: "bg-white text-indigo-600 hover:bg-indigo-50",
    badge: "bg-white/20 text-white",
  },
  premium: {
    card: "bg-gradient-to-br from-gray-900 to-indigo-950 shadow-clay-lg",
    title: "text-white",
    subtitle: "text-gray-400",
    price: "text-white",
    desc: "text-gray-400",
    check: "text-emerald-400",
    feature: "text-gray-300",
    cta: "bg-white/[0.08] text-white hover:bg-white/[0.13]",
    badge: "bg-white/10 text-gray-300",
  },
};

export default function PortalPricing({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="bg-[#eef0f5] py-24 sm:py-28">
      <div className="mx-auto max-w-[90rem] px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <PortalEyebrow>Pricing</PortalEyebrow>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-6 text-lg text-gray-600">
            Start free. Scale as you grow, from solo indie devs to global publishing teams.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white p-1 shadow-clay-inset ring-1 ring-black/5">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                !yearly ? "bg-indigo-600 text-white shadow-clay-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                yearly ? "bg-indigo-600 text-white shadow-clay-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Yearly
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${yearly ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                Save up to 25%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-6 lg:max-w-7xl lg:grid-cols-4 lg:items-stretch" style={{ paddingTop: "1rem" }}>
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
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-6 ${s.card}`}
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

                <div className="mt-4 flex items-baseline gap-x-2">
                  {plan.contactSales ? (
                    <span className={`text-4xl font-bold tracking-tight ${s.price}`}>Custom</span>
                  ) : (
                    <>
                      <span className={`text-4xl font-bold tracking-tight ${s.price}`}>
                        {billing.price}
                      </span>
                      {!isFree && (
                        <span className={`text-xs ${s.subtitle}`}>
                          / mo{yearly && " · billed yearly"}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {yearly && plan.yearlySavings && !plan.contactSales && (
                  <p className={`mt-1 text-xs font-semibold ${s.subtitle}`}>Save {plan.yearlySavings} a year</p>
                )}

                <p className={`mt-4 text-sm leading-relaxed ${s.desc}`}>{plan.description}</p>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckIcon className={`size-5 shrink-0 mt-0.5 ${s.check}`} aria-hidden="true" />
                      <span className={`text-sm ${s.feature}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={href}
                  target={plan.contactSales && salesUrl ? "_blank" : undefined}
                  rel={plan.contactSales && salesUrl ? "noopener noreferrer" : undefined}
                  className={`mt-8 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${s.cta}`}
                >
                  {cta}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
