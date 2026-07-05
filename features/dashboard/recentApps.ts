export type RecentEntry = {
  name: string;
  iconUrl: string | null;
  store: "ios" | "android";
  bundleId: string;
  storeId: string;
  country: string;
  href: string;
  trackedId?: string;
  timestamp: number;
};

export const RECENT_MAX = 10;

export function recentKey(workspaceId: string) {
  return `aso_recently_viewed_${workspaceId}`;
}

export function loadRecent(workspaceId: string): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(recentKey(workspaceId)) ?? "[]");
  } catch { return []; }
}

export function removeRecentEntry(workspaceId: string, bundleId: string, store: string) {
  try {
    const key = recentKey(workspaceId);
    const filtered = loadRecent(workspaceId).filter(
      (r) => r.bundleId !== bundleId || r.store !== store
    );
    localStorage.setItem(key, JSON.stringify(filtered));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch { /* no-op outside browser */ }
}

export function saveRecentEntry(workspaceId: string, entry: Omit<RecentEntry, "timestamp">) {
  const key = recentKey(workspaceId);
  const existing = loadRecent(workspaceId).filter(
    r => r.bundleId !== entry.bundleId || r.store !== entry.store
  );
  const updated = [{ ...entry, timestamp: Date.now() }, ...existing].slice(0, RECENT_MAX);
  localStorage.setItem(key, JSON.stringify(updated));
}

// A tracked entry whose app no longer exists (deleted here, or by another
// workspace member — localStorage isn't synced across users/tabs) would
// otherwise sit in "recently viewed" forever, still clickable, and bounce
// through the report page's dead-app fallback when clicked.
export function pruneDeletedApps(workspaceId: string, liveAppIds: string[]): RecentEntry[] {
  const loaded = loadRecent(workspaceId);
  const stale = loaded.filter(e => e.trackedId && !liveAppIds.includes(e.trackedId));
  if (stale.length === 0) return loaded;
  for (const e of stale) removeRecentEntry(workspaceId, e.bundleId, e.store);
  return loadRecent(workspaceId);
}
