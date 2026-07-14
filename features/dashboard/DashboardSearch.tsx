"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { searchStoreApps, type SearchStoreResult } from "./searchAction";
import { saveRecentEntry, pruneDeletedApps } from "./recentApps";
import type { RecentEntry } from "./recentApps";
import type { App, AppSearchResult } from "@/libs/contracts";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";

type Props = {
  apps: App[];
  workspaceId: string;
  /** True when the current page doesn't encode the app in its URL (Keywords, Reviews, Market, ...) */
  stayInPlace: boolean;
  onSelectApp: (entry: Omit<RecentEntry, "timestamp">) => void;
  /** Builds the link target for an app-scoped page (Report/Metadata/preview), preserving the current sub-page. */
  hrefForApp: (entry: {
    trackedId?: string;
    bundleId: string;
    storeId: string;
    store: "ios" | "android";
    name: string;
    iconUrl: string | null;
    country: string;
  }) => string;
};
type Tab = "all" | "myapps" | "recent";
type StoreFilter = "all" | "ios" | "android";

const RESULTS_PREVIEW = 7;

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-4" />;
}
function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-4" />;
}

function FollowedBadge() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
      Following
    </span>
  );
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
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative shrink-0">
      {iconUrl && !failed ? (
        <img
          src={iconUrl}
          alt={name}
          className="size-11 rounded-xl object-cover"
          onError={() => setFailed(true)}
        />
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

export function DashboardSearch({ apps, workspaceId, stayInPlace, onSelectApp, hrefForApp }: Props) {
  const [open, setOpen]               = useState(false);
  const [tab, setTab]                 = useState<Tab>("recent");
  const [query, setQuery]             = useState("");
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("all");
  const [country, setCountry]         = useState("US");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [results, setResults]         = useState<AppSearchResult[]>([]);
  const [iosDown, setIosDown]         = useState(false);
  const [showAll, setShowAll]         = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [recentlyViewed, setRecentlyViewed] = useState<RecentEntry[]>([]);

  // Reload recently viewed whenever the popup opens or workspace changes,
  // pruning entries for apps deleted since they were last viewed (deleted
  // here, or by another workspace member — localStorage isn't synced).
  useEffect(() => {
    setRecentlyViewed(pruneDeletedApps(workspaceId, apps.map(a => a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apps.map(...) is derived fresh every render; apps itself is the real dependency
  }, [open, workspaceId, apps]);

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
    if (!query.trim()) { setResults([]); setIosDown(false); return; }
    debounce.current = setTimeout(() => {
      startTransition(async () => {
        const { results: r, iosUnavailable }: SearchStoreResult = await searchStoreApps(query, country);
        setResults(r);
        setIosDown(iosUnavailable);
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

  // Let other components (e.g. "Add App" buttons) open + focus this search bar
  useEffect(() => {
    function onFocusRequest() {
      setOpen(true);
      inputRef.current?.focus();
    }
    window.addEventListener("aso:focus-search", onFocusRequest);
    return () => window.removeEventListener("aso:focus-search", onFocusRequest);
  }, []);

  const allCountries = useMemo(() => Object.keys(COUNTRY_MAP).sort(), []);

  // Persist selected country per-workspace in localStorage
  useEffect(() => {
    if (!workspaceId) return;
    const key = `dashboardCountry:${workspaceId}`;
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (stored) setCountry(stored);
    } catch {
      /* ignore */
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const key = `dashboardCountry:${workspaceId}`;
    try {
      localStorage.setItem(key, country);
    } catch {
      /* ignore */
    }

    // Also set a cookie so SSR/server components can read the selected country for this workspace
    try {
      const cookieName = `dashboardCountry:${workspaceId}`;
      const maxAge = 60 * 60 * 24 * 30; // 30 days
      document.cookie = `${cookieName}=${encodeURIComponent(country)}; path=/; max-age=${maxAge}; samesite=Lax`;
    } catch {
      /* ignore */
    }
  }, [country, workspaceId]);

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
      if (country && (a.country ?? "US").toUpperCase() !== country.toUpperCase()) return false;
      if (isSearching) {
        const q = query.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.bundle_id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [apps, storeFilter, country, query, isSearching]);

  // Recently viewed + followed apps not already in recent list
  const combinedRecent = useMemo(() => {
    const recentKeys = new Set(recentlyViewed.map(r => `${r.bundleId}::${r.store}`));
    const followedNotInRecent = apps
      .filter(a => !recentKeys.has(`${a.bundle_id}::${a.store}`))
      .map(a => ({
        name: a.name,
        iconUrl: a.icon_url,
        store: a.store,
        bundleId: a.bundle_id,
        storeId: a.store_id,
        country: a.country ?? "US",
        href: `/dashboard/apps/${a.id}/report`,
        trackedId: a.id,
        timestamp: 0,
      } as RecentEntry));
    return [...recentlyViewed, ...followedNotInRecent];
  }, [recentlyViewed, apps]);

  // Tab labels: "All Apps" / "Followed Apps" when searching, "Recently Viewed" / "Followed Apps" otherwise
  const tabs: { key: Tab; label: string }[] = isSearching
    ? [{ key: "all", label: "All Apps" }, { key: "myapps", label: "Followed Apps" }]
    : [{ key: "recent", label: "Recently Viewed" }, { key: "myapps", label: "Followed Apps" }];

  function handleResultClick(e: React.MouseEvent, entry: Omit<RecentEntry, "timestamp">) {
    saveRecentEntry(workspaceId, entry);
    setRecentlyViewed(pruneDeletedApps(workspaceId, apps.map(a => a.id)));
    setOpen(false);
    if (stayInPlace) {
      e.preventDefault();
      onSelectApp(entry);
    }
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
                onClick={() => { setCountryOpen(v => !v); setCountryQuery(""); }}
                className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3.5 py-2 text-sm text-gray-200 hover:text-white transition-colors min-w-[160px]"
              >
                <span className="text-base leading-none">{countryFlag(country)}</span>
                <span className="flex-1 text-left truncate">{COUNTRY_MAP[country] ?? country}</span>
                <ChevronDownIcon className={`size-3.5 shrink-0 text-gray-500 transition-transform ${countryOpen ? "rotate-180" : ""}`} />
              </button>

              {countryOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
                  <div className="px-2 pt-2 pb-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search country…"
                      value={countryQuery}
                      onChange={e => setCountryQuery(e.target.value)}
                      className="w-full rounded-md bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {allCountries
                      .filter(code => {
                        const q = countryQuery.toLowerCase();
                        return !q || (COUNTRY_MAP[code] ?? code).toLowerCase().includes(q) || code.toLowerCase().includes(q);
                      })
                      .map(code => (
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
                  combinedRecent.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-600">No recently viewed apps</p>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {combinedRecent.map((r, i) => {
                        const followedApp = apps.find(a =>
                          a.bundle_id === r.bundleId &&
                          a.store === r.store &&
                          (a.country ?? "US").toUpperCase() === r.country.toUpperCase()
                        );
                        const isFollowed = !!followedApp;
                        const trackedId = r.trackedId ?? followedApp?.id;
                        const targetHref = stayInPlace ? r.href : hrefForApp({
                          trackedId, bundleId: r.bundleId, storeId: r.storeId, store: r.store,
                          name: r.name, iconUrl: r.iconUrl, country: r.country,
                        });
                        return (
                          <a
                            key={i}
                            href={targetHref}
                            onClick={(e) => handleResultClick(e, {
                              name: r.name,
                              iconUrl: r.iconUrl,
                              store: r.store,
                              bundleId: r.bundleId,
                              storeId: r.storeId,
                              country: r.country,
                              href: r.href,
                              trackedId,
                            })}
                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                          >
                            <AppIconWithBadge iconUrl={r.iconUrl} name={r.name} store={r.store} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {r.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {countryFlag(r.country)} {COUNTRY_MAP[r.country] ?? r.country}
                                {" · "}{r.store === "ios" ? "App Store" : "Google Play"}
                              </p>
                            </div>
                            {isFollowed ? <FollowedBadge /> : null}
                          </a>
                        );
                      })}
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
                      <div className="px-5 py-6 space-y-1">
                        {iosDown && (
                          <p className="text-xs text-amber-500/80">App Store search is temporarily unavailable.</p>
                        )}
                        <p className="text-sm text-gray-600">No results for &ldquo;{query}&rdquo;</p>
                      </div>
                    ) : (
                      <>
                        {iosDown && (
                          <div className="px-5 py-2 border-b border-white/[0.04]">
                            <p className="text-xs text-amber-500/80">App Store is temporarily unavailable — showing Google Play results only.</p>
                          </div>
                        )}
                        <div className="divide-y divide-white/[0.04]">
                          {visibleResults.map((r, i) => {
                            const trackedApp = apps.find(a => a.bundle_id === r.bundleId && a.store === r.store && (a.country ?? "US").toUpperCase() === country.toUpperCase());
                            const href = trackedApp
                              ? `/dashboard/apps/${trackedApp.id}/report`
                              : `/dashboard/preview?bundleId=${encodeURIComponent(r.bundleId)}&storeId=${encodeURIComponent(r.storeId)}&store=${r.store}&name=${encodeURIComponent(r.name)}&icon=${encodeURIComponent(r.iconUrl)}&country=${country}&page=report`;
                            const targetHref = stayInPlace ? href : hrefForApp({
                              trackedId: trackedApp?.id, bundleId: r.bundleId, storeId: r.storeId, store: r.store,
                              name: r.name, iconUrl: r.iconUrl, country,
                            });
                            return (
                              <a
                                key={i}
                                href={targetHref}
                                onClick={(e) => handleResultClick(e, {
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
                                        <p className="text-sm font-semibold text-white truncate">
                                          <span className="mr-2 text-base leading-none">{countryFlag(country)}</span>
                                          {r.name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                          {COUNTRY_MAP[country] ?? country}
                                          {" · "}{r.developer}
                                        </p>
                                </div>
                                {trackedApp ? <FollowedBadge /> : null}
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

            {/* Followed Apps tab */}
            {tab === "myapps" && (
              <>
                {filteredApps.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-600">
                    {apps.length === 0 ? "No apps added yet" : "No apps match your filters"}
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {filteredApps.map(app => {
                      const targetHref = stayInPlace ? `/dashboard/apps/${app.id}/report` : hrefForApp({
                        trackedId: app.id, bundleId: app.bundle_id, storeId: app.store_id, store: app.store,
                        name: app.name, iconUrl: app.icon_url, country: app.country ?? "US",
                      });
                      return (
                        <a
                          key={app.id}
                          href={targetHref}
                          onClick={(e) => handleResultClick(e, {
                            name: app.name,
                            iconUrl: app.icon_url,
                            store: app.store,
                            bundleId: app.bundle_id,
                            storeId: app.store_id,
                            country: app.country ?? "US",
                            href: `/dashboard/apps/${app.id}/report`,
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
                        </a>
                      );
                    })}
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
