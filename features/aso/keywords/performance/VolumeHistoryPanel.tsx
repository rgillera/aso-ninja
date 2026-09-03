"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { VolumeHistoryEntry } from "@/app/api/keywords/volume-history/route";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";

type Props = {
  term: string;
  store: "ios" | "android";
  country: string;
  onClose: () => void;
};

function formatMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function VolumeHistoryPanel({ term, store, country, onClose }: Props) {
  const workspaceId = useWorkspaceId();
  const planSlug     = usePlanSlug();
  const [rows, setRows]       = useState<VolumeHistoryEntry[]>([]);
  const [locked, setLocked]   = useState(false);
  const [loading, setLoading] = useState(true);

  // Pro+ gets a full year, everyone else gets the same 6-month window — Pro
  // sees it in full, Free/Basic only get the current month's bar; the past
  // months are omitted entirely behind an upgrade prompt.
  const currentIndex = rows.length - 1;
  const windowLabel = isPlanAtLeast(planSlug, "pro_plus") ? "Last 12 months"
    : locked ? `This month · past ${currentIndex} month${currentIndex === 1 ? "" : "s"} locked`
    : "Last 6 months";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ term, store, country, workspaceId });
    fetch(`/api/keywords/volume-history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setLocked(!!d.locked);
      })
      .catch(() => {
        setRows([]);
        setLocked(false);
      })
      .finally(() => setLoading(false));
  }, [term, store, country, workspaceId]);

  // Past months draw no bar at all when locked — only the current month
  // (always the last bucket) renders, under the lock overlay's empty space.
  function barShape(props: unknown) {
    const { x, y, width, height, index } = props as { x: number; y: number; width: number; height: number; index: number };
    if (locked && index !== currentIndex) return <></>;
    return <rect x={x} y={y} width={width} height={Math.max(height, 0)} rx={3} fill="#818cf8" />;
  }

  function axisTick(props: unknown) {
    const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
    const isCurrent = index === currentIndex;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isCurrent ? "#e5e7eb" : "#6b7280"} fontWeight={isCurrent ? 600 : 400}>
        {formatMonth(payload.value)}
      </text>
    );
  }

  // Never reveal a locked month's real score through the tooltip, even
  // though there's no bar there to hover.
  function tooltipContent(props: unknown) {
    const { active, payload } = props as { active?: boolean; payload?: { payload: VolumeHistoryEntry }[] };
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    const index = rows.findIndex((r) => r.month === entry.month);
    const isLockedBar = locked && index !== currentIndex;
    return (
      <div className="rounded-lg border border-white/10 bg-[#1a1d24] px-3 py-2 text-xs">
        <p className="text-gray-400">{formatMonth(entry.recorded_on)}</p>
        {isLockedBar ? (
          <p className="mt-0.5 flex items-center gap-1 text-violet-400">
            <LockClosedIcon className="size-3" /> Upgrade to see this
          </p>
        ) : (
          <p className="mt-0.5 text-gray-200">Avg. Volume: <span className="font-semibold">{entry.score}</span></p>
        )}
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">
            Volume history for{" "}
            <span className="font-bold text-white">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-gray-500">
              Loading volume history…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <ChartBarIcon className="size-8 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">No history yet for this keyword</p>
              <p className="mt-1 text-xs text-gray-600 max-w-xs">
                Volume snapshots accumulate automatically each time this keyword is checked.
              </p>
            </div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={rows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="recorded_on"
                      tick={axisTick}
                      axisLine={{ stroke: "#ffffff1a" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip content={tooltipContent} cursor={{ fill: "#ffffff08" }} />
                    <Bar dataKey="score" name="Avg. Volume" shape={barShape} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>

                {locked && rows.length > 1 && (
                  <div className="absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-2 text-center px-4" style={{ width: `${(currentIndex / rows.length) * 100}%` }}>
                    <LockClosedIcon className="size-5 text-violet-400" />
                    <p className="text-sm font-semibold text-white">{currentIndex} month{currentIndex === 1 ? "" : "s"} locked</p>
                    <p className="text-xs text-gray-400 max-w-[16rem]">
                      Upgrade to Pro to see this keyword&apos;s volume trend beyond this month.
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

              <div className="mt-3 text-[10px] text-gray-600">
                {windowLabel} · monthly average
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
