"use client";

import { useState } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

type Unit = "day" | "week" | "month";

const UNIT_DAYS: Record<Unit, number> = { day: 1, week: 7, month: 30 };

type Props = {
  rating: number | null;
  ratingCount: number | null;
};

export function AssessYourApp({ rating, ratingCount }: Props) {
  const [target, setTarget] = useState(4.8);
  const [duration, setDuration] = useState(1);
  const [unit, setUnit] = useState<Unit>("day");
  const [starValue, setStarValue] = useState(5);

  const canCompute = rating != null && ratingCount != null && ratingCount > 0;

  // Solving (C*R + N*V) / (C + N) = T for N, where C = current count,
  // R = current average, T = target average, V = the star value being added.
  let result: { variation: number; achievable: boolean; alreadyThere: boolean } | null = null;
  if (canCompute) {
    const C = ratingCount!;
    const R = rating!;
    const T = target;
    const V = starValue;
    if (V === T) {
      result = null; // division by zero — no amount of V-star ratings changes the average onto exactly V
    } else {
      const N = (C * (T - R)) / (V - T);
      const totalDays = duration * UNIT_DAYS[unit];
      result = {
        variation: N / totalDays,
        achievable: true,
        alreadyThere: N <= 0,
      };
    }
  }

  return (
    <div className="rounded-xl bg-[#1a1d24] p-5 ring-1 ring-white/[0.08]">
      <p className="text-sm font-medium text-gray-300 mb-4">Assess your app</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
        <span>To reach</span>
        <input
          type="number"
          step={0.01}
          min={1}
          max={5}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-16 rounded-lg bg-[#0d0f14] px-2 py-1 text-center text-white ring-1 ring-white/[0.08] focus:outline-none focus:ring-indigo-500"
        />
        <span>stars in</span>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
          className="w-14 rounded-lg bg-[#0d0f14] px-2 py-1 text-center text-white ring-1 ring-white/[0.08] focus:outline-none focus:ring-indigo-500"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="rounded-lg bg-[#0d0f14] px-2 py-1 text-white ring-1 ring-white/[0.08] focus:outline-none focus:ring-indigo-500"
        >
          <option value="day">day</option>
          <option value="week">week</option>
          <option value="month">month</option>
        </select>
        <span>you need a variation of</span>

        {!canCompute ? (
          <span className="text-gray-500">—</span>
        ) : result === null ? (
          <span className="text-amber-400">pick a star value different from your target</span>
        ) : result.alreadyThere ? (
          <span className="text-emerald-400">you already meet or exceed this target</span>
        ) : (
          <span className={`inline-flex items-center gap-1 font-semibold ${result.variation >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {result.variation >= 0 ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />}
            {Math.abs(result.variation).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        )}

        <span>{unit === "day" ? "daily" : unit === "week" ? "weekly" : "monthly"}</span>
        <input
          type="number"
          min={1}
          max={5}
          value={starValue}
          onChange={(e) => setStarValue(Math.min(5, Math.max(1, Number(e.target.value))))}
          className="w-12 rounded-lg bg-[#0d0f14] px-2 py-1 text-center text-white ring-1 ring-white/[0.08] focus:outline-none focus:ring-indigo-500"
        />
        <span>star ratings.</span>
      </div>
    </div>
  );
}
