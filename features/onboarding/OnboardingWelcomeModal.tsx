"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  MagnifyingGlassIcon, XMarkIcon, StarIcon, ChevronDownIcon, CameraIcon, RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { VolumeBar } from "@/features/aso/keywords/research/ui";
import { loadOnboarding, saveOnboarding } from "./onboarding-checklist";

type Props = {
  hasApp: boolean;
  workspaceId: string;
};

// Illustrative only — a static walkthrough (add an app, add keywords, watch
// rank over time) shown once right after registration. Everything below is
// fixed sample data, not real API calls or real progress tracking.
const EXAMPLE_KEYWORDS = [
  { keyword: "instagram",       volume: 98, relevancy: 92, opportunity: 88, rank: 4 },
  { keyword: "photo editor",    volume: 76, relevancy: 81, opportunity: 74, rank: 12 },
  { keyword: "reels video",     volume: 64, relevancy: 77, opportunity: 69, rank: 19 },
  { keyword: "story maker",     volume: 58, relevancy: 68, opportunity: 61, rank: 27 },
  { keyword: "social media",    volume: 89, relevancy: 42, opportunity: 38, rank: null },
  { keyword: "filters camera",  volume: 45, relevancy: 55, opportunity: 33, rank: 41 },
];

const RANK_HISTORY = [
  { date: "Jan 1",  position: 42 },
  { date: "Jan 8",  position: 38 },
  { date: "Jan 15", position: 41 },
  { date: "Jan 22", position: 29 },
  { date: "Jan 29", position: 22 },
  { date: "Feb 5",  position: 18 },
  { date: "Feb 12", position: 12 },
];

function scorePill(value: number) {
  const tone =
    value >= 70 ? "bg-emerald-500/15 text-emerald-400" :
    value >= 40 ? "bg-yellow-500/15 text-yellow-400" :
                  "bg-gray-500/10 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

function WelcomePage() {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="flex items-center justify-center size-14 rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20 mb-5">
        <RocketLaunchIcon className="size-7 text-indigo-400" />
      </div>
      <p className="text-sm text-gray-400 max-w-sm">
        Here&rsquo;s a quick look at how to track and monitor your app&rsquo;s keywords —
        it only takes a minute.
      </p>
    </div>
  );
}

function AddAppPage() {
  return (
    <div>
      <div className="rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <MagnifyingGlassIcon className="size-4 text-gray-500 shrink-0" />
          <span className="text-sm text-gray-200">instagram</span>
        </div>
        <div className="flex items-center gap-4 px-2 py-2.5 rounded-md bg-white/[0.03]">
          <div className="size-9 rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
            <CameraIcon className="size-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Instagram</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">🇺🇸 United States · App Store</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Search for your app by name, bundle ID, or store URL to start tracking it.
      </p>
    </div>
  );
}

function AddKeywordsPage() {
  return (
    <div>
      <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                Keyword
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                Volume
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                Relevancy
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                <span className="flex items-center gap-1 text-gray-300">
                  Opportunity
                  <ChevronDownIcon className="size-3 text-indigo-400" />
                </span>
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                Rank
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {EXAMPLE_KEYWORDS.map((row) => (
              <tr key={row.keyword}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <StarIcon className="size-3.5 text-gray-600 shrink-0" />
                    <span className="text-sm text-gray-200">{row.keyword}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5"><VolumeBar value={row.volume} /></td>
                <td className="px-4 py-2.5">{scorePill(row.relevancy)}</td>
                <td className="px-4 py-2.5">{scorePill(row.opportunity)}</td>
                <td className="px-4 py-2.5">
                  {row.rank !== null
                    ? <span className={`text-sm font-medium tabular-nums ${row.rank <= 3 ? "text-emerald-400" : row.rank <= 10 ? "text-yellow-400" : "text-gray-300"}`}>#{row.rank}</span>
                    : <span className="text-xs text-gray-600 italic">Unranked</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Every keyword you add is scored for Relevancy and Opportunity, so you can see which ones
        are worth chasing first.
      </p>
    </div>
  );
}

function MonitorPage() {
  return (
    <div>
      <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] p-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={RANK_HISTORY} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={{ stroke: "#ffffff1a" }}
              tickLine={false}
            />
            <YAxis
              dataKey="position"
              domain={[(min: number) => Math.max(1, min - 2), (max: number) => max + 2]}
              reversed
              allowDecimals={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={(v) => `#${v}`}
            />
            <Tooltip
              formatter={(value) => [`#${value}`, "Rank"]}
              contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Line
              type="stepAfter"
              dataKey="position"
              name="Rank"
              stroke="#818cf8"
              strokeWidth={2}
              dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        This is sample data, not yours. Once you add your own app and keywords, we check rank
        daily and show your real numbers the same way.
      </p>
    </div>
  );
}

const PAGES = [WelcomePage, AddAppPage, AddKeywordsPage, MonitorPage];
const PAGE_TITLES = [
  "Welcome to AppASO",
  "Add your app",
  "Add keywords to track",
  "Monitor rankings over time",
];

export function OnboardingWelcomeModal({ hasApp, workspaceId }: Props) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Shown once, the first time a brand-new (app-less) workspace loads the
  // dashboard. If the workspace already has an app on that first check,
  // it's an existing user who onboarded organically before this shipped —
  // mark it seen without ever showing anything.
  useEffect(() => {
    if (!workspaceId) return;
    const stored = loadOnboarding(workspaceId);
    if (stored) return;
    if (hasApp) {
      saveOnboarding(workspaceId, { seen: true });
      return;
    }
    setShow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Manual reopen from the sidebar's "Onboarding steps" link — independent
  // of the once-per-workspace auto-show above.
  useEffect(() => {
    function onOpen() {
      setStep(0);
      setShow(true);
    }
    window.addEventListener("aso:open-onboarding", onOpen);
    return () => window.removeEventListener("aso:open-onboarding", onOpen);
  }, []);

  function close() {
    saveOnboarding(workspaceId, { seen: true });
    setShow(false);
  }

  if (!show) return null;

  const isLast = step === PAGES.length - 1;
  const Page = PAGES[step];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">{PAGE_TITLES[step]}</h2>
          <button onClick={close} aria-label="Close" className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <Page />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.07] shrink-0">
          <div className="flex items-center gap-1.5">
            {PAGES.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition-colors ${i === step ? "bg-indigo-400" : "bg-white/15"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? close() : setStep((s) => s + 1))}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
