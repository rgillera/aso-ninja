"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon, LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePlanSlug } from "@/features/dashboard/PlanContext";
import { isPlanAtLeast } from "@/features/subscription/planTiers";
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
  const planSlug = usePlanSlug();
  const locked = !isPlanAtLeast(planSlug, "pro_plus");
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>(initialDismissed);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  function handleDismiss(title: string) {
    setDismissed((prev) => dismissSuggestion(bundleId, store, title, prev));
  }

  function toggleItem(title: string) {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  }

  if (locked) {
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
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <span className="mb-3 flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
              <LockClosedIcon className="size-2.5" />
              Pro+
            </span>
            <p className="text-xs font-medium text-gray-400">ASO Suggestions is a Pro+ feature</p>
            <p className="mt-1 max-w-xs text-xs text-gray-600">Upgrade to Pro+ or above to see ASO recommendations for this app.</p>
          </div>
        )}
      </div>
    );
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
          {visible.map((suggestion) => {
            const itemCollapsed = collapsedItems.has(suggestion.title);
            return (
              <li key={suggestion.title} className="group flex gap-3 px-5 py-4">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                <button
                  onClick={() => toggleItem(suggestion.title)}
                  className="flex-1 min-w-0 text-left"
                  aria-label={itemCollapsed ? "Expand" : "Collapse"}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white">{suggestion.title}</span>
                    <ChevronDownIcon className={`size-3.5 shrink-0 text-gray-600 transition-transform ${itemCollapsed ? "-rotate-90" : ""}`} />
                  </span>
                  {!itemCollapsed && (
                    <p className="mt-1 text-sm leading-6 text-gray-500">{suggestion.description}</p>
                  )}
                </button>
                <button
                  onClick={() => handleDismiss(suggestion.title)}
                  title="Dismiss"
                  className="shrink-0 text-gray-600 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                >
                  <XMarkIcon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
