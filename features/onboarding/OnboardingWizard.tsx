"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { searchStoreApps } from "@/features/dashboard/searchAction";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";
import { COUNTRY_MAP, countryFlag } from "@/libs/countries";
import type { AppSearchResult } from "@/libs/contracts";
import type { AISuggestionsResult } from "@/app/api/keywords/ai-suggestions/route";

type Props = {
  workspaceId: string;
  /** Called once an app and at least one keyword are saved and the user has been sent on to Keywords Research. */
  onDone: () => void;
};

type Step = "search" | "keywords";

type SelectedApp = {
  name: string;
  iconUrl: string | null;
  store: "ios" | "android";
  bundleId: string;
  storeId: string;
  country: string;
};

// The Free plan's whole keyword budget is 20, pooled across every workspace
// the subscriber owns — a wall of 30 tap-to-add suggestions would let a
// first-timer blow right through that limit before ever reaching the real
// Keywords Research page, turning their very first interaction with AI
// suggestions into a paywall error. Capped well under it instead.
const MAX_SUGGESTIONS = 12;

// Default before the user picks otherwise — a locked screen with no skip
// means a US-only search could strand someone whose app simply isn't listed
// in that storefront, so unlike most of this screen's other simplifications,
// this one gets a real (if compact) picker rather than staying hardcoded.
const DEFAULT_COUNTRY = "US";

// Matches the lifetime DashboardShell uses for the same cookies.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function StoreBadge({ store }: { store: "ios" | "android" }) {
  return store === "ios" ? (
    <img src="/app-store.svg" alt="" className="size-3.5" />
  ) : (
    <img src="/google-play.svg" alt="" className="size-3.5" />
  );
}

function ResultIcon({ iconUrl, name }: { iconUrl?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return iconUrl && !failed ? (
    <img src={iconUrl} alt={name} className="size-11 rounded-xl object-cover shrink-0" onError={() => setFailed(true)} />
  ) : (
    <div className="size-11 shrink-0 rounded-xl bg-[#0d0f14] flex items-center justify-center">
      <DevicePhoneMobileIcon className="size-5 text-gray-600" />
    </div>
  );
}

// Flattens the 4 categorized sections the real Keyword Suggestions panel
// shows (Discovery / Generic / Branded / Relevancy) into one deduplicated
// list, relevancy-first — this screen's only job is "give a first-timer
// something to click," not teach the categorization.
function flattenSuggestions(data: AISuggestionsResult): string[] {
  const seen = new Set<string>();
  const flat: string[] = [];
  for (const section of [data.relevancy, data.discovery, data.generic, data.branded]) {
    for (const { term } of section) {
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(term);
      if (flat.length >= MAX_SUGGESTIONS) return flat;
    }
  }
  return flat;
}

// A locked, full-screen first-run wizard: search for an app, add its first
// keyword(s), then hand off to the real Keywords Research page. Deliberately
// has no close button, no Escape handling, and no backdrop-click dismiss —
// it's the mandatory front door for a brand-new workspace, not a dismissible
// tooltip. Whether to show it at all is the Onboarding coordinator's call.
export function OnboardingWizard({ workspaceId, onDone }: Props) {
  const [step, setStep] = useState<Step>("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [iosDown, setIosDown] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");

  const [selected, setSelected] = useState<SelectedApp | null>(null);
  const [appId, setAppId] = useState<string | undefined>(undefined);
  const [keywordInput, setKeywordInput] = useState("");
  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [pendingTerms, setPendingTerms] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  const allCountries = useMemo(() => Object.keys(COUNTRY_MAP).sort(), []);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (step === "keywords") keywordInputRef.current?.focus();
  }, [step]);

  // Close the country dropdown on an outside click — same pattern as the
  // real dashboard search's own country picker.
  useEffect(() => {
    if (!countryOpen) return;
    function onClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [countryOpen]);

  // Debounced store search — same 350ms cadence as the real dashboard search.
  // Re-runs on a country change too, so switching storefronts mid-search
  // refreshes results instead of leaving stale ones from the old country.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setResults([]);
      setIosDown(false);
      setSearching(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchStoreApps(query, country)
        .then(({ results: r, iosUnavailable }) => {
          setResults(r);
          setIosDown(iosUnavailable);
        })
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, country]);

  // Fetches AI keyword suggestions the moment an app is picked. Gets a
  // paywall bypass (`onboarding=1`) from the API route itself — see that
  // route for why it's safe: it only fires while this workspace has zero
  // apps, i.e. exactly the window this wizard runs in.
  useEffect(() => {
    if (!selected?.name) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setSuggestions(null);
    const params = new URLSearchParams({
      appName: selected.name,
      country: selected.country,
      workspaceId,
      onboarding: "1",
    });
    fetch(`/api/keywords/ai-suggestions?${params}`)
      .then((r) => r.json())
      .then((data: AISuggestionsResult) => setSuggestions(flattenSuggestions(data)))
      .catch(() => setSuggestions([]));
  }, [selected?.name, selected?.country, workspaceId]);

  function handlePickApp(r: AppSearchResult) {
    setSelected({
      name: r.name,
      iconUrl: r.iconUrl || null,
      store: r.store,
      bundleId: r.bundleId,
      storeId: r.storeId,
      country,
    });
    setStep("keywords");
  }

  function handleChangeApp() {
    setStep("search");
    setSelected(null);
    setAppId(undefined);
    setAddedKeywords([]);
    setAddError(null);
    setSuggestions(null);
  }

  // Shared by the manual add box and the suggestion pills — reserves the
  // term(s) server-side (no metrics computed here; the real Keywords
  // Research page backfills those for anything it loads without a cache).
  // Keyed per-term in `pendingTerms` rather than one shared boolean so a
  // suggestion pill click doesn't get blocked by an unrelated in-flight save.
  async function saveTerms(terms: string[]) {
    if (!selected) return;
    const existing = new Set(addedKeywords.map((k) => k.toLowerCase()));
    const fresh = terms.filter((t) => !existing.has(t.toLowerCase()));
    if (!fresh.length) return;

    setPendingTerms((prev) => new Set([...prev, ...fresh.map((t) => t.toLowerCase())]));
    setAddError(null);
    try {
      const res = await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: fresh,
          workspaceId,
          appId,
          bundleId: selected.bundleId,
          storeId: selected.storeId,
          appName: selected.name,
          iconUrl: selected.iconUrl ?? undefined,
          store: selected.store,
          country: selected.country,
        }),
      });
      const body: { appId?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(body.error ?? "Couldn't save that keyword.");
        return;
      }
      if (body.appId) setAppId(body.appId);
      setAddedKeywords((prev) => [...prev, ...fresh]);
    } catch {
      setAddError("Couldn't save that keyword. Check your connection and try again.");
    } finally {
      setPendingTerms((prev) => {
        const next = new Set(prev);
        fresh.forEach((t) => next.delete(t.toLowerCase()));
        return next;
      });
    }
  }

  async function handleAddKeyword() {
    const terms = keywordInput.split(",").map((t) => t.trim()).filter(Boolean);
    setKeywordInput("");
    if (terms.length) await saveTerms(terms);
  }

  function handleToggleSuggestion(term: string) {
    if (addedKeywords.some((k) => k.toLowerCase() === term.toLowerCase())) {
      handleRemoveKeyword(term);
    } else {
      saveTerms([term]);
    }
  }

  function handleRemoveKeyword(term: string) {
    setAddedKeywords((prev) => prev.filter((k) => k.toLowerCase() !== term.toLowerCase()));
    fetch("/api/keywords/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        terms: [term],
        appId,
        workspaceId,
        bundleId: selected?.bundleId,
        store: selected?.store,
        country: selected?.country,
      }),
    }).catch(() => {});
  }

  function handleFinish() {
    if (!selected || !addedKeywords.length || !appId) return;
    // A client-side router.push isn't enough here: Keywords Research reads its
    // active app off DashboardShell's `allApps`, which app/dashboard/layout.tsx
    // only fetches fresh on an actual request — that layout persists across a
    // push (it wraps both the page we're on and the destination), so it would
    // still be serving the snapshot from before this wizard ever created the
    // app, and the page would flash "No apps yet". A full navigation forces
    // that layout to refetch; the cookies below (the same ones DashboardShell
    // itself writes on a normal app selection) are what carry the new app
    // across that reload. Set `lastWorkspaceId` explicitly rather than via
    // DashboardShell's `selectApp` helper — that helper only sets it by
    // looking the app up in the very `allApps` snapshot that's stale here.
    document.cookie = `lastWorkspaceId=${workspaceId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `lastAppId=${appId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `lastPreview=; path=/; max-age=0; SameSite=Lax`;
    onDone();
    window.location.href = "/dashboard/keywords/research";
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0b0d] px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#141417] ring-1 ring-white/[0.1] shadow-2xl">
        {/* Progress */}
        <div className="flex items-center gap-1.5 px-6 pt-6">
          {(["search", "keywords"] as Step[]).map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s === step || (step === "keywords" && i === 0) ? "bg-indigo-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {step === "search" ? (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white">Welcome to AppASO</h2>
            <p className="mt-1.5 text-sm text-gray-400">
              Let&apos;s find the app you want to track. Search by name, bundle ID, or store URL.
            </p>

            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-3.5 py-2.5 transition-all">
              <MagnifyingGlassIcon className="size-4 text-gray-500 shrink-0" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for your app…"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
            </div>

            {/* Country — search results are storefront-specific, so switching
                this actually matters (not just cosmetic) when an app isn't
                listed under the default store. */}
            <div className="relative mt-2" ref={countryRef}>
              <button
                onClick={() => { setCountryOpen((v) => !v); setCountryQuery(""); }}
                className="flex items-center gap-2 rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors"
              >
                <span className="text-sm leading-none">{countryFlag(country)}</span>
                <span>{COUNTRY_MAP[country] ?? country}</span>
                <ChevronDownIcon className={`size-3 shrink-0 text-gray-500 transition-transform ${countryOpen ? "rotate-180" : ""}`} />
              </button>

              {countryOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-10 w-56 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
                  <div className="px-2 pt-2 pb-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search country…"
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      className="w-full rounded-md bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {allCountries
                      .filter((code) => {
                        const q = countryQuery.toLowerCase();
                        return !q || (COUNTRY_MAP[code] ?? code).toLowerCase().includes(q) || code.toLowerCase().includes(q);
                      })
                      .map((code) => (
                        <button
                          key={code}
                          onClick={() => { setCountry(code); setCountryOpen(false); setCountryQuery(""); }}
                          className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-white/[0.05] transition-colors ${
                            country === code ? "text-white" : "text-gray-400"
                          }`}
                        >
                          <span className="text-base leading-none">{countryFlag(code)}</span>
                          <span className="flex-1 truncate">{COUNTRY_MAP[code] ?? code}</span>
                          <span className="text-xs text-gray-600">{code}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto -mx-2">
              {searching && results.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-5 text-xs text-gray-600">
                  <span className="size-3 rounded-full border border-gray-600 border-t-transparent animate-spin" />
                  Searching App Store &amp; Google Play…
                </div>
              ) : query.trim() && results.length === 0 && !searching ? (
                <div className="px-2 py-5 space-y-1">
                  {iosDown && <p className="text-xs text-amber-500/80">App Store search is temporarily unavailable.</p>}
                  <p className="text-sm text-gray-600">No results for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handlePickApp(r)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
                    >
                      <ResultIcon iconUrl={r.iconUrl} name={r.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1.5">
                          <StoreBadge store={r.store} />
                          {r.developer}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <button
              onClick={handleChangeApp}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowLeftIcon className="size-3" />
              Change app
            </button>

            <div className="mt-3 flex items-center gap-3">
              <ResultIcon iconUrl={selected?.iconUrl} name={selected?.name ?? ""} />
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">{selected?.name}</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  {selected && <StoreBadge store={selected.store} />}
                  {selected?.store === "ios" ? "App Store" : "Google Play"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-400">
              Keyword research is the heart of ASO. The terms you track here drive your rankings and reports, so add one to get started.
            </p>

            {addError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
                <span className="flex-1"><PlanLimitMessage message={addError} /></span>
                <button onClick={() => setAddError(null)} className="shrink-0 hover:text-red-300">
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            )}

            {/* AI suggestions — tap to add */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1">
                <span className="text-indigo-400">✦</span>
                Suggested keywords
              </span>
              <div className="mt-2">
                {suggestions === null ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-6 rounded-md bg-white/[0.04] animate-pulse" style={{ width: `${50 + (i % 5) * 12}px` }} />
                    ))}
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-xs text-gray-600">No suggestions available. Type a keyword below instead.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 pr-1">
                    {suggestions.map((term) => {
                      const isAdded = addedKeywords.some((k) => k.toLowerCase() === term.toLowerCase());
                      const isPending = pendingTerms.has(term.toLowerCase());
                      return (
                        <button
                          key={term}
                          onClick={() => handleToggleSuggestion(term)}
                          disabled={isPending}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all ${
                            isAdded
                              ? "bg-indigo-500/20 ring-1 ring-indigo-500/40 text-indigo-300"
                              : "bg-[#0d0f14] ring-1 ring-white/[0.08] text-gray-300 hover:ring-indigo-500/50 hover:text-white"
                          } ${isPending ? "opacity-50 cursor-wait" : ""}`}
                        >
                          {isPending ? (
                            <span className="size-3 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                          ) : isAdded ? (
                            <CheckIcon className="size-3 text-indigo-400 shrink-0" />
                          ) : (
                            <PlusIcon className="size-3 text-gray-500 shrink-0" />
                          )}
                          {term}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Manual add */}
            <p className="mt-4 text-xs text-gray-500">Or type your own</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-lg bg-[#0d0f14] ring-1 ring-white/[0.08] focus-within:ring-indigo-500/40 px-3 py-2.5 transition-all">
                <input
                  ref={keywordInputRef}
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                  placeholder="Type a keyword…"
                  className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
                />
              </div>
              <button
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors shrink-0"
              >
                <PlusIcon className="size-3.5" />
                Add
              </button>
            </div>

            {addedKeywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {addedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.06] pl-3 pr-2 py-1 text-xs text-gray-300 ring-1 ring-white/[0.08]"
                  >
                    {kw}
                    <button onClick={() => handleRemoveKeyword(kw)} className="text-gray-600 hover:text-white transition-colors">
                      <XMarkIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleFinish}
              disabled={!addedKeywords.length}
              className="mt-5 w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/[0.06] disabled:text-gray-600 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Continue to Keyword Research
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
