import { ChevronRightIcon } from "@heroicons/react/20/solid";

export default function PortalHero() {
  return (
    <section className="relative isolate overflow-hidden bg-gray-900 pt-32 pb-24 sm:pb-32">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 to-purple-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <a
              href="#features"
              className="inline-flex items-center gap-x-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400 ring-1 ring-indigo-500/20 ring-inset hover:bg-indigo-500/20 transition-colors"
            >
              Now tracking iOS & Android
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </a>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Rank higher.{" "}
            <span className="text-indigo-400">Grow faster.</span>
          </h1>
          <p className="mt-8 text-lg font-medium text-gray-400 sm:text-xl">
            ASO Ninja gives your app the intelligence it needs — keyword tracking, metadata optimization, competitor analysis, and review monitoring in one workspace.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="/signup"
              className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Start for free
            </a>
            <a href="#features" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              See how it works <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="mt-20 rounded-2xl bg-gray-800/50 ring-1 ring-white/10 p-2">
          <div className="rounded-xl bg-gray-900 h-80 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Dashboard preview</p>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-500 to-purple-400 opacity-10 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
        />
      </div>
    </section>
  );
}
