import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  BeakerIcon,
  FunnelIcon,
  BanknotesIcon,
  MegaphoneIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "Growth Services",
  description:
    "Done-for-you App Store Optimization, creative testing, funnel and monetization optimization, Meta & Apple Search Ads management, and growth strategy, run by the team behind AppASO.",
  alternates: {
    canonical: "/growth-services",
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const services = [
  {
    name: "ASO service",
    description:
      "Keyword strategy and metadata, tuned from the same ranking and volume data your workspace already tracks, not guesswork.",
    icon: MagnifyingGlassIcon,
  },
  {
    name: "Creative & CRO",
    description:
      "Icon, screenshot, and video A/B testing on your store listing (Product Page Optimization / Store Listing Experiments) to convert more of the traffic you already get.",
    icon: BeakerIcon,
  },
  {
    name: "Funnel optimization",
    description:
      "From store listing to first session, we find where users drop off and fix the leaks between install and activation.",
    icon: FunnelIcon,
  },
  {
    name: "Monetization optimization",
    description:
      "Pricing, paywall placement, and subscription tuning to grow revenue per user without hurting conversion.",
    icon: BanknotesIcon,
  },
  {
    name: "Meta & ASA campaign management",
    description:
      "Paid user acquisition on Meta and Apple Search Ads, built and managed end to end against your actual CPI and LTV targets.",
    icon: MegaphoneIcon,
  },
  {
    name: "Strategy & scaling support",
    description:
      "A standing growth roadmap and hands-on support as you scale, so priorities stay clear as the app grows.",
    icon: RocketLaunchIcon,
  },
];

export default async function GrowthServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-gray-900 min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="pt-32 pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Growth Services</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              App growth, <span className="text-indigo-400">without hiring an in-house team</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400">
              Before AppASO was a tool, it was a service. We ran done-for-you App Store Optimization,
              Meta Ads, and Apple Search Ads for app teams, and we still take on a limited number of
              clients directly, using the same data our own platform gives you.
            </p>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3">
              {services.map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-8 transition-colors hover:bg-gray-800/80 hover:ring-indigo-500/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                    <s.icon className="size-5 text-indigo-400" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{s.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400 flex-1">{s.description}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-16 max-w-3xl rounded-2xl bg-gray-800/40 ring-1 ring-white/[0.08] px-6 py-10 text-center sm:px-10">
              <h2 className="text-2xl font-bold text-white">Ready to talk growth?</h2>
              <p className="mt-3 text-sm text-gray-400">
                We take on a limited number of clients at a time. Tell us about your app and we&apos;ll
                figure out if it&apos;s a fit.
              </p>
              <div className="mt-6">
                <a
                  href={calendlyUrl ?? "mailto:hello@appaso.io"}
                  target={calendlyUrl ? "_blank" : undefined}
                  rel={calendlyUrl ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  Talk to us
                </a>
              </div>
              <p className="mt-4 text-xs text-gray-600">
                Prefer to DIY?{" "}
                <Link href="/#pricing" className="text-indigo-400 hover:underline">
                  Check our self-serve plans
                </Link>{" "}
                instead.
              </p>
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
