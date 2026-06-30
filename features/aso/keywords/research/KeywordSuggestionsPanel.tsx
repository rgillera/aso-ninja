"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { SUGGESTION_TABS } from "./constants";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword } from "./types";
import { KeywordSuggestionMetadata }   from "./KeywordSuggestionMetadata";
import { KeywordSuggestionAi }         from "./KeywordSuggestionAi";
import { KeywordSuggestionCompetitors } from "./KeywordSuggestionCompetitors";
import { ManageCompetitorsModal }      from "./ManageCompetitorsModal";
import type { CompetitorApp }          from "./ManageCompetitorsModal";

type Props = {
  onAddKeyword: (keyword: string) => void;
  onAddKeywords?: (keywords: string[]) => void;
  onRemoveKeyword?: (keyword: string) => void;
  activeApp?: ActiveApp;
  trackedKeywords?: Keyword[];
  competitors: CompetitorApp[];
  onCompetitorsChange: (competitors: CompetitorApp[]) => void;
};

export function KeywordSuggestionsPanel({
  onAddKeyword,
  onAddKeywords,
  onRemoveKeyword,
  activeApp,
  trackedKeywords = [],
  competitors,
  onCompetitorsChange,
}: Props) {
  const [open,       setOpen]       = useState(true);
  const [activeTab,  setActiveTab]  = useState<string>(SUGGESTION_TABS[0].label);
  const [manageOpen, setManageOpen] = useState(false);

  const tabProps = { activeApp, trackedKeywords, onAddKeyword, onAddKeywords, onRemoveKeyword };

  return (
    <>
      <div className="mx-6 mt-4 mb-4 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <span className="text-sm font-semibold text-white">Keyword Suggestions</span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1 rounded text-gray-500 hover:text-white transition-colors"
          >
            {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </button>
        </div>

        {open && (
          <>
            {/* Tab bar */}
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

            {/* Always-mounted tabs (preserve state across switches) */}
            <div className={activeTab === "Metadata" ? "" : "hidden"}>
              <KeywordSuggestionMetadata {...tabProps} />
            </div>
            <div className={activeTab === "Competitors" ? "" : "hidden"}>
              <KeywordSuggestionCompetitors
                {...tabProps}
                competitors={competitors}
                onManageClick={() => setManageOpen(true)}
              />
            </div>
            <div className={activeTab === "AI Suggestions" ? "" : "hidden"}>
              <KeywordSuggestionAi {...tabProps} />
            </div>
          </>
        )}
      </div>

      {manageOpen && activeApp && (
        <ManageCompetitorsModal
          activeApp={activeApp}
          selected={competitors}
          onSave={onCompetitorsChange}
          onClose={() => setManageOpen(false)}
        />
      )}
    </>
  );
}
