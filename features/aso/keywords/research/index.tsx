"use client";

import { useState } from "react";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { KeywordSuggestionsPanel } from "./KeywordSuggestionsPanel";
import { KeywordTable } from "./KeywordTable";
import type { Keyword } from "./types";

export default function KeywordResearchPage() {
  const activeApp    = useActiveApp();
  const workspaceId  = useWorkspaceId();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [translateToggle, setTranslateToggle] = useState(false);

  async function handleAddKeywords(newKeywords: string[]) {
    setKeywords((prev) => [
      ...prev,
      ...newKeywords.map((kw) => ({
        keyword: kw,
        volume: 0, diff: 0, chance: 0, opportunity: 0,
        rank: null, starred: false, loading: true,
      })),
    ]);

    const store = activeApp?.store ?? "ios";
    const country = activeApp?.country ?? "us";
    const params = new URLSearchParams({
      terms: newKeywords.join(","),
      store,
      country: country ?? "us",
      appName: activeApp?.name ?? "",
    });

    // Save to Supabase (fire-and-forget) — also auto-follows the app in My Apps
    if (workspaceId) {
      fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: newKeywords,
          workspaceId,
          bundleId:  activeApp?.bundle_id,
          storeId:   activeApp?.store_id,
          appName:   activeApp?.name,
          iconUrl:   activeApp?.icon_url ?? undefined,
          store:     activeApp?.store ?? "ios",
          country:   activeApp?.country ?? "us",
        }),
      });
    }

    try {
      const res = await fetch(`/api/keywords/metrics?${params}`);
      const data: Record<string, { volume: number; diff: number; chance: number; opportunity: number; results: number; relevancy: number; rank: number | null }> = await res.json();
      setKeywords((prev) =>
        prev.map((k) => {
          if (!k.loading || !newKeywords.includes(k.keyword)) return k;
          const m = data[k.keyword];
          return m ? { ...k, ...m, loading: false } : { ...k, loading: false };
        })
      );
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
