"use client";

import {
  MagnifyingGlassIcon, StarIcon, ChevronDownIcon, CameraIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { VolumeBar } from "@/features/aso/keywords/research/ui";

// Shared static/illustrative visuals for "how it works" walkthroughs — the
// in-app onboarding modal (features/onboarding/OnboardingWelcomeModal.tsx)
// and the public portal's "How it works" section both render these exact
// blocks. Everything here is fixed sample data, not a live API call.

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

export function AppSearchDemo() {
  return (
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
  );
}

export function KeywordTableDemo() {
  return (
    <div className="rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-x-auto">
      <table className="w-full min-w-[560px]">
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
                  <span className="text-sm text-gray-200 whitespace-nowrap">{row.keyword}</span>
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
  );
}

export function RankChartDemo() {
  return (
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
  );
}
