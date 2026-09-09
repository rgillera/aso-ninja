"use client";

import { DashboardHeroDemo } from "./DashboardHeroDemo";

export default function PortalHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#f5f6f8] pt-32 pb-24 sm:pb-32">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-400 to-purple-300 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
            Rank higher.
            <span className="block text-indigo-600">Grow faster.</span>
          </h1>
          <p className="mt-8 text-lg font-medium text-gray-600 sm:text-xl">
            Climb the App Store and Google Play charts, turn more searches into installs, and stay a step ahead of your competitors — all from one workspace built for app growth.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-y-4 gap-x-6 sm:flex-row">
            <a
              href={isAuthenticated ? "/dashboard" : "/signup"}
              className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn hover:bg-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {isAuthenticated ? "Go to dashboard" : "Create free account"}
            </a>
            <a href="#how-it-works" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              See how it works <span aria-hidden="true">→</span>
            </a>
          </div>
          {!isAuthenticated && (
            <p className="mt-4 text-sm text-gray-500">
              Free for indie developers and small teams. No credit card required.
            </p>
          )}
        </div>

        <div className="mt-20 w-full rounded-3xl bg-white p-2 shadow-clay-lg ring-1 ring-black/5">
          <DashboardHeroDemo />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-400 to-purple-300 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
        />
      </div>
    </section>
  );
}
