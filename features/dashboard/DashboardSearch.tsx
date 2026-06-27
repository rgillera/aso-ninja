"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { searchStoreApps } from "./searchAction";
import { loadRecent, saveRecentEntry } from "./recentApps";
import type { RecentEntry } from "./recentApps";
import type { App, AppSearchResult } from "@/libs/contracts";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";

type Props = { apps: App[]; workspaceId: string };
type Tab = "all" | "myapps" | "recent";
type StoreFilter = "all" | "ios" | "android";

const RESULTS_PREVIEW = 7;

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-4" />;
}
function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-4" />;
}

function AppIconWithBadge({
  iconUrl,
  name,
  store,
}: {
  iconUrl?: string | null;
  name: string;
  store: "ios" | "android";
}) {
  return (
    <div className="relative shrink-0">
      {iconUrl ? (
        <img src={iconUrl} alt={name} className="size-11 rounded-xl object-cover" />
      ) : (
        <div className="size-11 rounded-xl bg-[#0d0f14] flex items-center justify-center">
          <DevicePhoneMobileIcon className="size-5 text-gray-600" />
        </div>
      )}
      <div className="absolute -bottom-1 -left-1 rounded-full bg-[#111318] p-px ring-1 ring-white/[0.08]">
        {store === "ios" ? (
          <img src="/app-store.svg" alt="" className="size-3.5" />
        ) : (
          <img src="/google-play.svg" alt="" className="size-3.5" />
        )}
      </div>
    </div>
  );
}

function ConnectedBadge() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
      Connected
    </span>
  );
}

function FollowingBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[#22252f] px-3 py-1 text-xs text-gray-400 ring-1 ring-white/[0.08]">
      Following
    </span>
  );
}

export function DashboardSearch({ apps, workspaceId }: Props) {
  const [open, setOpen]               = useState(false);
  const [tab, setTab]                 = useState<Tab>("recent");
  const [query, setQuery]             = useState("");
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("all");
  const [country, setCountry]         = useState("US");
  const [countryOpen, setCountryOpen] = useState(false);
  const [results, setResults]         = useState<AppSearchResult[]>([]);
  const [showAll, setShowAll]         = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [recentlyViewed, setRecentlyViewed] = useState<RecentEntry[]>([]);

  // Load recently viewed from localStorage on mount
  useEffect(() => { setRecentlyViewed(loadRecent(workspaceId)); }, [workspaceId]);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const debounce   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearching = query.trim().length > 0;

  // Reset "show all" and tab when query changes
  useEffect(() => {
    setShowAll(false);
    if (isSearching) setTab("all");
  }, [query]);

  // Debounced store search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      startTransition(async () => {
        const r = await searchStoreApps(query);
        setResults(r);
      });
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCountryOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const allCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const a of apps) if (a.country) codes.add(a.country);
    if (!codes.has("US")) codes.add("US");
    return [...codes].sort();
  }, [apps]);

  // Filtered store results (by store type)
  const filteredResults = useMemo(() => {
    let r = results;
    if (storeFilter !== "all") r = r.filter(x => x.store === storeFilter);
    return r;
  }, [results, storeFilter]);

  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, RESULTS_PREVIEW);
  const hasMore = filteredResults.length > RESULTS_PREVIEW && !showAll;

  // Filtered user apps
  const filteredApps = useMemo(() => {
    return apps.filter(a => {
      if (storeFilter !== "all" && a.store !== storeFilter) return false;
      if (country && a.country !== country) return false;
      if (isSearching) {
        const q = query.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.bundle_id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [apps, storeFilter, country, query, isSearching]);

  // Tab labels: "All Apps" / "My Apps" when searching, "Recently Viewed" / "My Apps" otherwise
  const tabs: { key: Tab; label: string }[] = isSearching
    ? [{ key: "all", label: "All Apps" }, { key: "myapps", label: "My Apps" }]
    : [{ key: "recent", label: "Recently Viewed" }, { key: "myapps", label: "My Apps" }];

  function handleResultClick(entry: Omit<RecentEntry, "timestamp">) {
    saveRecentEntry(workspaceId, entry);
    setRecentlyViewed(loadRecent(workspaceId));
    setOpen(false);
  }

  function clearQuery() {
    setQuery("");
    setResults([]);
    setTab("recent");
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapRef} className="relative border-b border-white/[0.07]">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-5 py-3">
        <MagnifyingGlassIcon className="size-5 text-gray-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search for an app by name, app id or URL ..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
        />
        {query && (
          <button onClick={clearQuery} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
            <XMarkIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Popup */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 bg-[#111318] border-t border-white/[0.07] shadow-2xl shadow-black/50">

          {/* Tabs */}
          <div className="flex items-end gap-6 px-5 pt-4 border-b border-white/[0.07]">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? "border-white text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] flex-wrap">

            {/* Country */}
            <div className="relative" ref={countryRef}>
              <button
                onClick={() => setCountryOpen(v => !v)}
                className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3.5 py-2 text-sm text-gray-200 hover:text-white transition-colors min-w-[160px]"
              >
                <span className="text-base leading-none">{countryFlag(country)}</span>
                <span className="flex-1 text-left truncate">{COUNTRY_MAP[country] ?? country}</span>
                <ChevronDownIcon className={`size-3.5 shrink-0 text-gray-500 transition-transform ${countryOpen ? "rotate-180" : ""}`} />
              </button>

              {countryOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto py-1">
                    {allCountries.map(code => (
                      <button
                        key={code}
                        onClick={() => { setCountry(code); setCountryOpen(false); }}
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

            {/* Store filter */}
            <div className="flex items-center rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] p-1 gap-0.5">
              {(["all", "ios", "android"] as StoreFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStoreFilter(s)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    storeFilter === s ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {s === "all" && "All"}
                  {s === "ios" && <IosIcon />}
                  {s === "android" && <AndroidIcon />}
                </button>
              ))}
            </div>

          </div>

          {/* Content */}
          <div className="max-h-[440px] overflow-y-auto">

            {/* All Apps tab — store search results */}
            {(tab === "all" || (!isSearching && tab === "recent")) && (
              <>
                {tab === "recent" && (
                  recentlyViewed.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-600">No recently viewed apps</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {recentlyViewed.map((r, i) => (
                        <a
                          key={i}
                          href={r.href}
                          onClick={() => handleResultClick(r)}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                        >
                          <AppIconWithBadge iconUrl={r.iconUrl} name={r.name} store={r.store} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {countryFlag(r.country)} {COUNTRY_MAP[r.country] ?? r.country}
                              {" · "}{r.store === "ios" ? "App Store" : "Google Play"}
                            </p>
                          </div>
                          {r.trackedId ? <ConnectedBadge /> : null}
                        </a>
                      ))}
                    </div>
                  )
                )}

                {tab === "all" && (
                  <>
                    {isPending && results.length === 0 ? (
                      <div className="flex items-center gap-2 px-5 py-5 text-xs text-gray-600">
                        <span className="size-3 rounded-full border border-gray-600 border-t-transparent animate-spin" />
                        Searching App Store &amp; Google Play…
                      </div>
                    ) : filteredResults.length === 0 && !isPending ? (
                      <p className="px-5 py-6 text-sm text-gray-600">No results for "{query}"</p>
                    ) : (
                      <>
                        <div className="divide-y divide-white/[0.04]">
                          {visibleResults.map((r, i) => {
                            const trackedApp = apps.find(a => a.bundle_id === r.bundleId);
                            const href = trackedApp
                              ? `/dashboard/apps/${trackedApp.id}`
                              : `/dashboard/preview?bundleId=${encodeURIComponent(r.bundleId)}&storeId=${encodeURIComponent(r.storeId)}&store=${r.store}&name=${encodeURIComponent(r.name)}&icon=${encodeURIComponent(r.iconUrl)}&country=${country}`;
                            return (
                              <a
                                key={i}
                                href={href}
                                onClick={() => handleResultClick({
                                  name: r.name,
                                  iconUrl: r.iconUrl,
                                  store: r.store,
                                  bundleId: r.bundleId,
                                  storeId: r.storeId,
                                  country,
                                  href,
                                  trackedId: trackedApp?.id,
                                })}
                                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                              >
                                <AppIconWithBadge iconUrl={r.iconUrl} name={r.name} store={r.store} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                                  <p className="text-xs text-gray-500 truncate mt-0.5">{r.developer}</p>
                                </div>
                                {trackedApp && <ConnectedBadge />}
                              </a>
                            );
                          })}
                        </div>

                        {hasMore && (
                          <button
                            onClick={() => setShowAll(true)}
                            className="w-full px-5 py-3 text-sm text-gray-500 hover:text-gray-300 text-left border-t border-white/[0.04] transition-colors"
                          >
                            See all results
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* My Apps tab */}
            {tab === "myapps" && (
              <>
                {filteredApps.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-600">
                    {apps.length === 0 ? "No apps added yet" : "No apps match your filters"}
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {filteredApps.map(app => (
                      <a
                        key={app.id}
                        href={`/dashboard/apps/${app.id}`}
                        onClick={() => handleResultClick({
                          name: app.name,
                          iconUrl: app.icon_url,
                          store: app.store,
                          bundleId: app.bundle_id,
                          storeId: app.store_id,
                          country: app.country ?? "US",
                          href: `/dashboard/apps/${app.id}`,
                          trackedId: app.id,
                        })}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                      >
                        <AppIconWithBadge iconUrl={app.icon_url} name={app.name} store={app.store} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{app.name}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {app.country && (
                              <span>{countryFlag(app.country)} {COUNTRY_MAP[app.country] ?? app.country} - {app.country}</span>
                            )}
                            {app.bundle_id && (
                              <span className="ml-2 text-gray-700">{app.bundle_id.split(".").slice(0, 3).join(".")}</span>
                            )}
                          </p>
                        </div>
                        <FollowingBadge />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
