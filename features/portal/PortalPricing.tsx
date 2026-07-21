"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { PLANS, type PlanId } from "@/features/subscription/plans";

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

// Managed ASO isn't one of the 4 fast-choice cards below — it's a
// done-for-you service staffed by an actual specialist, not a self-serve
// tier, so it gets a single "talk to us" banner beneath the grid instead
// (see UpgradeButton.tsx, which does the same thing for the logged-in
// /dashboard/subscription page).
const plans = PLANS.filter((plan) => plan.id !== "enterprise").map((plan) => {
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
    description: plan.description,
    badge: plan.badge,
    features: plan.features,
    signupCta: isFree ? "Create free account" : "Upgrade now",
    variant: variantByPlan[plan.id],
    contactSales: false,
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
    card: "bg-gray-800/40 ring-1 ring-white/[0.08]",
    title: "text-gray-100",
    subtitle: "text-gray-500",
    price: "text-white",
    desc: "text-gray-400",
    check: "text-indigo-400",
    feature: "text-gray-300",
    cta: "bg-indigo-500 text-white hover:bg-indigo-400",
    badge: "bg-white/10 text-gray-300",
  },
  featured: {
    card: "bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-400/40 shadow-2xl shadow-indigo-900/40",
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
    card: "bg-gray-900 ring-1 ring-white/[0.12]",
    title: "text-white",
    subtitle: "text-gray-500",
    price: "text-white",
    desc: "text-gray-400",
    check: "text-emerald-400",
    feature: "text-gray-300",
    cta: "bg-white/[0.08] text-white hover:bg-white/[0.13] ring-1 ring-white/[0.12]",
    badge: "bg-white/10 text-gray-300",
  },
};

export default function PortalPricing({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="bg-gray-950 py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-4 lg:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Pricing</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            Start free. Scale as you grow — from solo indie devs to global publishing teams.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-gray-800/60 ring-1 ring-white/10 p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                !yearly ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                yearly ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Yearly
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${yearly ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-400"}`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-6 lg:max-w-7xl lg:grid-cols-4 lg:items-stretch" style={{ paddingTop: "1rem" }}>
          {plans.map((plan) => {
            const billing = yearly ? plan.yearly : plan.monthly;
            const s = cardStyles[plan.variant];
            const isFree = plan.name === "Free";
            const href = isAuthenticated
              ? isFree
                ? "/dashboard"
                : "/dashboard/subscription"
              : billing.signupHref;
            const cta = isAuthenticated
              ? isFree
                ? "Go to dashboard"
                : "Upgrade now"
              : plan.signupCta;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-6 ${s.card}`}
              >
                {plan.variant === "featured" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-yellow-900 shadow-lg shadow-yellow-900/30">
                      ★ Most Popular
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
                    <span className={`text-2xl font-bold tracking-tight ${s.price}`}>Contact sales</span>
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
                  className={`mt-8 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${s.cta}`}
                >
                  {cta}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-8 flex max-w-5xl flex-col items-center justify-between gap-5 rounded-2xl bg-gray-800/40 ring-1 ring-white/[0.08] px-10 py-8 sm:flex-row">
          <p className="text-lg text-gray-300">
            Need more apps, seats, or a hands-on team? <span className="text-gray-500">Managed ASO adds a dedicated growth manager and ASO specialist.</span>
          </p>
          <a
            href={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ?? "mailto:hello@appaso.io"}
            target={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ? "_blank" : undefined}
            rel={process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ? "noopener noreferrer" : undefined}
            className="shrink-0 rounded-lg bg-white/[0.08] px-6 py-3 text-base font-semibold text-white ring-1 ring-white/[0.12] transition-colors hover:bg-white/[0.13]"
          >
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}
