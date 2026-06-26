"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";

const plans = [
  {
    name: "Pro",
    monthly: { price: "$14.99", href: "/signup?plan=pro&billing=monthly" },
    yearly: { price: "$9.99", href: "/signup?plan=pro&billing=yearly" },
    description: "For growing teams managing multiple apps.",
    badge: "7-day free trial",
    features: [
      "3 workspaces",
      "20 apps",
      "500 keywords tracked",
      "90-day rank history",
      "Daily reviews sync",
      "Rank alerts via email",
      "Competitor analysis",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Agency",
    monthly: { price: "$299", href: "/signup?plan=agency&billing=monthly" },
    yearly: { price: "$249", href: "/signup?plan=agency&billing=yearly" },
    description: "For agencies managing apps across multiple clients.",
    badge: null,
    features: [
      "Unlimited workspaces",
      "Unlimited apps",
      "Unlimited keywords",
      "Full rank history",
      "Daily reviews sync",
      "Rank alerts via email & Slack",
      "Competitor analysis",
      "Priority support",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

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
            Start free. Upgrade when you need more apps, keywords, or history.
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
                Save 33%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
          {plans.map((plan) => {
            const billing = yearly ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl p-8 ring-1 ${
                  plan.highlighted
                    ? "bg-indigo-500 ring-indigo-500"
                    : "bg-gray-800/50 ring-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-white" : "text-gray-300"}`}>
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {billing.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? "text-indigo-200" : "text-gray-400"}`}>
                    / mo{yearly && " · billed yearly"}
                  </span>
                </div>

                <p className={`mt-4 text-sm ${plan.highlighted ? "text-indigo-100" : "text-gray-400"}`}>
                  {plan.description}
                </p>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckIcon
                        className={`size-5 shrink-0 mt-0.5 ${plan.highlighted ? "text-white" : "text-indigo-400"}`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm ${plan.highlighted ? "text-indigo-100" : "text-gray-300"}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={billing.href}
                  className={`mt-8 block rounded-md px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-white text-indigo-600 hover:bg-indigo-50"
                      : "bg-indigo-500 text-white hover:bg-indigo-400"
                  }`}
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
