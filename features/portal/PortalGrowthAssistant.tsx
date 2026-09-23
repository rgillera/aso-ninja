import { CheckIcon } from "@heroicons/react/20/solid";
import PortalEyebrow from "./PortalEyebrow";

const highlights = [
  "Trained specifically on mobile app growth workflows",
  "Guided day to day by a Senior App Growth Specialist",
  "Recruitment, training, supervision, and QA handled for you",
  "Not the right fit? We'll replace them at no cost",
  "AppASO Pro included, for as long as you have an active assistant",
];

export default function PortalGrowthAssistant() {
  return (
    <section className="bg-[#eef0f5] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950 shadow-clay-lg">
          <div className="grid grid-cols-1 gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <PortalEyebrow>Dedicated hire</PortalEyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Prefer a dedicated assistant?
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-300">
                Not a generic VA. The App Growth Assistant is a dedicated team member for your
                app, 40 hours a week, trained specifically for mobile apps and guided by a Senior
                App Growth Specialist. You get the person. We handle the training, systems, and
                management behind them.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  href="/growth-assistant"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-clay-sm transition-colors hover:bg-indigo-50"
                >
                  Explore the Growth Assistant
                </a>
                <span className="text-sm text-gray-400">40 hrs/week &middot; From $1,200/mo</span>
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
