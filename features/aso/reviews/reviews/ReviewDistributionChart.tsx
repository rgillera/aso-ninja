"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { ChartBarIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { bucketSeries, STAR_COLORS, type Granularity, type SeriesPoint } from "./types";

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
];

type Props = {
  series: SeriesPoint[];
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
};

export function ReviewDistributionChart({ series, from, to, onFromChange, onToChange }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("week");

  const rows = useMemo(() => {
    const bucketed = bucketSeries(series, granularity);
    return bucketed.map((b) => ({
      label: b.label,
      "5": b.byStar["5"],
      "4": b.byStar["4"],
      "3": b.byStar["3"],
      "2": b.byStar["2"],
      "1": b.byStar["1"],
      avgRating: b.avgRating,
    }));
  }, [series, granularity]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
        <p className="text-sm font-semibold text-white">Review distribution per star</p>

        <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5">
          <CalendarDaysIcon className="size-3.5 text-gray-500" />
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)}
            className="bg-transparent text-xs text-gray-300 focus:outline-none"
            style={{ colorScheme: "dark" }}
          />
          <span className="text-gray-600">–</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onToChange(e.target.value)}
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

      {rows.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center text-center px-6">
          <ChartBarIcon className="size-8 text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-400">No reviews in this date range</p>
          <p className="mt-1 text-xs text-gray-600 max-w-xs">Try widening the date range above.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={rows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={{ stroke: "#ffffff1a" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              formatter={(value, name) => [typeof value === "number" ? Math.round(value * 100) / 100 : value, name]}
              contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />

            {(["5", "4", "3", "2", "1"] as const).map((star) => (
              <Bar key={star} yAxisId="left" dataKey={star} name={`${star} star`} stackId="reviews" fill={STAR_COLORS[star]} />
            ))}
            <Line yAxisId="right" type="monotone" dataKey="avgRating" name="Average rating" stroke="#f43f5e" dot={false} strokeWidth={2} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
