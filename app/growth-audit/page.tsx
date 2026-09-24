import type { Metadata } from "next";
import Link from "next/link";
import {
  VideoCameraIcon,
  DocumentTextIcon,
  ChartBarIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  PresentationChartLineIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { createClient } from "@/libs/supabase/server";
import PortalNav from "@/features/portal/PortalNav";
import PortalFooter from "@/features/portal/PortalFooter";

export const metadata: Metadata = {
  title: "ASO Growth Audit",
  description:
    "60 minutes with an ASO specialist plus personalized metadata recommendations. We'll analyze your app, identify the biggest ASO opportunities holding back growth, and show you exactly what we'd change, and why.",
  alternates: {
    canonical: "/growth-audit",
  },
};

const paymentUrl = process.env.NEXT_PUBLIC_GROWTH_AUDIT_PAYMENT_URL;

const stats = [
  { label: "Session", value: "60 minutes" },
  { label: "Investment", value: "$300 per store" },
  { label: "Turnaround", value: "1 week" },
  { label: "You get", value: "Metadata plan" },
];

const included = [
  "A 60-minute live session with an ASO specialist",
  "One store per audit: App Store or Google Play",
  "An analysis of your app store conversion funnel",
  "The biggest opportunities holding back growth",
  "Personalized metadata recommendations",
  "The reasoning behind every change we suggest",
  "A clear list of what to do first",
];

const deliverables = [
  {
    name: "Live 60-minute session",
    icon: VideoCameraIcon,
    description:
      "Walk through your app with an ASO specialist. Ask anything, and get straight answers about what's working and what isn't.",
  },
  {
    name: "Funnel analysis",
    icon: FunnelIcon,
    description:
      "We trace how users move from impressions to page views to installs, and pinpoint where your listing loses them.",
  },
  {
    name: "Opportunity analysis",
    icon: ChartBarIcon,
    description:
      "We look at your keywords, rankings, and competitors to find the gaps that are costing you visibility and installs.",
  },
  {
    name: "Metadata recommendations",
    icon: DocumentTextIcon,
    description:
      "Personalized recommendations for your title, subtitle, and keywords, with the reasoning behind each change.",
  },
];

const steps = [
  {
    name: "Book your audit",
    icon: ClipboardDocumentListIcon,
    description: "Tell us which app you want reviewed, and we'll schedule your call about a week out.",
  },
  {
    name: "We analyze your app",
    icon: PresentationChartLineIcon,
    description: "Over the next week, we dig into your listing, funnel, keywords, and competitors before the call.",
  },
  {
    name: "Walk away with a plan",
    icon: LightBulbIcon,
    description: "On the call, we show you exactly what we'd change, and why.",
  },
];

export default async function GrowthAuditPage() {
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
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">ASO Growth Audit</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Find out what&apos;s holding <span className="text-indigo-600">your app back.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              60 minutes with an ASO specialist, plus personalized metadata recommendations.
              We&apos;ll analyze your app, identify the biggest ASO opportunities holding back
              growth, and show you exactly what we&apos;d change, and why.
            </p>
            <div className="mt-8">
              <a
                href={paymentUrl ?? "mailto:hello@appaso.io"}
                target={paymentUrl ? "_blank" : undefined}
                rel={paymentUrl ? "noopener noreferrer" : undefined}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Book your audit
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
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">What you get</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Expert eyes on your listing
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                No generic checklist. Every recommendation is based on your app, your category,
                and your competitors.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
              {deliverables.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-clay-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                    <item.icon className="size-5 text-indigo-600" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">The offer</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                One audit, one clear plan
              </h2>
            </div>

            <div className="mx-auto mt-16 flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-clay ring-1 ring-black/5 sm:p-10">
              <p className="text-sm font-semibold text-gray-500">ASO Growth Audit</p>
              <div className="mt-4 flex items-baseline gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-gray-900">$300</span>
                <span className="text-sm text-gray-500">one-time, per store</span>
              </div>
              <ul className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-x-8 gap-y-3 text-left sm:grid-cols-2">
                {included.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckIcon className="size-5 shrink-0 mt-0.5 text-indigo-600" aria-hidden="true" />
                    <span className="text-sm text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={paymentUrl ?? "mailto:hello@appaso.io"}
                target={paymentUrl ? "_blank" : undefined}
                rel={paymentUrl ? "noopener noreferrer" : undefined}
                className="mt-8 inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Book your audit
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#eef0f5] pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">How it works</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Three simple steps
              </h2>
            </div>

            <ol className="mx-auto mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.name} className="flex flex-col rounded-2xl bg-white p-8 shadow-clay ring-1 ring-black/5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                      <step.icon className="size-5 text-indigo-600" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-gray-300">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pt-24 pb-24 sm:pt-32 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 px-6 py-12 text-center shadow-clay-lg sm:px-10">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to see what we&apos;d change?</h2>
              <p className="mt-3 text-sm text-indigo-200">
                Book your ASO Growth Audit and get a clear, prioritized plan for your app.
              </p>
              <div className="mt-6">
                <a
                  href={paymentUrl ?? "mailto:hello@appaso.io"}
                  target={paymentUrl ? "_blank" : undefined}
                  rel={paymentUrl ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-clay-sm hover:bg-indigo-50 transition-colors"
                >
                  Book your audit
                </a>
              </div>
              <p className="mt-4 text-xs text-indigo-300">
                Need ongoing help?{" "}
                <Link href="/growth-assistant" className="text-white hover:underline">
                  Meet the App Growth Assistant
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
