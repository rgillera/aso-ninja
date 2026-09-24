import { CheckIcon } from "@heroicons/react/20/solid";
import PortalEyebrow from "./PortalEyebrow";

const highlights = [
  "A 60-minute live session with an ASO specialist",
  "The biggest opportunities holding back growth",
  "Personalized metadata recommendations",
  "The reasoning behind every change we suggest",
  "A clear list of what to do first",
];

export default function PortalGrowthAudit() {
  return (
    <section className="bg-[#eef0f5] py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 shadow-clay-lg">
          <div className="grid grid-cols-1 gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <PortalEyebrow>ASO Growth Audit</PortalEyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Want an expert to review your app?
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-300">
                Book an ASO Growth Audit. We&apos;ll analyze your app, identify the biggest ASO
                opportunities holding back growth, and show you exactly what we&apos;d change,
                and why.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3">
                <a
                  href="/growth-audit"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-clay-sm transition-colors hover:bg-indigo-50"
                >
                  Explore the audit
                </a>
                <span className="text-sm text-gray-400">60 minutes &middot; 1-week turnaround &middot; $200 per store</span>
              </div>
            </div>

            <ul className="space-y-4">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <CheckIcon className="size-5 shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-sm text-gray-200">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
