"use client";

import { useState, useEffect, useRef } from "react";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { KeywordSuggestionsPanel } from "./KeywordSuggestionsPanel";
import { KeywordTable } from "./KeywordTable";
import type { Keyword } from "./types";
import type { SavedKeyword } from "@/app/api/keywords/list/route";


export default function KeywordResearchPage() {
  const activeApp   = useActiveApp();
  const workspaceId = useWorkspaceId();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [translateToggle, setTranslateToggle] = useState(false);

  // Load persisted keywords for this app on mount / app change — instant (no metrics recompute)
  const loadedAppId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const appId = activeApp?.id;
    if (!appId || loadedAppId.current === appId) return;
    loadedAppId.current = appId;
    fetch(`/api/keywords/list?appId=${appId}`)
      .then((r) => r.json())
      .then(({ keywords: saved }: { keywords: SavedKeyword[] }) => {
        if (!saved?.length) return;
        setKeywords(
          saved.map((s) => ({
            keyword:     s.term,
            volume:      s.volume,
            diff:        s.diff,
            chance:      s.chance,
            opportunity: s.opportunity,
            relevancy:   s.relevancy,
            rank:        s.rank,
            starred:     false,
            // If no cached metrics, mark as loading so metrics get re-fetched
            loading:     !s.hasCachedMetrics,
          }))
        );
        // Re-fetch metrics for any keywords that have no cached values
        const needsMetrics = saved.filter((s) => !s.hasCachedMetrics).map((s) => s.term);
        if (needsMetrics.length) handleAddKeywords(needsMetrics);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeApp?.id]);

  async function handleAddKeywords(newKeywords: string[]) {
    // Deduplicate against already-tracked (non-loading) keywords
    const existing = new Set(
      keywords.filter((k) => !k.loading).map((k) => k.keyword.toLowerCase())
    );
    const fresh = newKeywords.filter((kw) => !existing.has(kw.toLowerCase()));
    if (!fresh.length) return;
    newKeywords = fresh;

    setKeywords((prev) => [
      ...prev,
      ...newKeywords.map((kw) => ({
        keyword: kw,
        volume: 0, diff: 0, chance: 0, opportunity: 0,
        rank: null, starred: false, loading: true,
      })),
    ]);

    const store   = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";
    const params  = new URLSearchParams({
      terms: newKeywords.join(","),
      store,
      country: country ?? "us",
      appName: activeApp?.name ?? "",
      ...(activeApp?.id ? { appId: activeApp.id } : {}),
    });

    try {
      const res  = await fetch(`/api/keywords/metrics?${params}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number; results: number; relevancy: number; rank: number | null }> = await res.json();

      setKeywords((prev) =>
        prev.map((k) => {
          if (!k.loading || !newKeywords.includes(k.keyword)) return k;
          const m = data[k.keyword];
          return m ? { ...k, ...m, loading: false } : { ...k, loading: false };
        })
      );

      // Persist keywords + freshly computed metrics to Supabase
      if (workspaceId) {
        fetch("/api/keywords/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terms:     newKeywords,
            workspaceId,
            metrics:   data,
            bundleId:  activeApp?.bundle_id,
            storeId:   activeApp?.store_id,
            appName:   activeApp?.name,
            iconUrl:   activeApp?.icon_url ?? undefined,
            store,
            country,
          }),
        });
      }
    } catch {
      setKeywords((prev) =>
        prev.map((k) =>
          k.loading && newKeywords.includes(k.keyword) ? { ...k, loading: false } : k
        )
      );
    }
  }

  function handleToggleStar(index: number) {
    setKeywords((prev) =>
      prev.map((k, i) => i === index ? { ...k, starred: !k.starred } : k)
    );
  }

  function handleRemoveSelected(indices: Set<number>) {
    setKeywords((prev) => prev.filter((_, i) => !indices.has(i)));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#111318]">
      <AppHeader app={activeApp ?? null} title="Keyword Research" />

      <div className="flex-1 overflow-y-auto">
        <KeywordSuggestionsPanel
          translateToggle={translateToggle}
          onTranslateToggle={() => setTranslateToggle((v) => !v)}
          onAddKeyword={(kw) => handleAddKeywords([kw])}
          activeApp={activeApp}
          trackedKeywords={keywords}
        />

        <KeywordTable
          keywords={keywords}
          store={activeApp?.store ?? "ios"}
          country={activeApp?.country ?? "us"}
          translateToggle={translateToggle}
          onTranslateToggle={() => setTranslateToggle((v) => !v)}
          onAddKeywords={handleAddKeywords}
          onToggleStar={handleToggleStar}
          onRemoveSelected={handleRemoveSelected}
        />
      </div>
    </div>
  );
}
