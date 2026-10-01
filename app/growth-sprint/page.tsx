import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
  MegaphoneIcon,
  UserGroupIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "90-Day ASO Growth Sprint",
  description:
    "A focused, 90-day engagement to audit, fix, and test your way to better rankings, conversion, and paid acquisition, run by the team behind AppASO, with clear deliverables and no long-term contract.",
  alternates: {
    canonical: "/growth-sprint",
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const stats = [
  { label: "Duration", value: "90 days" },
  { label: "Pricing", value: "Scoped per app" },
  { label: "Bonus", value: "1 yr Pro free" },
];

const phases = [
  {
    n: "Days 1–30",
    title: "Audit & quick wins",
    description:
      "Full audit of your metadata, keyword coverage, and store listing against your ranking and volume data. We ship the quick wins immediately, then lock in a prioritized roadmap for the next 60 days.",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    n: "Days 31–60",
    title: "Test & optimize",
    description:
      "Icon, screenshot, and metadata A/B tests go live, alongside small Meta and Apple Search Ads tests. We fix the biggest drop-offs in your funnel and iterate on what the data shows is working.",
    icon: BeakerIcon,
  },
  {
    n: "Days 61–90",
    title: "Scale & hand off",
    description:
      "Double down on the winning tests, get paid campaigns ready to scale, fold results into a long-term growth strategy, and hand you a clear playbook for what to run next, with or without us.",
    icon: ArrowTrendingUpIcon,
  },
];

const deliverables = [
  {
    name: "Full ASO audit",
    description: "A complete review of your current keyword coverage, metadata, and category placement, benchmarked against competitors.",
    icon: MagnifyingGlassIcon,
  },
  {
    name: "Metadata & keyword rewrite",
    description: "Title, subtitle, and keyword field rebuilt around ranking and volume data, not guesswork.",
    icon: DocumentCheckIcon,
  },
  {
    name: "Creative A/B testing",
    description: "Icon and screenshot experiments (Product Page Optimization / Store Listing Experiments) run and read out with real conversion data.",
    icon: BeakerIcon,
  },
  {
    name: "Funnel optimization",
    description: "We analyze the full user journey, from store impression to install to sale, and fix the steps where users drop off.",
    icon: FunnelIcon,
  },
  {
    name: "UA management (Meta & Apple Search Ads)",
    description: "We set up and run small, controlled paid tests to find what converts, so your campaigns are ready to scale. Ad spend is billed separately.",
    icon: MegaphoneIcon,
  },
  {
    name: "Growth strategy & scaling",
    description: "A prioritized plan across organic and paid, reviewed at each phase, so you know exactly where to invest as you grow.",
    icon: ArrowTrendingUpIcon,
  },
  {
    name: "Performance tracking & reporting",
    description: "Regular reports on rankings, conversion, and campaign results, so you see exactly what's working before the sprint ends.",
    icon: ChartBarIcon,
  },
  {
    name: "Hands-on collaboration",
    description: "We work closely with your team throughout the sprint, not from a distance, so decisions and changes move fast.",
    icon: UserGroupIcon,
  },
  {
    name: "Handoff playbook",
    description: "A written summary of what moved the needle and what to run next, yours to keep and act on after the sprint ends.",
    icon: ClockIcon,
  },
];

const sprintIncludes = [
  "Full audit and all three sprint phases",
  "Creative & metadata A/B testing",
  "Funnel optimization, from impression to sale",
  "UA management for Meta & Apple Search Ads (ad spend billed separately)",
  "Growth strategy & scaling plan",
  "Performance tracking & reporting",
  "Hands-on collaboration with your team",
  "Handoff playbook at the end of day 90",
  "1 year of AppASO Pro, included free",
];

const benefits = [
  "Senior growth expertise without a full-time hire",
  "Organic and paid handled by one team, in one plan",
  "Decisions backed by your data, not guesswork",
  "Small, low-risk tests before you commit bigger budgets",
  "A clear 90-day scope with no long-term contract",
  "A playbook your team keeps after the sprint",
];

export default async function GrowthSprintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="bg-[#f5f6f8] min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="relative overflow-hidden pt-40 pb-16 sm:pt-48 sm:pb-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center blur-3xl">
            <div className="h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-300 opacity-30 sm:h-96 sm:w-96" />
          </div>

          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">90-Day ASO Growth Sprint</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              A focused 90 days to <span className="text-indigo-600">fix what&apos;s holding your app&apos;s growth back</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              No long-term contract, just a scoped, three-phase engagement that audits your app,
              ships the fixes, and tests its way to better rankings and conversion, run by the same
              team behind AppASO, working from the data your workspace already tracks.
            </p>
            <div className="mt-8">
              <a
                href={calendlyUrl ?? "mailto:hello@appaso.io"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Book a sprint scoping call
              </a>
            </div>

            <dl className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4 rounded-2xl bg-white p-6 shadow-clay ring-1 ring-black/5">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</dt>
                  <dd className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-900 sm:text-lg">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">The three phases</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Thirty days at a time
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                Each phase builds on the last, with a milestone review in between so priorities stay
                grounded in what the data is actually showing.
              </p>
            </div>

            <div className="relative mx-auto mt-20 max-w-5xl">
              <div aria-hidden="true" className="absolute left-0 right-0 top-6 hidden h-px bg-indigo-200 sm:block" />
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
                {phases.map((phase) => (
                  <div key={phase.title} className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shadow-clay-sm ring-8 ring-[#f5f6f8]">
                      <phase.icon className="size-5 text-white" aria-hidden="true" />
                    </div>
                    <p className="mt-5 text-xs font-semibold text-indigo-600 uppercase tracking-widest">{phase.n}</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">{phase.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{phase.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">What you get</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Deliverables, not just hours
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                Every sprint ends with concrete artifacts you keep, whether or not you continue
                working with us after day 90.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3">
              {deliverables.map((d) => (
                <div
                  key={d.name}
                  className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-clay-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                    <d.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">{d.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600 flex-1">{d.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">Getting started</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Scoped to your app
              </h2>
            </div>

            <div className="mx-auto mt-16 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch">
              <div className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5 sm:p-10 lg:col-span-3">
                <p className="text-sm font-semibold text-gray-500">90-Day ASO Growth Sprint</p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
                  Contact us for details
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Every sprint is scoped to your app on a quick call. Here&apos;s what&apos;s included.
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {sprintIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckIcon className="size-5 shrink-0 mt-0.5 text-indigo-600" aria-hidden="true" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={calendlyUrl ?? "mailto:hello@appaso.io"}
                  target={calendlyUrl ? "_blank" : undefined}
                  rel={calendlyUrl ? "noopener noreferrer" : undefined}
                  className="mt-8 inline-flex w-fit items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  Book a call for details
                </a>
                <p className="mt-4 text-xs text-gray-500">
                  Fixed 90 days, paid upfront.{" "}
                  <Link href="/growth-sprint/terms" className="text-indigo-600 hover:underline">
                    See the terms
                  </Link>
                </p>
              </div>

              <div className="flex flex-col rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 shadow-clay-lg ring-1 ring-indigo-400/40 sm:p-10 lg:col-span-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
                  <RocketLaunchIcon className="size-6 text-white" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-semibold text-indigo-100 uppercase tracking-widest">Benefits</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Why teams choose the sprint</h3>
                <ul className="mt-6 space-y-3">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <CheckIcon className="size-5 shrink-0 mt-0.5 text-white" aria-hidden="true" />
                      <span className="text-sm leading-6 text-indigo-50">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 px-6 py-12 text-center shadow-clay-lg sm:px-10">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to start the sprint?</h2>
              <p className="mt-3 text-sm text-indigo-200">
                Tell us about your app and we&apos;ll scope the first 30 days.
              </p>
              <div className="mt-6">
                <a
                  href={calendlyUrl ?? "mailto:hello@appaso.io"}
                  target={calendlyUrl ? "_blank" : undefined}
                  rel={calendlyUrl ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-clay-sm hover:bg-indigo-50 transition-colors"
                >
                  Talk to us
                </a>
              </div>
              <p className="mt-4 text-xs text-indigo-300">
                Prefer to DIY?{" "}
                <Link href="/#pricing" className="text-white hover:underline">
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
