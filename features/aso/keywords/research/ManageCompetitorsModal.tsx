"use client";

import { useState, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { AppSearchResult } from "@/libs/contracts";

export type CompetitorApp = {
  storeId: string;
  name: string;
  icon: string;
  developer: string;
};

type Props = {
  activeApp: ActiveApp;
  selected: CompetitorApp[];
  onSave: (competitors: CompetitorApp[]) => void;
  onClose: () => void;
};

function tryChipsFromName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !["the", "and", "for", "with", "app"].includes(w))
    .slice(0, 4);
}

export function ManageCompetitorsModal({ activeApp, selected, onSave, onClose }: Props) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<AppSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft,     setDraft]     = useState<Map<string, CompetitorApp>>(
    new Map(selected.map((c) => [c.storeId, c]))
  );

  const chips = tryChipsFromName(activeApp.name);

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q:       term,
        store:   "ios",
        country: (activeApp.country ?? "us").toUpperCase(),
      });
      const res  = await fetch(`/api/apps/search?${params}`);
      const data = await res.json() as { results: AppSearchResult[] };
      setResults((data.results ?? []).filter((r) => r.storeId !== activeApp.store_id));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [activeApp.country, activeApp.store_id]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  function toggle(app: AppSearchResult) {
    setDraft((prev) => {
      const next = new Map(prev);
      if (next.has(app.storeId)) {
        next.delete(app.storeId);
      } else {
        next.set(app.storeId, {
          storeId:   app.storeId,
          name:      app.name,
          icon:      app.iconUrl,
          developer: app.developer,
        });
      }
      return next;
    });
  }

  function removeFromDraft(storeId: string) {
    setDraft((prev) => { const next = new Map(prev); next.delete(storeId); return next; });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-10 px-4 pb-4">
      <div className="bg-[#1a1d24] rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl ring-1 ring-white/[0.07]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-base font-semibold text-white">Manage competitors</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSave([...draft.values()]); onClose(); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-100 transition-colors"
            >
              Save selection
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Added competitors */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Added competitors</p>
            {draft.size === 0 ? (
              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-white/[0.06] text-gray-500 text-[10px] font-bold">i</span>
                You don&apos;t have any competitors added
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...draft.values()].map((c) => (
                  <div
                    key={c.storeId}
                    className="flex items-center gap-1.5 bg-indigo-500/10 ring-1 ring-indigo-500/30 rounded-lg px-2 py-1"
                  >
                    {c.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.icon} alt="" className="size-5 rounded-md" />
                    )}
                    <span className="text-xs text-indigo-300 max-w-[120px] truncate">{c.name}</span>
                    <button
                      onClick={() => removeFromDraft(c.storeId)}
                      className="text-indigo-400 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div>
            <div className="flex items-center gap-2 bg-[#0d0f14] rounded-lg ring-1 ring-white/[0.08] px-3 py-2.5 focus-within:ring-indigo-500/50 transition-all">
              <MagnifyingGlassIcon className="size-4 text-gray-500 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for an app name or keyword"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }} className="text-gray-600 hover:text-gray-400">
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>
            {chips.length > 0 && !query && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-600">Try:</span>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQuery(chip)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-[#0d0f14] ring-1 ring-white/[0.07] rounded-md px-2 py-1 transition-colors"
                  >
                    <MagnifyingGlassIcon className="size-3" />
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {searching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {results.map((app) => {
                const added = draft.has(app.storeId);
                return (
                  <button
                    key={app.storeId}
                    onClick={() => toggle(app)}
                    className={`flex items-center gap-3 p-3 rounded-xl ring-1 text-left transition-all ${
                      added
                        ? "bg-indigo-500/10 ring-indigo-500/40"
                        : "bg-[#0d0f14] ring-white/[0.06] hover:ring-white/20"
                    }`}
                  >
                    {app.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.iconUrl} alt="" className="size-10 rounded-xl shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{app.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{app.developer}</p>
                    </div>
                    <div className={`size-5 rounded-full shrink-0 flex items-center justify-center ring-1 transition-colors ${
                      added ? "bg-indigo-500 ring-indigo-500" : "ring-white/[0.12] bg-white/[0.04]"
                    }`}>
                      {added && <CheckIcon className="size-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query && !searching ? (
            <p className="text-sm text-gray-600 text-center py-6">No results for &quot;{query}&quot;</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
