"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { addAppDirectAction } from "./actions";
import type { AppSearchResult } from "@/libs/contracts";
import { COUNTRIES } from "@/libs/countries";

type Store = "all" | "ios" | "android";

type Props = {
  workspaceId: string;
  onClose: () => void;
};

function StoreBadge({ store }: { store: "ios" | "android" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        store === "ios"
          ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
          : "bg-green-500/10 text-green-400 ring-green-500/20"
      }`}
    >
      {store === "ios" ? "App Store" : "Google Play"}
    </span>
  );
}

export default function AddApp({ workspaceId, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("US");
  const [storeFilter, setStoreFilter] = useState<Store>("all");
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q, country, store: storeFilter });
        const res = await fetch(`/api/apps/search?${params}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setError("Search failed. Check your connection.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query, country, storeFilter]);

  function handleAdd(result: AppSearchResult) {
    const key = `${result.store}:${result.bundleId}`;
    setAddingId(key);
    startTransition(async () => {
      const err = await addAppDirectAction(workspaceId, result, country);
      if (err) {
        setError(err);
        setAddingId(null);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl bg-gray-900 ring-1 ring-white/10 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Add app</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or paste App Store / Play Store URL…"
              className="w-full rounded-lg bg-gray-800 border border-white/10 pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mt-3">
            {/* Country */}
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg bg-gray-800 border border-white/10 px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Store toggle */}
            <div className="flex rounded-lg bg-gray-800 border border-white/10 overflow-hidden text-xs">
              {(["all", "ios", "android"] as Store[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStoreFilter(s)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    storeFilter === s
                      ? "bg-indigo-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {s === "all" ? "All" : s === "ios" ? "App Store" : "Google Play"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {error && (
            <p className="mx-2 mb-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="size-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DevicePhoneMobileIcon className="size-8 text-gray-700 mb-3" />
              <p className="text-sm text-gray-400">No apps found</p>
              <p className="text-xs text-gray-600 mt-1">Try a different search term or store</p>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MagnifyingGlassIcon className="size-8 text-gray-700 mb-3" />
              <p className="text-sm text-gray-400">Search for an app</p>
              <p className="text-xs text-gray-600 mt-1">
                Or paste an App Store / Google Play URL
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="space-y-1">
              {results.map((r) => {
                const key = `${r.store}:${r.bundleId}`;
                const isAdding = addingId === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => handleAdd(r)}
                      disabled={!!addingId}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5 transition-colors disabled:opacity-60"
                    >
                      {r.iconUrl ? (
                        <img
                          src={r.iconUrl}
                          alt={r.name}
                          className="size-11 rounded-xl shrink-0 object-cover bg-gray-700"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            e.currentTarget.nextElementSibling?.removeAttribute("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        hidden={!!r.iconUrl}
                        className="size-11 rounded-xl bg-gray-700 shrink-0 flex items-center justify-center"
                      >
                        <DevicePhoneMobileIcon className="size-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 truncate">{r.developer}</p>
                        <div className="mt-1">
                          <StoreBadge store={r.store} />
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isAdding ? (
                          <div className="size-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        ) : (
                          <span className="text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                            Add
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
