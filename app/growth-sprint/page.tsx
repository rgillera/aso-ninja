import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
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
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";
import PortalEyebrow from "@/features/portal/PortalEyebrow";
import PortalButton from "@/features/portal/PortalButton";
import PortalCtaCard from "@/features/portal/PortalCtaCard";
import PortalGridBackdrop from "@/features/portal/PortalGridBackdrop";
import PortalSectionHeading from "@/features/portal/PortalSectionHeading";

export const metadata: Metadata = {
  title: "90-Day ASO Growth Sprint",
  description:
    "A focused, 90-day engagement to audit your app, fix your funnel, and grow visibility, conversion, and revenue, run by the team behind AppASO, with clear deliverables, three guarantees, and no long-term contract.",
  alternates: {
    canonical: "/growth-sprint",
  },
  openGraph: {
    type: "website",
    url: "/growth-sprint",
    title: "90-Day ASO Growth Sprint | AppASO",
    description: "Audit your app, fix your funnel, and grow visibility, conversion, and revenue in 90 days. $1,700/mo or $4,800 upfront, backed by three guarantees.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "90-Day ASO Growth Sprint | AppASO",
    description: "Audit your app, fix your funnel, and grow visibility, conversion, and revenue in 90 days. $1,700/mo or $4,800 upfront, backed by three guarantees.",
    images: ["/opengraph-image"],
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const stats = [
  { label: "Duration", value: "90 days" },
  { label: "Pricing", value: "$1,700/mo" },
  { label: "Bonus", value: "1 yr Pro ($348)" },
];

const phases = [
  {
    n: "Days 1–30",
    title: "Audit, fix & plan",
    description: "We find what's holding your app back and fix the biggest problems first.",
    items: [
      "Full audit of your metadata, keywords, creatives, and competitors",
      "Funnel reviewed from impression to sale, with the biggest leaks found and fixed",
      "Working sessions with your team to shape how your app will scale",
      "Growth strategy and a prioritized 60-day roadmap, agreed with your team",
      "FREE 1 year of AppASO Pro, yours to keep even if you cancel after month one",
    ],
    milestone: "Day 30: audit and roadmap delivered",
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
      "Strategy check-ins that turn test data into your next moves",
    ],
    milestone: "Day 60: test results and next priorities reviewed",
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
      "A plan for scaling beyond day 90, built together with your team",
    ],
    milestone: "Day 90: playbook delivered",
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
    name: "Hands-on collaboration in Slack",
    description: "Our team and yours work together in a shared Slack channel throughout the sprint, not from a distance, so decisions and changes move fast.",
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
  "Hands-on collaboration with our team in a shared Slack channel",
  "A handoff playbook you keep after day 90",
  "1 year of AppASO Pro included ($348 value), yours to keep even if you cancel",
];

export default async function GrowthSprintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const bookHref = calendlyUrl ?? "mailto:hello@appaso.io";

  return (
    <div className="bg-white min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="relative isolate overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-28">
          <PortalGridBackdrop />

          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <PortalEyebrow>90-Day ASO Growth Sprint</PortalEyebrow>
            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:mt-10 sm:text-6xl sm:leading-[1.05]">
              A focused 90 days to{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">fix what&apos;s holding your app&apos;s growth back</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600 sm:text-xl">
              No long-term contract. Just a fixed-price, three-phase engagement where we audit your app,
              fix the leaks in your funnel, and test our way to more visibility, higher conversion,
              and more revenue. It&apos;s run by the same team that built AppASO.
            </p>
            <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-9">
              Book your free audit call
            </PortalButton>

            <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl bg-gray-950/10 ring-1 ring-gray-950/10">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white px-3 py-5">
                  <dt className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">{stat.label}</dt>
                  <dd className="mt-1.5 whitespace-nowrap text-sm font-semibold text-gray-950 sm:text-lg">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="The three phases"
              title="Your 90 days,"
              highlight="step by step"
              description={
                <>
                  Every phase has clear work, a clear milestone, and a review with your team, so you
                  always know what&apos;s done, what it changed, and what comes next.
                </>
              }
            />

            {/* Numbered rail, same nodes as the homepage How it works
                section, running across instead of down. */}
            <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
              <div
                aria-hidden="true"
                className="absolute left-5 right-0 top-5 hidden h-px bg-gradient-to-r from-indigo-300 via-violet-200 to-transparent sm:block"
              />
              <ol className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
                {phases.map((phase, i) => (
                  <li key={phase.title} className="relative flex flex-col">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm ring-4 ring-white">
                      <span className="text-sm font-bold text-white">{i + 1}</span>
                    </div>
                    <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">{phase.n}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">{phase.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{phase.description}</p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {phase.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
                          <span className="text-sm leading-5 text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 border-t border-gray-950/10 pt-4 text-xs font-semibold text-gray-950">
                      {phase.milestone}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="What you get"
              title="Deliverables,"
              highlight="not just hours"
              description="Every sprint ends with concrete artifacts you keep, whether or not you continue working with us after day 90."
            />

            {/* Hairline grid, same as the homepage features section. */}
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-3xl bg-gray-950/10 ring-1 ring-gray-950/10 sm:mt-20 md:grid-cols-2 lg:max-w-none lg:grid-cols-3">
              {deliverables.map((d) => (
                <div key={d.name} className="flex flex-col bg-white p-8 sm:p-10">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                    <d.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-balance text-lg font-semibold tracking-tight text-gray-950">{d.name}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">{d.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading eyebrow="Getting started" title="One sprint. Clear price." highlight="Real deliverables." />

            <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:mt-20 lg:grid-cols-5 lg:items-stretch">
              <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:p-10 lg:col-span-3">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">90-Day ASO Growth Sprint</p>
                <p className="mt-4 flex items-baseline gap-x-1.5">
                  <span className="text-5xl font-semibold tracking-tight text-gray-950">$1,700</span>
                  <span className="text-sm font-medium text-gray-500">/mo for 3 months</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Or <span className="font-semibold text-gray-950">$4,800 paid upfront</span>{" "}and save $300.
                </p>
                <ul className="mt-8 flex-1 space-y-3 border-t border-gray-950/10 pt-8">
                  {sprintIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-8 w-fit">
                  Book your free audit call
                </PortalButton>
                <p className="mt-4 text-xs text-gray-500">
                  Fixed 90 days, paid monthly or upfront.{" "}
                  <Link href="/growth-sprint/terms" className="font-medium text-indigo-600 hover:underline">
                    See the terms
                  </Link>
                </p>
              </div>

              {/* Tinted panel, same backdrop as the homepage How it works demos. */}
              <div className="flex flex-col rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-8 ring-1 ring-indigo-200 sm:p-10 lg:col-span-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm">
                  <ShieldCheckIcon className="size-5 text-white" aria-hidden="true" />
                </div>
                <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">Our guarantees</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">We put our work on the line</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Nobody can promise rankings or revenue, but we can promise our own work.
                </p>
                <ul className="mt-8 flex-1 space-y-6">
                  {guarantees.map((g) => (
                    <li key={g.name} className="flex items-start gap-3">
                      <g.icon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-gray-950">{g.name}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{g.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-xs text-gray-500">
                  Guarantees depend on your team giving us access and approvals on time.{" "}
                  <Link href="/growth-sprint/terms#guarantees" className="font-medium text-indigo-600 hover:underline">
                    See the full terms
                  </Link>
                </p>
              </div>
            </div>

            <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-6 rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-950">After the sprint, keep the momentum going</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Your playbook shows what to run next. With the Growth Retainer, the same team keeps your
                  keywords current, your ads running, and new creatives tested, month to month.
                </p>
              </div>
              <Link
                href="/growth-retainer"
                className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                See the Growth Retainer
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="pt-8 pb-24 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalCtaCard
              eyebrow="Get started"
              title="Ready to start"
              highlight="the sprint?"
              description={<>Tell us about your app and we&apos;ll show you where it&apos;s losing installs.</>}
            >
              <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-8">
                Talk to us
              </PortalButton>
              <p className="mt-6 text-sm text-gray-500">
                Prefer to DIY?{" "}
                <Link href="/#pricing" className="font-medium text-indigo-600 hover:underline">
                  Check our self-serve plans
                </Link>{" "}
                instead.
              </p>
            </PortalCtaCard>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
