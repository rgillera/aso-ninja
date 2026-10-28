"use client";

import { CheckIcon, PlusIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { VolumeBar } from "@/features/aso/keywords/research/ui";
import type { CombinationGroup } from "./types";

// Same thresholds as CombinationTable, so a number reads the same color in
// the pane as on the full page.
const diffColor = (d: number) => d > 60 ? "text-red-400 light:text-red-600" : d > 40 ? "text-yellow-500 light:text-yellow-600" : "text-emerald-400 light:text-emerald-700";
const chanceColor = (c: number) => c > 15 ? "text-emerald-400 light:text-emerald-700" : "text-gray-400 light:text-gray-600";

// Long Tail docked in Keyword Research's side pane: just the selected
// keyword's variations, easiest to rank first (the reason to go long tail),
// each with its own Add, plus Add all. The full page's table, with its
// other groups, seed chips and bulk selection, stays on the full page.
export function LongTailFocus({
  seed, group, trackedSet, pendingSet, onAdd,
}: {
  seed: string | null;
  group: CombinationGroup | undefined;
  trackedSet: Set<string>;
  pendingSet: Set<string>;
  onAdd: (terms: string[]) => void;
}) {
  if (!seed) {
    return (
      <div className="py-16 px-6 text-center">
        <PuzzlePieceIcon className="size-10 text-gray-700 light:text-gray-300 mx-auto mb-4" />
        <p className="text-sm text-gray-600 light:text-gray-400">Click a keyword in your table to find its long tail versions.</p>
      </div>
    );
  }

  const loading = !group || group.loading;
  const children = [...(group?.children ?? [])].sort((a, b) => b.chance - a.chance || a.difficulty - b.difficulty);
  const avgDiff = children.length ? children.reduce((sum, c) => sum + c.difficulty, 0) / children.length : 0;
  const untracked = children.filter((c) => !trackedSet.has(c.term.toLowerCase()) && !pendingSet.has(c.term.toLowerCase()));

  return (
    <div className="px-4 py-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white light:text-gray-900">
            Long tail for &ldquo;{seed}&rdquo;
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {loading ? "Finding variations..." : `${children.length} variations, easiest to rank first`}
          </p>
        </div>
        {!loading && untracked.length > 0 && (
          <button
            type="button"
            onClick={() => onAdd(untracked.map((c) => c.term))}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors"
          >
            <PlusIcon className="size-3.5 stroke-[2.5]" />
            Add all
          </button>
        )}
      </div>

      <div className="rounded-xl bg-[#141417] light:bg-white ring-1 ring-white/[0.06] light:ring-gray-950/[0.07] light:shadow-sm overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_88px_40px_48px_64px] items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-white/[0.06] light:border-black/[0.06]">
          <span>Keyword</span>
          <span>Vol.</span>
          <span className="text-right">Diff.</span>
          <span className="text-right">Chance</span>
          <span />
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-3 py-3 border-b last:border-0 border-white/[0.04] light:border-black/[0.05]">
              <div className="h-3 w-2/3 rounded bg-white/[0.06] light:bg-black/[0.05] animate-pulse" />
            </div>
          ))
        ) : children.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-gray-500">No long tail versions found for this keyword.</p>
        ) : (
          children.map((c) => {
            const key = c.term.toLowerCase();
            const tracked = trackedSet.has(key);
            const pending = pendingSet.has(key);
            // Clearly below the group's average difficulty (the "Avg.
            // Difficulty" the full page shows): a real step down.
            const easier = c.difficulty <= avgDiff - 10;
            return (
              <div
                key={c.term}
                className="grid grid-cols-[minmax(0,1fr)_88px_40px_48px_64px] items-center gap-2 px-3 py-2.5 border-b last:border-0 border-white/[0.04] light:border-black/[0.05]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm text-gray-200 light:text-gray-800" title={c.term}>{c.term}</span>
                  {easier && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-semibold text-emerald-300 light:text-emerald-700">
                      Easier
                    </span>
                  )}
                </span>
                <VolumeBar value={c.volume} />
                <span className={`text-right text-sm tabular-nums ${diffColor(c.difficulty)}`}>{c.difficulty}</span>
                <span className={`text-right text-sm tabular-nums ${chanceColor(c.chance)}`}>{c.chance}</span>
                <span className="flex justify-end">
                  {tracked ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-indigo-300 light:text-indigo-600">
                      <CheckIcon className="size-3.5" />
                      Added
                    </span>
                  ) : pending ? (
                    <span className="size-3.5 rounded-full border border-gray-500 border-t-transparent animate-spin" aria-label="Adding" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd([c.term])}
                      className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-semibold text-indigo-400 light:text-indigo-600 hover:bg-indigo-500/10 transition-colors"
                    >
                      <PlusIcon className="size-3.5 stroke-[2.5]" />
                      Add
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
