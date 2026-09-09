"use client";

import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon, StarIcon, ChevronDownIcon, CameraIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { VolumeBar } from "@/features/aso/keywords/research/ui";

// Shared static/illustrative visuals for the public portal's "How it works"
// section. Everything here is fixed sample data, not a live API call.
//
// Rendered in the dashboard's *light* theme (data-theme="light" below,
// matched by the `light:` custom variant from app/globals.css) since the
// portal itself is a fixed-light page — see DashboardHeroDemo.tsx, which
// this mirrors. This file has no other consumers (only PortalHowItWorks.tsx
// imports it), so classes are written light-only rather than as dark-base +
// `light:` overrides; colors still come from the real dark/light pairs in
// DashboardSearch/KeywordTable/DashboardSidebar, not invented tones.

const EXAMPLE_KEYWORDS = [
  { keyword: "instagram", volume: 98, relevancy: 92, opportunity: 88, estimatedDownloads: 412_000, rank: 4 },
  { keyword: "photo editor", volume: 76, relevancy: 81, opportunity: 74, estimatedDownloads: 96_000, rank: 12 },
  { keyword: "reels video", volume: 64, relevancy: 77, opportunity: 69, estimatedDownloads: 58_000, rank: 19 },
  { keyword: "story maker", volume: 58, relevancy: 68, opportunity: 61, estimatedDownloads: 31_000, rank: 27 },
  { keyword: "social media", volume: 89, relevancy: 42, opportunity: 38, estimatedDownloads: 12_000, rank: null },
  { keyword: "filters camera", volume: 45, relevancy: 55, opportunity: 33, estimatedDownloads: 6_400, rank: 41 },
];

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const RANK_HISTORY = [
  { date: "Jan 1", position: 42 },
  { date: "Jan 8", position: 38 },
  { date: "Jan 15", position: 41 },
  { date: "Jan 22", position: 29 },
  { date: "Jan 29", position: 22 },
  { date: "Feb 5", position: 18 },
  { date: "Feb 12", position: 12 },
];

export function scorePill(value: number) {
  const tone =
    value >= 70 ? "bg-emerald-500/15 text-emerald-700" :
    value >= 40 ? "bg-yellow-500/15 text-yellow-400" :
                  "bg-gray-500/10 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

export function AppSearchDemo() {
  return (
    <div className="rounded-lg bg-white shadow-sm ring-1 ring-black/[0.08] p-2">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <MagnifyingGlassIcon className="size-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-800">instagram</span>
      </div>
      <div className="flex items-center gap-4 px-2 py-2.5 rounded-md bg-black/[0.03]">
        <div className="size-9 rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
          <CameraIcon className="size-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">Instagram</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">🇺🇸 United States · App Store</p>
        </div>
      </div>
    </div>
  );
}

export function KeywordTableDemo() {
  return (
    <div data-theme="light" className="rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08] overflow-x-auto">
      <table className="w-full min-w-[680px]">
        <thead>
          <tr className="border-b border-black/[0.08]">
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
              Keyword
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
              Volume
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
              Relevancy
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
              <span className="flex items-center gap-1 text-gray-700">
                Opportunity
                <ChevronDownIcon className="size-3 text-indigo-600" />
              </span>
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
              Est. Downloads
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
              Rank
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06]">
          {EXAMPLE_KEYWORDS.map((row) => (
            <tr key={row.keyword}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <StarIcon className="size-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-800 whitespace-nowrap">{row.keyword}</span>
                </div>
              </td>
              <td className="px-4 py-2.5"><VolumeBar value={row.volume} /></td>
              <td className="px-4 py-2.5">{scorePill(row.relevancy)}</td>
              <td className="px-4 py-2.5">{scorePill(row.opportunity)}</td>
              <td className="px-4 py-2.5">
                <span className="text-sm text-gray-700">~{DOWNLOADS_FORMATTER.format(row.estimatedDownloads)}</span>
              </td>
              <td className="px-4 py-2.5">
                {row.rank !== null
                  ? <span className={`text-sm font-medium tabular-nums ${row.rank <= 3 ? "text-emerald-700" : row.rank <= 10 ? "text-yellow-400" : "text-gray-700"}`}>#{row.rank}</span>
                  : <span className="text-xs text-gray-400 italic">Unranked</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PushNotificationDemo() {
  // Only the top portion of the phone is shown (h-[288px] wrapper clipping a
  // 600px-tall frame) — reads as the device peeking into frame, not a full
  // mockup. The banner only starts its --animate-notif-in entrance once
  // scrolled into view — a plain mount-time animation would already be over
  // by the time anyone scrolls down to step 4, since this section renders
  // (off-screen) with the rest of the page on load.
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto h-[288px] w-[300px] overflow-hidden">
      {/* The phone bezel and dynamic island are hardware, not app chrome —
          they stay black regardless of theme, same as a real device. Only
          the "screen" (wallpaper + notification banner) follows the portal's
          light theme, using a light iOS-style frosted notification card.
          The clock sits at the same height as (and overlaps) the island, so
          it stays light text regardless of screen theme — its backdrop at
          that spot is the black island, not the wallpaper. */}
      <div className="absolute inset-x-0 top-0 h-[600px] w-[300px] rounded-[3rem] bg-black p-2 shadow-2xl">
        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-indigo-100 via-indigo-50 to-white">
          <div className="absolute left-1/2 top-4 h-[27px] w-[112px] -translate-x-1/2 rounded-full bg-black" />
          <span className="absolute inset-x-0 top-5 text-center text-xs font-semibold text-white/90">
            9:41
          </span>

          <div className={`absolute inset-x-4 top-20 ${visible ? "animate-notif-in" : "opacity-0"}`}>
            <div className="rounded-2xl bg-white/95 p-3.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600">
                  <CameraIcon className="size-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-gray-600">AppASO Rankings</span>
                    <span className="shrink-0 text-[10px] text-gray-500">now</span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">Ranking changes</p>
                  <p className="mt-0.5 text-xs leading-snug text-gray-600">
                    &ldquo;instagram&rdquo; moved from #18 to #12
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RankChartDemo() {
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08] p-4">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={RANK_HISTORY} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000012" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#00000014" }}
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
            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#6b7280" }}
          />
          <Line
            type="stepAfter"
            dataKey="position"
            name="Rank"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
