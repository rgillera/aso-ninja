import type { Metadata } from "next";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "Managed ASO",
  description:
    "Done-for-you App Store Optimization. Our team handles keyword research, metadata, and creative iteration for your app.",
  alternates: {
    canonical: "/managed-aso",
  },
};

type Tier = {
  name: string;
  priceMonthly: number;
  featured: boolean;
  features: string[];
  team: { role: string; included: boolean }[];
};

const tiers: Tier[] = [
  {
    name: "Starter",
    priceMonthly: 1000,
    featured: false,
    features: [
      "Ongoing app store funnel audit & optimization recommendations",
      "Ongoing ASO for 1 app across 2 countries (iOS & Google Play)",
      "Monthly performance report with clear, actionable insights",
      "Dedicated collaboration via WhatsApp for ongoing support & coordination",
      "App Growth Guide & strategic support to help scale installs, retention, and overall app performance",
    ],
    team: [
      { role: "Project Manager", included: true },
      { role: "ASO Specialist", included: true },
      { role: "ASA & Meta Ad Manager", included: false },
      { role: "Creative Team", included: false },
    ],
  },
  {
    name: "Growth",
    priceMonthly: 4000,
    featured: true,
    features: [
      "Ongoing app store funnel audit & optimization recommendations",
      "Ongoing ASO for 1 app across 3 countries (iOS & Google Play)",
      "Monthly performance report with clear, actionable insights",
      "App Store listing experiments (conversion rate optimization)",
      "Paid acquisition management across Meta & Apple Search Ads",
      "Creative & social assets to fuel campaigns and store listings",
      "Dedicated collaboration via WhatsApp for ongoing support & coordination",
      "App Growth Guide & strategic support to help scale installs, retention, and overall app performance",
    ],
    team: [
      { role: "Project Manager", included: true },
      { role: "ASO Specialist", included: true },
      { role: "ASA & Meta Ad Manager", included: true },
      { role: "Creative Team", included: true },
    ],
  },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
});

export default async function ManagedAsoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <div className="bg-gray-900 min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="pt-32 pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Managed ASO</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Done-for-you App Store Optimization
            </h1>
            <p className="mt-6 text-lg text-gray-400">
              Don&apos;t have the time to run ASO yourself? Our team plugs into your workspace and handles
              keyword research, metadata, and creative iteration for you — you just review and approve.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={calendlyUrl ?? "mailto:hello@appaso.io"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-x-2 rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {calendlyUrl ? "Book a call" : (
                  <>
                    <EnvelopeIcon className="size-4" aria-hidden="true" />
                    hello@appaso.io
                  </>
                )}
              </a>
            </div>
          </div>
        </section>

        <section id="managed-aso-pricing" className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {tiers.map((tier) => {
                const ctaHref = calendlyUrl
                  ?? `mailto:hello@appaso.io?subject=${encodeURIComponent(`Managed ASO — ${tier.name} plan`)}`;
                return (
                  <div
                    key={tier.name}
                    className={`relative flex flex-col rounded-2xl p-8 ${
                      tier.featured
                        ? "bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-400/40 shadow-2xl shadow-indigo-900/40"
                        : "bg-gray-800/40 ring-1 ring-white/[0.08]"
                    }`}
                  >
                    {tier.featured && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-bold text-yellow-900 shadow-lg shadow-yellow-900/30">
                          ★ Most Popular
                        </span>
                      </div>
                    )}

                    <p className={`text-sm font-semibold uppercase tracking-widest ${tier.featured ? "text-indigo-200" : "text-indigo-400"}`}>
                      {tier.name}
                    </p>

                    <div className="mt-4 flex items-baseline gap-x-2 text-white">
                      <span className="text-5xl font-bold tracking-tight">
                        {currencyFormatter.format(tier.priceMonthly)}
                      </span>
                      <span className={`text-xs ${tier.featured ? "text-indigo-200" : "text-gray-500"}`}>/ month</span>
                    </div>

                    <h3 className="mt-8 text-sm font-semibold text-white">
                      What&apos;s included
                    </h3>
                    <ul className="mt-4 flex-1 space-y-3">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <CheckIcon className={`size-5 shrink-0 mt-0.5 ${tier.featured ? "text-white" : "text-emerald-400"}`} aria-hidden="true" />
                          <span className={`text-sm ${tier.featured ? "text-indigo-50" : "text-gray-400"}`}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={`mt-8 border-t pt-6 ${tier.featured ? "border-white/20" : "border-white/10"}`}>
                      <h3 className="text-sm font-semibold text-white">
                        Your team
                      </h3>
                      <ul className="mt-4 space-y-2">
                        {tier.team.map((member) => (
                          <li
                            key={member.role}
                            className={`text-sm ${
                              member.included
                                ? tier.featured ? "text-indigo-50" : "text-gray-400"
                                : tier.featured ? "text-indigo-300/60 line-through" : "text-gray-600 line-through"
                            }`}
                          >
                            {member.role}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href={ctaHref}
                      target={calendlyUrl ? "_blank" : undefined}
                      rel={calendlyUrl ? "noopener noreferrer" : undefined}
                      className={`mt-8 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        tier.featured
                          ? "bg-white text-indigo-600 hover:bg-indigo-50 focus-visible:outline-white"
                          : "bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-indigo-400"
                      }`}
                    >
                      Get Started
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
