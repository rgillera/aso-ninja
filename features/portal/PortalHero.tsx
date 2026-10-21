"use client";

import { PlayIcon } from "@heroicons/react/20/solid";
import { DashboardHeroDemo, DEMO_RESTART_EVENT } from "./DashboardHeroDemo";
import PortalEyebrow from "./PortalEyebrow";

const TRUSTED_AVATARS = [
  { initial: "M", className: "bg-teal-600" },
  { initial: "R", className: "bg-cyan-600" },
  { initial: "L", className: "bg-blue-500" },
  { initial: "A", className: "bg-amber-500" },
  { initial: "優", className: "bg-violet-500" },
];

export default function PortalHero({
  isAuthenticated,
  trustedByCount,
}: {
  isAuthenticated: boolean;
  trustedByCount: number;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-white pt-36 pb-24 sm:pb-28">
      {/* Faint line grid that fades out from the top, plus one soft glow
          behind the headline. Both stay well above the product screenshot so
          they never compete with it. Same treatment as the ad landing pages. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_45%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-32 -z-10 h-72 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <PortalEyebrow>Built for App Store &amp; Google Play</PortalEyebrow>
          <h1 className="mt-8 sm:mt-10 text-balance text-4xl font-semibold tracking-tight text-gray-950 sm:text-6xl sm:leading-[1.05]">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">App ASO tool with pro-level data,</span>{" "}
            <span className="sm:block">without the $299 price tag.</span>
          </h1>
          <p className="mx-auto mt-8 sm:mt-10 max-w-2xl text-balance text-lg text-gray-600 sm:text-xl">
            Start free. Upgrade from <span className="font-bold text-gray-900">$29/mo</span> as you grow, from solo indie devs to publishing teams.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-y-4 gap-x-6 sm:flex-row">
            <a
              href={isAuthenticated ? "/dashboard" : "/signup"}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {isAuthenticated ? "Go to dashboard" : "Create free account"}
            </a>
            {/* Scrolls to the product demo and restarts it from step 1. Still a
                plain anchor link to the demo if this script never runs. */}
            <a
              href="#product-demo"
              onClick={(e) => {
                const demo = document.getElementById("product-demo");
                if (!demo) return;
                e.preventDefault();
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                demo.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                window.dispatchEvent(new Event(DEMO_RESTART_EVENT));
              }}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-gray-900"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm ring-1 ring-gray-950/10 transition-transform group-hover:scale-105">
                <PlayIcon className="ml-0.5 size-3.5" />
              </span>
              Watch the tour
            </a>
          </div>
          {!isAuthenticated && (
            <ul className="mt-5 flex flex-col items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-700 sm:flex-row sm:text-base">
              {["Free for indie developers", "No credit card required"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-5 text-emerald-500">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <div aria-hidden="true" className="flex -space-x-2">
              {TRUSTED_AVATARS.map(({ initial, className }) => (
                <span
                  key={initial}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white ${className}`}
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="text-center font-mono text-[11px] leading-relaxed text-gray-500 sm:text-left sm:text-xs">
              Trusted by{" "}
              <span className="font-semibold text-gray-900">{trustedByCount.toLocaleString("en-US")}</span>{" "}
              developers, from indie devs to large publishers
            </p>
          </div>
        </div>

        <div id="product-demo" className="relative mx-auto mt-20 max-w-6xl scroll-mt-24">
          <div
            aria-hidden="true"
            className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-indigo-200/40 to-transparent blur-2xl"
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
