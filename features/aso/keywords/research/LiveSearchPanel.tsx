"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, PlusIcon, CheckIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { AppSearchResult } from "@/app/api/keywords/search/route";
import { fetchLiveSearchResults } from "./liveSearch";
import { useActiveApp } from "@/features/dashboard/ActiveAppContext";
import { useWorkspaceId } from "@/features/dashboard/WorkspaceContext";
import { PlanLimitMessage } from "@/features/subscription/PlanLimitMessage";

type AddStatus = "idle" | "adding" | "added";

function rowStoreId(app: AppSearchResult, store: "ios" | "android"): string {
  return store === "ios" ? String(app.trackId) : app.appId ?? String(app.trackId);
}

type Props = {
  keyword: string;
  store: "ios" | "android";
  country: string;
  onClose: () => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function Stars({ rating }: { rating: number }) {
  const full    = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = i <= full ? 1 : i === full + 1 && partial > 0 ? partial : 0;
        return (
          <svg key={i} className="size-2.5" viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`star-${rating}-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${fill * 100}%`} stopColor="#F59E0B" />
                <stop offset={`${fill * 100}%`} stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#star-${rating}-${i})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      })}
    </div>
  );
}


function AppRow({
  app, store, isCurrentApp, addStatus, onAddCompetitor,
}: {
  app: AppSearchResult;
  store: "ios" | "android";
  isCurrentApp: boolean;
  addStatus: AddStatus;
  onAddCompetitor: (app: AppSearchResult) => void;
}) {
  const storeUrl = store === "ios" && app.trackId
    ? `https://apps.apple.com/app/id${app.trackId}`
    : null;

  return (
    <div className="border-b border-gray-100 last:border-0 px-3 py-2">
      <div className="flex items-center gap-2.5">
        <span className="text-[9px] font-bold text-gray-300 w-3 shrink-0 text-center">{app.position}</span>
        <div className={`relative w-11 h-11 overflow-hidden shrink-0 bg-gray-100 border border-black/[0.06] ${store === "android" ? "rounded-xl" : "rounded-2xl"} ${!isCurrentApp ? "group/icon" : ""}`}>
          {app.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.icon}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          {!isCurrentApp && (
            <button
              type="button"
              onClick={() => onAddCompetitor(app)}
              disabled={addStatus !== "idle"}
              aria-label={addStatus === "added" ? `${app.name} added as competitor` : `Add ${app.name} as competitor`}
              title={addStatus === "added" ? "Added as competitor" : "Add as competitor"}
              className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
                addStatus === "added" ? "opacity-100" : "opacity-0 group-hover/icon:opacity-100"
              } ${addStatus === "adding" ? "cursor-wait" : addStatus === "added" ? "cursor-default" : "cursor-pointer"}`}
            >
              {addStatus === "added" ? (
                <CheckIcon className="size-4 text-white" />
              ) : (
                <PlusIcon className={`size-4 text-white ${addStatus === "adding" ? "opacity-50" : ""}`} />
              )}
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-900 truncate leading-tight">{app.name}</p>
          <p className="text-[10px] text-gray-500 truncate leading-tight">{app.subtitle || app.developer}</p>
          {app.rating > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Stars rating={app.rating} />
              <span className="text-[9px] text-gray-400">{formatCount(app.ratingCount)}</span>
            </div>
          )}
        </div>
        {store === "android" ? (
          <span className="text-[10px] font-semibold text-[#01875f] whitespace-nowrap shrink-0">
            {app.price === "Free" ? "Install" : app.price}
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0">
            {app.price === "Free" ? "GET" : app.price}
          </span>
        )}
      </div>
      {storeUrl && (
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 ml-7 inline-flex items-center gap-1 text-[9px] text-[#007AFF] hover:underline"
        >
          View on App Store
          <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      )}
    </div>
  );
}

function PhoneFrame({
  keyword, apps, loading, error, store, currentStoreId, addingStoreId, addedStoreIds, onAddCompetitor,
}: {
  keyword: string;
  apps: AppSearchResult[];
  loading: boolean;
  error?: string | null;
  store: "ios" | "android";
  currentStoreId?: string;
  addingStoreId: string | null;
  addedStoreIds: Set<string>;
  onAddCompetitor: (app: AppSearchResult) => void;
}) {
  const isAndroid = store === "android";
  return (
    <div
      className={`relative shrink-0 bg-black shadow-2xl ${isAndroid ? "rounded-[2rem]" : "rounded-[3rem]"}`}
      style={{ width: 390, height: 780, boxShadow: "0 0 0 9px #1e1e1e, 0 0 0 11px #111, 0 30px 80px rgba(0,0,0,0.5)" }}
    >
      {/* Side buttons */}
      <div className="absolute -left-2.5 top-20 w-1.5 h-8 bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -left-2.5 top-32 w-1.5 h-12 bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -left-2.5 top-48 w-1.5 h-12 bg-[#2a2a2a] rounded-l-sm" />
      <div className="absolute -right-2.5 top-28 w-1.5 h-16 bg-[#2a2a2a] rounded-r-sm" />

      {/* Screen */}
      <div className={`absolute inset-[3px] bg-white overflow-hidden flex flex-col ${isAndroid ? "rounded-[1.7rem]" : "rounded-[2.6rem]"}`}>
        {isAndroid ? (
          <>
            {/* Punch-hole camera */}
            <div className="flex justify-center pt-2 shrink-0">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-1.5 pb-1 shrink-0">
              <span className="text-[11px] font-medium text-black leading-none">9:41</span>
              <div className="flex items-center gap-1.5">
                <svg className="size-3.5" viewBox="0 0 17 12" fill="black">
                  <rect x="0" y="8" width="3" height="4" rx="0.5" />
                  <rect x="4" y="5" width="3" height="7" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" />
                  <rect x="12" y="0" width="3" height="12" rx="0.5" opacity="0.3" />
                </svg>
                <svg className="size-3.5" viewBox="0 0 16 12" fill="black">
                  <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                  <path d="M4.5 6.5A4.97 4.97 0 018 5c1.38 0 2.63.56 3.54 1.46L13 5a7 7 0 00-10 0l1.5 1.5z" opacity="0.7" />
                  <path d="M1.5 3.5A9.95 9.95 0 018 1c2.76 0 5.26 1.12 7.07 2.93L16.5 2.5A12 12 0 000 2.5l1.5 1z" opacity="0.3" />
                </svg>
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={1.5}>
                  <rect x="2" y="7" width="18" height="10" rx="2.5" />
                  <path d="M22 10v4" strokeLinecap="round" fill="black" />
                </svg>
              </div>
            </div>
            {/* Play Store search bar */}
            <div className="px-3 py-2 shrink-0">
              <div className="flex items-center gap-2 bg-[#f1f3f4] rounded-full px-3 py-2">
                <svg className="size-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
                </svg>
                <span className="flex-1 text-[12px] text-gray-900 font-normal truncate">{keyword}</span>
                <svg className="size-3.5 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
                  <path d="M17 11a5 5 0 01-10 0H5a7 7 0 006 6.93V21h2v-3.07A7 7 0 0019 11h-2z" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Dynamic island */}
            <div className="flex justify-center pt-2.5 shrink-0">
              <div className="w-24 h-6 bg-black rounded-full" />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-1 pb-0.5 shrink-0">
              <span className="text-[11px] font-semibold text-black leading-none">9:41</span>
              <div className="flex items-center gap-1">
                {/* Signal bars */}
                <svg className="size-3.5" viewBox="0 0 17 12" fill="black">
                  <rect x="0" y="8" width="3" height="4" rx="0.5" />
                  <rect x="4" y="5" width="3" height="7" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" />
                  <rect x="12" y="0" width="3" height="12" rx="0.5" opacity="0.3" />
                </svg>
                {/* Wifi */}
                <svg className="size-3.5" viewBox="0 0 16 12" fill="black">
                  <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                  <path d="M4.5 6.5A4.97 4.97 0 018 5c1.38 0 2.63.56 3.54 1.46L13 5a7 7 0 00-10 0l1.5 1.5z" opacity="0.7" />
                  <path d="M1.5 3.5A9.95 9.95 0 018 1c2.76 0 5.26 1.12 7.07 2.93L16.5 2.5A12 12 0 000 2.5l1.5 1z" opacity="0.3" />
                </svg>
                {/* Battery */}
                <div className="flex items-center">
                  <div className="w-6 h-3 rounded-[3px] border border-black/40 p-px">
                    <div className="h-full w-full bg-black rounded-[2px]" />
                  </div>
                  <div className="w-0.5 h-1.5 bg-black/40 rounded-r-sm ml-px" />
                </div>
              </div>
            </div>

            {/* App Store search bar */}
            <div className="px-3 py-2 shrink-0">
              <div className="flex items-center gap-2 bg-[#f2f2f7] rounded-xl px-3 py-2">
                <svg className="size-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <span className="flex-1 text-[12px] text-gray-900 font-normal truncate">{keyword}</span>
                <svg className="size-3 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </>
        )}

        {/* Results label */}
        <div className="px-3 pb-1 shrink-0">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            {loading ? "Loading…" : error ? "Unavailable" : `${apps.length} results`}
          </span>
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                    <div className="h-2 bg-gray-200 rounded w-2/3" />
                  </div>
                  <div className="w-10 h-6 bg-gray-200 rounded-full" />
                </div>
              ))
            : error
            ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <svg className="size-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {isAndroid ? "Google Play’s search is currently unavailable. Try again later." : "Apple’s search API is currently unavailable. Try again later."}
                  </p>
                </div>
              )
            : apps.map((app) => {
                const id = rowStoreId(app, store);
                return (
                  <AppRow
                    key={app.position}
                    app={app}
                    store={store}
                    isCurrentApp={!!currentStoreId && id === currentStoreId}
                    addStatus={addingStoreId === id ? "adding" : addedStoreIds.has(id) ? "added" : "idle"}
                    onAddCompetitor={onAddCompetitor}
                  />
                );
              })}
        </div>

        {/* Bottom bar */}
        {isAndroid ? (
          <div className="flex items-center justify-center gap-16 py-2.5 shrink-0">
            <svg className="size-3.5 text-black/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black/70" />
            <div className="w-3.5 h-3.5 rounded-sm border-2 border-black/70" />
          </div>
        ) : (
          <div className="flex justify-center py-2 shrink-0">
            <div className="w-24 h-1 bg-black/20 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function LiveSearchPanel({ keyword, store, country, onClose }: Props) {
  const activeApp   = useActiveApp();
  const workspaceId = useWorkspaceId();
  const [apps, setApps]           = useState<AppSearchResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [addingStoreId, setAddingStoreId] = useState<string | null>(null);
  const [addedStoreIds, setAddedStoreIds] = useState<Set<string>>(new Set());
  const [addError, setAddError]           = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setApps([]);
    setError(null);
    setAddedStoreIds(new Set());
    setAddError(null);
    fetchLiveSearchResults(keyword, store, country)
      .then((apps) => { setApps(apps); setLoading(false); })
      .catch(() => { setError("unavailable"); setLoading(false); });
  }, [keyword, store, country]);

  async function handleAddCompetitor(app: AppSearchResult) {
    if (!activeApp || addingStoreId) return;
    const storeId = rowStoreId(app, store);
    if (addedStoreIds.has(storeId)) return;

    setAddError(null);
    setAddingStoreId(storeId);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          bundleId: activeApp.bundle_id,
          storeId:  activeApp.store_id,
          appName:  activeApp.name,
          iconUrl:  activeApp.icon_url ?? undefined,
          store:    activeApp.store,
          country:  activeApp.country,
          competitor: { storeId, name: app.name, icon: app.icon, developer: app.developer },
        }),
      });
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setAddError(body.error ?? "Couldn't add this app as a competitor.");
        return;
      }
      setAddedStoreIds((prev) => new Set(prev).add(storeId));
    } catch {
      setAddError("Couldn't add this app as a competitor.");
    } finally {
      setAddingStoreId(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-xl bg-[#141417] rounded-2xl ring-1 ring-white/[0.1] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-medium text-gray-300">
            Live Search insights for{" "}
            <span className="font-bold text-white">{keyword}</span>
          </h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {addError && (
          <div className="flex items-center gap-2 px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px] shrink-0">
            <ExclamationTriangleIcon className="size-3.5 shrink-0" />
            <span className="flex-1"><PlanLimitMessage message={addError} /></span>
            <button onClick={() => setAddError(null)} className="shrink-0 hover:text-red-300">
              <XMarkIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex justify-center p-8 overflow-auto">
          <PhoneFrame
            keyword={keyword}
            apps={apps}
            loading={loading}
            error={error}
            store={store}
            currentStoreId={activeApp?.store_id}
            addingStoreId={addingStoreId}
            addedStoreIds={addedStoreIds}
            onAddCompetitor={handleAddCompetitor}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
