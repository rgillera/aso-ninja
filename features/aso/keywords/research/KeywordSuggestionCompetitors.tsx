"use client";

import { useState, useEffect } from "react";
import { PlusIcon, CheckIcon, MinusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword } from "./types";
import type { CompetitorKeywordsResult, CompetitorKeyword } from "@/app/api/keywords/competitor-keywords/route";
import type { CompetitorApp } from "./ManageCompetitorsModal";

type Props = {
  activeApp?: ActiveApp;
  trackedKeywords: Keyword[];
  competitors: CompetitorApp[];
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  onRemoveKeyword?: (keyword: string) => void;
  onManageClick: () => void;
  translateToggle?: boolean;
};

function CompetitorPill({ kw, tracked, onAdd, onRemove, translation, loadingTranslation }: {
  kw: CompetitorKeyword;
  tracked: boolean;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  translation?: string;
  loadingTranslation?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => tracked ? onRemove?.(kw.term) : onAdd(kw.term)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Used by: ${kw.competitors.join(", ")}`}
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
      <span className="flex flex-col items-start leading-tight py-0.5">
        <span>{kw.term}</span>
        {translation && (
          <span className="text-[10px] text-gray-500">(en) {translation}</span>
        )}
        {loadingTranslation && !translation && (
          <span className="h-2 w-10 rounded bg-white/[0.08] animate-pulse" />
        )}
      </span>
      {kw.competitors.length > 1 && (
        <span className={`ml-0.5 text-[10px] tabular-nums rounded px-1 ${
          tracked
            ? hovered ? "bg-red-500/10 text-red-400" : "bg-indigo-500/10 text-indigo-400"
            : "bg-white/[0.06] text-gray-600"
        }`}>
          {kw.competitors.length}
        </span>
      )}
    </button>
  );
}

function KeywordSection({
  label, keywords, trackedSet, onAdd, onRemove, onAddAll, translations, translating,
}: {
  label: string;
  keywords: CompetitorKeyword[] | null;
  trackedSet: Set<string>;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  onAddAll?: (terms: string[]) => void;
  translations?: Record<string, string>;
  translating?: boolean;
}) {
  const PAGE = 20;
  const STEP = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const tracked = keywords?.filter((k) => trackedSet.has(k.term)).length ?? 0;
  const total   = keywords?.length ?? 0;
  const visible = keywords?.slice(0, visibleCount);

  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
          {keywords && <span className="text-[10px] text-gray-600">{tracked} / {total}</span>}
        </div>
        <button
          onClick={() => {
            const untracked = keywords?.filter((k) => !trackedSet.has(k.term)).map((k) => k.term) ?? [];
            if (!untracked.length) return;
            if (onAddAll) onAddAll(untracked); else untracked.forEach(onAdd);
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Analyze all
        </button>
      </div>

      {keywords === null ? (
        <div className="flex flex-wrap gap-1.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-6 rounded-md bg-white/[0.04] animate-pulse" style={{ width: `${50 + i * 12}px` }} />
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <p className="text-xs text-gray-600">No keywords found.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {visible!.map((kw) => (
              <CompetitorPill
                key={kw.term}
                kw={kw}
                tracked={trackedSet.has(kw.term)}
                onAdd={onAdd}
                onRemove={onRemove}
                translation={translations?.[kw.term]?.toLowerCase() !== kw.term.toLowerCase() ? translations?.[kw.term] : undefined}
                loadingTranslation={translating && !(kw.term in (translations ?? {}))}
              />
            ))}
          </div>
          {keywords.length > PAGE && (
            <button
              onClick={() => setVisibleCount((v) => v < total ? Math.min(v + STEP, total) : PAGE)}
              className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {visibleCount < total ? `Show more (${Math.min(STEP, total - visibleCount)} more)` : "Show less"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function KeywordSuggestionCompetitors({
  activeApp, trackedKeywords, competitors, onAddKeyword, onAddKeywords, onRemoveKeyword, onManageClick, translateToggle,
}: Props) {
  const [data,    setData]    = useState<CompetitorKeywordsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating]   = useState(false);

  // Fetch keywords whenever the competitor list or app changes
  useEffect(() => {
    if (!activeApp?.store_id || !competitors.length) {
      setData(null);
      return;
    }
    const key = `${activeApp.store_id}-${activeApp.country}-${competitors.map((c) => c.storeId).sort().join(",")}`;
    if (fetchKey === key) return;
    setFetchKey(key);
    setLoading(true);
    setData(null);

    const params = new URLSearchParams({
      storeId:       activeApp.store_id,
      country:       activeApp.country ?? "us",
      competitorIds: competitors.map((c) => c.storeId).join(","),
    });
    fetch(`/api/keywords/competitor-keywords?${params}`)
      .then((r) => r.json())
      .then((d: CompetitorKeywordsResult) => setData(d))
      .catch(() => setData({ appName: "", keywords: [], competitorApps: [] }))
      .finally(() => setLoading(false));
  }, [activeApp?.store_id, activeApp?.country, competitors, fetchKey]);

  useEffect(() => {
    if (!translateToggle) return;
    const terms = [...new Set((data?.keywords ?? []).map((k) => k.term))].filter((t) => !(t in translations));
    if (!terms.length) return;
    setTranslating(true);
    fetch("/api/keywords/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms }),
    })
      .then((r) => r.json())
      .then(({ translations: fresh }: { translations: Record<string, string> }) => {
        setTranslations((prev) => ({ ...prev, ...fresh }));
      })
      .catch(() => {})
      .finally(() => setTranslating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateToggle, data]);

  const trackedSet = new Set(trackedKeywords.map((k) => k.keyword.toLowerCase()));

  if (!activeApp?.store_id) {
    return <p className="px-4 py-4 text-xs text-gray-600 text-center">Select an app to see competitor keywords.</p>;
  }

  // No competitors added yet — show empty state
  if (!competitors.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
        <div className="size-12 rounded-full bg-white/[0.04] flex items-center justify-center">
          <UserGroupIcon className="size-6 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-400">No competitors added yet</p>
        <p className="text-xs text-gray-600 text-center max-w-xs">
          Add your competitor apps and we&apos;ll extract keywords from their titles and subtitles.
        </p>
        <button
          onClick={onManageClick}
          className="mt-1 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Add competitors
        </button>
      </div>
    );
  }

  const multiKeywords  = loading ? null : (data?.keywords.filter((k) => k.competitors.length >= 2) ?? []);
  const singleKeywords = loading ? null : (data?.keywords.filter((k) => k.competitors.length === 1) ?? []);

  return (
    <div className="px-4">
      {/* Competitor apps row + manage button */}
      <div className="py-3 border-b border-white/[0.05] flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Analyzing competitors</p>
          <div className="flex flex-wrap gap-2">
            {competitors.map((c) => (
              <div key={c.storeId} title={c.name} className="flex items-center gap-1.5 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2 py-1">
                {c.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon} alt="" className="size-4 rounded-md" />
                )}
                <span className="text-[10px] text-gray-400 max-w-[80px] truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onManageClick}
          className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
        >
          Edit
        </button>
      </div>

      <KeywordSection
        label="Shared by multiple competitors"
        keywords={multiKeywords}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
      <KeywordSection
        label="Used by one competitor"
        keywords={singleKeywords}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
    </div>
  );
}
