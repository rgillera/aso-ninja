import type { Metadata } from "next";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  FireIcon,
  QuestionMarkCircleIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  UsersIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  KeyIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
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

// Mostly sent as a link after the free audit call. Linked in the footer but
// kept out of the sitemap and search until the offer is proven.
export const metadata: Metadata = {
  title: "ASO Growth Starter",
  description:
    "Stop guessing how to grow your app. A growth expert reviews your full funnel and roasts it live with you, plus 12 months of AppASO Pro. $500, one payment.",
  alternates: {
    canonical: "/growth-starter",
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "/growth-starter",
    title: "ASO Growth Starter | AppASO",
    description: "Stop guessing how to grow your app. An expert review of your full funnel, a live roast, and 12 months of AppASO Pro. $500, one payment.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASO Growth Starter | AppASO",
    description: "Stop guessing how to grow your app. An expert review of your full funnel, a live roast, and 12 months of AppASO Pro. $500, one payment.",
    images: ["/opengraph-image"],
  },
};

const calendlyUrl = process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL;
const checkoutHref = "/growth-starter/checkout";
const ctaLabel = "Get started for $500";

const stats = [
  { label: "Price", value: "$500", note: "one payment" },
  { label: "Expert time", value: "90 min", note: "live, 1-on-1" },
  { label: "Specialist", value: "2 months", note: "your partner" },
  { label: "AppASO Pro", value: "12 months", note: "$288 value" },
];

const pains = [
  {
    title: "Keywords picked by gut feel",
    description: "You chose them at launch and never looked back. You don't know which ones you could actually rank for.",
    icon: QuestionMarkCircleIcon,
  },
  {
    title: "Downloads that won't move",
    description: "Your listing hasn't changed in months, and every tweak feels like a guess you can't measure.",
    icon: ArrowTrendingDownIcon,
  },
  {
    title: "Installs, but no purchases",
    description: "People find your app, then drop off somewhere between the first screen and the paywall.",
    icon: CreditCardIcon,
  },
];

const steps = [
  {
    n: "After checkout",
    title: "Learn the tool",
    description: "A 30-minute onboarding call on how ASO works and how to get the most out of AppASO Pro.",
    items: [
      "ASO basics, explained with your own app",
      "A guided tour of AppASO Pro",
      "How to find, track, and score keywords",
      "How to read your rankings and see what's working",
    ],
    milestone: "You know your way around AppASO",
  },
  {
    n: "Within 7 working days",
    title: "Get roasted",
    description: "A growth expert studies your full funnel, from store listing to purchase, and your competitors. Then we go through all of it with you, live, for 60 minutes.",
    items: [
      "Keywords you could rank for but don't",
      "What competitors rank for, and the gaps they leave",
      "An honest roast of your listing, onboarding, and paywall",
      "Your next moves, in order of impact",
    ],
    milestone: "You know exactly what to change first",
  },
  {
    n: "The next 2 months",
    title: "Ship it",
    description: "You make the changes, with your specialist one email away when you get stuck.",
    items: [
      "Work through your plan at your own pace",
      "Ask your specialist anything, for 2 months",
      "Watch each change move your rankings in Pro",
    ],
    milestone: "Your first changes are live",
  },
  {
    n: "Months 3–12",
    title: "Keep growing",
    description: "Your AppASO Pro keeps running all year, so you can keep improving on your own.",
    items: [
      "Track your rankings and competitors every week",
      "Find new keywords as your app grows",
      "Test new metadata and see what moves",
    ],
    milestone: "12 months of Pro, no renewal",
  },
];

const deliverables = [
  {
    name: "12 months of AppASO Pro",
    description: "The tool to act on everything you learn: unlimited keywords, the Keyword Inspector, est. downloads per keyword, AI suggestions, and competitor tracking.",
    icon: KeyIcon,
  },
  {
    name: "Personal onboarding",
    description: "A 30-minute call on ASO basics and how to use AppASO Pro, so you know which tools to reach for and why.",
    icon: AcademicCapIcon,
  },
  {
    name: "Keyword opportunities",
    description: "The keywords your app could realistically rank for but doesn't, with search volume, difficulty, and relevancy. Walked through on the call.",
    icon: MagnifyingGlassIcon,
  },
  {
    name: "Competitor breakdown",
    description: "What your closest competitors rank for, how their listings are built, and where they leave gaps you can take.",
    icon: UsersIcon,
  },
  {
    name: "60-minute roast & strategy call",
    description: "No fluff, no sugarcoating. We tell you what's holding your app back, from listing to paywall, then agree what to change first. Record it and keep every point.",
    icon: FireIcon,
  },
  {
    name: "2 months with your specialist",
    description: "The specialist who researched your app stays on as your growth partner. Stuck on a step or unsure about a result? Ask them, and get an answer from someone who already knows your app.",
    icon: EnvelopeIcon,
  },
];

const starterIncludes = [
  "12 months of AppASO Pro ($288 value)",
  "30-minute personal onboarding",
  "Expert review of your full funnel, from store listing to purchase, done before the call",
  "60-minute call: a live roast of your app and a strategy to grow it",
  "Keyword opportunities and competitor gaps, walked through on the call",
  "2 months of support from the specialist who researched your app",
];

const goodFit = [
  "Your app is live, but you don't know how to grow it",
  "You're an indie developer or a small team doing ASO yourself",
  "You want an expert to check your direction before you spend months on it",
  "You'd rather learn the work than hand it off",
];

const notFit = [
  "You want someone to do the work for you",
  "You only need the software",
];

const faqs = [
  {
    q: "Is this a subscription?",
    a: "No. You pay $500 once. Your Pro access runs for 12 months and then ends. It doesn't renew unless you choose to subscribe again.",
  },
  {
    q: "What if it's not what I expected?",
    a: "Ask within 7 days of purchase, before your strategy call happens, and we'll refund you in full.",
  },
  {
    q: "Do I get a written report?",
    a: "No. Everything is walked through live, so you can ask questions as we go. Record the call and you'll have every point to come back to, and your specialist is there for 2 months if anything is unclear.",
  },
  {
    q: "What do you need from me?",
    a: "Your App Store or Google Play link. If your paywall or purchase flow sits behind a login or invite code, we'll also need access so we can review the whole funnel.",
  },
  {
    q: "I'm already on a paid AppASO plan. Can I buy it?",
    a: (
      <>
        Yes. Email us at <a href="mailto:hello@appaso.io" className="font-medium text-indigo-600 hover:underline">hello@appaso.io</a>{" "}
        and we&apos;ll set it up so you aren&apos;t charged twice for Pro.
      </>
    ),
  },
  {
    q: "When do the calls happen?",
    a: "After checkout, your assigned growth specialist emails you to schedule onboarding. The strategy call follows within 7 working days of onboarding, once your review is ready.",
  },
  {
    q: "Will you change my store listing for me?",
    a: "No, you make the changes. That's why it's $500 and not $4,800. If you'd rather we do the work, look at the Growth Sprint.",
  },
];

type PageProps = { searchParams: Promise<{ purchased?: string; error?: string }> };

export default async function GrowthStarterPage({ searchParams }: PageProps) {
  const { purchased, error } = await searchParams;
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
            {purchased === "1" && (
              <div className="mx-auto mb-12 max-w-2xl rounded-2xl bg-indigo-50 p-6 text-left ring-1 ring-indigo-200">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="mt-0.5 size-6 shrink-0 text-indigo-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-950">You&apos;re in. Welcome to the Growth Starter.</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Your AppASO Pro access is active. Your assigned growth specialist will email you to
                      schedule your onboarding call. Haven&apos;t heard from them within 3 days? Email{" "}
                      <a href="mailto:hello@appaso.io" className="font-medium text-indigo-600 hover:underline">hello@appaso.io</a>.
                    </p>
                    <div className="mt-4">
                      <PortalButton href="/dashboard">Go to your dashboard</PortalButton>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-auto mb-12 flex max-w-2xl items-start gap-3 rounded-2xl bg-amber-50 p-6 text-left ring-1 ring-amber-200">
                <ExclamationTriangleIcon className="mt-0.5 size-6 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-sm leading-6 text-gray-700">
                  {error === "subscribed"
                    ? "You're already on a paid AppASO plan, so checkout here would charge you twice for Pro. "
                    : "We couldn't start checkout just now. "}
                  Email us at{" "}
                  <a href="mailto:hello@appaso.io" className="font-medium text-indigo-600 hover:underline">hello@appaso.io</a>{" "}
                  and we&apos;ll set you up.
                </p>
              </div>
            )}

            <PortalEyebrow>ASO Growth Starter</PortalEyebrow>
            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:mt-10 sm:text-6xl sm:leading-[1.05]">
              Stop guessing how to{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">grow your app</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600 sm:text-xl">
              You don&apos;t need an agency. You need someone who&apos;s done it to{" "}
              <span className="font-semibold text-gray-950">look at your app and tell you what to fix first.</span>{" "}
              A growth expert walks your funnel with you and ranks your fixes, then stays on as your partner for 2
              months. Plus a year of AppASO Pro to{" "}
              <span className="font-semibold text-indigo-600">ship them yourself.</span>
            </p>
            <PortalButton href={checkoutHref} className="mt-9">
              {ctaLabel}
            </PortalButton>
            <p className="mt-4 text-sm text-gray-500">One payment · No renewal · 7-day refund</p>
            <p className="mt-2 text-sm text-gray-500">
              Have questions first?{" "}
              <a
                href={bookHref}
                target={calendlyUrl ? "_blank" : undefined}
                rel={calendlyUrl ? "noopener noreferrer" : undefined}
                className="font-medium text-indigo-600 hover:underline"
              >
                Book a free 15-minute call
              </a>
            </p>

            <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-950/10 ring-1 ring-gray-950/10 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white px-3 py-5">
                  <dt className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">{stat.label}</dt>
                  <dd className="mt-1.5 whitespace-nowrap text-sm font-semibold text-gray-950 sm:text-lg">{stat.value}</dd>
                  {stat.note && <dd className="mt-0.5 whitespace-nowrap text-xs text-gray-500">{stat.note}</dd>}
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="Sound familiar?"
              title="You built a good app."
              highlight="It's just not growing."
              description="Most indie apps don't fail because they're bad. They fail because nobody can find them, or the people who do never pay."
            />

            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:mt-20 md:grid-cols-3">
              {pains.map((pain) => (
                <div key={pain.title} className="rounded-3xl bg-white p-8 ring-1 ring-gray-950/10">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                    <pain.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight text-gray-950">{pain.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{pain.description}</p>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-12 max-w-2xl text-balance text-center text-lg text-gray-600">
              The Growth Starter replaces the guessing with{" "}
              <span className="font-semibold text-gray-950">an expert&apos;s eyes on your app and a plan you can act on this week.</span>
            </p>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="How it works"
              title="One week to a plan."
              highlight="A year to run it."
              description="Learn the tool, get your app roasted by an expert, then ship the changes with Pro running all year."
            />

            {/* Same numbered rail as the Growth Sprint phases. */}
            <div className="relative mx-auto mt-16 max-w-6xl sm:mt-20">
              <div
                aria-hidden="true"
                className="absolute left-5 right-0 top-5 hidden h-px bg-gradient-to-r from-indigo-300 via-violet-200 to-transparent lg:block"
              />
              <ol className="grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
                {steps.map((step, i) => (
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
              title="Expert eyes on your app."
              highlight="The tools to act on it."
              description="Agencies charge thousands to do this for you. Here, you get the same expert review and learn to do the work yourself."
            />

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
            <PortalSectionHeading eyebrow="Pricing" title="One payment." highlight="No subscription." />

            <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:mt-20 lg:grid-cols-5 lg:items-stretch">
              <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:p-10 lg:col-span-3">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">ASO Growth Starter</p>
                <p className="mt-4 flex items-baseline gap-x-1.5">
                  <span className="text-5xl font-semibold tracking-tight text-gray-950">$500</span>
                  <span className="text-sm font-medium text-gray-500">one payment</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Pro alone is <span className="font-semibold text-gray-950">$288/year</span>. For $212 more, a growth expert works on your app with you.
                </p>
                <ul className="mt-8 flex-1 space-y-3 border-t border-gray-950/10 pt-8">
                  {starterIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <PortalButton href={checkoutHref} className="mt-8 w-fit">
                  {ctaLabel}
                </PortalButton>
                <p className="mt-4 text-xs text-gray-500">
                  Full refund within 7 days if your strategy call hasn&apos;t happened yet.{" "}
                  <Link href="/growth-starter/terms" className="font-medium text-indigo-600 hover:underline">
                    See the terms
                  </Link>
                </p>
              </div>

              {/* Tinted panel, same backdrop as the Sprint's guarantees. */}
              <div className="flex flex-col rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-8 ring-1 ring-indigo-200 sm:p-10 lg:col-span-2">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">Is it for you?</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Made for indie developers</h3>
                <ul className="mt-6 space-y-3">
                  {goodFit.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <span className="text-sm leading-6 text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-sm font-semibold text-gray-950">Probably not, if:</p>
                <ul className="mt-3 flex-1 space-y-3">
                  {notFit.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <XMarkIcon className="mt-0.5 size-5 shrink-0 text-gray-400" aria-hidden="true" />
                      <span className="text-sm leading-6 text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-xs text-gray-500">
                  Only need the tool?{" "}
                  <Link href="/#pricing" className="font-medium text-indigo-600 hover:underline">
                    See the self-serve plans
                  </Link>
                </p>
              </div>
            </div>

            <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-6 rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-950">Rather we do the work?</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  In the 90-Day Growth Sprint, our team runs the audit, rewrites your listing, tests your
                  creatives, and manages your ads, with a year of Pro included.
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
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <PortalSectionHeading eyebrow="Questions" title="Before you" highlight="buy" />
            <dl className="mt-16 divide-y divide-gray-950/10 border-y border-gray-950/10">
              {faqs.map((faq) => (
                <div key={faq.q} className="py-6">
                  <dt className="text-base font-semibold text-gray-950">{faq.q}</dt>
                  <dd className="mt-2 text-sm leading-6 text-gray-600">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="pt-8 pb-24 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <PortalCtaCard
              eyebrow="Get started"
              title="Stop guessing."
              highlight="Start growing."
              description={<>Get an expert&apos;s eyes on your app this week, and a year of Pro to act on what you learn.</>}
            >
              <PortalButton href={checkoutHref} className="mt-8">
                {ctaLabel}
              </PortalButton>
              <p className="mt-6 text-sm text-gray-500">
                Not sure yet?{" "}
                <a
                  href={bookHref}
                  target={calendlyUrl ? "_blank" : undefined}
                  rel={calendlyUrl ? "noopener noreferrer" : undefined}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  Book a free audit call
                </a>{" "}
                first.
              </p>
            </PortalCtaCard>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
