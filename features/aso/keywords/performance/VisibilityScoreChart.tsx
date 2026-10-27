"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { SERIES_COLORS, type VisibilityHistoryResult } from "./types";

export type ChartApp = { id: string; name: string; icon: string };

type Props = {
  apps: ChartApp[];
  data: VisibilityHistoryResult;
  loading: boolean;
};

type MergedRow = { date: string; [appId: string]: number | string | null };

// Each app's series only has points for dates we actually observed a rank.
// Dates an app wasn't observed carry its last known score forward, so every
// series has a value on every merged date — "nothing changed since", not a guess.
function mergeSeries(apps: ChartApp[], data: VisibilityHistoryResult): MergedRow[] {
  const allDates = [...new Set(apps.flatMap((a) => (data[a.id] ?? []).map((p) => p.date)))].sort();
  if (!allDates.length) return [];

  const cursors: Record<string, number> = {};
  const lastSeen: Record<string, number | null> = {};
  for (const app of apps) { cursors[app.id] = 0; lastSeen[app.id] = null; }

  return allDates.map((date) => {
    const row: MergedRow = { date };
    for (const app of apps) {
      const series = data[app.id] ?? [];
      while (cursors[app.id] < series.length && series[cursors[app.id]].date <= date) {
        lastSeen[app.id] = series[cursors[app.id]].score;
        cursors[app.id] += 1;
      }
      row[app.id] = lastSeen[app.id];
    }
    return row;
  });
}

// Y axis top: the score is a 0 to 100 percentage, but most apps rank for a
// small share of their tracked keywords and sit in the single digits, where a
// fixed 0-100 axis draws every change as a flat line. Picks the smallest of
// these that clears the highest point with some headroom; each divides into
// 4 whole-number steps.
const Y_TOPS = [4, 8, 12, 20, 40, 60, 80, 100];

function yAxisTop(apps: ChartApp[], rows: MergedRow[]): number {
  let max = 0;
  for (const row of rows) {
    for (const app of apps) {
      const v = row[app.id];
      if (typeof v === "number" && v > max) max = v;
    }
  }
  return Y_TOPS.find((top) => top >= max * 1.15) ?? 100;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function VisibilityScoreChart({ apps, data, loading }: Props) {
  const rows = useMemo(() => mergeSeries(apps, data), [apps, data]);
  const yTop = useMemo(() => yAxisTop(apps, rows), [apps, rows]);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-gray-500">
        Loading visibility score…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex h-56 flex-col items-center justify-center text-center px-6">
        <ChartBarIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-400 light:text-gray-600">No visibility data yet</p>
        <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
          Run a Live Search on a tracked keyword to start capturing rank history for this date range.
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 pt-4">
      <div className="flex flex-wrap items-center gap-4 px-4 pb-1">
        {apps.map((app, i) => (
          <div key={app.id} className="flex items-center gap-1.5 text-xs text-gray-400 light:text-gray-600">
            <span className="size-2 rounded-full" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {app.name}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={rows} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
          <defs>
            {apps.map((app, i) => {
              const color = SERIES_COLORS[i % SERIES_COLORS.length];
              return (
                <linearGradient key={app.id} id={`vs-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#ffffff1a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[0, yTop]}
            ticks={[0, 1, 2, 3, 4].map((i) => (yTop / 4) * i)}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(value, name) => [`${value}%`, name]}
            contentStyle={{ background: "#141417", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          {apps.map((app, i) => (
            <Area
              key={app.id}
              type="monotone"
              dataKey={app.id}
              name={app.name}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              fill={`url(#vs-grad-${i})`}
              // A just-followed app has a single day of data, which an
              // area with no dots wouldn't draw at all.
              dot={rows.length === 1 ? { r: 3, fill: SERIES_COLORS[i % SERIES_COLORS.length], strokeWidth: 0 } : false}
              connectNulls={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
