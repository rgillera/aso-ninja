"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { ChartBarIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { bucketSeries, STAR_COLORS, type Granularity, type SeriesPoint } from "./types";

type Tab = "gained" | "total" | "change";

const TABS: { id: Tab; label: string }[] = [
  { id: "gained", label: "Ratings Gained" },
  { id: "total", label: "Total ratings" },
  { id: "change", label: "Change in average rating" },
];

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
];

type Props = {
  series: SeriesPoint[];
  hasStarBreakdown: boolean;
};

export function RatingsGainedChart({ series, hasStarBreakdown }: Props) {
  const [tab, setTab] = useState<Tab>("gained");
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [from, setFrom] = useState(series[0]?.date ?? "");
  const [to, setTo] = useState(series.at(-1)?.date ?? "");

  const filtered = useMemo(
    () => series.filter((p) => (!from || p.date >= from) && (!to || p.date <= to)),
    [series, from, to]
  );

  const rows = useMemo(() => {
    const bucketed = bucketSeries(filtered, granularity);
    return bucketed.map((b) => ({
      label: b.label,
      "5": b.gainedByStar?.["5"] ?? 0,
      "4": b.gainedByStar?.["4"] ?? 0,
      "3": b.gainedByStar?.["3"] ?? 0,
      "2": b.gainedByStar?.["2"] ?? 0,
      "1": b.gainedByStar?.["1"] ?? 0,
      total: b.gainedTotal ?? 0,
      ratingCount: b.ratingCount,
      avgRating: b.avgRating,
    }));
  }, [filtered, granularity]);

  // Real history only accretes one snapshot per day, starting the day this
  // dashboard is first viewed — there's no way to backfill from the store APIs.
  if (series.length < 2) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-center px-6">
        <ChartBarIcon className="size-8 text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-400">Tracking starts today</p>
        <p className="mt-1 text-xs text-gray-600 max-w-xs">
          Check back after a few visits to see your ratings history build up — there&rsquo;s no
          way to backfill history the store doesn&rsquo;t expose.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5">
          <CalendarDaysIcon className="size-3.5 text-gray-500" />
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-xs text-gray-300 focus:outline-none"
            style={{ colorScheme: "dark" }}
          />
          <span className="text-gray-600">–</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-xs text-gray-300 focus:outline-none"
            style={{ colorScheme: "dark" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 px-5 pb-2">
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGranularity(g.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              granularity === g.id ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={rows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#ffffff1a" }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={tab === "change" || tab === "gained" ? [0, 5] : undefined}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(value, name) => [typeof value === "number" ? Math.round(value * 100) / 100 : value, name]}
            contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />

          {tab === "gained" && (
            hasStarBreakdown ? (
              (["5", "4", "3", "2", "1"] as const).map((star) => (
                <Bar key={star} yAxisId="left" dataKey={star} name={`${star} star`} stackId="ratings" fill={STAR_COLORS[star]} />
              ))
            ) : (
              <Bar yAxisId="left" dataKey="total" name="Ratings gained" fill="#22c55e" />
            )
          )}
          {tab === "total" && <Bar yAxisId="left" dataKey="ratingCount" name="Total ratings" fill="#6366f1" />}

          {(tab === "gained" || tab === "change") && (
            <Line yAxisId="right" type="monotone" dataKey="avgRating" name="Average rating" stroke="#f43f5e" dot={false} strokeWidth={2} connectNulls />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
