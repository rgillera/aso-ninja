"use client";

import { useState } from "react";
import Link from "next/link";

// Admin → Growth Starter bonus: pick the kind of link first, then "Make link"
// submits it as a GET to the same page. "Start over" drops the query string.

export type BonusLinkMode = "date" | "24" | "2";

const MODES: { value: BonusLinkMode; label: string }[] = [
  { value: "2", label: "Call only (2 hours)" },
  { value: "24", label: "24 hours" },
  { value: "date", label: "Deadline date" },
];

export function BonusLinkForm({
  initialMode,
  initialDeadline,
  showReset,
}: {
  initialMode: BonusLinkMode;
  initialDeadline: string;
  showReset: boolean;
}) {
  const [mode, setMode] = useState<BonusLinkMode>(initialMode);

  return (
    <form method="get" className="space-y-4 rounded-xl bg-[#141417] light:bg-white p-4 ring-1 ring-white/[0.06] light:ring-black/[0.08]">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Link type">
        {MODES.map((m) => {
          const selected = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(m.value)}
              className={
                selected
                  ? "rounded-lg bg-indigo-600/15 light:bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-300 light:text-indigo-700 ring-1 ring-indigo-500"
                  : "rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-4 py-2 text-sm font-semibold text-gray-200 light:text-gray-800 hover:bg-white/[0.10] light:hover:bg-black/[0.08]"
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {mode === "date" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-400 light:text-gray-600">Buy by</span>
            <input
              type="date"
              name="deadline"
              defaultValue={initialDeadline}
              required
              className="rounded-lg bg-black/30 light:bg-gray-50 px-3 py-2 text-sm text-white light:text-gray-900 ring-1 ring-white/10 light:ring-black/10 outline-none"
            />
          </label>
        ) : (
          <input type="hidden" name="hours" value={mode} />
        )}
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Make link
        </button>
        {showReset && (
          <Link
            href="/admin/growth-starter"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 light:text-gray-600 hover:bg-white/[0.06] light:hover:bg-black/[0.05]"
          >
            Start over
          </Link>
        )}
      </div>
    </form>
  );
}
