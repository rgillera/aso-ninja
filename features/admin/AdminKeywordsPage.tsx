"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon, TagIcon } from "@heroicons/react/24/outline";
import { searchKeywordsAction, refreshKeywordAction, type KeywordRefreshGroup, type RefreshResult } from "@/features/admin/actions";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-4" />;
}

function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-4" />;
}

function groupKey(g: { term: string; store: string; country: string }): string {
  return `${g.term}|${g.store}|${g.country}`;
}

export default function AdminKeywordsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KeywordRefreshGroup[]>([]);
  // The query these results actually correspond to — lets the render distinguish
  // "results are for an older query, a newer search is queued/in flight" from
  // "this query genuinely has zero matches", without clearing state from
  // inside the debounce effect itself.
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const [searchPending, startSearch] = useTransition();
  const [, startRefresh] = useTransition();
  const [refreshState, setRefreshState] = useState<Record<string, { pending: boolean; result?: RefreshResult }>>({});
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const id = ++requestId.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const rows = await searchKeywordsAction(q);
        if (id === requestId.current) {
          setResults(rows);
          setResultsQuery(q);
        }
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  function handleRefresh(group: KeywordRefreshGroup) {
    const key = groupKey(group);
    setRefreshState((prev) => ({ ...prev, [key]: { pending: true } }));
    startRefresh(async () => {
      const result = await refreshKeywordAction(group.term, group.store, group.country);
      setRefreshState((prev) => ({ ...prev, [key]: { pending: false, result } }));
    });
  }

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;
  const isStale = !tooShort && resultsQuery !== trimmed;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/[0.08]">
            <TagIcon className="size-4.5 text-gray-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Super Admin · Keywords</h1>
            <p className="text-xs text-gray-500">Force-refresh rankings + volume history for a specific keyword</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-2.5 mb-5">
          <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword term…"
            className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
            autoFocus
          />
        </div>

        <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
          {tooShort ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600">Type at least 2 characters to search.</div>
          ) : isStale || searchPending ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-600">
              No tracked keyword matches “{trimmed}”.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {results.map((group) => {
                const key = groupKey(group);
                const state = refreshState[key];
                return (
                  <div key={key} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="shrink-0">{group.store === "ios" ? <IosIcon /> : <AndroidIcon />}</div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                        {group.term}
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] font-medium text-gray-400">
                          <span className="text-xs leading-none">{countryFlag(group.country)}</span>
                          {COUNTRY_MAP[group.country] ?? group.country}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {group.workspaceNames.length} workspace{group.workspaceNames.length === 1 ? "" : "s"} · {group.appNames.join(", ")}
                      </p>
                      {state?.result && (
                        <p className={`text-xs mt-1 ${state.result.ok ? "text-emerald-400" : "text-red-400"}`}>
                          {state.result.ok
                            ? `Refreshed just now — ${state.result.resultsCount.toLocaleString()} results recorded`
                            : state.result.error}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRefresh(group)}
                      disabled={state?.pending}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/[0.10] hover:text-white disabled:opacity-50 disabled:cursor-default transition-colors"
                    >
                      <ArrowPathIcon className={`size-3.5 ${state?.pending ? "animate-spin" : ""}`} />
                      {state?.pending ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
