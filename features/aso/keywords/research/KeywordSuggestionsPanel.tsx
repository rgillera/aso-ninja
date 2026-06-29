"use client";

import { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  FunnelIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { Toggle } from "./ui";
import { SUGGESTION_TABS, RANK_PILLS } from "./constants";
import type { RankPill } from "./types";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword } from "./types";
import type { AppMetadataResult, MetadataKeyword } from "@/app/api/keywords/app-metadata/route";

const SAMPLE_SUGGESTIONS = ["nutrisnap", "nutri snap", "nutrition", "snap calories", "food scan"];

type Props = {
  translateToggle: boolean;
  onTranslateToggle: () => void;
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  activeApp?: ActiveApp;
  trackedKeywords?: Keyword[];
};

// ── Metadata Tab ──────────────────────────────────────────────────────────────

function KeywordPill({
  kw,
  tracked,
  onAdd,
}: {
  kw: MetadataKeyword;
  tracked: boolean;
  onAdd: (term: string) => void;
}) {
  return (
    <button
      onClick={() => !tracked && onAdd(kw.term)}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all ${
        tracked
          ? "bg-indigo-500/20 ring-1 ring-indigo-500/40 text-indigo-300 cursor-default"
          : "bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-300 hover:ring-indigo-500/50 hover:text-white"
      }`}
    >
      {tracked
        ? <CheckIcon className="size-3 text-indigo-400 shrink-0" />
        : <PlusIcon  className="size-3 text-gray-500 shrink-0" />
      }
      {kw.term}
      {kw.volume > 0 && (
        <span className={`ml-0.5 font-semibold tabular-nums ${tracked ? "text-indigo-400" : "text-gray-500"}`}>
          {kw.volume}
        </span>
      )}
    </button>
  );
}

function MetadataSection({
  label,
  keywords,
  trackedSet,
  onAdd,
  onAddAll,
  placeholder,
  onLoadMore,
  loadingMore,
}: {
  label: string;
  keywords: MetadataKeyword[] | null;
  trackedSet: Set<string>;
  onAdd: (term: string) => void;
  onAddAll?: (terms: string[]) => void;
  placeholder?: React.ReactNode;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}) {
  const tracked = keywords?.filter((k) => trackedSet.has(k.term)).length ?? 0;
  const total   = keywords?.length ?? 0;

  const handleAnalyzeAll = () => {
    const untracked = keywords?.filter((k) => !trackedSet.has(k.term)).map((k) => k.term) ?? [];
    if (!untracked.length) return;
    if (onAddAll) onAddAll(untracked);
    else untracked.forEach((t) => onAdd(t));
  };

  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
          {keywords && (
            <span className="text-[10px] text-gray-600">{tracked} / {total}</span>
          )}
        </div>
        <button
          onClick={handleAnalyzeAll}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Analyze all
        </button>
      </div>
      {placeholder ?? (
        keywords === null ? (
          <div className="flex flex-wrap gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 rounded-md bg-white/[0.04] animate-pulse" style={{ width: `${50 + i * 15}px` }} />
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <p className="text-xs text-gray-600">No keywords found.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <KeywordPill key={kw.term} kw={kw} tracked={trackedSet.has(kw.term)} onAdd={onAdd} />
              ))}
            </div>
            {onLoadMore && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )
      )}
    </div>
  );
}

function MetadataTab({
  activeApp,
  trackedKeywords,
  onAddKeyword,
  onAddKeywords,
}: {
  activeApp?: ActiveApp;
  trackedKeywords: Keyword[];
  onAddKeyword: (kw: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
}) {
  const [data, setData]                 = useState<AppMetadataResult | null>(null);
  const [loading, setLoading]           = useState(false);
  const [descKeywords, setDescKeywords] = useState<MetadataKeyword[]>([]);
  const [hasMoreDesc, setHasMoreDesc]   = useState(false);
  const [descOffset, setDescOffset]     = useState(0);
  const [loadingMore, setLoadingMore]   = useState(false);

  const fetchMetadata = async (storeId: string, store: string, country: string, offset: number, append: boolean) => {
    const params = new URLSearchParams({ storeId, store, country, descOffset: String(offset) });
    const d: AppMetadataResult = await fetch(`/api/keywords/app-metadata?${params}`).then((r) => r.json());
    if (!append) {
      setData(d);
      setDescKeywords(d.descriptionKeywords);
    } else {
      setDescKeywords((prev) => [...prev, ...d.descriptionKeywords]);
    }
    setHasMoreDesc(d.hasMoreDesc);
    setDescOffset(offset);
  };

  useEffect(() => {
    if (!activeApp?.store_id) return;
    setLoading(true);
    setData(null);
    setDescKeywords([]);
    setHasMoreDesc(false);
    setDescOffset(0);
    fetchMetadata(activeApp.store_id, activeApp.store ?? "ios", activeApp.country ?? "us", 0, false)
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.store_id, activeApp?.store, activeApp?.country]);

  const handleLoadMore = () => {
    if (!activeApp?.store_id || loadingMore) return;
    setLoadingMore(true);
    const nextOffset = descOffset + 20;
    fetchMetadata(activeApp.store_id, activeApp.store ?? "ios", activeApp.country ?? "us", nextOffset, true)
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const trackedSet = new Set(trackedKeywords.map((k) => k.keyword.toLowerCase()));
  const noApp = !activeApp?.store_id;

  return (
    <div className="px-4">
      {noApp && (
        <p className="py-4 text-xs text-gray-600 text-center">Select an app to see its metadata keywords.</p>
      )}
      {!noApp && (
        <>
          <MetadataSection
            label="Title Keywords"
            keywords={loading ? null : (data?.titleKeywords ?? [])}
            trackedSet={trackedSet}
            onAdd={onAddKeyword}
            onAddAll={onAddKeywords}
          />
          <MetadataSection
            label="Subtitle Keywords"
            keywords={loading ? null : (data?.subtitleKeywords ?? [])}
            trackedSet={trackedSet}
            onAdd={onAddKeyword}
            onAddAll={onAddKeywords}
          />
          <MetadataSection
            label="Description Keywords"
            keywords={loading ? null : descKeywords}
            trackedSet={trackedSet}
            onAdd={onAddKeyword}
            onAddAll={onAddKeywords}
            onLoadMore={hasMoreDesc ? handleLoadMore : undefined}
            loadingMore={loadingMore}
          />
        </>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function KeywordSuggestionsPanel({
  translateToggle,
  onTranslateToggle,
  onAddKeyword,
  onAddKeywords,
  activeApp,
  trackedKeywords = [],
}: Props) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(SUGGESTION_TABS[0].label);
  const [rankPill, setRankPill] = useState<RankPill>("All");

  return (
    <div className="mx-6 mt-4 mb-4 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <span className="text-sm font-semibold text-white">Keyword Suggestions</span>
        <div className="flex items-center gap-3">
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
                className={`whitespace-nowrap px-3.5 py-3 text-xs font-medium border-b-2 -mb-px transition-colors shrink-0 ${
                  activeTab === tab.label
                    ? "border-indigo-400 text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.ai ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[10px]">✦</span>
                    {tab.label}
                  </span>
                ) : tab.label}
              </button>
            ))}
          </div>

          {/* Metadata tab */}
          {activeTab === "Metadata" && (
            <MetadataTab
              activeApp={activeApp}
              trackedKeywords={trackedKeywords}
              onAddKeyword={onAddKeyword}
              onAddKeywords={onAddKeywords}
            />
          )}

          {/* All other tabs: shared filter bar + suggestions */}
          {activeTab !== "Metadata" && (
            <>
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
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
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
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    + Analyze all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_SUGGESTIONS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => onAddKeyword(kw)}
                      className="flex items-center gap-1 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1 text-xs text-gray-300 hover:ring-indigo-500/50 hover:text-white transition-all"
                    >
                      <PlusIcon className="size-3 text-gray-500" />
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
