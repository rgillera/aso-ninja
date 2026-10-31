"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { MAX_COMBINATIONS_PER_SEED, type CombinationGroup } from "./types";

// "Generate more" under a group's combinations, shared by the full table and
// the docked pane. Shows the in-flight round, the "nothing new" result, and
// the per-seed cap in place of the button.
export function GenerateMore({ group, onGenerateMore }: {
  group: CombinationGroup;
  onGenerateMore: (seed: string) => void;
}) {
  if (group.loading) return null;

  const atCap = group.children.length >= MAX_COMBINATIONS_PER_SEED;
  if (atCap) {
    return (
      <p className="text-xs text-gray-500">
        {MAX_COMBINATIONS_PER_SEED} combinations is the limit for one keyword.
      </p>
    );
  }

  if (group.loadingMore) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 light:text-gray-600">
        <span className="size-3 rounded-full border-2 border-gray-500/40 border-t-gray-300 light:border-t-gray-600 animate-spin" />
        Generating more...
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={() => onGenerateMore(group.seed)}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-400 light:text-indigo-600 hover:bg-indigo-500/10 transition-colors"
      >
        <SparklesIcon className="size-3.5" />
        {group.exhausted ? "Try again" : "Generate more"}
      </button>
      {group.exhausted && (
        <span className="text-xs text-gray-500">No new combinations found.</span>
      )}
    </span>
  );
}
