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
  ShieldCheckIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "90-Day ASO Growth Sprint",
  description:
    "A focused, 90-day engagement to audit your app, fix your funnel, and grow visibility, conversion, and revenue, run by the team behind AppASO, with clear deliverables, three guarantees, and no long-term contract.",
  alternates: {
    canonical: "/growth-sprint",
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const stats = [
  { label: "Duration", value: "90 days" },
  { label: "Pricing", value: "$1,500/mo" },
  { label: "Bonus", value: "1 yr Pro ($348)" },
];

const phases = [
  {
    n: "Days 1–30",
    title: "Audit, fix & plan",
    description: "We find what's holding your app back and fix the biggest problems first.",
    items: [
      "Full audit of your metadata, keywords, creatives, and competitors",
      "Title, subtitle, and keyword rewrite, shipped",
      "Funnel mapped from impression to sale, with the biggest leaks fixed",
      "Growth strategy and a prioritized 60-day roadmap, agreed with your team",
    ],
    milestone: "Day 30: audit and roadmap delivered",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    n: "Days 31–60",
    title: "Test & optimize",
    description: "We test what drives installs and conversions, and keep only what works.",
    items: [
      "Icon and screenshot A/B tests running by day 45",
      "Small Meta and Apple Search Ads tests to find what converts",
      "New high-potential keywords added to your coverage",
      "Deeper funnel fixes, guided by test results",
    ],
    milestone: "Day 60: test results and next priorities reviewed",
    icon: BeakerIcon,
  },
  {
    n: "Days 61–90",
    title: "Scale & hand off",
    description: "We double down on what worked and set you up to keep growing.",
    items: [
      "Winning variants rolled out to your live listing",
      "Paid campaigns ready to scale on the channels that convert",
      "Long-term growth plan across organic and paid",
      "A handoff playbook your team keeps, with or without us",
    ],
    milestone: "Day 90: playbook delivered",
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

const guarantees = [
  {
    name: "Shipped by day 45, or a month free",
    description:
      "Your quick wins will be live and your first A/B tests running by day 45. If not, your next month is free. If you paid upfront, we refund one month.",
    icon: CalendarDaysIcon,
  },
  {
    name: "Not working? Leave at day 30",
    description:
      "Tell us by day 30 and you won't pay for the remaining two months. If you paid upfront, we refund them. You keep the audit and roadmap either way.",
    icon: BanknotesIcon,
  },
  {
    name: "We finish what we promised",
    description:
      "If any deliverable isn't done by day 90, we keep working on it at no extra cost.",
    icon: ArrowPathIcon,
  },
];

const sprintIncludes = [
  "Full ASO audit, benchmarked against your competitors",
  "Title, subtitle, and keyword rewrite based on real ranking data",
  "Icon and screenshot A/B tests, read out with real conversion data",
  "Funnel fixes, from store impression to sale",
  "Meta & Apple Search Ads tests, managed by us (ad spend billed separately)",
  "A growth plan across organic and paid, reviewed every 30 days",
  "Regular reports on rankings, conversion, and campaigns",
  "A handoff playbook you keep after day 90",
  "1 year of AppASO Pro included ($348 value)",
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
              No long-term contract. Just a fixed-price, three-phase engagement where we audit your app,
              fix the leaks in your funnel, and test our way to more visibility, higher conversion,
              and more revenue. It&apos;s run by the same team that built AppASO.
            </p>
            <div className="mt-8">
              <a
                href={calendlyUrl ?? "mailto:hello@appaso.io"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Book your free audit call
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
                Your 90 days, step by step
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                Every phase has clear work, a clear milestone, and a review with your team, so you
                always know what&apos;s done, what it changed, and what comes next.
              </p>
            </div>

            <div className="relative mx-auto mt-20 max-w-5xl">
              <div aria-hidden="true" className="absolute left-0 right-0 top-6 hidden h-px bg-indigo-200 sm:block" />
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
                {phases.map((phase) => (
                  <div key={phase.title} className="relative flex flex-col items-start text-left">
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shadow-clay-sm ring-8 ring-[#f5f6f8]">
                      <phase.icon className="size-5 text-white" aria-hidden="true" />
                    </div>
                    <p className="mt-5 text-xs font-semibold text-indigo-600 uppercase tracking-widest">{phase.n}</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">{phase.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{phase.description}</p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {phase.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <CheckIcon className="size-4 shrink-0 mt-0.5 text-indigo-600" aria-hidden="true" />
                          <span className="text-sm leading-5 text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                      {phase.milestone}
                    </p>
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
                One sprint. Clear price. Real deliverables.
              </h2>
            </div>

            <div className="mx-auto mt-16 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch">
              <div className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5 sm:p-10 lg:col-span-3">
                <p className="text-sm font-semibold text-gray-500">90-Day ASO Growth Sprint</p>
                <p className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">$1,500</span>
                  <span className="text-sm font-semibold text-gray-500">/month for 3 months</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Or <span className="font-semibold text-gray-900">$4,000 paid upfront</span>{" "}and save $500.
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
                  Book your free audit call
                </a>
                <p className="mt-4 text-xs text-gray-500">
                  Fixed 90 days, paid monthly or upfront.{" "}
                  <Link href="/growth-sprint/terms" className="text-indigo-600 hover:underline">
                    See the terms
                  </Link>
                </p>
              </div>

              <div className="flex flex-col rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 shadow-clay-lg ring-1 ring-indigo-400/40 sm:p-10 lg:col-span-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
                  <ShieldCheckIcon className="size-6 text-white" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-semibold text-indigo-100 uppercase tracking-widest">Our guarantees</p>
                <h3 className="mt-2 text-xl font-semibold text-white">We put our work on the line</h3>
                <p className="mt-2 text-sm leading-6 text-indigo-100">
                  Nobody can promise rankings or revenue, but we can promise our own work.
                </p>
                <ul className="mt-6 flex-1 space-y-6">
                  {guarantees.map((g) => (
                    <li key={g.name} className="flex items-start gap-3">
                      <g.icon className="size-5 shrink-0 mt-0.5 text-white" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white">{g.name}</p>
                        <p className="mt-1 text-sm leading-6 text-indigo-50">{g.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-xs text-indigo-200">
                  Guarantees depend on your team giving us access and approvals on time.{" "}
                  <Link href="/growth-sprint/terms#guarantees" className="text-white hover:underline">
                    See the full terms
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 px-6 py-12 text-center shadow-clay-lg sm:px-10">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to start the sprint?</h2>
              <p className="mt-3 text-sm text-indigo-200">
                Tell us about your app and we&apos;ll show you where it&apos;s losing installs.
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
