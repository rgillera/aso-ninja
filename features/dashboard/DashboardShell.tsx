"use client";

import { useState, useEffect } from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";
import { DashboardSearch } from "./DashboardSearch";
import { WorkspaceProvider } from "./WorkspaceContext";
import { saveRecentEntry } from "./recentApps";
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
      document.cookie = `lastAppId=; path=/; max-age=0; SameSite=Lax`;
      setSavedPreview(rawSearchClean);
      setSavedAppId(undefined);

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

  const resolvedAppId = params.id ?? (savedPreview ? undefined : savedAppId);
  const activeApp     = resolvedAppId ? allApps.find(a => a.id === resolvedAppId) : undefined;

  const wsParam = searchParams.get("ws");
  // wsParam takes priority over the saved-app workspace when not on an app route,
  // so clicking the workspace switcher always reflects immediately.
  const activeWorkspaceId: string | undefined = params.id
    ? (activeApp?.workspace_id ?? workspaces[0]?.id)
    : wsParam
    ? (workspaces.find(w => w.id === wsParam)?.id ?? workspaces[0]?.id)
    : (activeApp?.workspace_id ?? workspaces[0]?.id);

  const previewSearch = isOnPreview
    ? rawSearchClean
    : (savedPreview ? decodeURIComponent(savedPreview) : undefined);

  const metaOverrideHref = (!params.id && previewSearch)
    ? `/dashboard/preview${previewSearch}`
    : undefined;

  const activePreviewPage = isOnPreview ? (searchParams.get("page") ?? "") : undefined;

  return (
    <WorkspaceProvider value={activeWorkspaceId ?? ""}>
      <div className="flex h-screen bg-[#111318] overflow-hidden">
        <DashboardSidebar
          currentPath={pathname}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          activeAppId={activeApp?.id}
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
    </WorkspaceProvider>
  );
}
