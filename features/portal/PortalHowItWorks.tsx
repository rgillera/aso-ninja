import { AppSearchDemo, KeywordTableDemo, RankChartDemo } from "@/features/onboarding/demo";

const STEPS = [
  {
    n: 1,
    title: "Add your app",
    description: "Search by name, bundle ID, or store URL (for iOS or Android) and start tracking it in seconds.",
    visual: <AppSearchDemo />,
  },
  {
    n: 2,
    title: "Add keywords to track",
    description: "Every keyword you add is scored for Relevancy and Opportunity, so you always know which ones are worth chasing first.",
    visual: <KeywordTableDemo />,
    // Wider content than the other two steps — stack it full-width instead
    // of squeezing it into half the row.
    stacked: true,
  },
  {
    n: 3,
    title: "Monitor rankings over time",
    description: "We check your rank daily and plot the history, so you can see whether your app is climbing, falling, or holding steady.",
    visual: <RankChartDemo />,
  },
];

export default function PortalHowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">How it works</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Three steps to your first insight
          </h2>
          <p className="mt-6 text-lg text-gray-400">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/20">
                  <span className="text-sm font-semibold text-indigo-400">{step.n}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-400">{step.description}</p>
              </div>
              <div>{step.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
