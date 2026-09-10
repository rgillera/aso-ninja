"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { VolumeHistoryEntry } from "@/app/api/keywords/volume-history/route";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { REPORT_MONTHS, planNeededForMoreHistory } from "@/libs/keyword-report-window";

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
  const [rows, setRows] = useState<VolumeHistoryEntry[]>([]);
  // Defaults to the full window so nothing flashes as locked before the
  // real entitlement comes back from the API.
  const [unlockedMonths, setUnlockedMonths] = useState(REPORT_MONTHS);
  const [loading, setLoading] = useState(true);

  // Always a full REPORT_MONTHS window of bars; the oldest
  // `rows.length - unlockedMonths` of them are the locked/blurred tease.
  const lockedCount = Math.max(0, rows.length - unlockedMonths);
  const currentIndex = rows.length - 1;
  const windowLabel = lockedCount === 0
    ? `Last ${rows.length} month${rows.length === 1 ? "" : "s"}`
    : `${unlockedMonths === 1 ? "This month" : `Last ${unlockedMonths} months`} · past ${lockedCount} month${lockedCount === 1 ? "" : "s"} locked`;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ term, store, country, workspaceId });
    fetch(`/api/keywords/volume-history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setUnlockedMonths(typeof d.unlockedMonths === "number" ? d.unlockedMonths : REPORT_MONTHS);
      })
      .catch(() => {
        setRows([]);
        setUnlockedMonths(REPORT_MONTHS);
      })
      .finally(() => setLoading(false));
  }, [term, store, country, workspaceId]);

  // Real scores for locked months stay in `rows` (the tooltip still needs
  // them to show the upgrade message at the right point) but are nulled out
  // for the line itself here, so it doesn't draw through the locked leading
  // stretch — connectNulls={false} then breaks the line at that gap.
  const chartData = rows.map((r, i) => (i < lockedCount ? { ...r, score: null } : r));

  function dotShape(props: unknown) {
    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { score: number | null } };
    if (payload.score == null) return <></>;
    return <circle cx={cx} cy={cy} r={3} fill="#818cf8" />;
  }

  function axisTick(props: unknown) {
    const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
    const isCurrent = index === currentIndex;
    return (
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fontSize={11}
        fontWeight={isCurrent ? 600 : 400}
        className={isCurrent ? "fill-gray-200 light:fill-gray-800" : "fill-gray-500"}
      >
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
    const isLockedBar = index < lockedCount;
    return (
      <div className="rounded-lg border border-white/10 bg-[#1a1d24] light:bg-white px-3 py-2 text-xs">
        <p className="text-gray-400 light:text-gray-600">{formatMonth(entry.recorded_on)}</p>
        {isLockedBar ? (
          <p className="mt-0.5 flex items-center gap-1 text-violet-400 light:text-violet-700">
            <LockClosedIcon className="size-3" /> Upgrade to see this
          </p>
        ) : (
          <p className="mt-0.5 text-gray-200 light:text-gray-800">Avg. Volume: <span className="font-semibold">{entry.score}</span></p>
        )}
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#141417] light:bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] light:border-black/[0.08] shrink-0">
          <h2 className="text-sm font-medium text-gray-300 light:text-gray-700">
            Volume history for{" "}
            <span className="font-bold text-white light:text-gray-900">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 light:text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors">
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
              <ChartBarIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400 light:text-gray-600">No history yet for this keyword</p>
              <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
                Volume snapshots accumulate automatically each time this keyword is checked.
              </p>
            </div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
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
                    <Tooltip content={tooltipContent} cursor={{ stroke: "#ffffff20" }} />
                    <Line type="linear" dataKey="score" name="Avg. Volume" stroke="#818cf8" strokeWidth={2} dot={dotShape} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>

                {lockedCount > 0 && (
                  <div className="absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-2 text-center px-4" style={{ width: `${(lockedCount / rows.length) * 100}%` }}>
                    <LockClosedIcon className="size-5 text-violet-400 light:text-violet-700" />
                    <p className="text-sm font-semibold text-white light:text-gray-900">{lockedCount} month{lockedCount === 1 ? "" : "s"} locked</p>
                    <p className="text-xs text-gray-400 light:text-gray-600 max-w-[16rem]">
                      Upgrade to {planNeededForMoreHistory(unlockedMonths)} to see this keyword&apos;s volume trend further back.
                    </p>
                    <Link
                      href="/dashboard/subscription"
                      className="mt-1 text-xs font-semibold text-violet-400 light:text-violet-700 hover:text-violet-300 transition-colors underline underline-offset-2"
                    >
                      Upgrade to {planNeededForMoreHistory(unlockedMonths)}
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-3 text-[10px] text-gray-600 light:text-gray-400">
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
