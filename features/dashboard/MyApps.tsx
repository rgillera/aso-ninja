"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  PlusIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  CheckIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { deleteAppAction } from "@/features/app/actions";
import { removeRecentEntry } from "@/features/dashboard/recentApps";
import { MobileAppQrButton } from "@/features/dashboard/MobileAppQrButton";
import type { App } from "@/libs/contracts";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";

type Props = {
  apps: App[];
  workspaceId: string;
  connectedAppIds: string[];
};

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-5" />;
}

function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-5" />;
}


type AppGroup = {
  key: string;
  primary: App;
  entries: App[];
};

function groupApps(apps: App[]): AppGroup[] {
  const map = new Map<string, App[]>();
  for (const app of apps) {
    const key = `${app.store}::${app.bundle_id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(app);
  }
  return [...map.entries()].map(([key, entries]) => ({
    key,
    primary: entries[0],
    entries,
  }));
}

function ConfirmRemoveDialog({
  group,
  onConfirm,
  onCancel,
}: {
  group: AppGroup;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { primary } = group;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-2xl shadow-black/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          {primary.icon_url ? (
            <img src={primary.icon_url} alt={primary.name} className="size-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="size-10 rounded-xl bg-[#0d0f14] flex items-center justify-center shrink-0">
              <DevicePhoneMobileIcon className="size-5 text-gray-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{primary.name}</p>
            <p className="text-xs text-gray-500 truncate">{primary.bundle_id}</p>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-2">
          Remove <span className="font-semibold text-white">{primary.name}</span> from your followed apps?
        </p>
        <p className="text-xs text-red-400/80 mb-6">
          All tracked keywords and metrics for this app will be permanently deleted. This cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/[0.10] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function AppRow({ group, connected, onRequestDelete }: { group: AppGroup; connected: boolean; onRequestDelete: (group: AppGroup) => void }) {
  const { primary, entries } = group;

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group">
      {/* Store icon */}
      <div className="shrink-0">
        {primary.store === "ios" ? <IosIcon /> : <AndroidIcon />}
      </div>

      {/* App icon — links to first entry */}
      <Link href={`/dashboard/apps/${primary.id}/report`} className="shrink-0">
        {primary.icon_url ? (
          <img src={primary.icon_url} alt={primary.name} className="size-10 rounded-xl object-cover" />
        ) : (
          <div className="size-10 rounded-xl bg-gray-700 flex items-center justify-center">
            <DevicePhoneMobileIcon className="size-5 text-gray-500" />
          </div>
        )}
      </Link>

      {/* Name + bundle — links to first entry */}
      <Link href={`/dashboard/apps/${primary.id}/report`} className={`flex-1 min-w-0 ${primary.status === "frozen" ? "opacity-60" : ""}`}>
        <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
          {primary.name}
          {primary.status === "frozen" && (
            <span
              className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-500 shrink-0"
              title="This app is over your plan's limit. Upgrade to resume tracking."
            >
              Paused
            </span>
          )}
          {connected && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-500 shrink-0"
              title="Connected to real download data"
            >
              <CheckCircleIcon className="size-2.5" />
              Connected
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{primary.bundle_id}</p>
      </Link>

      {/* Country badges + remove button */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {entries.map((app) =>
            app.country ? (
              <Link
                key={app.id}
                href={`/dashboard/apps/${app.id}/report`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0d0f14] px-3 py-1 text-xs font-medium text-gray-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                <span className="text-base leading-none">{countryFlag(app.country)}</span>
                {app.country}
              </Link>
            ) : null
          )}
        </div>

        <button
          onClick={() => onRequestDelete(group)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Remove app"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

function focusGlobalSearch() {
  window.dispatchEvent(new Event("aso:focus-search"));
}

export default function MyApps({ apps, workspaceId, connectedAppIds }: Props) {
  const [pendingDelete, setPendingDelete] = useState<AppGroup | null>(null);
  const [, startTransition] = useTransition();
  const connectedIds = useMemo(() => new Set(connectedAppIds), [connectedAppIds]);

  function handleDelete(ids: string[], bundleId: string, store: string) {
    startTransition(async () => {
      for (const id of ids) await deleteAppAction(id);
      removeRecentEntry(workspaceId, bundleId, store);
      setPendingDelete(null);
    });
  }
  const [storeFilter, setStoreFilter] = useState<"all" | "ios" | "android">("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [showCountries, setShowCountries] = useState(false);
  const countriesRef = useRef<HTMLDivElement>(null);

  const allCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const a of apps) if (a.country) codes.add(a.country);
    return [...codes].sort();
  }, [apps]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (countriesRef.current && !countriesRef.current.contains(e.target as Node)) {
        setShowCountries(false);
      }
    }
    if (showCountries) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showCountries]);

  function toggleCountry(code: string) {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (storeFilter !== "all" && a.store !== storeFilter) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.bundle_id.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCountries.size > 0 && !selectedCountries.has(a.country ?? "")) return false;
      return true;
    });
  }, [apps, storeFilter, search, selectedCountries]);

  const hasFilters = storeFilter !== "all" || search || selectedCountries.size > 0;

  return (
    <>
      {pendingDelete && (
        <ConfirmRemoveDialog
          group={pendingDelete}
          onConfirm={() => handleDelete(pendingDelete.entries.map(e => e.id), pendingDelete.primary.bundle_id, pendingDelete.primary.store)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <div className="p-6">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Store filter */}
          <div className="flex items-center gap-1 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08]">
            <button
              onClick={() => setStoreFilter("all")}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${storeFilter === "all" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              All
            </button>
            <button
              onClick={() => setStoreFilter("ios")}
              className={`rounded-md p-2 transition-colors ${storeFilter === "ios" ? "bg-white/10" : "opacity-50 hover:opacity-80"}`}
            >
              <IosIcon />
            </button>
            <button
              onClick={() => setStoreFilter("android")}
              className={`rounded-md p-2 transition-colors ${storeFilter === "android" ? "bg-white/10" : "opacity-50 hover:opacity-80"}`}
            >
              <AndroidIcon />
            </button>
          </div>

          {/* Search */}
          {showSearch ? (
            <div className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-2.5">
              <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => { if (!search) setShowSearch(false); }}
                placeholder="Search apps…"
                className="bg-transparent text-xs text-white placeholder-gray-600 outline-none w-36"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-3 py-2.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <MagnifyingGlassIcon className="size-3.5" />
              App name
              <ChevronDownIcon className="size-3 text-gray-600" />
            </button>
          )}

          {/* Countries dropdown */}
          <div className="relative" ref={countriesRef}>
            <button
              onClick={() => setShowCountries((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg bg-[#1a1d24] ring-1 px-3 py-2.5 text-xs transition-colors ${selectedCountries.size > 0 ? "text-white ring-indigo-500/50" : "ring-white/[0.08] text-gray-400 hover:text-gray-200"}`}
            >
              <GlobeAltIcon className="size-3.5" />
              {selectedCountries.size > 0 ? `${selectedCountries.size} countr${selectedCountries.size === 1 ? "y" : "ies"}` : "Countries"}
              <ChevronDownIcon className={`size-3 text-gray-600 transition-transform ${showCountries ? "rotate-180" : ""}`} />
            </button>

            {showCountries && allCountries.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 z-50 w-52 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
                <div className="max-h-64 overflow-y-auto py-1">
                  {allCountries.map((code) => {
                    const active = selectedCountries.has(code);
                    return (
                      <button
                        key={code}
                        onClick={() => toggleCountry(code)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-left hover:bg-white/[0.05] transition-colors"
                      >
                        <span className={`flex items-center justify-center size-4 rounded shrink-0 ring-1 ${active ? "bg-indigo-500 ring-indigo-500" : "ring-white/20"}`}>
                          {active && <CheckIcon className="size-3 text-white stroke-[3]" />}
                        </span>
                        <span className="text-base leading-none">{countryFlag(code)}</span>
                        <span className={`${active ? "text-white" : "text-gray-400"}`}>
                          {COUNTRY_MAP[code] ?? code}
                        </span>
                        <span className="ml-auto text-gray-600">{code}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedCountries.size > 0 && (
                  <div className="border-t border-white/[0.07] px-3 py-2">
                    <button
                      onClick={() => setSelectedCountries(new Set())}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={() => { setStoreFilter("all"); setSearch(""); setShowSearch(false); setSelectedCountries(new Set()); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2"
            >
              <span>×</span> Clear all
            </button>
          )}

          {/* Mobile app QR + Add app — right side; hidden on mobile, where "Add App"
              is redundant with the always-visible top search bar and a QR prompt
              to get the mobile app is pointless if you're already on one */}
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <MobileAppQrButton />
            <button
              onClick={focusGlobalSearch}
              className="flex items-center gap-2 rounded-lg bg-[#1a1d24] ring-1 ring-white/[0.08] px-4 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#22252f] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              Add App
            </button>
          </div>
        </div>

        {/* App list */}
        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#1a1d24]/40 py-24">
            <DevicePhoneMobileIcon className="size-10 text-gray-700 mb-4" />
            <p className="text-sm font-medium text-gray-400">No apps yet</p>
            <p className="mt-1 text-sm text-gray-600">Add your first app to start tracking its ASO performance.</p>
            <button
              onClick={focusGlobalSearch}
              className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
            >
              <PlusIcon className="size-4" />
              Add app
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
            <div className="px-5 py-2.5 border-b border-white/[0.07]">
              <p className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                Followed Apps · {groupApps(filtered).length}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-600">No apps match your filters.</div>
            ) : (
              <div className="divide-y divide-white/[0.07]">
                {groupApps(filtered).map((group) => (
                  <AppRow key={group.key} group={group} connected={connectedIds.has(group.primary.id)} onRequestDelete={setPendingDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
