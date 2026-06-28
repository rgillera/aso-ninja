"use client";

import { useState, useEffect } from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";
import { DashboardSearch } from "./DashboardSearch";
import { WorkspaceProvider } from "./WorkspaceContext";
import { ActiveAppProvider } from "./ActiveAppContext";
import type { ActiveApp } from "./ActiveAppContext";
import { saveRecentEntry, loadRecent } from "./recentApps";
import type { App, Workspace } from "@/libs/contracts";

type Props = {
  workspaces: Workspace[];
  allApps: App[];
  lastAppId?: string;
  lastPreview?: string;
  children: React.ReactNode;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function DashboardShell({ workspaces, allApps, lastAppId, lastPreview, children }: Props) {
  const pathname     = usePathname();
  const params       = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  const isOnPreview = pathname === "/dashboard/preview";
  const rawSearch   = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  const rawSearchClean = (() => {
    if (!rawSearch) return "";
    const sp = new URLSearchParams(rawSearch.slice(1));
    sp.delete("page");
    return sp.size > 0 ? `?${sp.toString()}` : "";
  })();

  const [savedAppId,   setSavedAppId]   = useState<string | undefined>(lastAppId);
  const [savedPreview, setSavedPreview] = useState<string | undefined>(lastPreview);

  // On mount: clear stale cookie if the app was deleted, then fall through to
  // seed recentAppId from localStorage. Both checks share one effect so that
  // a stale-then-cleared savedAppId still triggers the localStorage fallback.
  // Must be in useEffect — localStorage is client-only (hydration safety).
  const [recentAppId, setRecentAppId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (savedAppId) {
      if (allApps.find(a => a.id === savedAppId)) return; // valid — no fallback needed
      // Stale cookie: clear it and fall through to load from localStorage
      document.cookie = `lastAppId=; path=/; max-age=0; SameSite=Lax`;
      setSavedAppId(undefined);
    }
    for (const ws of workspaces) {
      const entry = loadRecent(ws.id).find(r => r.trackedId);
      if (entry?.trackedId) { setRecentAppId(entry.trackedId); return; }
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      document.cookie = `lastAppId=${params.id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = `lastPreview=; path=/; max-age=0; SameSite=Lax`;
      setSavedAppId(params.id);
      setSavedPreview(undefined);

      // Track every tracked-app navigation as recently viewed
      const app = allApps.find(a => a.id === params.id);
      if (app) {
        saveRecentEntry(app.workspace_id, {
          name: app.name,
          iconUrl: app.icon_url,
          store: app.store,
          bundleId: app.bundle_id,
          storeId: app.store_id,
          country: app.country ?? "US",
          href: `/dashboard/apps/${app.id}`,
          trackedId: app.id,
        });
      }
    } else if (isOnPreview && rawSearchClean) {
      document.cookie = `lastPreview=${encodeURIComponent(rawSearchClean)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      setSavedPreview(rawSearchClean);
      // Intentionally do NOT clear savedAppId — the tracked app persists through
      // preview visits so keywords and other pages keep showing the last followed app.

      // Track every preview navigation as recently viewed
      const sp = new URLSearchParams(rawSearchClean.slice(1));
      const bundleId = sp.get("bundleId");
      const store    = sp.get("store") as "ios" | "android" | null;
      const name     = sp.get("name");
      if (bundleId && store && name) {
        saveRecentEntry(workspaces[0]?.id ?? "", {
          name,
          iconUrl: sp.get("icon") ?? null,
          store,
          bundleId,
          storeId: sp.get("storeId") ?? bundleId,
          country: sp.get("country") ?? "US",
          href: `/dashboard/preview${rawSearchClean}`,
        });
      }
    }
  }, [params.id, isOnPreview, rawSearchClean]);

  // Resolve sidebar context ─────────────────────────────────────────────────

  const resolvedAppId = params.id ?? savedAppId;
  const activeApp     = resolvedAppId ? allApps.find(a => a.id === resolvedAppId) : undefined;

  // For the ActiveAppContext: always use the last *tracked* app regardless of preview state,
  // so non-metadata pages (keywords, etc.) always show whichever app was last selected.
  // Falls back to localStorage recently-viewed when no cookie is present.
  const lastTrackedApp = (params.id ?? savedAppId ?? recentAppId)
    ? allApps.find(a => a.id === (params.id ?? savedAppId ?? recentAppId))
    : undefined;

  const wsParam = searchParams.get("ws");
  // wsParam takes priority over the saved-app workspace when not on an app route,
  // so clicking the workspace switcher always reflects immediately.
  const activeWorkspaceId: string | undefined = params.id
    ? (activeApp?.workspace_id ?? workspaces[0]?.id)
    : wsParam
    ? (workspaces.find(w => w.id === wsParam)?.id ?? workspaces[0]?.id)
    : (activeApp?.workspace_id ?? workspaces[0]?.id);

  const metaOverrideHref = isOnPreview
    ? `/dashboard/preview${rawSearchClean}`
    : undefined;

  const activePreviewPage = isOnPreview ? (searchParams.get("page") ?? "") : undefined;

  // displayApp is what non-metadata pages (keywords, etc.) show in their app header.
  // Recency determines priority: navigating to a tracked app always clears savedPreview,
  // so savedPreview being set means a preview was visited MORE RECENTLY than the tracked app.
  const displayApp: ActiveApp | undefined = (() => {
    const previewStr = isOnPreview ? rawSearchClean : (savedPreview ? decodeURIComponent(savedPreview) : "");
    const previewApp: ActiveApp | undefined = (() => {
      if (!previewStr) return undefined;
      const sp = new URLSearchParams(previewStr.slice(1));
      const name  = sp.get("name");
      const store = sp.get("store") as "ios" | "android" | null;
      if (!name || !store) return undefined;
      return { name, icon_url: sp.get("icon") ?? null, store, country: sp.get("country") ?? null };
    })();
    // On the preview route itself: always show the currently previewed app
    if (isOnPreview) return previewApp;
    // savedPreview set = preview was navigated to after the last tracked app → preview wins
    if (savedPreview) return previewApp ?? lastTrackedApp;
    // No savedPreview = tracked app is more recent (or only tracked apps exist)
    return lastTrackedApp ?? previewApp;
  })();

  return (
    <WorkspaceProvider value={activeWorkspaceId ?? ""}>
    <ActiveAppProvider value={displayApp}>
      <div className="flex h-screen bg-[#111318] overflow-hidden">
        <DashboardSidebar
          currentPath={pathname}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activeAppId={lastTrackedApp?.id}
          metaOverrideHref={metaOverrideHref}
          activePreviewPage={activePreviewPage}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#111318]">
          <DashboardSearch apps={allApps} workspaceId={activeWorkspaceId ?? ""} />
          <div className="flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </ActiveAppProvider>
    </WorkspaceProvider>
  );
}
