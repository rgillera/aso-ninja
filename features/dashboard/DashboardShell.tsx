"use client";

import { useState, useEffect } from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";
import { DashboardSearch } from "./DashboardSearch";
import { WorkspaceProvider } from "./WorkspaceContext";
import { ActiveAppProvider } from "./ActiveAppContext";
import type { ActiveApp } from "./ActiveAppContext";
import { NavigationGuardProvider } from "./NavigationGuardContext";
import { LeaveConfirmDialog } from "./LeaveConfirmDialog";
import { saveRecentEntry, loadRecent } from "./recentApps";
import type { RecentEntry } from "./recentApps";
import type { App, Workspace } from "@/libs/contracts";

// Routes where the selected app is encoded in the URL itself, so switching
// apps has to navigate. Everywhere else (Keywords, Reviews, Market, ...) the
// page is app-agnostic and just reads the active app from context/cookies.
const APP_SCOPED_PREFIXES = ["/dashboard/apps/", "/dashboard/report", "/dashboard/metadata", "/dashboard/preview"];

type MetaSection = "report" | "preview" | "timeline" | "benchmark";

// Which Report/Metadata sub-page the user is currently looking at, so that
// switching apps from search lands on the equivalent page for the new app
// instead of always bouncing to Report.
function sectionFromPath(pathname: string, isOnPreview: boolean, previewPage: string | null): MetaSection {
  if (pathname.startsWith("/dashboard/apps/")) {
    const seg = pathname.split("/")[4];
    if (seg === "timeline" || seg === "benchmark" || seg === "preview") return seg;
    return "report";
  }
  if (pathname.startsWith("/dashboard/metadata/timeline")) return "timeline";
  if (pathname.startsWith("/dashboard/metadata/benchmark")) return "benchmark";
  if (pathname.startsWith("/dashboard/metadata/preview")) return "preview";
  if (isOnPreview && (previewPage === "timeline" || previewPage === "benchmark" || previewPage === "preview")) {
    return previewPage;
  }
  return "report";
}

type Props = {
  workspaces: Workspace[];
  allApps: App[];
  lastAppId?: string;
  lastPreview?: string;
  lastWorkspaceId?: string;
  children: React.ReactNode;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function DashboardShell({ workspaces, allApps, lastAppId, lastPreview, lastWorkspaceId, children }: Props) {
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
  const [savedWorkspaceId, setSavedWorkspaceId] = useState<string | undefined>(lastWorkspaceId);

  // Set by pages (e.g. Keywords) while a save is still in flight, so navigating
  // away — sidebar links, search results, any in-app link — asks for confirmation
  // first instead of silently losing the in-progress add.
  const [guardMessage, setGuardMessage] = useState<string | null>(null);
  const [pendingHref,  setPendingHref]  = useState<string | null>(null);

  function handleNavClickCapture(e: React.MouseEvent) {
    if (!guardMessage) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (!anchor) return;
    e.preventDefault();
    e.stopPropagation();
    setPendingHref(anchor.getAttribute("href"));
  }

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
        // Following a specific app also follows its workspace, so non-app pages
        // (App Explorer, etc.) visited afterwards stay on the same workspace.
        document.cookie = `lastWorkspaceId=${app.workspace_id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        setSavedWorkspaceId(app.workspace_id);
        saveRecentEntry(app.workspace_id, {
          name: app.name,
          iconUrl: app.icon_url,
          store: app.store,
          bundleId: app.bundle_id,
          storeId: app.store_id,
          country: app.country ?? "US",
          href: `/dashboard/apps/${app.id}/report`,
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

  // Persist an explicit workspace switch (the sidebar switcher navigates to
  // /dashboard?ws=<id>) so it sticks on the next navigation — otherwise it's
  // only reflected on that one URL and any link without ?ws= (e.g. App
  // Explorer) falls straight back to whatever workspace the last-viewed app
  // belongs to, undoing the switch.
  useEffect(() => {
    if (!wsParam) return;
    const match = workspaces.find(w => w.id === wsParam);
    if (!match) return;
    document.cookie = `lastWorkspaceId=${match.id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    setSavedWorkspaceId(match.id);
  }, [wsParam, workspaces]);

  // wsParam (freshest explicit switch) wins, then the persisted workspace
  // choice, then the last-viewed app's workspace, then the first workspace.
  const activeWorkspaceId: string | undefined = params.id
    ? (activeApp?.workspace_id ?? workspaces[0]?.id)
    : wsParam
    ? (workspaces.find(w => w.id === wsParam)?.id ?? workspaces[0]?.id)
    : (workspaces.find(w => w.id === savedWorkspaceId)?.id ?? activeApp?.workspace_id ?? workspaces[0]?.id);

  // Invoked by DashboardSearch when the user picks an app while sitting on an
  // app-agnostic page — updates the active app in place instead of navigating
  // away to Report, which is what URL-driven selection (params.id / preview
  // route) does via the effect above.
  function selectApp(entry: Omit<RecentEntry, "timestamp">) {
    if (entry.trackedId) {
      document.cookie = `lastAppId=${entry.trackedId}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = `lastPreview=; path=/; max-age=0; SameSite=Lax`;
      setSavedAppId(entry.trackedId);
      setSavedPreview(undefined);
      const app = allApps.find(a => a.id === entry.trackedId);
      if (app) {
        document.cookie = `lastWorkspaceId=${app.workspace_id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        setSavedWorkspaceId(app.workspace_id);
      }
      return;
    }
    const sp = new URLSearchParams();
    sp.set("bundleId", entry.bundleId);
    sp.set("storeId", entry.storeId);
    sp.set("store", entry.store);
    sp.set("name", entry.name);
    if (entry.iconUrl) sp.set("icon", entry.iconUrl);
    sp.set("country", entry.country);
    const query = `?${sp.toString()}`;
    document.cookie = `lastPreview=${encodeURIComponent(query)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    setSavedPreview(query);
    // Intentionally do NOT clear savedAppId — same reasoning as the effect above.
  }

  const isAppScopedPath = APP_SCOPED_PREFIXES.some(p => pathname.startsWith(p));
  const activeSection = sectionFromPath(pathname, isOnPreview, searchParams.get("page"));

  // Used by DashboardSearch on app-scoped pages (Report/Metadata/preview) to
  // build a link to the same sub-page for the newly selected app, instead of
  // always linking to Report.
  function hrefForApp(entry: {
    trackedId?: string;
    bundleId: string;
    storeId: string;
    store: "ios" | "android";
    name: string;
    iconUrl: string | null;
    country: string;
  }): string {
    if (entry.trackedId) return `/dashboard/apps/${entry.trackedId}/${activeSection}`;
    const sp = new URLSearchParams();
    sp.set("bundleId", entry.bundleId);
    sp.set("storeId", entry.storeId);
    sp.set("store", entry.store);
    sp.set("name", entry.name);
    if (entry.iconUrl) sp.set("icon", entry.iconUrl);
    sp.set("country", entry.country);
    sp.set("page", activeSection);
    return `/dashboard/preview?${sp.toString()}`;
  }

  // Mirrors displayApp's priority: while on preview, use the live query string;
  // otherwise fall back to the persisted savedPreview so sidebar Metadata links
  // keep pointing at a previewed-but-not-tracked app after navigating away
  // (e.g. Keywords -> Metadata) instead of losing it to the generic fallback route.
  const metaOverrideHref = isOnPreview
    ? `/dashboard/preview${rawSearchClean}`
    : savedPreview
    ? `/dashboard/preview${decodeURIComponent(savedPreview)}`
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
      return {
        bundle_id: sp.get("bundleId") ?? undefined,
        store_id:  sp.get("storeId")  ?? undefined,
        name, icon_url: sp.get("icon") ?? null, store, country: sp.get("country") ?? null,
      };
    })();
    // On the preview route itself: always show the currently previewed app
    if (isOnPreview) return previewApp;
    // savedPreview set = preview was navigated to after the last tracked app → preview wins
    if (savedPreview) return previewApp ?? (lastTrackedApp ? {
      id: lastTrackedApp.id, bundle_id: lastTrackedApp.bundle_id, store_id: lastTrackedApp.store_id,
      name: lastTrackedApp.name, icon_url: lastTrackedApp.icon_url, store: lastTrackedApp.store, country: lastTrackedApp.country,
    } : undefined);
    // No savedPreview = tracked app is more recent (or only tracked apps exist)
    return lastTrackedApp ? {
      id: lastTrackedApp.id, bundle_id: lastTrackedApp.bundle_id, store_id: lastTrackedApp.store_id,
      name: lastTrackedApp.name, icon_url: lastTrackedApp.icon_url, store: lastTrackedApp.store, country: lastTrackedApp.country,
    } : previewApp;
  })();

  return (
    <WorkspaceProvider value={activeWorkspaceId ?? ""}>
    <ActiveAppProvider value={displayApp}>
    <NavigationGuardProvider value={{ guardMessage, setGuardMessage }}>
      <div className="flex h-screen bg-[#111318] overflow-hidden" onClickCapture={handleNavClickCapture}>
        <DashboardSidebar
          currentPath={pathname}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activeAppId={lastTrackedApp?.id}
          metaOverrideHref={metaOverrideHref}
          activePreviewPage={activePreviewPage}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#111318]">
          <DashboardSearch
            apps={allApps}
            workspaceId={activeWorkspaceId ?? ""}
            stayInPlace={!isAppScopedPath}
            onSelectApp={selectApp}
            hrefForApp={hrefForApp}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
      {pendingHref && guardMessage && (
        <LeaveConfirmDialog
          message={guardMessage}
          onCancel={() => setPendingHref(null)}
          onConfirm={() => { window.location.href = pendingHref; }}
        />
      )}
    </NavigationGuardProvider>
    </ActiveAppProvider>
    </WorkspaceProvider>
  );
}
