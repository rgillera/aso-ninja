"use client";

import { useState } from "react";
import { PlusIcon, CheckIcon, MinusIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword } from "./types";
import { AnalyzeAllButton } from "./ui";

type Props = {
  activeApp?: ActiveApp;
  trackedKeywords: Keyword[];
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  onRemoveKeyword?: (keyword: string) => void;
};

const WORD_COUNT = 4;

type Combos = { two: string[]; three: string[]; four: string[] };

// Every size-`size` subset of words, order preserved, e.g. combinations(["a","b","c"], 2) -> [["a","b"],["a","c"],["b","c"]].
function combinations(words: string[], size: number): string[][] {
  if (size === 0) return [[]];
  if (size > words.length) return [];
  const result: string[][] = [];
  words.forEach((word, i) => {
    combinations(words.slice(i + 1), size - 1).forEach((rest) => result.push([word, ...rest]));
  });
  return result;
}

// All orderings of the given words, e.g. ["fast", "food"] -> [["fast","food"],["food","fast"]].
function permute(words: string[]): string[][] {
  if (words.length <= 1) return [words];
  const result: string[][] = [];
  words.forEach((word, i) => {
    const rest = [...words.slice(0, i), ...words.slice(i + 1)];
    permute(rest).forEach((p) => result.push([word, ...p]));
  });
  return result;
}

// Every ordering of every size-`size` subset, deduped case-insensitively and joined into phrases.
function buildCombos(words: string[], size: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  combinations(words, size).forEach((subset) => {
    permute(subset).forEach((p) => {
      const term = p.join(" ");
      const key = term.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(term);
    });
  });
  return result;
}

function ShufflePill({ term, tracked, onAdd, onRemove }: {
  term: string;
  tracked: boolean;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => tracked ? onRemove?.(term) : onAdd(term)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all ${
        tracked
          ? hovered
            ? "bg-red-500/10 ring-1 ring-red-500/40 text-red-400 cursor-pointer"
            : "bg-indigo-500/20 ring-1 ring-indigo-500/40 text-indigo-300"
          : "bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-300 hover:ring-indigo-500/50 hover:text-white"
      }`}
    >
      {tracked
        ? hovered
          ? <MinusIcon className="size-3 text-red-400 shrink-0" />
          : <CheckIcon className="size-3 text-indigo-400 shrink-0" />
        : <PlusIcon className="size-3 text-gray-500 shrink-0" />
      }
      <span>{term}</span>
    </button>
  );
}

function ComboSection({ label, terms, trackedSet, onAdd, onRemove, onAddAll }: {
  label: string;
  terms: string[];
  trackedSet: Set<string>;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  onAddAll?: (terms: string[]) => void;
}) {
  const tracked = terms.filter((t) => trackedSet.has(t.toLowerCase())).length;

  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
          <span className="text-[10px] text-gray-600">{tracked} / {terms.length}</span>
        </div>
        <AnalyzeAllButton
          onClick={() => {
            const untracked = terms.filter((t) => !trackedSet.has(t.toLowerCase()));
            if (!untracked.length) return;
            if (onAddAll) onAddAll(untracked); else untracked.forEach(onAdd);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {terms.map((t) => (
          <ShufflePill
            key={t}
            term={t}
            tracked={trackedSet.has(t.toLowerCase())}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

export function KeywordSuggestionCombinations({ trackedKeywords, onAddKeyword, onAddKeywords, onRemoveKeyword }: Props) {
  const [words, setWords]   = useState<string[]>(Array(WORD_COUNT).fill(""));
  const [combos, setCombos] = useState<Combos | null>(null);

  const trackedSet = new Set(trackedKeywords.map((k) => k.keyword.toLowerCase()));
  const filled      = words.map((w) => w.trim()).filter(Boolean);
  const canShuffle  = filled.length >= 2;

  const handleShuffle = () => {
    if (!canShuffle) return;
    setCombos({
      two:   buildCombos(filled, 2),
      three: buildCombos(filled, 3),
      four:  buildCombos(filled, 4),
    });
  };

  const handleReset = () => {
    setWords(Array(WORD_COUNT).fill(""));
    setCombos(null);
  };

  const updateWord = (i: number, value: string) => {
    setWords((prev) => prev.map((w, idx) => (idx === i ? value : w)));
  };

  const hasInput = filled.length > 0 || combos !== null;

  return (
    <div className="px-4 py-3">
      <p className="mb-2.5 text-xs text-gray-500">
        Enter up to {WORD_COUNT} words and shuffle them into new keyword combinations.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {words.map((w, i) => (
          <input
            key={i}
            value={w}
            onChange={(e) => updateWord(i, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleShuffle()}
            placeholder={`Word ${i + 1}`}
            className="min-w-[80px] flex-1 rounded-md bg-[#0d0f14] px-2.5 py-1.5 text-xs text-gray-200 ring-1 ring-white/[0.08] placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        ))}
        <button
          onClick={handleShuffle}
          disabled={!canShuffle}
          className="flex w-32 shrink-0 items-center justify-center gap-1.5 rounded-md bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/40 transition-colors hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-500/20"
        >
          <ArrowsRightLeftIcon className="size-3.5" />
          Shuffle
        </button>
        {hasInput && (
          <button
            onClick={handleReset}
            className="shrink-0 text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            Reset
          </button>
        )}
      </div>

      {combos !== null && (
        <div className="mt-1">
          {combos.two.length === 0 ? (
            <p className="py-3 text-xs text-gray-600">No combinations yet.</p>
          ) : (
            <>
              <ComboSection
                label="2-Word Combinations"
                terms={combos.two}
                trackedSet={trackedSet}
                onAdd={onAddKeyword}
                onRemove={onRemoveKeyword}
                onAddAll={onAddKeywords}
              />
              {combos.three.length > 0 && (
                <ComboSection
                  label="3-Word Combinations"
                  terms={combos.three}
                  trackedSet={trackedSet}
                  onAdd={onAddKeyword}
                  onRemove={onRemoveKeyword}
                  onAddAll={onAddKeywords}
                />
              )}
              {combos.four.length > 0 && (
                <ComboSection
                  label="4-Word Combinations"
                  terms={combos.four}
                  trackedSet={trackedSet}
                  onAdd={onAddKeyword}
                  onRemove={onRemoveKeyword}
                  onAddAll={onAddKeywords}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
