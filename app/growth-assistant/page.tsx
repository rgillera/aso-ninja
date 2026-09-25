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

export const metadata: Metadata = {
  title: "App Growth Assistant",
  description:
    "A dedicated growth assistant for your mobile app, trained in mobile app growth fundamentals and guided by a Senior App Growth Specialist who sets the strategy. 40 hours a week, without hiring, training, or managing one yourself.",
  alternates: {
    canonical: "/growth-assistant",
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;

const stats = [
  { label: "Hours", value: "40 / week" },
  { label: "Investment", value: "From $1,200/mo" },
  { label: "Guided by", value: "App Growth Specialist" },
  { label: "Bonus", value: "AppASO Pro included" },
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

  return (
    <div className="bg-[#f5f6f8] min-h-screen">
      <PortalNav isAuthenticated={isAuthenticated} />

      <main>
        <section className="relative overflow-hidden pt-40 pb-16 sm:pt-48 sm:pb-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center blur-3xl">
            <div className="h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-300 opacity-30 sm:h-96 sm:w-96" />
          </div>

          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">App Growth Assistant</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Not a generic VA. <span className="text-indigo-600">Expert-guided help for your app.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Get a dedicated app growth assistant without hiring, training, or managing one
              yourself. Your assistant is trained in mobile app growth fundamentals, and
              guided day to day by a Senior App Growth Specialist who sets the strategy.
            </p>
            <div className="mt-8">
              <a
                href={calendlyUrl ?? "mailto:hello@appaso.io"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Get your dedicated assistant
              </a>
            </div>

            <dl className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-6 rounded-2xl bg-white p-6 shadow-clay ring-1 ring-black/5 sm:grid-cols-4 sm:gap-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900 sm:text-lg">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-[#eef0f5] pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">Why it&apos;s different</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Not just another VA
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                A generic virtual assistant learns your app from scratch, on your time. Ours
                already speaks the language of app stores, keywords, and growth.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 items-stretch" style={{ paddingTop: "1rem" }}>
              <div className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5">
                <h3 className="text-lg font-semibold text-gray-900">A generic VA</h3>
                <p className="mt-2 text-xs text-gray-500">Hired off a general marketplace</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {genericVaCons.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <XMarkIcon className="size-5 shrink-0 mt-0.5 text-gray-400" aria-hidden="true" />
                      <span className="text-sm text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative flex flex-col rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-400/40 shadow-clay-lg p-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-indigo-600 shadow-clay-sm">
                    App Growth Assistant
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">Your dedicated assistant</h3>
                <p className="mt-2 text-xs text-indigo-200">Trained, guided, and managed for you</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {assistantPros.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckIcon className="size-5 shrink-0 mt-0.5 text-white" aria-hidden="true" />
                      <span className="text-sm text-indigo-50">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">The offer</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                One dedicated assistant, 40 hours a week
              </h2>
            </div>

            <div className="mx-auto mt-16 flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-clay ring-1 ring-black/5 sm:p-10">
              <p className="text-sm font-semibold text-gray-500">App Growth Assistant</p>
              <div className="mt-4 flex items-baseline gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-gray-900">$1,200</span>
                <span className="text-sm text-gray-500">/ month, to start</span>
              </div>
              <ul className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-x-8 gap-y-3 text-left sm:grid-cols-2">
                {offerFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckIcon className="size-5 shrink-0 mt-0.5 text-indigo-600" aria-hidden="true" />
                    <span className="text-sm text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-600 ring-1 ring-indigo-100">
                <SparklesIcon className="size-4" aria-hidden="true" />
                AppASO Pro included, for as long as you have an active assistant
              </p>
              <a
                href={calendlyUrl ?? "mailto:hello@appaso.io"}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="mt-8 inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Get your dedicated assistant
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#eef0f5] pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">What they can handle</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Skills built for app teams
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                Your assistant executes across four areas. The Senior App Growth Specialist
                guides, reviews, and prioritizes the work.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
              {skillGroups.map((group) => (
                <div
                  key={group.name}
                  className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-clay-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                    <group.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">{group.name}</h3>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="text-sm leading-6 text-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">How it works</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Execution, guided by expertise
              </h2>
            </div>

            <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 items-stretch gap-6 sm:grid-cols-[1fr_auto_1fr]">
              <div className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                  <UserGroupIcon className="size-5 text-indigo-600" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">Your assistant executes</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Research, monitoring, testing, reporting, and outreach, done consistently,
                  40 hours a week, on your schedule.
                </p>
              </div>

              <div aria-hidden="true" className="mx-auto hidden size-10 items-center justify-center self-center rounded-full bg-indigo-600 shadow-clay-sm sm:flex">
                <ArrowRightIcon className="size-5 text-white" />
              </div>

              <div className="flex flex-col rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 shadow-clay-lg ring-1 ring-indigo-400/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/30">
                  <AcademicCapIcon className="size-5 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">The specialist guides</h3>
                <p className="mt-3 text-sm leading-6 text-indigo-100">
                  A Senior App Growth Specialist reviews the work and prioritizes what to focus
                  on next, so effort goes toward what actually moves your app forward.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-clay ring-1 ring-black/5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                  <LockClosedIcon className="size-4 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">A private workspace</h4>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Your own workspace with your assistant and specialist. No shared pools, no
                    visibility into other clients.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-clay ring-1 ring-black/5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                  <ChatBubbleLeftRightIcon className="size-4 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Direct communication</h4>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Talk to your assistant directly, on the hours you set. No account manager
                    standing between you and the work.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-clay ring-1 ring-black/5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                  <ShieldCheckIcon className="size-4 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Backed by our team</h4>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Recruitment, training, supervision, QA, and replacement, all handled for you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 px-6 py-12 text-center shadow-clay-lg sm:px-10">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready for a dedicated assistant?</h2>
              <p className="mt-3 text-sm text-indigo-200">
                Tell us about your app and the work you need covered, and we&apos;ll match you
                with the right person.
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
