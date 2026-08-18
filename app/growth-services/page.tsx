import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  BeakerIcon,
  FunnelIcon,
  BanknotesIcon,
  MegaphoneIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  CircleStackIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";
import { GrowthServicesGlobe } from "@/features/portal/GrowthServicesGlobe";

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

const inHouseCons = [
  "+20–30% more on top in payroll tax, benefits, and equipment",
  "4–8 weeks to recruit, interview, and hire",
  "One skill set — ASO, paid ads, or creative, rarely all three",
  "Ramp-up time before they're productive",
  "Vacation, sick leave, and turnover mean coverage gaps",
];

const growthTeamPros = [
  "ASO, paid ads, creative, and strategy in one team",
  "Start within days, not months",
  "No recruiting, onboarding, or HR overhead",
  "Always-on coverage — no single point of failure",
  "Scale up or down as your app grows, no severance",
];

const benefits = [
  {
    name: "Senior talent, not a discount on skill",
    description:
      "The Philippines has a deep bench of English-fluent, senior ASO and UA specialists. You're paying less because of cost of living, not because of experience.",
    icon: UserGroupIcon,
  },
  {
    name: "Same data, zero handoff friction",
    description:
      "Your growth team works from the exact ranking, keyword, and funnel data your AppASO workspace already tracks, no exporting spreadsheets back and forth.",
    icon: CircleStackIcon,
  },
  {
    name: "Flexible, not locked in",
    description:
      "Scale the engagement up before a launch, down after, or pause entirely, without a severance package or a notice period.",
    icon: ClockIcon,
  },
];

const engagementSteps = [
  {
    n: 1,
    title: "Book a call",
    description: "Tell us about your app and where growth is stalling. No pitch deck, just a real conversation.",
  },
  {
    n: 2,
    title: "We audit your app",
    description: "We dig into your rankings, funnel, and ad spend, using the same data your AppASO dashboard already tracks.",
  },
  {
    n: 3,
    title: "We scope your team",
    description: "A flat rate and a plan built around the roles your app actually needs, not a bloated retainer.",
  },
  {
    n: 4,
    title: "Your team starts",
    description: "ASO, creative, and paid acquisition go live, typically within days, not the months a hire would take.",
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
          <GrowthServicesGlobe />

          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Growth Services</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Skip the hire. <span className="text-indigo-400">Get a full growth team in the Philippines</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400">
              Before AppASO was a tool, it was a service, and still is. Skip the recruiting, get a full
              team in the Philippines running your App Store Optimization, Meta Ads, and Apple Search
              Ads, for less than one hire would cost, working from the same data your dashboard already
              tracks.
            </p>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Why it works</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Senior talent, without the overhead
              </h2>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3 lg:max-w-none">
              {benefits.map((b) => (
                <div
                  key={b.name}
                  className="flex flex-col items-center rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-8 text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                    <b.icon className="size-5 text-indigo-400" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{b.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">What&apos;s included</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Everything a growth hire would do
              </h2>
              <p className="mt-6 text-lg text-gray-400">
                One team covering the full stack, from keyword strategy to paid acquisition, so nothing
                falls through the cracks between roles.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3">
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
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">The math</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                One US hire, or a full team
              </h2>
              <p className="mt-6 text-lg text-gray-400">
                A single mobile growth manager in the US or another high-cost market covers one skill
                set, on one salary. Here&apos;s what that same budget gets you instead.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 items-stretch" style={{ paddingTop: "1rem" }}>
              <div className="flex flex-col rounded-2xl bg-gray-800/40 ring-1 ring-white/[0.08] p-8">
                <h3 className="text-lg font-semibold text-gray-100">In-house hire (US market)</h3>
                <p className="mt-2 text-xs text-gray-500">One person, one salary</p>
                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-3xl font-bold tracking-tight text-white">$90k&ndash;$140k+</span>
                  <span className="text-xs text-gray-500">/ yr base salary</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {inHouseCons.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <XMarkIcon className="size-5 shrink-0 mt-0.5 text-gray-600" aria-hidden="true" />
                      <span className="text-sm text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative flex flex-col rounded-2xl bg-gray-900 ring-1 ring-indigo-500/30 shadow-2xl shadow-indigo-900/20 p-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/30">
                    Better value
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">AppASO Growth Team</h3>
                <p className="mt-2 text-xs text-gray-500">A full team, outsourced to the Philippines</p>
                <div className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-3xl font-bold tracking-tight text-white">A fraction</span>
                  <span className="text-xs text-gray-500">of one US hire</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {growthTeamPros.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckIcon className="size-5 shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-sm text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={calendlyUrl ?? "mailto:hello@appaso.io"}
                  target={calendlyUrl ? "_blank" : undefined}
                  rel={calendlyUrl ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex items-center justify-center rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-colors"
                >
                  Get a quote for your app
                </a>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-gray-600">
              Illustrative US salary range for a mid-to-senior mobile growth / UA manager. Your actual
              savings depend on team size and scope, we&apos;ll quote a flat rate once we know your app.
            </p>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">How it works</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                From call to live team in days
              </h2>
              <p className="mt-6 text-lg text-gray-400">
                No lengthy contracts or onboarding process. Here&apos;s exactly what happens after you
                reach out.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
              {engagementSteps.map((step) => (
                <div key={step.n} className="flex flex-col rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                    <span className="text-sm font-semibold text-indigo-400">{step.n}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gray-800/40 ring-1 ring-white/[0.08] px-6 py-10 text-center sm:px-10">
              <h2 className="text-2xl font-bold text-white">Ready to talk growth?</h2>
              <p className="mt-3 text-sm text-gray-400">
                Tell us about your app and we&apos;ll figure out if it&apos;s a fit.
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
