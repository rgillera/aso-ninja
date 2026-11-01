"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
  onClose?: () => void;
  // A card in the page flow instead of a modal: the Performance tab of
  // Keyword Research's side pane stacks these for one keyword.
  inline?: boolean;
  // The app doesn't rank for this keyword right now: an empty history then
  // says so, instead of reading like missing data.
  unranked?: boolean;
};

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMonth(month: string): string {
  const d = new Date(month + "-01T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short" });
}

function formatMonthLong(month: string): string {
  const d = new Date(month + "-01T00:00:00");
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// One bar per calendar month, spanning that month's best to worst weekly
// rank. `weeks` keeps only the weeks the plan can see, so a month that's
// half inside the locked stretch shows just its unlocked half; `locked` is
// a month with no unlocked weeks at all.
type MonthlyRankEntry = {
  month: string; // "2026-08"
  weeks: WeeklyRankEntry[];
  range: [number, number] | null; // [best, worst]; null = nothing to draw
  locked: boolean;
};

// Weeks are bucketed by the month their Monday falls in. The ~52-week
// window spills into a 13th partial month at the front, so only the last
// REPORT_MONTHS are kept, matching Volume History's month count.
function toMonthly(weekly: WeeklyRankEntry[], lockedWeeks: number): MonthlyRankEntry[] {
  const byMonth = new Map<string, { weeks: WeeklyRankEntry[]; anyUnlocked: boolean }>();
  weekly.forEach((w, i) => {
    const key = w.week.slice(0, 7);
    const bucket = byMonth.get(key) ?? { weeks: [], anyUnlocked: false };
    if (i >= lockedWeeks) {
      bucket.weeks.push(w);
      bucket.anyUnlocked = true;
    }
    byMonth.set(key, bucket);
  });
  return [...byMonth.entries()].slice(-REPORT_MONTHS).map(([month, { weeks, anyUnlocked }]) => {
    const ranks = weeks.map((w) => w.position).filter((p): p is number => p != null);
    return {
      month,
      weeks,
      range: ranks.length ? [Math.min(...ranks), Math.max(...ranks)] : null,
      locked: !anyUnlocked,
    };
  });
}

// Ranks start at #1 (there's no #0), so the axis does too. Ticks are #1
// plus round multiples of a step sized to the worst rank shown, with the top
// rounded up to the next one, so labels read #1, #5, #10... instead of
// whatever uneven values an auto-scaled [1, n] axis would pick.
function yAxisScale(max: number): { domain: [number, number]; ticks: number[] } {
  const top = Math.max(max + 5, 20);
  const step = top <= 20 ? 5 : top <= 50 ? 10 : top <= 100 ? 25 : 50;
  const end = Math.ceil(top / step) * step;
  const ticks = [1];
  for (let t = step; t <= end; t += step) ticks.push(t);
  return { domain: [1, end], ticks };
}

// A month whose best and worst week match would be a zero-height bar, so
// every bar gets a minimum height, centered on its real span.
function rangeBarShape(props: unknown) {
  const { x, y, width, height } = props as { x: number; y: number; width: number; height: number };
  const top = Math.min(y, y + height);
  const h = Math.abs(height);
  const minH = 4;
  const drawH = Math.max(h, minH);
  return <rect x={x} y={top - (drawH - h) / 2} width={width} height={drawH} rx={Math.min(3, width / 2)} fill="#818cf8" />;
}

export function RankHistoryPanel({ term, storeId, store, country, onClose, inline, unranked = false }: Props) {
  const workspaceId = useWorkspaceId();
  const [allWeekly, setWeekly] = useState<WeeklyRankEntry[]>([]);
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
  const hiddenCount = Math.max(0, allWeekly.length - unlockedWeeks);
  // Inline (Keyword Research's Performance tab) draws just the plan's
  // unlocked weeks, with no locked stretch or upgrade prompt.
  const weekly = inline ? allWeekly.slice(hiddenCount) : allWeekly;
  const months = toMonthly(weekly, inline ? 0 : hiddenCount);
  const lockedCount = months.filter((m) => m.locked).length;
  const currentIndex = months.length - 1;
  // With only the current month unlocked there's barely a trend to show, so
  // the whole panel is the lock screen — same as Volume History.
  const fullyLocked = lockedCount > 0 && unlockedMonths <= 1;
  const windowLabel = lockedCount === 0
    ? `Last ${unlockedMonths} month${unlockedMonths === 1 ? "" : "s"}`
    : `${unlockedMonths === 1 ? "This month" : `Last ${unlockedMonths} months`} · earlier history locked`;

  // Locked weeks never make it into `months` (see toMonthly), so neither
  // the bars nor the y-axis scale can hint at a rank the plan can't see.
  const worstShown = months.reduce((m, r) => Math.max(m, r.range?.[1] ?? 0), 0);
  const yScale = yAxisScale(worstShown);
  const hasUntrackedGap = months.some((m) => m.weeks.some((w) => w.position == null));

  function axisTick(props: unknown) {
    const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
    const isCurrent = index === currentIndex;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={isCurrent ? "#e5e7eb" : "#6b7280"} fontWeight={isCurrent ? 600 : 400}>
        {formatMonth(payload.value)}
      </text>
    );
  }

  // The month's best-to-worst span, then each of its weeks. A locked month
  // only says so; its weeks were never handed to the chart.
  function tooltipContent(props: unknown) {
    const { active, payload } = props as { active?: boolean; payload?: { payload: MonthlyRankEntry }[] };
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    const best = entry.range?.[0];
    const worst = entry.range?.[1];
    return (
      <div className="min-w-40 rounded-lg border border-white/10 bg-[#141417] light:bg-white px-3 py-2 text-xs">
        <p className="text-gray-400 light:text-gray-600">{formatMonthLong(entry.month)}</p>
        {entry.locked ? (
          <p className="mt-0.5 flex items-center gap-1 text-violet-400 light:text-violet-700">
            <LockClosedIcon className="size-3" /> Upgrade to see this
          </p>
        ) : !entry.range ? (
          <p className="mt-0.5 text-gray-200 light:text-gray-800">Not tracked yet</p>
        ) : (
          <>
            <p className="mt-0.5 text-gray-200 light:text-gray-800">
              {best === worst ? "Rank " : "Rank range "}
              <span className="font-semibold">{best === worst ? `#${best}` : `#${best} to #${worst}`}</span>
            </p>
            <ul className="mt-1.5 flex flex-col gap-0.5 border-t border-white/[0.07] light:border-black/[0.08] pt-1.5">
              {entry.weeks.map((w) => (
                <li key={w.week} className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Week of {formatDay(w.week)}</span>
                  <span
                    className={
                      w.position == null
                        ? "text-gray-600 light:text-gray-400"
                        : best !== worst && w.position === best
                          ? "font-semibold text-emerald-400 light:text-emerald-700"
                          : best !== worst && w.position === worst
                            ? "font-semibold text-rose-400 light:text-rose-700"
                            : "text-gray-200 light:text-gray-800"
                    }
                  >
                    {w.position == null ? "n/a" : `#${w.position}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  const body = (
    <>
      {loading ? (
        <div className="flex h-64 items-center justify-center text-xs text-gray-500">
          Loading rank history…
        </div>
      ) : months.length === 0 || (unranked && !months.some((m) => m.range)) ? (
        <div className={`flex ${inline ? "h-40" : "h-64"} flex-col items-center justify-center text-center px-6`}>
          <ChartBarIcon className="size-8 text-gray-700 light:text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-400 light:text-gray-600">
            {unranked ? "Your app isn't ranking for this keyword yet" : "No history yet for this keyword"}
          </p>
          <p className="mt-1 text-xs text-gray-600 light:text-gray-400 max-w-xs">
            {unranked
              ? "Rank history starts the first week it shows up in search results."
              : "Rank snapshots accumulate automatically each time this keyword is checked."}
          </p>
        </div>
      ) : fullyLocked ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center px-6">
          <LockClosedIcon className="size-6 text-violet-400 light:text-violet-700" />
          <p className="text-sm font-semibold text-white light:text-gray-900">Rank history locked</p>
          <p className="text-xs text-gray-400 light:text-gray-600 max-w-xs">
            Upgrade to{" "}
            <span className="font-semibold text-white light:text-gray-900">{planNeededForMoreHistory(unlockedMonths)}</span>{" "}
            to see how this keyword&apos;s rank has moved over the past months.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-1 text-xs font-semibold text-violet-400 light:text-violet-700 hover:text-violet-300 transition-colors underline underline-offset-2"
          >
            Upgrade to {planNeededForMoreHistory(unlockedMonths)}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={months} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={axisTick}
                  axisLine={{ stroke: "#ffffff1a" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  domain={yScale.domain}
                  ticks={yScale.ticks}
                  // #1 at the top: a better rank is a smaller number, so
                  // an improving keyword should climb, not dip.
                  reversed
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => `#${v}`}
                />
                <Tooltip content={tooltipContent} cursor={{ fill: "#ffffff08" }} />
                {/* A [best, worst] pair per month draws a floating bar between the two. */}
                <Bar dataKey="range" name="Rank" maxBarSize={inline ? 14 : 18} shape={rangeBarShape} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>

            {lockedCount > 0 && (
              <div className="absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-2 text-center px-4" style={{ width: `${(lockedCount / months.length) * 100}%` }}>
                <LockClosedIcon className="size-5 text-violet-400 light:text-violet-700" />
                <p className="text-sm font-semibold text-white light:text-gray-900">Earlier rank trend locked</p>
                <p className="text-xs text-gray-400 light:text-gray-600 max-w-[16rem]">
                  Upgrade to{" "}
                  <span className="font-semibold text-white light:text-gray-900">{planNeededForMoreHistory(unlockedMonths)}</span>{" "}
                  to see how this keyword&apos;s rank moved further back.
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
            {windowLabel} · best to worst weekly rank each month
          </p>

          {hasUntrackedGap && firstRecordedOn && (
            <p className="text-xs text-gray-500 text-center">
              History starts {formatDay(firstRecordedOn)}. More will fill in as this keyword keeps being tracked.
            </p>
          )}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <section className="rounded-2xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm">
        <h3 className="px-4 pt-4 text-xs font-medium text-gray-500">Rank history</h3>
        <div className="p-4">{body}</div>
      </section>
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
          {body}
        </div>
      </div>
    </div>,
    document.body
  );
}
