"use client";

import { useState } from "react";
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

// Same example keywords as KeywordTableDemo above, just carried through to
// what an exported sheet of them looks like — reads as the same app's data
// flowing through the product, not a different unrelated example. One entry
// per exported month (newest first, matching the sheet tabs below), each
// with its own highest ranking + change so switching tabs shows an actual
// different snapshot instead of just relabeling the same numbers. Volume and
// est. downloads stay fixed per keyword across months — only ranking moves.
const EXPORT_HISTORY = [
  {
    month: "Sep 2026",
    rows: [
      { keyword: "instagram", volume: 98, highestRank: 4, change: 14, estimatedDownloads: 412_000 },
      { keyword: "photo editor", volume: 76, highestRank: 12, change: 7, estimatedDownloads: 96_000 },
      { keyword: "reels video", volume: 64, highestRank: 19, change: -3, estimatedDownloads: 58_000 },
      { keyword: "story maker", volume: 58, highestRank: 27, change: 9, estimatedDownloads: 31_000 },
      { keyword: "social media", volume: 89, highestRank: 41, change: -6, estimatedDownloads: 12_000 },
    ],
  },
  {
    month: "Aug 2026",
    rows: [
      { keyword: "instagram", volume: 98, highestRank: 18, change: 9, estimatedDownloads: 412_000 },
      { keyword: "photo editor", volume: 76, highestRank: 19, change: 5, estimatedDownloads: 96_000 },
      { keyword: "reels video", volume: 64, highestRank: 16, change: 8, estimatedDownloads: 58_000 },
      { keyword: "story maker", volume: 58, highestRank: 36, change: 7, estimatedDownloads: 31_000 },
      { keyword: "social media", volume: 89, highestRank: 35, change: 10, estimatedDownloads: 12_000 },
    ],
  },
  {
    month: "Jul 2026",
    rows: [
      { keyword: "instagram", volume: 98, highestRank: 27, change: 6, estimatedDownloads: 412_000 },
      { keyword: "photo editor", volume: 76, highestRank: 24, change: 4, estimatedDownloads: 96_000 },
      { keyword: "reels video", volume: 64, highestRank: 24, change: 5, estimatedDownloads: 58_000 },
      { keyword: "story maker", volume: 58, highestRank: 43, change: 6, estimatedDownloads: 31_000 },
      { keyword: "social media", volume: 89, highestRank: 45, change: 8, estimatedDownloads: 12_000 },
    ],
  },
  {
    month: "Jun 2026",
    rows: [
      { keyword: "instagram", volume: 98, highestRank: 33, change: 5, estimatedDownloads: 412_000 },
      { keyword: "photo editor", volume: 76, highestRank: 28, change: 3, estimatedDownloads: 96_000 },
      { keyword: "reels video", volume: 64, highestRank: 29, change: 4, estimatedDownloads: 58_000 },
      { keyword: "story maker", volume: 58, highestRank: 49, change: 5, estimatedDownloads: 31_000 },
      { keyword: "social media", volume: 89, highestRank: 53, change: 7, estimatedDownloads: 12_000 },
    ],
  },
  {
    month: "May 2026",
    rows: [
      { keyword: "instagram", volume: 98, highestRank: 38, change: 4, estimatedDownloads: 412_000 },
      { keyword: "photo editor", volume: 76, highestRank: 31, change: 2, estimatedDownloads: 96_000 },
      { keyword: "reels video", volume: 64, highestRank: 33, change: 3, estimatedDownloads: 58_000 },
      { keyword: "story maker", volume: 58, highestRank: 54, change: 4, estimatedDownloads: 31_000 },
      { keyword: "social media", volume: 89, highestRank: 60, change: 5, estimatedDownloads: 12_000 },
    ],
  },
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

export function SpreadsheetExportDemo() {
  const [activeMonth, setActiveMonth] = useState(0);
  const rows = EXPORT_HISTORY[activeMonth].rows;

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/[0.08] overflow-hidden">
      {/* Toolbar — just enough spreadsheet chrome (cell reference + formula
          bar) to read as "this opened in Sheets/Excel", not a pixel-accurate
          clone of either. */}
      <div className="flex items-center gap-2 border-b border-black/[0.08] px-3 py-2">
        <span className="rounded border border-black/[0.08] px-2 py-0.5 text-[11px] font-medium text-gray-600">A1</span>
        <span className="text-xs italic text-gray-400">fx</span>
        <span className="text-xs text-gray-500">Keyword</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="bg-indigo-600">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap">Keyword</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap">Volume</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap">Highest Ranking</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap">Change</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-white whitespace-nowrap">Est. Downloads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {rows.map((row, i) => (
              <tr key={row.keyword} className={i % 2 === 1 ? "bg-gray-50/70" : undefined}>
                <td className="px-3 py-2 text-sm text-gray-800 whitespace-nowrap">{row.keyword}</td>
                <td className="px-3 py-2 text-sm text-gray-700 tabular-nums">{row.volume}</td>
                <td className="px-3 py-2 text-sm text-gray-700 tabular-nums">#{row.highestRank}</td>
                <td className={`px-3 py-2 text-sm font-medium tabular-nums ${row.change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {row.change >= 0 ? "+" : ""}{row.change}
                </td>
                <td className="px-3 py-2 text-sm text-gray-700 tabular-nums whitespace-nowrap">
                  ~{DOWNLOADS_FORMATTER.format(row.estimatedDownloads)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs — one per month of exported history. Clicking one swaps
          the table above to that month's own snapshot, same as switching
          sheets in Excel/Sheets actually would. */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-black/[0.08] bg-gray-50 px-2 py-1.5">
        <span className="shrink-0 px-1.5 text-sm text-gray-400">+</span>
        {EXPORT_HISTORY.map((entry, i) => (
          <button
            key={entry.month}
            type="button"
            onClick={() => setActiveMonth(i)}
            className={`shrink-0 rounded px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
              i === activeMonth ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-black/[0.04] hover:text-gray-700"
            }`}
          >
            {entry.month}
          </button>
        ))}
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
