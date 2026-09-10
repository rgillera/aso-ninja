"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { XMarkIcon, ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { WeeklyRankEntry } from "@/app/api/keywords/rankings-history/route";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { REPORT_MONTHS, planNeededForMoreHistory } from "@/libs/keyword-report-window";

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

function dotShape(props: unknown) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: { position: number | null } };
  // Nothing to draw before this keyword's first-ever snapshot, or across the
  // locked leading stretch — see `firstRecordedOn` and `lockedCount` below.
  // connectNulls={false} on the Line already breaks the line itself there;
  // this just keeps a dot from appearing at that gap too.
  if (payload.position == null) return <></>;
  return <circle cx={cx} cy={cy} r={3} fill="#818cf8" />;
}

export function RankHistoryPanel({ term, storeId, store, country, onClose }: Props) {
  const workspaceId = useWorkspaceId();
  const [weekly, setWeekly] = useState<WeeklyRankEntry[]>([]);
  // Defaults to the full window so nothing flashes as locked before the
  // real entitlement comes back from the API.
  const [unlockedWeeks, setUnlockedWeeks] = useState(0);
  const [unlockedMonths, setUnlockedMonths] = useState(REPORT_MONTHS);
  const [firstRecordedOn, setFirstRecordedOn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ keyword: term, store, country, storeId, workspaceId });
    fetch(`/api/keywords/rankings-history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setWeekly(d.weekly ?? []);
        setUnlockedWeeks(typeof d.unlockedWeeks === "number" ? d.unlockedWeeks : 0);
        setUnlockedMonths(typeof d.unlockedMonths === "number" ? d.unlockedMonths : REPORT_MONTHS);
        setFirstRecordedOn(d.firstRecordedOn ?? null);
      })
      .catch(() => {
        setWeekly([]);
        setUnlockedWeeks(0);
        setUnlockedMonths(REPORT_MONTHS);
        setFirstRecordedOn(null);
      })
      .finally(() => setLoading(false));
  }, [term, storeId, store, country, workspaceId]);

  // Always a full ~52-week window; the oldest `weekly.length - unlockedWeeks`
  // of them are the locked/blurred tease — same split as Volume History.
  const lockedCount = Math.max(0, weekly.length - unlockedWeeks);
  const currentIndex = weekly.length - 1;
  const windowLabel = lockedCount === 0
    ? `Last ${unlockedMonths} month${unlockedMonths === 1 ? "" : "s"}`
    : `${unlockedMonths === 1 ? "This month" : `Last ${unlockedMonths} months`} · earlier history locked`;

  // Real values before the plan's unlocked window stay in `weekly` (for the
  // tooltip to explain what's there) but are nulled out for the line/dots
  // themselves, so the chart doesn't draw through the locked stretch —
  // exactly like it already doesn't draw before `firstRecordedOn`.
  const chartData = weekly.map((w, i) => (i < lockedCount ? { ...w, position: null } : w));
  const weeklyMax = weekly.reduce((m, r) => Math.max(m, r.position ?? 0), 0);
  const hasUntrackedGap = weekly.some((w, i) => i >= lockedCount && w.position == null);

  function axisTick(props: unknown) {
    const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
    const isCurrent = index === currentIndex;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isCurrent ? "#e5e7eb" : "#6b7280"} fontWeight={isCurrent ? 600 : 400}>
        {formatDay(payload.value)}
      </text>
    );
  }

  // Never reveal a locked week's real rank through the tooltip, even though
  // there's no dot there to hover.
  function tooltipContent(props: unknown) {
    const { active, payload } = props as { active?: boolean; payload?: { payload: WeeklyRankEntry }[] };
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    const index = weekly.findIndex((w) => w.week === entry.week);
    const isLocked = index < lockedCount;
    return (
      <div className="rounded-lg border border-white/10 bg-[#1a1d24] light:bg-white px-3 py-2 text-xs">
        <p className="text-gray-400 light:text-gray-600">Week of {formatDay(entry.recorded_on)}</p>
        {isLocked ? (
          <p className="mt-0.5 flex items-center gap-1 text-violet-400 light:text-violet-700">
            <LockClosedIcon className="size-3" /> Upgrade to see this
          </p>
        ) : (
          <p className="mt-0.5 text-gray-200 light:text-gray-800">
            Rank: <span className="font-semibold">{weekly[index]?.position == null ? "Not tracked yet" : `#${weekly[index].position}`}</span>
          </p>
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
            Rank history for{" "}
            <span className="font-bold text-white light:text-gray-900">{term}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 light:text-gray-400 hover:text-white light:hover:text-gray-900 transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-gray-500">
              Loading rank history…
            </div>
          ) : weekly.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center px-6">
              <ChartBarIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400 light:text-gray-600">No history yet for this keyword</p>
              <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
                Rank snapshots accumulate automatically each time this keyword is checked.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="recorded_on"
                      tick={axisTick}
                      axisLine={{ stroke: "#ffffff1a" }}
                      tickLine={false}
                      interval={Math.max(0, Math.ceil(weekly.length / 13) - 1)}
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
                    <Tooltip content={tooltipContent} cursor={{ stroke: "#ffffff20" }} />
                    <Line type="linear" dataKey="position" name="Rank" stroke="#818cf8" strokeWidth={2} dot={dotShape} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>

                {lockedCount > 0 && (
                  <div className="absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-2 text-center px-4" style={{ width: `${(lockedCount / weekly.length) * 100}%` }}>
                    <LockClosedIcon className="size-5 text-violet-400 light:text-violet-700" />
                    <p className="text-sm font-semibold text-white light:text-gray-900">Earlier rank trend locked</p>
                    <p className="text-xs text-gray-400 light:text-gray-600 max-w-[16rem]">
                      Upgrade to {planNeededForMoreHistory(unlockedMonths)} to see how this keyword&apos;s rank moved further back.
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

              <p className="text-[10px] text-gray-600 light:text-gray-400 text-center">
                {windowLabel} · weekly median rank
              </p>

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
