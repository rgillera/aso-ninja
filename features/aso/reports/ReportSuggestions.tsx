"use client";

import { useState } from "react";
import { ChevronUpIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

type Suggestion = {
  title: string;
  description: string;
};

type ReportSuggestionsProps = {
  suggestions: Suggestion[];
};

export function ReportSuggestions({ suggestions }: ReportSuggestionsProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">ASO Suggestions</h3>
          <InformationCircleIcon className="size-4 text-gray-600" />
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-gray-500 hover:text-white transition-colors" aria-label={expanded ? "Collapse" : "Expand"}>
          <ChevronUpIcon className={`size-4 transition-transform ${expanded ? "" : "rotate-180"}`} />
        </button>
      </div>
      {expanded && (
        <ul className="divide-y divide-white/[0.06]">
          {suggestions.map((suggestion) => (
            <li key={suggestion.title} className="flex gap-3 px-5 py-4">
              <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">{suggestion.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-500">{suggestion.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
