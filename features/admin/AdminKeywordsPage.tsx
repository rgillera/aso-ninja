"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon, TagIcon } from "@heroicons/react/24/outline";
import {
  searchKeywordsAction, searchAppsAction, refreshKeywordAction,
  type KeywordRefreshGroup, type AppRefreshGroup, type RefreshResult,
} from "@/features/admin/actions";
import { countryFlag, COUNTRY_MAP, COUNTRIES } from "@/libs/countries";

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-4" />;
}

function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-4" />;
}

function groupKey(g: { term: string; store: string; country: string }): string {
  return `${g.term}|${g.store}|${g.country}`;
}

type Mode = "keyword" | "app";

export default function AdminKeywordsPage() {
  const [mode, setMode] = useState<Mode>("keyword");

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.06] light:bg-black/[0.05]">
            <TagIcon className="size-4.5 text-gray-300 light:text-gray-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white light:text-gray-900">Super Admin · Keywords</h1>
            <p className="text-xs text-gray-500">
              {mode === "keyword"
                ? "Force-refresh rankings + volume history for a specific keyword"
                : "Force-refresh every keyword an app tracks in one store and country"}
            </p>
          </div>
          <div className="flex rounded-lg bg-[#141417] light:bg-white p-1">
            {(["keyword", "app"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-white/[0.10] light:bg-black/[0.08] text-white light:text-gray-900"
                    : "text-gray-500 hover:text-gray-300 light:hover:text-gray-700"
                }`}
              >
                {m === "keyword" ? "By keyword" : "By app"}
              </button>
            ))}
          </div>
        </div>

        {mode === "keyword" ? <KeywordSearch /> : <AppSearch />}
      </div>
    </div>
  );
}

function KeywordSearch() {
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
    <>
    <div className="flex items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 mb-5">
      <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by keyword term…"
        className="bg-transparent text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none w-full"
        autoFocus
      />
    </div>

    <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden shadow-lg shadow-black/20">
      {tooShort ? (
        <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">Type at least 2 characters to search.</div>
      ) : isStale || searchPending ? (
        <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">Searching…</div>
      ) : results.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">
          No tracked keyword matches “{trimmed}”.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
          {results.map((group) => {
            const key = groupKey(group);
            const state = refreshState[key];
            return (
              <div key={key} className="flex items-center gap-4 px-5 py-3.5">
                <div className="shrink-0">{group.store === "ios" ? <IosIcon /> : <AndroidIcon />}</div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white light:text-gray-900 truncate flex items-center gap-1.5">
                    {group.term}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] light:bg-black/[0.05] px-1.5 py-px text-[10px] font-medium text-gray-400 light:text-gray-600">
                      <span className="text-xs leading-none">{countryFlag(group.country)}</span>
                      {COUNTRY_MAP[group.country] ?? group.country}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {group.workspaceNames.length} workspace{group.workspaceNames.length === 1 ? "" : "s"} · {group.appNames.join(", ")}
                  </p>
                  {state?.result && (
                    <p className={`text-xs mt-1 ${state.result.ok ? "text-emerald-400 light:text-emerald-700" : "text-red-400 light:text-red-600"}`}>
                      {state.result.ok
                        ? `Refreshed just now: volume ${state.result.volume}, ${state.result.resultsCount.toLocaleString()} results recorded`
                        : state.result.error}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleRefresh(group)}
                  disabled={state?.pending}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-3 py-2 text-xs font-medium text-gray-300 light:text-gray-700 hover:bg-white/[0.10] light:hover:bg-black/[0.08] hover:text-white light:hover:text-gray-900 disabled:opacity-50 disabled:cursor-default transition-colors"
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
    </>
  );
}

type BulkState = {
  running: boolean;
  done: number;
  total: number;
  current?: string;
  failed: { term: string; error: string }[];
  // Set when the run ended early: Apple rate-limited it, or it was stopped.
  stoppedReason?: string;
};

function AppSearch() {
  const [query, setQuery] = useState("");
  const [store, setStore] = useState<"all" | "ios" | "android">("all");
  const [country, setCountry] = useState("all");
  const [results, setResults] = useState<AppRefreshGroup[]>([]);
  // Same role as KeywordSearch's resultsQuery, keyed on all three filters.
  const [resultsKey, setResultsKey] = useState<string | null>(null);
  const [searchPending, startSearch] = useTransition();
  const [bulk, setBulk] = useState<Record<string, BulkState>>({});
  const cancelled = useRef<Set<string>>(new Set());
  const requestId = useRef(0);

  const trimmed = query.trim();
  const searchKey = `${trimmed}|${store}|${country}`;

  useEffect(() => {
    if (trimmed.length < 2) return;

    const id = ++requestId.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const rows = await searchAppsAction(trimmed, store, country);
        if (id === requestId.current) {
          setResults(rows);
          setResultsKey(searchKey);
        }
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [trimmed, store, country, searchKey]);

  // One term at a time: every refresh is a live store search, and running
  // them in parallel would just get Apple to rate-limit the whole batch.
  async function handleRefreshAll(group: AppRefreshGroup) {
    const key = group.key;
    cancelled.current.delete(key);
    setBulk((prev) => ({ ...prev, [key]: { running: true, done: 0, total: group.terms.length, failed: [] } }));

    for (let i = 0; i < group.terms.length; i++) {
      const term = group.terms[i];
      if (cancelled.current.has(key)) {
        setBulk((prev) => ({ ...prev, [key]: { ...prev[key], running: false, current: undefined, stoppedReason: "Stopped." } }));
        return;
      }
      setBulk((prev) => ({ ...prev, [key]: { ...prev[key], current: term } }));

      let result: RefreshResult;
      try {
        result = await refreshKeywordAction(term, group.store, group.country);
      } catch {
        result = { ok: false, error: "Request failed." };
      }

      const failure = result.ok ? null : { term, error: result.error };
      setBulk((prev) => ({
        ...prev,
        [key]: { ...prev[key], done: i + 1, failed: failure ? [...prev[key].failed, failure] : prev[key].failed },
      }));
      if (!result.ok && result.rateLimited) {
        setBulk((prev) => ({
          ...prev,
          [key]: { ...prev[key], running: false, current: undefined, stoppedReason: "Apple rate-limited the run. Wait a minute and refresh again." },
        }));
        return;
      }
    }

    setBulk((prev) => ({ ...prev, [key]: { ...prev[key], running: false, current: undefined } }));
  }

  const tooShort = trimmed.length < 2;
  const isStale = !tooShort && resultsKey !== searchKey;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex flex-1 min-w-56 items-center gap-2 rounded-lg bg-[#141417] light:bg-white px-3 py-2.5">
          <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by app name…"
            className="bg-transparent text-sm text-white light:text-gray-900 placeholder-gray-600 light:placeholder-gray-400 outline-none w-full"
            autoFocus
          />
        </div>

        <select
          value={store}
          onChange={(e) => setStore(e.target.value as "all" | "ios" | "android")}
          className="rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 text-xs text-gray-300 light:text-gray-700 outline-none"
        >
          <option value="all">All platforms</option>
          <option value="ios">App Store</option>
          <option value="android">Google Play</option>
        </select>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg bg-[#141417] light:bg-white px-3 py-2.5 text-xs text-gray-300 light:text-gray-700 outline-none max-w-48"
        >
          <option value="all">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-[#141417] light:bg-white overflow-hidden shadow-lg shadow-black/20">
        {tooShort ? (
          <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">Type at least 2 characters to search.</div>
        ) : isStale || searchPending ? (
          <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">Searching…</div>
        ) : results.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-600 light:text-gray-400">
            No tracked app matches “{trimmed}” for these filters.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07] light:divide-black/[0.08]">
            {results.map((group) => {
              const state = bulk[group.key];
              const noTerms = group.terms.length === 0;
              const succeeded = state ? state.done - state.failed.length : 0;
              return (
                <div key={group.key} className="flex items-center gap-4 px-5 py-3.5">
                  {group.iconUrl ? (
                    <img src={group.iconUrl} alt="" className="size-9 shrink-0 rounded-lg" />
                  ) : (
                    <div className="size-9 shrink-0 rounded-lg bg-white/[0.06] light:bg-black/[0.05]" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white light:text-gray-900 truncate flex items-center gap-1.5">
                      <span className="shrink-0">{group.store === "ios" ? <IosIcon /> : <AndroidIcon />}</span>
                      <span className="truncate">{group.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] light:bg-black/[0.05] px-1.5 py-px text-[10px] font-medium text-gray-400 light:text-gray-600">
                        <span className="text-xs leading-none">{countryFlag(group.country)}</span>
                        {COUNTRY_MAP[group.country] ?? group.country}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {group.terms.length} keyword{group.terms.length === 1 ? "" : "s"} · {group.workspaceNames.join(", ")}
                    </p>
                    {state && (
                      <p className={`text-xs mt-1 ${
                        state.running
                          ? "text-gray-400 light:text-gray-600"
                          : state.failed.length || state.stoppedReason
                            ? "text-amber-400 light:text-amber-700"
                            : "text-emerald-400 light:text-emerald-700"
                      }`}>
                        {state.running
                          ? `Refreshing ${state.done + 1} of ${state.total}: ${state.current ?? ""}`
                          : `Refreshed ${succeeded} of ${state.total} keywords${state.failed.length ? `, ${state.failed.length} failed` : ""}.${state.stoppedReason ? ` ${state.stoppedReason}` : ""}`}
                      </p>
                    )}
                    {state && !state.running && state.failed.length > 0 && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate" title={state.failed.map((f) => `${f.term}: ${f.error}`).join("\n")}>
                        Failed: {state.failed.map((f) => f.term).join(", ")}
                      </p>
                    )}
                  </div>

                  {state?.running ? (
                    <button
                      onClick={() => cancelled.current.add(group.key)}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-3 py-2 text-xs font-medium text-gray-300 light:text-gray-700 hover:bg-white/[0.10] light:hover:bg-black/[0.08] hover:text-white light:hover:text-gray-900 transition-colors"
                    >
                      <ArrowPathIcon className="size-3.5 animate-spin" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRefreshAll(group)}
                      disabled={noTerms}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white/[0.06] light:bg-black/[0.05] px-3 py-2 text-xs font-medium text-gray-300 light:text-gray-700 hover:bg-white/[0.10] light:hover:bg-black/[0.08] hover:text-white light:hover:text-gray-900 disabled:opacity-50 disabled:cursor-default transition-colors"
                    >
                      <ArrowPathIcon className="size-3.5" />
                      Refresh all
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
