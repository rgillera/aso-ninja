"use client";

import { useState } from "react";
import { ChevronUpIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { dismissSuggestion } from "./dismissedSuggestions";

type Suggestion = {
  title: string;
  description: string;
};

type ReportSuggestionsProps = {
  bundleId: string;
  store: "ios" | "android";
  // Computed server-side from the dismissed-suggestions cookie (see
  // parseDismissedSuggestionsCookie) so the first paint already reflects it —
  // no client-only effect, no flash of a dismissed item before it disappears.
  initialDismissed: string[];
  suggestions: Suggestion[];
};

export function ReportSuggestions({ bundleId, store, initialDismissed, suggestions }: ReportSuggestionsProps) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>(initialDismissed);

  function handleDismiss(title: string) {
    setDismissed((prev) => dismissSuggestion(bundleId, store, title, prev));
  }

  const visible = suggestions.filter((s) => !dismissed.includes(s.title));
  if (visible.length === 0) return null;

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
          {visible.map((suggestion) => (
            <li key={suggestion.title} className="group flex gap-3 px-5 py-4">
              <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{suggestion.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-500">{suggestion.description}</p>
              </div>
              <button
                onClick={() => handleDismiss(suggestion.title)}
                title="Dismiss"
                className="shrink-0 text-gray-600 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
              >
                <XMarkIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
