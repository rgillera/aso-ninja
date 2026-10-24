import { AppSearchDemo, KeywordTableDemo, RankChartDemo, SpreadsheetExportDemo } from "@/features/onboarding/demo";
import PortalEyebrow from "./PortalEyebrow";

const STEPS = [
  {
    n: 1,
    label: "Track",
    title: "Start tracking in seconds",
    description: "Search by name, bundle ID, or store URL for iOS or Android. No setup, no waiting.",
    visual: <AppSearchDemo />,
  },
  {
    n: 2,
    label: "Prioritize",
    title: "Know which keywords are worth chasing",
    description: "Every keyword you add is scored for Relevancy and Opportunity, so you can focus on the ones that will actually move the needle.",
    visual: <KeywordTableDemo />,
    // Wider content than the other steps — stack it full-width instead
    // of squeezing it into half the row.
    stacked: true,
  },
  {
    n: 3,
    label: "Monitor",
    title: "See exactly where you stand",
    description: "We check your rank weekly and plot the history, so you always know whether you're climbing, falling, or holding steady.",
    visual: <RankChartDemo />,
    // Visual on the left so the side-by-side rows zigzag instead of
    // stacking every demo down the same edge.
    flip: true,
  },
  {
    n: 4,
    label: "Report",
    title: "Your rankings, archived every month",
    description: "Every month's snapshot exports to Excel or Google Sheets in one click, ready for client reports or your own analysis.",
    visual: <SpreadsheetExportDemo />,
  },
];

export default function PortalHowItWorks() {
  return (
    <section id="how-it-works" className="relative isolate overflow-hidden bg-white py-24 sm:py-32">
      {/* Soft glow behind the heading, same treatment as the hero. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-16 -z-10 h-64 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <PortalEyebrow>How it works</PortalEyebrow>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
            From setup to insight{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">in minutes</span>
          </h2>
          <p className="mt-6 text-balance text-lg text-gray-600">
            No spreadsheets, no guesswork. Here&rsquo;s what tracking a keyword actually looks like.
          </p>
        </div>

        <ol className="mx-auto mt-16 max-w-5xl space-y-20 sm:mt-24 sm:space-y-28">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative pl-14 sm:pl-20">
              {/* Timeline rail: numbered node plus a fading line down to the
                  next step's node (skipped on the last step). */}
              <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm ring-4 ring-white">
                <span className="text-sm font-bold text-white">{step.n}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute left-5 top-12 -bottom-18 w-px -translate-x-1/2 bg-gradient-to-b from-indigo-300 via-violet-200 to-transparent sm:-bottom-26"
                />
              )}

              <div
                className={step.stacked
                  ? "flex flex-col gap-10"
                  : "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14"}
              >
                <div className={step.flip ? "lg:order-2" : undefined}>
                  <p className="font-mono text-xs font-medium uppercase tracking-widest text-indigo-600">
                    {String(step.n).padStart(2, "0")} / {step.label}
                  </p>
                  <h3 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className={`mt-4 text-base leading-7 text-gray-600 ${step.stacked ? "max-w-2xl" : ""}`}>
                    {step.description}
                  </p>
                </div>

                {/* Each demo (features/onboarding/demo.tsx) is already a self-
                    contained light "app chrome" card with its own ring, so
                    this is just a tinted backdrop behind it, not a second
                    card: no border or shadow of its own. */}
                <div className="relative rounded-3xl bg-gradient-to-br from-indigo-50 via-gray-50 to-violet-50 p-3 sm:p-6">
                  {step.visual}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
