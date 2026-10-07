"use client";

import { useState, useEffect } from "react";
import { ClockIcon, DevicePhoneMobileIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { saveRecentEntry, pruneDeletedApps, removeRecentEntry, clearRecent } from "./recentApps";
import type { RecentEntry } from "./recentApps";
import { useWorkspaceId } from "./WorkspaceContext";
import { countryFlag, COUNTRY_MAP } from "@/libs/countries";
import type { App } from "@/libs/contracts";

function IosIcon() {
  return <img src="/app-store.svg" alt="App Store" className="size-3.5" />;
}
function AndroidIcon() {
  return <img src="/google-play.svg" alt="Google Play" className="size-3.5" />;
}

function ConnectedBadge() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 light:text-emerald-700 ring-1 ring-emerald-500/25">
      Following
    </span>
  );
}


function AppCard({
  entry,
  onNavigate,
  onRemove,
}: {
  entry: RecentEntry;
  onNavigate: (e: RecentEntry) => void;
  onRemove: (e: RecentEntry) => void;
}) {
  return (
    <div className="group relative shrink-0">
      <a
        href={entry.href}
        onClick={() => onNavigate(entry)}
        className="flex items-center gap-2.5 rounded-xl bg-[#1a1d24] light:bg-white px-3 py-2.5 pr-7 w-[200px] hover:bg-[#1e2129] light:hover:bg-gray-50 hover:ring-white/[0.12] light:hover:ring-black/[0.16] transition-all"
      >
        {/* Icon + store badge */}
        <div className="relative shrink-0">
          {entry.iconUrl ? (
            <img src={entry.iconUrl} alt={entry.name} className="size-9 rounded-xl object-cover" />
          ) : (
            <div className="size-9 rounded-xl bg-[#0d0f14] light:bg-gray-100 flex items-center justify-center">
              <DevicePhoneMobileIcon className="size-4 text-gray-600 light:text-gray-400" />
            </div>
          )}
          <div className="absolute -bottom-1 -left-1 rounded-full bg-[#1a1d24] light:bg-white p-px">
            {entry.store === "ios" ? <IosIcon /> : <AndroidIcon />}
          </div>
        </div>

        {/* Name + country */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white light:text-gray-900 truncate leading-tight">{entry.name}</p>
          <p className="mt-0.5 text-[10px] text-gray-500 truncate leading-tight">
            {countryFlag(entry.country)} {COUNTRY_MAP[entry.country] ?? entry.country}
          </p>
          {entry.trackedId && <ConnectedBadge />}
        </div>
      </a>
      {/* Sibling of the link, not nested: a button inside <a> is invalid HTML */}
      <button
        type="button"
        onClick={() => onRemove(entry)}
        aria-label={`Remove ${entry.name} from recently viewed`}
        title="Remove from recently viewed"
        className="absolute top-1.5 right-1.5 rounded-md p-0.5 text-gray-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-white/[0.08] light:hover:bg-black/[0.06] hover:text-white light:hover:text-gray-900 transition-opacity"
      >
        <XMarkIcon className="size-3.5" />
      </button>
    </div>
  );
}

export function RecentlyViewedApps({ apps }: { apps: App[] }) {
  const workspaceId = useWorkspaceId();
  const liveAppIds = apps.map((a) => a.id);
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setEntries(pruneDeletedApps(workspaceId, liveAppIds));

    function onStorage(e: StorageEvent) {
      if (e.key === `aso_recently_viewed_${workspaceId}`) setEntries(pruneDeletedApps(workspaceId, liveAppIds));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveAppIds is derived fresh every render; apps itself is the real dependency
  }, [workspaceId, apps]);

  if (entries.length === 0) return null;

  function handleNavigate(entry: RecentEntry) {
    saveRecentEntry(workspaceId, entry);
    setEntries(pruneDeletedApps(workspaceId, liveAppIds));
  }

  function handleRemove(entry: RecentEntry) {
    removeRecentEntry(workspaceId, entry.bundleId, entry.store);
    setEntries(pruneDeletedApps(workspaceId, liveAppIds));
  }

  function handleClearAll() {
    clearRecent(workspaceId);
    setEntries([]);
  }

  return (
    <section className="px-6 pt-6 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="size-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-300 light:text-gray-700">Recently Viewed Apps</h2>
        <button
          type="button"
          onClick={handleClearAll}
          className="ml-auto text-xs text-gray-500 hover:text-gray-300 light:hover:text-gray-700 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {entries.slice(0, 6).map((entry, i) => (
          <AppCard key={`${entry.bundleId}-${entry.store}-${i}`} entry={entry} onNavigate={handleNavigate} onRemove={handleRemove} />
        ))}
      </div>
    </section>
  );
}
