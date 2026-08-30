"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { AppSearchResult } from "@/libs/contracts";
import { StoreIcon } from "@/features/market/explorer/StoreIcon";
import { compareKey, MAX_COMPARE_APPS } from "./types";

type Props = {
  country: string;
  addedKeys: Set<string>;
  atLimit: boolean;
  onAdd: (app: AppSearchResult) => void;
};

export function AppPicker({ country, addedKeys, atLimit, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const controller = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q: term, store: "all", country });
      fetch(`/api/apps/search?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { results: AppSearchResult[] }) => setResults(data.results ?? []))
        .catch((e) => { if (e.name !== "AbortError") setResults([]); })
        .finally(() => setSearching(false));
    }, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query, country]);

  return (
    <div className="px-6 pt-4">
      <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-2.5 focus-within:ring-indigo-500/50 transition-all max-w-md">
        <MagnifyingGlassIcon className="size-4 text-gray-500 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={atLimit ? `Remove an app to add another (max ${MAX_COMPARE_APPS})` : "Search for an app to compare"}
          disabled={atLimit}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none disabled:cursor-not-allowed"
        />
      </div>

      {query.trim() && !atLimit && (
        <div className="mt-2 max-w-md rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] overflow-hidden">
          {searching ? (
            <div className="p-2 space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
              {results.map((app) => {
                const key = compareKey(app.store, app.storeId);
                const added = addedKeys.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => !added && onAdd(app)}
                    disabled={added}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      added ? "bg-indigo-500/10 cursor-default" : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={app.iconUrl} alt="" className="size-8 rounded-lg bg-white/[0.05]" />
                      <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-[#1a1d24] ring-1 ring-white/10">
                        <StoreIcon store={app.store} className="size-2 text-gray-300" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{app.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{app.developer}</p>
                    </div>
                    <span className={`shrink-0 flex size-5 items-center justify-center rounded-full ${added ? "bg-indigo-500 text-white" : "text-gray-500"}`}>
                      {added ? <CheckIcon className="size-3" /> : <PlusIcon className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-5">No results for &quot;{query}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}
