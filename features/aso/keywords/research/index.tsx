"use client";

import { useState } from "react";
import { AppHeader } from "@/features/aso/AppHeader";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { KeywordListSelector } from "./KeywordListSelector";
import { KeywordSuggestionsPanel } from "./KeywordSuggestionsPanel";
import { KeywordTable } from "./KeywordTable";
import { INITIAL_KEYWORDS } from "./constants";
import type { Keyword } from "./types";

export default function KeywordResearchPage() {
  const activeApp = useActiveApp();
  const [keywords, setKeywords] = useState<Keyword[]>(INITIAL_KEYWORDS);
  const [translateToggle, setTranslateToggle] = useState(false);

  function handleAddKeywords(newKeywords: string[]) {
    setKeywords((prev) => [
      ...prev,
      ...newKeywords.map((kw) => ({
        keyword: kw,
        volume: 0, maxVolume: 0, diff: 0, chance: 0, kei: 0,
        rank: "Unranked", growth: null, starred: false,
      })),
    ]);
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
      <KeywordListSelector count={keywords.length} />

      <div className="flex-1 overflow-y-auto">
        <KeywordSuggestionsPanel
          translateToggle={translateToggle}
          onTranslateToggle={() => setTranslateToggle((v) => !v)}
          onAddKeyword={(kw) => handleAddKeywords([kw])}
        />

        <KeywordTable
          keywords={keywords}
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
