import { AppSearchDemo, KeywordTableDemo, RankChartDemo, SpreadsheetExportDemo } from "@/features/onboarding/demo";
import PortalEyebrow from "./PortalEyebrow";

const STEPS = [
  {
    n: 1,
    title: "Start tracking in seconds",
    description: "Search by name, bundle ID, or store URL for iOS or Android — no setup, no waiting.",
    visual: <AppSearchDemo />,
  },
  {
    n: 2,
    title: "Know which keywords are worth chasing",
    description: "Every keyword you add is scored for Relevancy and Opportunity, so you can focus on the ones that will actually move the needle.",
    visual: <KeywordTableDemo />,
    // Wider content than the other two steps — stack it full-width instead
    // of squeezing it into half the row.
    stacked: true,
  },
  {
    n: 3,
    title: "See exactly where you stand",
    description: "We check your rank weekly and plot the history, so you always know whether you're climbing, falling, or holding steady.",
    visual: <RankChartDemo />,
  },
  {
    n: 4,
    title: "Your rankings, archived every month",
    description: "Every month's snapshot exports to Excel or Google Sheets in one click, ready for client reports or your own analysis.",
    visual: <SpreadsheetExportDemo />,
  },
];

export default function PortalHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#f5f6f8] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <PortalEyebrow>How it works</PortalEyebrow>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            From setup to insight in minutes
          </h2>
          <p className="mt-6 text-lg text-gray-600">
            No spreadsheets, no guesswork. Here&rsquo;s what tracking a keyword actually looks like.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl space-y-20 sm:mt-20">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className={step.stacked
                ? "flex flex-col gap-10"
                : "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"}
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-clay-sm">
                  <span className="text-sm font-bold text-white">{step.n}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{step.description}</p>
              </div>
              {/* Each demo (features/onboarding/demo.tsx) is already a self-
                  contained light "app chrome" card — bg-white + its own
                  ring — so it doesn't need a second card wrapped around it;
                  that would just double the border/shadow. */}
              <div>{step.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
