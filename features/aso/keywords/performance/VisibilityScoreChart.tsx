"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
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
// Between two observed points the line is held flat (step-after) at the
// last known score — an honest "nothing changed since" read, not a guess.
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

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function VisibilityScoreChart({ apps, data, loading }: Props) {
  const rows = useMemo(() => mergeSeries(apps, data), [apps, data]);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center text-xs text-gray-500">
        Loading visibility score…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex h-80 flex-col items-center justify-center text-center px-6">
        <ChartBarIcon className="size-8 text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-400">No visibility data yet</p>
        <p className="mt-1 text-xs text-gray-600 max-w-xs">
          Run a Live Search on a tracked keyword to start capturing rank history for this date range.
        </p>
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="flex flex-wrap items-center gap-4 px-4 pt-4 pb-1">
        {apps.map((app, i) => (
          <div key={app.id} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="size-2 rounded-full" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {app.name}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
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
          />
          <Tooltip
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(value) => [value, "Visibility score"]}
            contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          {apps.map((app, i) => (
            <Line
              key={app.id}
              type="stepAfter"
              dataKey={app.id}
              name={app.name}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
