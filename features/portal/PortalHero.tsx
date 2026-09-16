"use client";

import { DashboardHeroDemo } from "./DashboardHeroDemo";
import PortalEyebrow from "./PortalEyebrow";

export default function PortalHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#f5f6f8] pt-36 pb-24 sm:pb-28">
      {/* Faint dot grid instead of a blurred gradient blob — reads as
          structure/product rather than decoration, and stays put instead of
          smearing a big soft shape across the fold. Fades out before the
          product screenshot so it never competes with it. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[34rem] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{
          backgroundImage: "radial-gradient(rgba(79,70,229,0.16) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-8rem] -z-10 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-300/40 to-transparent blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <PortalEyebrow>Built for App Store &amp; Google Play</PortalEyebrow>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
            Rank higher.
            <span className="block text-indigo-600">Grow faster.</span>
          </h1>
          <p className="mt-6 text-balance text-lg font-medium text-gray-600 sm:text-xl">
            Climb the App Store and Google Play charts, turn more searches into installs, and stay a step ahead of your competitors.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-y-4 gap-x-6 sm:flex-row">
            <a
              href={isAuthenticated ? "/dashboard" : "/signup"}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-clay-btn transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {isAuthenticated ? "Go to dashboard" : "Create free account"}
            </a>
            <a href="#how-it-works" className="text-sm font-semibold text-gray-700 transition-colors hover:text-gray-900">
              See how it works <span aria-hidden="true">→</span>
            </a>
          </div>
          {!isAuthenticated && (
            <p className="mt-4 text-sm text-gray-500">
              Free for indie developers and small teams. No credit card required.
            </p>
          )}
        </div>

        <div className="relative mx-auto mt-20 max-w-6xl">
          <div
            aria-hidden="true"
            className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-indigo-200/60 via-violet-200/30 to-transparent blur-2xl"
          />

          {/* Browser-chrome frame instead of a bare screenshot — grounds the
              mockup as "the actual product" rather than a floating image. */}
          <div className="rounded-2xl bg-white shadow-clay-lg ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-3 rounded-t-2xl border-b border-black/[0.06] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-gray-200" />
                <span className="size-2.5 rounded-full bg-gray-200" />
                <span className="size-2.5 rounded-full bg-gray-200" />
              </div>
              <div className="mx-auto flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-400 ring-1 ring-black/[0.04]">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                app.appaso.io/keywords
              </div>
            </div>
            <div className="overflow-hidden rounded-b-2xl p-2">
              <DashboardHeroDemo />
            </div>
          </div>

          {/* One tasteful floating stat — proof-of-life next to the demo
              instead of another wall of copy. Hidden below lg where there's
              no room for it to float without overlapping the frame. */}
          <div className="absolute -right-6 -top-6 hidden rounded-2xl bg-white px-4 py-3 shadow-clay-lg ring-1 ring-black/[0.06] lg:block">
            <p className="text-xs font-medium text-gray-500">Rank movement</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-emerald-600">
              <span aria-hidden="true">↑</span> +18 keywords
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
