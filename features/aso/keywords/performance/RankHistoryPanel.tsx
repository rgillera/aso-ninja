"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { DailyRankEntry, WeeklyRankEntry } from "@/app/api/keywords/rankings-history/route";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";

type Props = {
  term: string;
  storeId: string;
  store: "ios" | "android";
  country: string;
  onClose: () => void;
};

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function yDomain(max: number): [number, number] {
  return [0, Math.max(max + 5, 20)];
}

function formatRankValue(value: unknown, label: string): [string, string] {
  return value == null ? ["Not tracked yet", label] : [`#${value}`, label];
}

function rectShape(props: unknown) {
  const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: { position: number | null } };
  // Nothing to draw before this keyword's first-ever snapshot — see
  // `firstRecordedOn` in the API route.
  if (payload.position == null) return <></>;
  return <rect x={x} y={y} width={width} height={Math.max(height, 0)} rx={3} fill="#818cf8" />;
}

function axisTick(currentIndex: number) {
  return function Tick(props: unknown) {
    const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
    const isCurrent = index === currentIndex;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isCurrent ? "#e5e7eb" : "#6b7280"} fontWeight={isCurrent ? 600 : 400}>
        {formatDay(payload.value)}
      </text>
    );
  };
}

export function RankHistoryPanel({ term, storeId, store, country, onClose }: Props) {
  const workspaceId = useWorkspaceId();
  const [daily, setDaily]     = useState<DailyRankEntry[]>([]);
  const [weekly, setWeekly]   = useState<WeeklyRankEntry[]>([]);
  const [locked, setLocked]   = useState(false);
  const [firstRecordedOn, setFirstRecordedOn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ keyword: term, store, country, storeId, workspaceId });
    fetch(`/api/keywords/rankings-history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setDaily(d.daily ?? []);
        setWeekly(d.weekly ?? []);
        setLocked(!!d.locked);
        setFirstRecordedOn(d.firstRecordedOn ?? null);
      })
      .catch(() => {
        setDaily([]);
        setWeekly([]);
        setLocked(false);
        setFirstRecordedOn(null);
      })
      .finally(() => setLoading(false));
  }, [term, storeId, store, country, workspaceId]);

  // Only meaningful for the charts actually visible to this plan — the
  // locked weekly chart already explains itself, it doesn't need this too.
  const hasUntrackedGap = daily.some((d) => d.position == null) || (!locked && weekly.some((w) => w.position == null));

  const dailyMax = daily.reduce((m, r) => Math.max(m, r.position ?? 0), 0);
  const weeklyMax = weekly.reduce((m, r) => Math.max(m, r.position ?? 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">
            Rank history for{" "}
            <span className="font-bold text-white">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-gray-500">
              Loading rank history…
            </div>
          ) : daily.length === 0 && weekly.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <ChartBarIcon className="size-8 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">No history yet for this keyword</p>
              <p className="mt-1 text-xs text-gray-600 max-w-xs">
                Rank snapshots accumulate automatically each time this keyword is checked.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-2 text-xs font-medium text-gray-400">
                  {daily.length === 1 ? "Today" : "This week"}
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={daily} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="recorded_on"
                      tick={axisTick(daily.length - 1)}
                      axisLine={{ stroke: "#ffffff1a" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={yDomain(dailyMax)}
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      tickFormatter={(v) => `#${v}`}
                    />
                    <Tooltip
                      labelFormatter={(d) => formatDay(String(d))}
                      formatter={(value) => formatRankValue(value, "Rank")}
                      contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#9ca3af" }}
                      itemStyle={{ color: "#e5e7eb" }}
                      cursor={{ fill: "#ffffff08" }}
                    />
                    <Bar dataKey="position" name="Rank" shape={rectShape} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-gray-400">Last 3 months</p>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weekly} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis
                        dataKey="recorded_on"
                        tick={axisTick(weekly.length - 1)}
                        axisLine={{ stroke: "#ffffff1a" }}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={yDomain(weeklyMax)}
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                        tickFormatter={(v) => `#${v}`}
                      />
                      {!locked && (
                        <Tooltip
                          labelFormatter={(d) => `Week of ${formatDay(String(d))}`}
                          formatter={(value) => formatRankValue(value, "Rank")}
                          contentStyle={{ background: "#1a1d24", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#9ca3af" }}
                          itemStyle={{ color: "#e5e7eb" }}
                          cursor={{ fill: "#ffffff08" }}
                        />
                      )}
                      <Bar dataKey="position" name="Rank" shape={locked ? () => <></> : rectShape} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>

                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
                      <LockClosedIcon className="size-5 text-violet-400" />
                      <p className="text-sm font-semibold text-white">3 months of rank trend locked</p>
                      <p className="text-xs text-gray-400 max-w-[16rem]">
                        Upgrade to Pro to see how this keyword&apos;s rank moved over the last 3 months.
                      </p>
                      <Link
                        href="/dashboard/subscription"
                        className="mt-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                      >
                        Upgrade to Pro
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {hasUntrackedGap && firstRecordedOn && (
                <p className="text-xs text-gray-500 text-center">
                  History starts {formatDay(firstRecordedOn)} — more will fill in as this keyword keeps being tracked.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
