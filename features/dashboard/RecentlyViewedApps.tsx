"use client";

import { useState, useEffect } from "react";
import { ClockIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { loadRecent, saveRecentEntry } from "./recentApps";
import type { RecentEntry } from "./recentApps";
import { useWorkspaceId } from "./WorkspaceContext";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-3.5" />;
}
function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-3.5" />;
}

function ConnectedBadge() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
      Following
    </span>
  );
}


function AppCard({ entry, onNavigate }: { entry: RecentEntry; onNavigate: (e: RecentEntry) => void }) {
  return (
    <a
      href={entry.href}
      onClick={() => onNavigate(entry)}
      className="flex items-center gap-2.5 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.07] px-3 py-2.5 w-[200px] shrink-0 hover:bg-[#1e2129] hover:ring-white/[0.12] transition-all"
    >
      {/* Icon + store badge */}
      <div className="relative shrink-0">
        {entry.iconUrl ? (
          <img src={entry.iconUrl} alt={entry.name} className="size-9 rounded-xl object-cover" />
        ) : (
          <div className="size-9 rounded-xl bg-[#0d0f14] flex items-center justify-center">
            <DevicePhoneMobileIcon className="size-4 text-gray-600" />
          </div>
        )}
        <div className="absolute -bottom-1 -left-1 rounded-full bg-[#1a1d24] p-px ring-1 ring-white/[0.08]">
          {entry.store === "ios" ? <IosIcon /> : <AndroidIcon />}
        </div>
      </div>

      {/* Name + country */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate leading-tight">{entry.name}</p>
        <p className="mt-0.5 text-[10px] text-gray-500 truncate leading-tight">
          {countryFlag(entry.country)} {COUNTRY_MAP[entry.country] ?? entry.country}
        </p>
        {entry.trackedId && <ConnectedBadge />}
      </div>
    </a>
  );
}

export function RecentlyViewedApps() {
  const workspaceId = useWorkspaceId();
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setEntries(loadRecent(workspaceId));

    function onStorage(e: StorageEvent) {
      if (e.key === `aso_recently_viewed_${workspaceId}`) setEntries(loadRecent(workspaceId));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [workspaceId]);

  if (entries.length === 0) return null;

  function handleNavigate(entry: RecentEntry) {
    saveRecentEntry(workspaceId, entry);
    setEntries(loadRecent(workspaceId));
  }

  return (
    <section className="px-6 pt-6 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="size-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-300">Recently Viewed Apps</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {entries.slice(0, 6).map((entry, i) => (
          <AppCard key={`${entry.bundleId}-${entry.store}-${i}`} entry={entry} onNavigate={handleNavigate} />
        ))}
      </div>
    </section>
  );
}
