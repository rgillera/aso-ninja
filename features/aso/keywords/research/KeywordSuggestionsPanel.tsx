"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Toggle } from "./ui";
import { SUGGESTION_TABS, RANK_PILLS } from "./constants";
import type { RankPill } from "./types";

const SAMPLE_SUGGESTIONS = ["nutrisnap", "nutri snap", "nutrition", "snap calories", "food scan"];

type Props = {
  translateToggle: boolean;
  onTranslateToggle: () => void;
  onAddKeyword: (keyword: string) => void;
};

export function KeywordSuggestionsPanel({ translateToggle, onTranslateToggle, onAddKeyword }: Props) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Top Ranked");
  const [rankPill, setRankPill] = useState<RankPill>("All");

  return (
    <div className="mx-6 mb-4 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <span className="text-sm font-semibold text-white">Keyword Suggestions</span>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowsUpDownIcon className="size-3.5" />
            Move to table
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1 rounded text-gray-500 hover:text-white transition-colors"
          >
            {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-white/[0.07] scrollbar-none">
            {SUGGESTION_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`flex items-center gap-1 whitespace-nowrap px-3.5 py-3 text-xs font-medium border-b-2 -mb-px transition-colors shrink-0 ${
                  activeTab === tab.label
                    ? "border-indigo-400 text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.ai && <SparklesIcon className="size-3 text-violet-400" />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* App selector + filters */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/[0.07] flex-wrap gap-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm font-bold ring-1 ring-white/10">
                  N
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-indigo-500 ring-1 ring-[#1a1d24]" />
              </div>
              <button className="size-8 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                <PlusIcon className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                <FunnelIcon className="size-3.5" />
                Filters
              </button>
              <button className="rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                Volume Today
              </button>
              <button className="rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                Max. Volume
              </button>
              <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5">
                <span className="text-xs text-gray-500">Translate to English</span>
                <Toggle checked={translateToggle} onChange={onTranslateToggle} />
              </div>
            </div>
          </div>

          {/* Rank pills */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.07]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mr-1">Rank</span>
            {RANK_PILLS.map((pill) => (
              <button
                key={pill}
                onClick={() => setRankPill(pill)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  rankPill === pill
                    ? "bg-indigo-500 text-white"
                    : "bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-400 hover:text-white"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Suggestions */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Your App</span>
                <span className="text-[10px] text-gray-600">0 / 2</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors">
                  <ArrowDownTrayIcon className="size-3.5" />
                </button>
                <button className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors">
                  <DocumentDuplicateIcon className="size-3.5" />
                </button>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  + Analyze all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SUGGESTIONS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => onAddKeyword(kw)}
                  className="flex items-center gap-1 rounded-full bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1 text-xs text-gray-300 hover:ring-indigo-500/50 hover:text-white transition-all"
                >
                  <PlusIcon className="size-3 text-gray-500" />
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
