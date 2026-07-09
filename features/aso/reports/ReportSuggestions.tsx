"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, InformationCircleIcon, LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
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

const PAGE_SIZE = 5;

export function ReportSuggestions({ bundleId, store, initialDismissed, suggestions }: ReportSuggestionsProps) {
  const planSlug = usePlanSlug();
  const locked = !isPlanAtLeast(planSlug, "pro_plus");
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>(initialDismissed);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

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

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  // Derived, not stored: keeps `page` valid even after a dismiss (or a fresh
  // `suggestions` list) shrinks the list out from under whatever page the
  // user was on, without a separate effect to clamp it back.
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

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
          {pageItems.map((suggestion) => {
            const itemCollapsed = collapsedItems.has(suggestion.title);
            return (
              <li key={suggestion.title} className="group flex gap-3 px-5 py-4">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                <button
                  onClick={() => toggleItem(suggestion.title)}
                  className="flex-1 min-w-0 text-left"
                  aria-label={itemCollapsed ? "Expand" : "Collapse"}
                >
                  <span className="text-sm font-medium text-white">{suggestion.title}</span>
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
      {expanded && pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/[0.07]">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
          >
            <ChevronLeftIcon className="size-3.5" />
            Prev
          </button>
          <span className="text-xs text-gray-500">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage === pageCount - 1}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
          >
            Next
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
