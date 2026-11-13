import type { Metadata } from "next";
import Link from "next/link";
import {
  QuestionMarkCircleIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GiftIcon,
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
import { checkGrowthStarterOfferToken } from "@/libs/stripe/growth-starter-offer";

// Mostly sent as a link after the free audit call. Linked in the footer but
// kept out of the sitemap and search until the offer is proven.
// Every Starter comes with 3 months of Pro. 12 months is a bonus offered on
// the call: with a valid ?offer token (libs/stripe/growth-starter-offer.ts)
// the page shows it and its deadline, and checkout grants it.
export const metadata: Metadata = {
  title: "Growth Starter",
  description:
    "Know exactly why your app isn't growing and what to fix first. A growth expert reviews your full funnel, roasts it live with you, and stays on as your partner for a month. $500, one payment.",
  alternates: {
    canonical: "/growth-starter",
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "/growth-starter",
    title: "Growth Starter | AppASO",
    description: "Know exactly why your app isn't growing and what to fix first. An expert review of your full funnel, a live roast, a written action plan, and a month with your specialist. $500, one payment.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Growth Starter | AppASO",
    description: "Know exactly why your app isn't growing and what to fix first. An expert review of your full funnel, a live roast, a written action plan, and a month with your specialist. $500, one payment.",
    images: ["/opengraph-image"],
  },
};

const baseCheckoutHref = "/growth-starter/checkout";
const ctaLabel = "Get started for $500";

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

// withPro: the page was opened from a valid Pro bonus link.
const stepsFor = (withPro: boolean) => [
  {
    n: "After checkout",
    title: "Know your app",
    description: "A 30-minute deep-dive call so we understand your app before we judge it. The better we know it, the sharper your plan.",
    items: [
      "Your goals, and the numbers behind them: downloads, conversion, revenue",
      "Who your users are and which markets matter",
      "What you've already tried, and what worked",
      "Your app set up in AppASO Pro, ready to track",
    ],
    milestone: "We know your app inside out",
  },
  {
    n: "Within 7 working days",
    title: "Get roasted",
    description: "A growth expert studies your full funnel, from store listing to purchase, and your competitors. Then we go through all of it with you, live, for 60 minutes.",
    items: [
      "A growth strategy for your app, from the keywords you're missing to the gaps your competitors leave",
      "An honest roast of your listing, onboarding, and paywall. Record the call and keep every point",
      "Your next moves, in order of impact",
      "Then, within 2 working days: a one-page action plan, in writing",
    ],
    milestone: "You know exactly what to change first",
  },
  {
    n: "The next month",
    title: "Ship it",
    description: "You make the changes, and your specialist checks them before they go live.",
    items: [
      "Work through your plan, with the App Growth Kit beside you",
      "Send any listing, onboarding, or paywall change for review before you publish, for a month, with written feedback within 2 working days",
      "A 30-minute check-in call at month 1",
      "Watch each change move your rankings in Pro",
    ],
    milestone: "Your first changes are live",
  },
  ...(withPro ? [{
    n: "Months 3–12",
    title: "Keep growing",
    description: "Your AppASO Pro keeps running all year, so you can keep improving on your own.",
    items: [
      "Track your rankings and competitors every week",
      "Find new keywords as your app grows",
      "Test new metadata and see what moves",
    ],
    milestone: "12 months of Pro, no renewal",
  }] : []),
];

// The pricing card: the four parts of the roadmap, then the extras.
const proLink = (
  <Link href="/#pricing" className="font-medium text-indigo-600 hover:underline">AppASO Pro</Link>
);

// Everything on the pricing card, in one list. Values are what each piece
// would cost on its own, totalled against the $500 price. The Sprint credit
// has none: it only counts if they upgrade.
const extrasFor = (withPro: boolean): { key: string; content: React.ReactNode; value?: number }[] => [
  { key: "review", content: <>An expert review of your app, from store listing to purchase</>, value: 300 },
  { key: "calls", content: <>3 expert calls, 2 hours in total: a deep dive, a live strategy roast, and a month-1 check-in</>, value: 500 },
  { key: "plan", content: <>A concrete action plan, in writing, ranked by impact</>, value: 200 },
  { key: "reviews", content: <>A month of expert reviews on your changes before you publish</>, value: 200 },
  withPro
    ? { key: "pro", content: <>12 months of {proLink}</>, value: 288 }
    : { key: "pro", content: <>3 months of {proLink}</>, value: 87 },
  {
    key: "kit",
    content: (
      <>
        Lifetime access to the{" "}
        <a href="https://appgrowthkit.app" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
          App Growth Kit
        </a>
      </>
    ),
    value: 149,
  },
  {
    key: "credit",
    content: (
      <>
        A $500 credit toward the{" "}
        <Link href="/growth-sprint" className="font-medium text-indigo-600 hover:underline">Growth Sprint</Link>{" "}
        if you upgrade within 2 months
      </>
    ),
  },
];

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

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

const faqsFor = (withPro: boolean) => [
  {
    q: "Is this a subscription?",
    a: withPro
      ? "No. You pay $500 once. Your Pro access runs for 12 months and then ends. It doesn't renew unless you choose to subscribe again."
      : "No. You pay $500 once. Your 3 months of Pro end on their own, and nothing renews unless you choose to subscribe.",
  },
  {
    id: "guarantee",
    q: "What if it's not worth it?",
    a: "Then you don't pay for it. After your strategy call, if you don't think the Starter was worth $500, email us within 7 days and we refund the full amount. You keep the action plan. Your Pro access from the Starter ends with the refund.",
  },
  {
    q: "What's the App Growth Kit?",
    a: (
      <>
        Our growth playbook, experiment library, templates, and calculators for app developers, normally $149.{" "}
        <a href="https://appgrowthkit.app" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
          App Growth Kit
        </a>{" "}
        is included free with the Growth Starter, with lifetime access, so you have the playbook beside you while you ship your plan.
        After checkout, your specialist sends you a code that unlocks it at no cost.
      </>
    ),
  },
  {
    q: "Do I get anything in writing?",
    a: "Yes. Within 2 working days of the strategy call, you get a one-page action plan with every fix ranked by impact. The detail behind it is walked through live, so record the call to keep every point.",
  },
  {
    q: "What do you need from me?",
    a: "Your App Store or Google Play link. If your paywall or purchase flow sits behind a login or invite code, we'll also need access so we can review the whole funnel.",
  },
  {
    q: "I'm already on a paid AppASO plan. Can I buy it?",
    a: withPro ? (
      <>
        Yes. Email us at <a href="mailto:hello@appaso.io" className="font-medium text-indigo-600 hover:underline">hello@appaso.io</a>{" "}
        and we&apos;ll set it up so you aren&apos;t charged twice for Pro.
      </>
    ) : (
      "Yes. You already have Pro, so your current plan keeps running as it is and you get the calls and support."
    ),
  },
  {
    q: "When do the calls happen?",
    a: "After checkout, your assigned growth specialist emails you to schedule your deep-dive call. The strategy call follows within 7 working days of it, once your review is ready.",
  },
  {
    q: "Will you change my store listing for me?",
    a: "No, you make the changes, and your specialist reviews them before they go live. That's why it's $500 and not $4,800. If you'd rather we do the work, look at the Growth Sprint.",
  },
  {
    q: "What if I decide I want you to do the work?",
    a: "Upgrade to the Growth Sprint within 2 months of your strategy call and the $500 you paid comes off your first Sprint payment. The Starter is never wasted money.",
  },
];

type PageProps = { searchParams: Promise<{ purchased?: string; pro?: string; guest?: string; error?: string; offer?: string }> };

export default async function GrowthStarterPage({ searchParams }: PageProps) {
  const { purchased, pro, guest, error, offer: offerToken } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const offerCheck = offerToken ? checkGrowthStarterOfferToken(offerToken) : null;
  const offer = offerCheck?.status === "valid" ? offerCheck.offer : null;
  const withPro = !!offer;
  const checkoutHref = offer ? `${baseCheckoutHref}?offer=${encodeURIComponent(offer.token)}` : baseCheckoutHref;
  const steps = stepsFor(withPro);
  const extras = extrasFor(withPro);
  const totalValue = extras.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const faqs = faqsFor(withPro);

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
                      {guest === "1" && !isAuthenticated
                        ? "Check your inbox: we've emailed you a link to get into your AppASO account. "
                        : pro === "1" && "Your AppASO Pro access is active. "}
                      Your assigned growth specialist will email you to
                      schedule your deep-dive call. Haven&apos;t heard from them within 3 days? Email{" "}
                      <a href="mailto:hello@appaso.io" className="font-medium text-indigo-600 hover:underline">hello@appaso.io</a>.
                    </p>
                    {isAuthenticated && (
                      <div className="mt-4">
                        <PortalButton href="/dashboard">Go to your dashboard</PortalButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {offer && purchased !== "1" && (
              <div className="mx-auto mb-12 max-w-2xl rounded-2xl bg-indigo-50 p-6 text-left ring-1 ring-indigo-200">
                <div className="flex items-start gap-3">
                  <GiftIcon className="mt-0.5 size-6 shrink-0 text-indigo-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-950">Your bonus: 12 months of AppASO Pro, free</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {offer.kind === "call" ? <>This bonus is only for our call: buy the Growth Starter in </> : <>Buy the Growth Starter by </>}
                      <span className="font-semibold text-gray-950">{offer.deadlineLabel}</span>{" "}
                      and you get 12 months of AppASO Pro ($288 value) instead of 3 months. Your Pro access starts the moment you check out.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {offerCheck?.status === "expired" && purchased !== "1" && (
              <div className="mx-auto mb-12 flex max-w-2xl items-start gap-3 rounded-2xl bg-amber-50 p-6 text-left ring-1 ring-amber-200">
                <ExclamationTriangleIcon className="mt-0.5 size-6 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-sm leading-6 text-gray-700">
                  {offerCheck.kind === "call" ? "The Pro bonus from our call has ended." : `The Pro bonus offer ended on ${offerCheck.deadlineLabel}.`} You can still get the Growth Starter below,
                  with 3 months of Pro instead of 12 months.
                </p>
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

            <PortalEyebrow>Growth Starter</PortalEyebrow>
            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:mt-10 sm:text-6xl sm:leading-[1.05]">
              Know exactly why your app isn&apos;t growing and{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">what to fix first</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600 sm:text-xl">
              You don&apos;t need an agency. You need someone who&apos;s done it to{" "}
              <span className="font-semibold text-gray-950">look at your app and tell you what to fix first.</span>{" "}
              A growth expert walks your funnel with you and ranks your fixes, then guides you for a
              month{withPro ? <>. Plus a year of AppASO Pro to{" "}</> : <> while you{" "}</>}
              <span className="font-semibold text-indigo-600">ship them yourself.</span>
            </p>
            <PortalButton href={checkoutHref} className="mt-9">
              {ctaLabel}
            </PortalButton>
            <p className="mt-4 text-sm text-gray-500">One payment · No renewal</p>

            {/* The split of work, said plainly (the customer ships, the expert steers), then the guarantee. */}
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl bg-gray-950/10 text-left ring-1 ring-gray-950/10 md:grid-cols-3">
              <div className="bg-white p-6">
                <p className="text-lg font-semibold tracking-tight text-gray-950">You implement.</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  You make the changes: your listing and keywords, plus product fixes from onboarding to purchase.
                </p>
              </div>
              <div className="bg-white p-6">
                <p className="text-lg font-semibold tracking-tight text-indigo-600">We guide.</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  A growth expert reviews your whole funnel, from first impression to sale, and tells you what to fix
                  first.
                </p>
              </div>
              <div className="bg-indigo-50 p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                  <p className="text-lg font-semibold tracking-tight text-gray-950">Your $500 back.</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Get your growth roadmap. If you don&apos;t find the strategy valuable, get your $500 back. Ask within 7
                  days of your strategy call.{" "}
                  <a href="#guarantee" className="font-medium text-indigo-600 hover:underline">Guarantee details</a>
                </p>
              </div>
            </div>
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
              title="Your plan in a week."
              highlight={withPro ? "A year to run it." : "An expert for a month."}
              description={
                withPro
                  ? "We get to know your app, roast your funnel live, and hand you a plan ranked by impact. Then you ship the fixes, with Pro tracking what moves all year."
                  : "We get to know your app, roast your funnel live, and hand you a plan ranked by impact. Then you ship the fixes, with a specialist guiding you for a month."
              }
            />

            {/* Same numbered rail as the Growth Sprint phases. */}
            <div className="relative mx-auto mt-16 max-w-6xl sm:mt-20">
              <div
                aria-hidden="true"
                className="absolute left-5 right-0 top-5 hidden h-px bg-gradient-to-r from-indigo-300 via-violet-200 to-transparent lg:block"
              />
              <ol className={`grid grid-cols-1 gap-12 sm:gap-x-8 ${withPro ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
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

        <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <PortalSectionHeading
              eyebrow="Pricing"
              title="Find your app's biggest growth opportunities."
              highlight="Get a clear plan to fix them."
              description="A personalized growth strategy for your whole funnel, from first impression to sale. For indie app developers who want more downloads and more revenue without hiring a full-service agency."
            />

            <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:mt-20 lg:grid-cols-5 lg:items-stretch">
              <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-gray-950/10 sm:p-10 lg:col-span-3">
                <p className="font-mono text-xs font-medium uppercase tracking-widest text-gray-500">Growth Starter</p>
                <p className="mt-4 text-5xl font-semibold tracking-tight text-gray-950">$500</p>
                <p className="mt-2 font-mono text-xs font-medium uppercase tracking-widest text-gray-500">
                  One-time payment · No subscription
                </p>

                <p className="mt-8 border-t border-gray-950/10 pt-8 text-sm font-semibold text-gray-950">What you get:</p>
                <ul className="mt-4 flex-1 space-y-3">
                  {extras.map((item) => (
                    <li key={item.key} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                      <span className="flex-1 text-sm leading-6 text-gray-600">{item.content}</span>
                      {item.value !== undefined && (
                        <span className="shrink-0 text-sm leading-6 tabular-nums text-gray-500">{usd(item.value)}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-2 border-t border-gray-950/10 pt-6">
                  <p className="flex items-baseline justify-between gap-3 text-sm text-gray-600">
                    <span>Total value</span>
                    <span className="tabular-nums line-through">{usd(totalValue)}</span>
                  </p>
                  <p className="flex items-baseline justify-between gap-3 text-base font-semibold text-gray-950">
                    <span>You pay</span>
                    <span className="tabular-nums">$500</span>
                  </p>
                </div>

                <PortalButton href={checkoutHref} className="mt-8 w-fit">
                  {ctaLabel}
                </PortalButton>
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
                  <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden="true" />
                  <p className="text-sm leading-6 text-gray-600">
                    <span className="font-semibold text-gray-950">Your investment is protected.</span>{" "}
                    Complete your strategy call. If you don&apos;t believe it was worth $500, request a full refund
                    within seven days under our guarantee.
                  </p>
                </div>
                <p className="mt-4 text-xs text-gray-500">
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
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <PortalSectionHeading eyebrow="Questions" title="Before you" highlight="buy" />
            <dl className="mt-16 divide-y divide-gray-950/10 border-y border-gray-950/10">
              {faqs.map((faq) => (
                <div key={faq.q} id={"id" in faq ? faq.id : undefined} className="scroll-mt-24 py-6">
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
              description={
                withPro
                  ? <>Get an expert&apos;s eyes on your app this week, and a year of Pro to act on what you learn.</>
                  : <>Get an expert&apos;s eyes on your app this week, and a specialist to back you while you act on it.</>
              }
            >
              <PortalButton href={checkoutHref} className="mt-8">
                {ctaLabel}
              </PortalButton>
              <p className="mt-6 text-sm text-gray-500">
                Not worth it after your strategy call? Full refund, no questions.
              </p>
            </PortalCtaCard>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
