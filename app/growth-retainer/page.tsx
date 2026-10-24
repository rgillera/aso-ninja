import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  BellAlertIcon,
  UserGroupIcon,
  SparklesIcon,
  MegaphoneIcon,
  PaintBrushIcon,
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
  title: "ASO Growth Retainer",
  description:
    "Ongoing, expert-led growth for your app after the sprint: keyword updates, new creatives, Meta and Apple Search Ads management, creative tests, and reporting, run by the team behind AppASO. Month to month, no long-term contract.",
  alternates: {
    canonical: "/growth-retainer",
  },
  openGraph: {
    type: "website",
    url: "/growth-retainer",
    title: "ASO Growth Retainer | AppASO",
    description: "Keep the gains from your sprint and keep growing. Keyword updates, new creatives, ad management, and testing for $1,200/mo, month to month.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASO Growth Retainer | AppASO",
    description: "Keep the gains from your sprint and keep growing. Keyword updates, new creatives, ad management, and testing for $1,200/mo, month to month.",
    images: ["/opengraph-image"],
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const stats = [
  { label: "Pricing", value: "$1,200/mo" },
  { label: "Contract", value: "Month to month" },
];

const cadence = [
  {
    n: "Every week",
    title: "Run & scale ads",
    description: "We run your paid campaigns week to week and put more behind what converts.",
    items: [
      "Meta and Apple Search Ads campaigns checked, with budgets, bids, and targeting adjusted",
      "Meta ad creatives refreshed, so your ads don't wear out",
      "Winning campaigns scaled, with budget increases approved by you first",
      "Weekly strategy update in Slack: what worked, what we'll do next week, and how we'll scale",
      "Installs, cost per install, and return on ad spend tracked against your targets",
    ],
    milestone: "Weekly strategy update in your Slack channel",
  },
  {
    n: "Every month",
    title: "Optimize & ship",
    description: "We act on what the data shows and ship the changes for you.",
    items: [
      "Keyword review, with metadata updates shipped",
      "New store screenshots designed and delivered",
      "A new listing experiment planned, run, or read out",
      "Promotional text and in-app event copy refreshed",
    ],
    milestone: "Monthly report and a 30-minute review call",
  },
  {
    n: "Every quarter",
    title: "Review & plan",
    description: "We step back, look at the trend, and set the next priorities.",
    items: [
      "Competitor and category benchmark refreshed",
      "Localization and new market opportunities checked",
      "Playbook updated with what worked and what to try next",
    ],
    milestone: "Quarterly plan agreed with your team",
  },
];

const deliverables = [
  {
    name: "Keyword upkeep",
    description: "Rankings shift every month. We review your coverage, catch slipping keywords, and ship metadata updates around real ranking and volume data.",
    icon: MagnifyingGlassIcon,
  },
  {
    name: "Ongoing creative tests",
    description: "A steady pace of icon, screenshot, and listing experiments, so conversion keeps improving after the sprint's first round of tests.",
    icon: BeakerIcon,
  },
  {
    name: "Ad management (Meta & Apple Search Ads)",
    description: "We run your Meta and Apple Search Ads campaigns week to week: budgets, bids, keywords, and audiences, scaled on what converts. We manage these two channels only. Ad spend is billed separately.",
    icon: MegaphoneIcon,
  },
  {
    name: "Creative production",
    description: "Fresh Meta ad creatives every week and new store screenshots every month, designed by our team and built to feed your ads and listing tests.",
    icon: PaintBrushIcon,
  },
  {
    name: "Review management",
    description: "Replies to new reviews drafted for your approval, plus a monthly look at what users praise and complain about.",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: "Competitor monitoring",
    description: "We track the apps you compete with and tell you when they change their listing, gain keywords, or launch something new.",
    icon: BellAlertIcon,
  },
  {
    name: "Listing & content updates",
    description: "Promotional text, in-app events, and seasonal listing changes written and shipped, so your page never goes stale.",
    icon: DocumentCheckIcon,
  },
  {
    name: "Monthly reporting",
    description: "One clear report each month on rankings, conversion, and tests, with what we changed and what comes next.",
    icon: ChartBarIcon,
  },
  {
    name: "Weekly strategy in Slack",
    description: "Every week, a clear update in your shared Slack channel on what worked and what we'll do next week, from the same team that ran your sprint.",
    icon: UserGroupIcon,
  },
];

const retainerIncludes = [
  "Monthly keyword review, with metadata updates shipped",
  "Meta Ads and Apple Search Ads managed by us (ad spend billed separately)",
  "Weekly Meta ad creative refresh, plus new store screenshots every month",
  "A new listing experiment every month",
  "Review replies drafted for your approval",
  "Competitor and ranking alerts",
  "Promotional text and in-app event copy",
  "Monthly report and a 30-minute review call",
  "Quarterly benchmark and growth plan",
  "Weekly strategy update in Slack: what worked and what's next",
];

const fit = [
  {
    name: "You've finished a Growth Sprint",
    description: "Your foundation is fixed. The retainer keeps it from slipping and keeps testing for the next win.",
    icon: SparklesIcon,
  },
  {
    name: "Your listing is in good shape already",
    description: "Not coming from a sprint? We start with a free audit call to make sure the basics are in place first.",
    icon: MagnifyingGlassIcon,
  },
  {
    name: "You want experts, not extra headcount",
    description: "Senior people doing a few focused hours of work each week, without hiring or managing anyone.",
    icon: UserGroupIcon,
  },
];

export default async function GrowthRetainerPage() {
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
            <PortalEyebrow>ASO Growth Retainer</PortalEyebrow>
            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:mt-10 sm:text-6xl sm:leading-[1.05]">
              Keep the gains from your sprint,{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">and keep growing</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600 sm:text-xl">
              Rankings drift, competitors move, and tests never really end. The same team that ran your
              sprint keeps your keywords current, your ads running, and new creatives tested, every
              month, with no long-term contract.
            </p>
            <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-9">
              Book a call
            </PortalButton>

            <dl className="mx-auto mt-16 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-950/10 ring-1 ring-gray-950/10">
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
              eyebrow="How it runs"
              title="A steady rhythm,"
              highlight="not a one-off"
              description={
                <>
                  The sprint fixed the big problems. The retainer is the routine that keeps your app
                  ahead: small, regular changes backed by data, reviewed with your team every month.
                </>
              }
            />

            {/* Numbered rail, same as the Growth Sprint phases. */}
            <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
              <div
                aria-hidden="true"
                className="absolute left-5 right-0 top-5 hidden h-px bg-gradient-to-r from-indigo-300 via-violet-200 to-transparent sm:block"
              />
              <ol className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
                {cadence.map((step, i) => (
                  <li key={step.title} className="relative flex flex-col">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm ring-4 ring-white">
                      <span className="text-sm font-bold text-white">{i + 1}</span>
                    </div>
                    <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">{step.n}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{step.description}</p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {step.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
                          <span className="text-sm leading-5 text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 border-t border-gray-950/10 pt-4 text-xs font-semibold text-gray-950">
                      {step.milestone}
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
              title="The work that keeps"
              highlight="your listing ahead"
              description="Everything an app needs after the big fixes are in, handled by people who already know your app."
            />

            {/* Hairline grid, same as the Growth Sprint deliverables. */}
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
            <PortalSectionHeading eyebrow="Getting started" title="One plan. Clear price." highlight="Cancel anytime." />

            <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:mt-20 lg:grid-cols-5 lg:items-stretch">
              <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:p-10 lg:col-span-3">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">ASO Growth Retainer</p>
                <p className="mt-4 flex items-baseline gap-x-1.5">
                  <span className="text-5xl font-semibold tracking-tight text-gray-950">$1,200</span>
                  <span className="text-sm font-medium text-gray-500">/mo</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Month to month. <span className="font-semibold text-gray-950">No long-term contract.</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3 border-t border-gray-950/10 pt-8">
                  {retainerIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-8 w-fit">
                  Book a call
                </PortalButton>
                <p className="mt-4 text-xs text-gray-500">
                  Ad management covers Meta Ads and Apple Search Ads only. Ad spend is billed separately, paid directly to Meta and Apple.{" "}
                  <Link href="/growth-retainer/terms" className="font-medium text-indigo-600 hover:underline">
                    See the terms
                  </Link>
                </p>
              </div>

              {/* Tinted panel, same as the Growth Sprint guarantees. */}
              <div className="flex flex-col rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-8 ring-1 ring-indigo-200 sm:p-10 lg:col-span-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm">
                  <CheckIcon className="size-5 text-white" aria-hidden="true" />
                </div>
                <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">Who it&apos;s for</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Built for apps past the big fixes</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  The retainer works best once your listing has a solid foundation.
                </p>
                <ul className="mt-8 flex-1 space-y-6">
                  {fit.map((f) => (
                    <li key={f.name} className="flex items-start gap-3">
                      <f.icon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-gray-950">{f.name}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{f.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-xs text-gray-500">
                  Starting from scratch?{" "}
                  <Link href="/growth-sprint" className="font-medium text-indigo-600 hover:underline">
                    Start with the Growth Sprint
                  </Link>
                </p>
              </div>
            </div>

          </div>
        </section>

        <section className="pt-8 pb-24 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalCtaCard
              eyebrow="Get started"
              title="Ready to keep"
              highlight="growing?"
              description={<>Tell us where your app is today and we&apos;ll show you what we&apos;d work on first.</>}
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
