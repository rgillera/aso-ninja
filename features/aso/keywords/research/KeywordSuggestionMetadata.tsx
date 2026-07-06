"use client";

import { useState, useEffect } from "react";
import { PlusIcon, CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword } from "./types";
import type { AppMetadataResult, MetadataKeyword } from "@/app/api/keywords/app-metadata/route";

type Props = {
  activeApp?: ActiveApp;
  trackedKeywords: Keyword[];
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  onRemoveKeyword?: (keyword: string) => void;
  translateToggle?: boolean;
  analyzeAllLocked?: boolean;
};

function KeywordPill({ kw, tracked, onAdd, onRemove, translation, loadingTranslation }: {
  kw: MetadataKeyword;
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
      {kw.volume > 0 && (
        <span className={`ml-0.5 font-semibold tabular-nums ${tracked ? (hovered ? "text-red-400" : "text-indigo-400") : "text-gray-500"}`}>
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
  onRemove,
  onAddAll,
  placeholder,
  onLoadMore,
  loadingMore,
  translations,
  translating,
  analyzeAllLocked,
}: {
  label: string;
  keywords: MetadataKeyword[] | null;
  trackedSet: Set<string>;
  onAdd: (term: string) => void;
  onRemove?: (term: string) => void;
  onAddAll?: (terms: string[]) => void;
  placeholder?: React.ReactNode;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  translations?: Record<string, string>;
  translating?: boolean;
  analyzeAllLocked?: boolean;
}) {
  const tracked = keywords?.filter((k) => trackedSet.has(k.term)).length ?? 0;
  const total   = keywords?.length ?? 0;

  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
          {keywords && <span className="text-[10px] text-gray-600">{tracked} / {total}</span>}
        </div>
        {!analyzeAllLocked && (
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
        )}
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
                <KeywordPill
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

export function KeywordSuggestionMetadata({ activeApp, trackedKeywords, onAddKeyword, onAddKeywords, onRemoveKeyword, translateToggle, analyzeAllLocked }: Props) {
  const [data, setData]                 = useState<AppMetadataResult | null>(null);
  const [loading, setLoading]           = useState(false);
  const [descKeywords, setDescKeywords] = useState<MetadataKeyword[]>([]);
  const [hasMoreDesc, setHasMoreDesc]   = useState(false);
  const [descOffset, setDescOffset]     = useState(0);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating]   = useState(false);

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

  useEffect(() => {
    if (!translateToggle) return;
    const allTerms = [
      ...(data?.titleKeywords ?? []),
      ...(data?.subtitleKeywords ?? []),
      ...descKeywords,
    ].map((k) => k.term);
    const terms = [...new Set(allTerms)].filter((t) => !(t in translations));
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
  }, [translateToggle, data, descKeywords]);

  const trackedSet = new Set(trackedKeywords.map((k) => k.keyword.toLowerCase()));

  if (!activeApp?.store_id) {
    return <p className="px-4 py-4 text-xs text-gray-600 text-center">Select an app to see its metadata keywords.</p>;
  }

  return (
    <div className="px-4">
      <MetadataSection
        label="Title Keywords"
        keywords={loading ? null : (data?.titleKeywords ?? [])}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        analyzeAllLocked={analyzeAllLocked}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
      <MetadataSection
        label="Subtitle Keywords"
        keywords={loading ? null : (data?.subtitleKeywords ?? [])}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onRemove={onRemoveKeyword}
        onAddAll={onAddKeywords}
        analyzeAllLocked={analyzeAllLocked}
        translations={translateToggle ? translations : undefined}
        translating={translateToggle && translating}
      />
      <MetadataSection
        label="Description Keywords"
        keywords={loading ? null : descKeywords}
        trackedSet={trackedSet}
        onAdd={onAddKeyword}
        onAddAll={onAddKeywords}
        analyzeAllLocked={analyzeAllLocked}
        onLoadMore={hasMoreDesc ? handleLoadMore : undefined}
        loadingMore={loadingMore}
        translating={translateToggle && translating}
        translations={translateToggle ? translations : undefined}
      />
    </div>
  );
}
