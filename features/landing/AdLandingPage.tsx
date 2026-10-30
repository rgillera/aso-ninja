import Link from "next/link";
import {
  ArrowRightIcon,
  ChartBarIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { DashboardHeroDemo } from "@/features/portal/DashboardHeroDemo";
import type { AdLandingPage as AdLandingPageData } from "./ad-landing-pages";

const CHECKS = ["Free plan, no credit card", "App Store & Google Play", "Set up in 2 minutes"];

const STEPS = [
  {
    icon: DevicePhoneMobileIcon,
    title: "Add your app",
    body: "Search by name or paste a store link. iOS and Android both work.",
  },
  {
    icon: SparklesIcon,
    title: "Get keyword picks",
    body: "We suggest keywords that fit your app, scored for relevancy and opportunity.",
  },
  {
    icon: ChartBarIcon,
    title: "Track what moves",
    body: "Watch your rankings over time and see which keywords bring in downloads.",
  },
];

const FEATURES = [
  { icon: MagnifyingGlassIcon, title: "Keyword research", body: "Volume, difficulty and long-tail ideas for any country." },
  { icon: SparklesIcon, title: "Relevancy scoring", body: "Scored on what your app actually does, not on word matches, so you skip keywords that don't fit before you chase them." },
  { icon: ChartBarIcon, title: "Downloads per keyword", body: "Estimated from your real App Store Connect or Play Console totals." },
  { icon: DevicePhoneMobileIcon, title: "Both stores", body: "App Store and Google Play in one workspace, in your browser." },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex items-end gap-0.5 rounded-lg bg-gray-950 p-1.5">
        <span className="h-2.5 w-1 rounded-sm bg-indigo-500" />
        <span className="h-4 w-1 rounded-sm bg-indigo-400" />
        <span className="h-5 w-1 rounded-sm bg-indigo-300" />
      </span>
      <span className="text-lg font-bold tracking-tight text-gray-900">
        App<span className="text-indigo-600">ASO</span>
      </span>
    </Link>
  );
}

function SignupButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <a
      href="/signup"
      className={`group inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
        size === "lg" ? "px-6 py-3.5 text-sm sm:text-base" : "px-4 py-2 text-sm"
      }`}
    >
      Create free account
      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-indigo-600">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-pretty text-base text-gray-500">{subtitle}</p>}
    </div>
  );
}

// One page per ad group. Unlike the homepage, there are no section links in
// the header and only a minimal footer: every exit that isn't the signup
// button is a paid click lost.
export default function AdLandingPage({ page }: { page: AdLandingPageData }) {
  const { comparison } = page;

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-950/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-950">
              Sign in
            </a>
            <span className="hidden sm:block">
              <SignupButton size="sm" />
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-24 -z-10 h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl"
        />

        <div className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-950/10 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {page.eyebrow}
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-6xl sm:leading-[1.05]">
              {page.headline}{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                {page.headlineAccent}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-gray-600">{page.subhead}</p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              <SignupButton />
              {comparison && (
                <a href="#compare" className="text-sm font-semibold text-gray-700 transition-colors hover:text-gray-950">
                  Compare with {comparison.competitor} <span aria-hidden="true">↓</span>
                </a>
              )}
            </div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              {CHECKS.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-emerald-500" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto mt-16 max-w-5xl rounded-[1.25rem] bg-gradient-to-b from-gray-950/10 to-gray-950/[0.02] p-1.5 sm:p-2">
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-indigo-950/10 ring-1 ring-gray-950/5">
              <div className="flex items-center gap-1.5 border-b border-gray-950/[0.06] px-4 py-3">
                <span className="size-2.5 rounded-full bg-gray-200" />
                <span className="size-2.5 rounded-full bg-gray-200" />
                <span className="size-2.5 rounded-full bg-gray-200" />
              </div>
              <div className="p-2">
                <DashboardHeroDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      {comparison && (
        <section id="compare" className="scroll-mt-16 border-t border-gray-950/[0.06] bg-gray-50/70 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Side by side"
              title={`${comparison.competitorPlan} vs AppASO Pro`}
              subtitle={`${comparison.competitor} figures from its public pricing page, October 2026.`}
            />

            <div className="mt-12 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-950/[0.07]">
              <div className="grid grid-cols-2 border-b border-gray-950/[0.06] text-sm sm:grid-cols-[1.1fr_1fr_1fr]">
                <div className="hidden sm:block" />
                <div className="px-4 py-4 font-medium text-gray-500 sm:px-6">{comparison.competitorPlan}</div>
                <div className="flex items-center gap-2 bg-indigo-50/60 px-4 py-4 font-semibold text-indigo-700 sm:px-6">
                  AppASO Pro
                  <span className="hidden rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white sm:inline">
                    Free to start
                  </span>
                </div>
              </div>
              {comparison.rows.map(([label, theirs, ours]) => (
                <div
                  key={label}
                  className="grid grid-cols-2 border-b border-gray-950/[0.04] text-sm last:border-0 sm:grid-cols-[1.1fr_1fr_1fr]"
                >
                  <div className="col-span-2 px-4 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400 sm:col-span-1 sm:px-6 sm:py-4 sm:text-sm sm:normal-case sm:tracking-normal sm:text-gray-950">
                    {label}
                  </div>
                  <div className="px-4 py-3 text-gray-500 sm:px-6 sm:py-4">{theirs}</div>
                  <div className="bg-indigo-50/60 px-4 py-3 font-medium text-gray-950 sm:px-6 sm:py-4">{ours}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3 rounded-2xl border border-gray-950/[0.07] bg-white p-5 text-sm leading-6 text-gray-600">
              <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                i
              </span>
              <p>
                <span className="font-semibold text-gray-950">Where {comparison.competitor} wins: </span>
                {comparison.theyWin}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-gray-950/[0.06] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" title="From zero to a keyword plan in minutes" />
          <ol className="mt-14 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-gray-950/[0.07] bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-gray-300">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-gray-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-950/[0.06] bg-gray-50/70 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What you get" title="The ASO essentials, without the enterprise price" />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-gray-950/[0.07] ring-1 ring-gray-950/[0.07] sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white p-6">
                <feature.icon className="size-5 text-indigo-600" />
                <h3 className="mt-4 font-semibold text-gray-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gray-950 px-6 py-16 text-center sm:px-16 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 -z-10 h-64 w-[40rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/40 blur-3xl"
          />
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            See your app&apos;s keywords in 2 minutes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-gray-400">
            Add your app and we&apos;ll suggest keywords to start with. Free plan, no credit card.
          </p>
          <a
            href="/signup"
            className="group mt-9 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:text-base"
          >
            Create free account
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      <footer className="border-t border-gray-950/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AppASO</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-gray-950">Privacy</a>
            <a href="/terms" className="hover:text-gray-950">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
