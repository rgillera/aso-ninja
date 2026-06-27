"use client";

import { useState, useEffect } from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";
import { DashboardSearch } from "./DashboardSearch";
import type { App, Workspace } from "@/libs/contracts";

type Props = {
  workspaces: Workspace[];
  allApps: App[];
  lastAppId?: string;
  lastPreview?: string; // URL-encoded search string, e.g. "?bundleId=...&store=ios&..."
  children: React.ReactNode;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function DashboardShell({ workspaces, allApps, lastAppId, lastPreview, children }: Props) {
  const pathname     = usePathname();
  const params       = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  // Computed once — consistent on server and client (no window access)
  const isOnPreview = pathname === "/dashboard/preview";
  const rawSearch   = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  // Strip the `page` sub-param so the stored base URL is always page-agnostic
  const rawSearchClean = (() => {
    if (!rawSearch) return "";
    const sp = new URLSearchParams(rawSearch.slice(1));
    sp.delete("page");
    return sp.size > 0 ? `?${sp.toString()}` : "";
  })();

  // Mirrors the cookie so sidebar updates without a full navigation
  const [savedAppId,   setSavedAppId]   = useState<string | undefined>(lastAppId);
  const [savedPreview, setSavedPreview] = useState<string | undefined>(lastPreview);

  useEffect(() => {
    if (params.id) {
      document.cookie = `lastAppId=${params.id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = `lastPreview=; path=/; max-age=0; SameSite=Lax`;
      setSavedAppId(params.id);
      setSavedPreview(undefined);
    } else if (isOnPreview && rawSearchClean) {
      document.cookie = `lastPreview=${encodeURIComponent(rawSearchClean)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = `lastAppId=; path=/; max-age=0; SameSite=Lax`;
      setSavedPreview(rawSearchClean);
      setSavedAppId(undefined);
    }
  }, [params.id, isOnPreview, rawSearchClean]);

  // Resolve sidebar context ─────────────────────────────────────────────────

  // 1. Active tracked app (current page or last-visited tracked)
  const resolvedAppId = params.id ?? (savedPreview ? undefined : savedAppId);
  const activeApp     = resolvedAppId ? allApps.find(a => a.id === resolvedAppId) : undefined;
  const activeWorkspaceId = activeApp?.workspace_id ?? workspaces[0]?.id;

  // 2. Preview override: used when viewing (or last viewed) an untracked search result
  const previewSearch = isOnPreview
    ? rawSearchClean
    : (savedPreview ? decodeURIComponent(savedPreview) : undefined);

  const metaOverrideHref = (!params.id && previewSearch)
    ? `/dashboard/preview${previewSearch}`
    : undefined;

  // Which preview sub-page is active right now (empty string = report)
  const activePreviewPage = isOnPreview ? (searchParams.get("page") ?? "") : undefined;

  return (
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
        <DashboardSearch apps={allApps} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
