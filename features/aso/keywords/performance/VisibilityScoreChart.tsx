"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { SERIES_COLORS, type VisibilityHistoryResult } from "./types";

export type ChartApp = { id: string; name: string; icon: string };

type Props = {
  apps: ChartApp[];
  data: VisibilityHistoryResult;
  loading: boolean;
  /** Below Pro: the user's own line stays readable, competitor lines are
   *  blurred with no tooltip values, behind an upgrade link. */
  competitorsLocked?: boolean;
};

type MergedRow = { date: string; ts: number; [appId: string]: number | string | null };

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
    const row: MergedRow = { date, ts: toTs(date) };
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

// Scores are estimated impressions per day, from single digits to hundreds
// of thousands, so ticks and the tooltip use short forms ("1.2K").
const COUNT_FORMATTER = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 });

const DAY_MS = 86_400_000;

// Dates are plotted on a time axis (UTC midnight), not as categories, so a
// gap between observed days takes up as much width as the days it spans
// instead of looking like a sudden one-day jump.
function toTs(iso: string): number {
  return Date.parse(iso + "T00:00:00Z");
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

// Whole-day ticks across the range, thinned to about 8 so labels don't collide.
function dayTicks(min: number, max: number): number[] {
  const days = Math.round((max - min) / DAY_MS);
  const step = Math.max(1, Math.ceil(days / 7));
  const ticks: number[] = [];
  for (let d = 0; d <= days; d += step) ticks.push(min + d * DAY_MS);
  return ticks;
}

export function VisibilityScoreChart({ apps, data, loading, competitorsLocked = false }: Props) {
  const rows = useMemo(() => mergeSeries(apps, data), [apps, data]);
  // apps[0] is always the user's own app; the rest are competitors.
  const ownId = apps[0]?.id;
  const locked = competitorsLocked && apps.length > 1;
  const isBlurred = (appId: string) => locked && appId !== ownId;

  const ticks = useMemo(
    () => (rows.length ? dayTicks(rows[0].ts, rows[rows.length - 1].ts) : []),
    [rows],
  );

  // The gap on the latest day, for the upgrade prompt: "your top competitor
  // gets X a day, you get Y" sells the comparison better than a bare lock.
  const gap = useMemo(() => {
    const last = rows[rows.length - 1];
    if (!locked || !last || !ownId) return null;
    const own = Number(last[ownId] ?? 0);
    const top = Math.max(...apps.slice(1).map((a) => Number(last[a.id] ?? 0)));
    return top > own ? { own, top } : null;
  }, [locked, rows, apps, ownId]);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-gray-500">
        Loading search visibility…
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-1">
        {apps.map((app, i) => (
          <div key={app.id} className="flex items-center gap-1.5 text-xs text-gray-400 light:text-gray-600">
            <span className="size-2 rounded-full" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {app.name}
          </div>
        ))}
        {locked && (
          <Link
            href="/dashboard/subscription"
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-violet-400 light:text-violet-700 hover:underline"
          >
            <LockClosedIcon className="size-3.5" />
            {gap
              ? <>Top competitor gets ~{COUNT_FORMATTER.format(gap.top)}/day. Compare on Pro</>
              : <>Compare competitors on Pro</>}
          </Link>
        )}
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
            <filter id="vs-blur">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            // A single day has no span; pad it so the lone point sits mid-axis.
            domain={rows.length === 1 ? [rows[0].ts - DAY_MS, rows[0].ts + DAY_MS] : ["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={formatTs}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#ffffff1a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            // Fit to the data rather than a fixed range, so a small app's
            // gains aren't drawn as a flat line along the bottom.
            domain={[0, "auto"]}
            allowDecimals={false}
            tickFormatter={(v: number) => COUNT_FORMATTER.format(v)}
          />
          <Tooltip
            labelFormatter={(ts) => formatTs(Number(ts))}
            formatter={(value, name) => [`${COUNT_FORMATTER.format(Number(value))} impressions/day`, name]}
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
              // Locked competitor lines are a faint blurred stroke only: no
              // fill, hover dot or tooltip row, so they hint without reading.
              fill={isBlurred(app.id) ? "none" : `url(#vs-grad-${i})`}
              strokeOpacity={isBlurred(app.id) ? 0.5 : 1}
              className={isBlurred(app.id) ? "[filter:url(#vs-blur)]" : undefined}
              activeDot={isBlurred(app.id) ? false : undefined}
              tooltipType={isBlurred(app.id) ? "none" : undefined}
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
