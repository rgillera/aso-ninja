"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";

type Variant = "default" | "featured" | "premium";

const plans: {
  name: string;
  monthly: { price: string; href: string };
  yearly: { price: string; href: string };
  description: string;
  badge: string | null;
  features: string[];
  cta: string;
  variant: Variant;
  contactSales: boolean;
}[] = [
  {
    name: "Starter",
    monthly: { price: "$14.99", href: "/signup?plan=starter&billing=monthly" },
    yearly: { price: "$9.99", href: "/signup?plan=starter&billing=yearly" },
    description: "Everything you need to launch, track, and grow your first app.",
    badge: "7-day free trial",
    features: [
      "1 workspace",
      "5 apps",
      "500 keywords tracked",
      "90-day rank history",
      "Daily reviews sync",
      "Rank alerts via email",
      "Competitor analysis",
    ],
    cta: "Start free trial",
    variant: "default",
    contactSales: false,
  },
  {
    name: "Pro",
    monthly: { price: "$249", href: "/signup?plan=pro&billing=monthly" },
    yearly: { price: "$199", href: "/signup?plan=pro&billing=yearly" },
    description: "Advanced tracking and collaboration for teams shipping multiple apps.",
    badge: "7-day free trial",
    features: [
      "3 workspaces",
      "20 apps",
      "2,000 keywords tracked",
      "Full rank history",
      "Daily reviews sync",
      "Rank alerts via email & Slack",
      "Competitor analysis",
      "Priority support",
    ],
    cta: "Get started",
    variant: "featured",
    contactSales: false,
  },
  {
    name: "Enterprise",
    monthly: { price: "$1,499", href: "/signup?plan=enterprise&billing=monthly" },
    yearly: { price: "$1,199", href: "/signup?plan=enterprise&billing=yearly" },
    description: "Unlimited scale for agencies and publishers managing large app portfolios.",
    badge: null,
    features: [
      "Everything in Pro",
      "Unlimited workspaces & apps",
      "Unlimited keywords tracked",
      "Dedicated account manager",
      "Custom integrations",
      "SLA & uptime guarantee",
      "Onboarding & training",
      "Invoiced billing",
    ],
    cta: "Get started",
    variant: "premium",
    contactSales: false,
  },
];

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

export default function PortalPricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="bg-gray-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
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
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-6xl lg:grid-cols-3 lg:items-stretch" style={{ paddingTop: "1rem" }}>
          {plans.map((plan) => {
            const billing = yearly ? plan.yearly : plan.monthly;
            const s = cardStyles[plan.variant];
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-8 ${s.card}`}
              >
                {plan.variant === "featured" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-yellow-900 shadow-lg shadow-yellow-900/30">
                      ★ Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <h3 className={`text-lg font-semibold ${s.title}`}>{plan.name}</h3>
                  {plan.badge && (
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.badge}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-x-2">
                  {plan.contactSales ? (
                    <span className={`text-3xl font-bold tracking-tight ${s.price}`}>Contact sales</span>
                  ) : (
                    <>
                      <span className={`text-5xl font-bold tracking-tight ${s.price}`}>
                        {billing.price}
                      </span>
                      <span className={`text-sm ${s.subtitle}`}>
                        / mo{yearly && " · billed yearly"}
                      </span>
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
                  href={billing.href}
                  className={`mt-8 block rounded-md px-4 py-3 text-center text-sm font-semibold transition-colors ${s.cta}`}
                >
                  {plan.cta}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
