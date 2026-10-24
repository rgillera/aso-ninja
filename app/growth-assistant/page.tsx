import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  BugAntIcon,
  MegaphoneIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";
import PortalEyebrow from "@/features/portal/PortalEyebrow";
import PortalButton from "@/features/portal/PortalButton";
import PortalCtaCard from "@/features/portal/PortalCtaCard";
import PortalGridBackdrop from "@/features/portal/PortalGridBackdrop";
import PortalSectionHeading from "@/features/portal/PortalSectionHeading";

export const metadata: Metadata = {
  title: "App Growth Assistant",
  description:
    "A dedicated growth assistant for your mobile app, trained in mobile app growth fundamentals and guided by a Senior App Growth Specialist who sets the strategy. 40 hours a week, without hiring, training, or managing one yourself.",
  alternates: {
    canonical: "/growth-assistant",
  },
  openGraph: {
    type: "website",
    url: "/growth-assistant",
    title: "App Growth Assistant | AppASO",
    description: "A dedicated growth assistant for your mobile app, 40 hours a week, guided by a Senior App Growth Specialist. From $1,200/mo, with AppASO Pro included.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "App Growth Assistant | AppASO",
    description: "A dedicated growth assistant for your mobile app, 40 hours a week, guided by a Senior App Growth Specialist. From $1,200/mo, with AppASO Pro included.",
    images: ["/opengraph-image"],
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const stats = [
  { label: "Hours", value: "40 / week" },
  { label: "Investment", value: "From $1,200/mo" },
  { label: "Guided by", value: "App Growth Specialist" },
  { label: "Bonus", value: "AppASO Pro included" },
];

const workspacePerks = [
  {
    name: "A private workspace",
    description: "Your own workspace with your assistant and specialist. No shared pools, no visibility into other clients.",
    icon: LockClosedIcon,
  },
  {
    name: "Direct communication",
    description: "Talk to your assistant directly, on the hours you set. No account manager standing between you and the work.",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: "Backed by our team",
    description: "Recruitment, training, supervision, QA, and replacement, all handled for you.",
    icon: ShieldCheckIcon,
  },
];

const genericVaCons = [
  "No context on mobile apps, ASO, or app store workflows",
  "Needs constant hand-holding and re-explaining",
  "You're the one training, correcting, and managing quality",
  "Often shared across other clients or projects",
  "One more hire you have to vet, onboard, and manage alone",
];

const assistantPros = [
  "Trained in app growth fundamentals (ASO, reviews, analytics)",
  "Guided day to day by a Senior App Growth Specialist",
  "Recruitment, training, supervision, and QA handled for you",
  "Dedicated to your app, 40 hours a week",
  "Replaced at no cost to you if it's not the right fit",
];

const offerFeatures = [
  "40 hours a week",
  "Dedicated to your app, not shared across clients",
  "You set the preferred working hours",
  "Direct communication with your assistant",
  "A private workspace for your team",
  "Trained in mobile app growth fundamentals",
  "Guided by a Senior App Growth Specialist",
  "We handle recruitment, training, supervision, QA, and replacement",
];

const skillGroups = [
  {
    name: "ASO",
    icon: MagnifyingGlassIcon,
    items: ["Keyword research", "Competitor research", "App Store & Google Play monitoring", "Review monitoring"],
  },
  {
    name: "Growth",
    icon: ArrowTrendingUpIcon,
    items: ["Market research", "Competitor monitoring", "User feedback analysis", "Growth experiment support"],
  },
  {
    name: "App operations",
    icon: BugAntIcon,
    items: ["QA testing", "Bug reproduction & reporting", "Onboarding testing", "App listing & content updates", "Reporting", "Data & spreadsheet work"],
  },
  {
    name: "Marketing",
    icon: MegaphoneIcon,
    items: ["Influencer research", "Lead research", "Outreach", "Content research", "Content creation", "Creative production"],
  },
];

export default async function GrowthAssistantPage() {
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
            <PortalEyebrow>App Growth Assistant</PortalEyebrow>
            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:mt-10 sm:text-6xl sm:leading-[1.05]">
              Not a generic VA.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Expert-guided help for your app.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600 sm:text-xl">
              Get a dedicated app growth assistant without hiring, training, or managing one
              yourself. Your assistant is trained in mobile app growth fundamentals, and
              guided day to day by a Senior App Growth Specialist who sets the strategy.
            </p>
            <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-9">
              Get your dedicated assistant
            </PortalButton>

            <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-950/10 ring-1 ring-gray-950/10 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white px-4 py-5">
                  <dt className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">{stat.label}</dt>
                  <dd className="mt-1.5 text-base font-semibold text-gray-950 sm:text-lg">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="Why it's different"
              title="Not just"
              highlight="another VA"
              description="A generic virtual assistant learns your app from scratch, on your time. Ours already speaks the language of app stores, keywords, and growth."
            />

            <div className="mt-16 grid grid-cols-1 gap-6 sm:mt-20 sm:grid-cols-2">
              <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:p-10">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">A generic VA</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-gray-950">Hired off a general marketplace</h3>
                <ul className="mt-8 flex-1 space-y-3">
                  {genericVaCons.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <XMarkIcon className="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <span className="text-sm text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tinted panel, same backdrop as the homepage How it works demos. */}
              <div className="flex flex-col rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-8 ring-1 ring-indigo-200 sm:p-10">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">App Growth Assistant</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-gray-950">Trained, guided, and managed for you</h3>
                <ul className="mt-8 flex-1 space-y-3">
                  {assistantPros.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalSectionHeading eyebrow="The offer" title="One dedicated assistant," highlight="40 hours a week" />

            <div className="mt-16 flex flex-col items-center rounded-3xl bg-white p-8 text-center ring-1 ring-gray-950/10 sm:mt-20 sm:p-12">
              <p className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">App Growth Assistant</p>
              <p className="mt-4 flex items-baseline gap-x-1.5">
                <span className="text-5xl font-semibold tracking-tight text-gray-950">$1,200</span>
                <span className="text-sm font-medium text-gray-500">/mo, to start</span>
              </p>
              <ul className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-x-10 gap-y-3 border-t border-gray-950/10 pt-10 text-left sm:grid-cols-2">
                {offerFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                    <span className="text-sm text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100">
                <SparklesIcon className="size-4" aria-hidden="true" />
                AppASO Pro included, for as long as you have an active assistant
              </p>
              <PortalButton href={bookHref} external={!!calendlyUrl} className="mt-8">
                Get your dedicated assistant
              </PortalButton>
              <p className="mt-4 text-xs text-gray-500">
                Month to month, cancel anytime.{" "}
                <Link href="/growth-assistant/terms" className="font-medium text-indigo-600 hover:underline">
                  See the terms
                </Link>
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-6 rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-950">Not sure where to start?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  An assistant does the work best when there&apos;s a clear plan to follow. Most clients start
                  with a 90-day Growth Sprint to build the strategy and find what works, then bring on an
                  assistant to keep it going.
                </p>
              </div>
              <Link
                href="/growth-sprint"
                className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                See the Growth Sprint
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="What they can handle"
              title="Skills built for"
              highlight="app teams"
              description="Your assistant executes across four areas. The Senior App Growth Specialist guides, reviews, and prioritizes the work."
            />

            {/* Hairline grid, same as the homepage features section. */}
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-3xl bg-gray-950/10 ring-1 ring-gray-950/10 sm:mt-20 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
              {skillGroups.map((group) => (
                <div key={group.name} className="flex flex-col bg-white p-8">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                    <group.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight text-gray-950">{group.name}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm leading-5 text-gray-600">
                        <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-indigo-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalSectionHeading eyebrow="How it works" title="Execution," highlight="guided by expertise" />

            <div className="mt-16 grid grid-cols-1 items-stretch gap-6 sm:mt-20 sm:grid-cols-[1fr_auto_1fr]">
              <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:p-10">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                  <UserGroupIcon className="size-5 text-indigo-600" aria-hidden="true" />
                </div>
                <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">01 / Execute</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-950">Your assistant executes</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Research, monitoring, testing, reporting, and outreach, done consistently,
                  40 hours a week, on your schedule.
                </p>
              </div>

              <div aria-hidden="true" className="mx-auto hidden size-10 items-center justify-center self-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm sm:flex">
                <ArrowRightIcon className="size-5 text-white" />
              </div>

              <div className="flex flex-col rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-8 ring-1 ring-indigo-200 sm:p-10">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm">
                  <AcademicCapIcon className="size-5 text-white" aria-hidden="true" />
                </div>
                <p className="mt-6 font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">02 / Guide</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-950">The specialist guides</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  A Senior App Growth Specialist reviews the work and prioritizes what to focus
                  on next, so effort goes toward what actually moves your app forward.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-gray-950/10 ring-1 ring-gray-950/10 sm:grid-cols-3">
              {workspacePerks.map((perk) => (
                <div key={perk.name} className="bg-white p-6 sm:p-8">
                  <perk.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  <h4 className="mt-4 text-sm font-semibold text-gray-950">{perk.name}</h4>
                  <p className="mt-1.5 text-sm leading-6 text-gray-600">{perk.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-8 pb-24 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalCtaCard
              eyebrow="Get started"
              title="Ready for a"
              highlight="dedicated assistant?"
              description={
                <>
                  Tell us about your app and the work you need covered, and we&apos;ll match you
                  with the right person.
                </>
              }
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
