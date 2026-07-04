"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  Squares2X2Icon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  StarIcon,
  GlobeAltIcon,
  PlusIcon,
  CheckIcon,
  Cog6ToothIcon,
  RectangleStackIcon,
  DocumentChartBarIcon,
  EyeIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ListBulletIcon,
  MagnifyingGlassCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  UserCircleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import CreateWorkspace from "@/features/workspace/CreateWorkspace";
import type { Workspace, WorkspaceAccess } from "@/libs/contracts";

const metadataLinks = [
  { label: "Preview", appPath: "preview",   fallback: "/dashboard/metadata/preview",    previewPage: "preview",   icon: EyeIcon },
  { label: "Timeline",         appPath: "timeline",  fallback: "/dashboard/metadata/timeline",   previewPage: "timeline",  icon: ClockIcon },
  { label: "Benchmark", appPath: "benchmark", fallback: "/dashboard/metadata/benchmark", previewPage: "benchmark", icon: ChartBarIcon },
];

const keywordLinks = [
  { label: "Research",    href: "/dashboard/keywords/research",    icon: MagnifyingGlassIcon },
  { label: "Combination", href: "/dashboard/keywords/combination",  icon: AdjustmentsHorizontalIcon },
  { label: "Performance", href: "/dashboard/keywords/performance",  icon: ArrowTrendingUpIcon },
  { label: "Ranked",      href: "/dashboard/keywords/ranked",       icon: ListBulletIcon },
];

const marketLinks = [
  { label: "App Explorer",   href: "/dashboard/market/explorer",   icon: MagnifyingGlassCircleIcon },
];

type Props = {
  currentPath?: string;
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  activeAppId?: string;
  /** When set, every metadata nav link uses this href instead of building /apps/[id]/... */
  metaOverrideHref?: string;
  /** Which preview sub-page is currently active ("" = report, "timeline", etc.) */
  activePreviewPage?: string;
  /** Which product areas the current member has access to in the active workspace */
  access: WorkspaceAccess[];
};

function workspaceInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

export default function DashboardSidebar({
  currentPath = "",
  workspaces,
  activeWorkspaceId,
  activeAppId,
  metaOverrideHref,
  activePreviewPage,
  access,
}: Props) {
  const hasAsoIntelligence = access.includes("aso_intelligence");
  const hasMarketIntelligence = access.includes("market_intelligence");
  const isOnPreviewRoute = currentPath === "/dashboard/preview";
  const isOnReport =
    currentPath.startsWith("/dashboard/report") ||
    currentPath.endsWith("/report") ||
    (isOnPreviewRoute && (activePreviewPage === "report" || activePreviewPage === ""));
  const isOnMetadata =
    !isOnReport && (
      (isOnPreviewRoute && activePreviewPage !== "" && activePreviewPage !== "report") ||
      metadataLinks.some((l) => currentPath.startsWith(l.fallback)) ||
      metadataLinks.some((l) => l.appPath && currentPath.endsWith(`/${l.appPath}`))
    );
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [metaOpen, setMetaOpen] = useState(isOnMetadata);
  const [keywordsOpen, setKeywordsOpen] = useState(
    currentPath.startsWith("/dashboard/keywords")
  );
  const [reviewsOpen, setReviewsOpen] = useState(
    currentPath.startsWith("/dashboard/reviews")
  );

  useEffect(() => {
    if (isOnReport) setMetaOpen(false);
  }, [currentPath]);

  function reportHref() {
    if (metaOverrideHref) return `${metaOverrideHref}&page=report`;
    if (activeAppId) return `/dashboard/apps/${activeAppId}/report`;
    return "/dashboard/report";
  }

  function metaHref(link: typeof metadataLinks[number]) {
    if (metaOverrideHref) {
      return link.previewPage ? `${metaOverrideHref}&page=${link.previewPage}` : metaOverrideHref;
    }
    if (!activeAppId) return link.fallback;
    return link.appPath ? `/dashboard/apps/${activeAppId}/${link.appPath}` : `/dashboard/apps/${activeAppId}`;
  }
  const ref = useRef<HTMLDivElement>(null);

  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
    {showCreate && <CreateWorkspace onClose={() => setShowCreate(false)} />}
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[#0d0f14] border-r border-white/[0.07]">
      {/* Workspace switcher */}
      <div className="relative p-4 border-b border-white/[0.07]" ref={ref}>
        <div className="group flex items-center rounded-lg hover:bg-white/5 transition-colors">
          <button
            onClick={() => setOpen(!open)}
            className="flex flex-1 min-w-0 items-center gap-2.5 px-3 py-2 text-sm font-medium text-white"
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-indigo-500 text-xs font-bold text-white">
              {active ? workspaceInitial(active.name) : "W"}
            </div>
            <span className="truncate">{active?.name ?? "My Workspace"}</span>
          </button>
          <a
            href={active ? `/dashboard/settings/workspace/${active.id}` : "#"}
            title="Workspace settings"
            className={`shrink-0 rounded p-1.5 mr-1 transition-all ${
              currentPath.startsWith("/dashboard/settings/workspace")
                ? "text-indigo-400"
                : "opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white hover:bg-white/10"
            }`}
          >
            <Cog6ToothIcon className="size-4" />
          </a>
          <ChevronDownIcon
            onClick={() => setOpen(!open)}
            className={`size-4 shrink-0 text-gray-500 mr-3 cursor-pointer transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </div>

        {open && (
          <div className="absolute left-4 right-4 top-full z-50 mt-1 rounded-xl bg-[#1a1d24] ring-1 ring-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
            <div className="px-2 py-1.5">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-gray-600">
                Workspaces
              </p>
              <div className="mt-1 space-y-0.5">
                {workspaces.map((ws) => (
                  <a
                    key={ws.id}
                    href={`/dashboard?ws=${ws.id}`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white ${ws.id === active?.id ? "bg-indigo-500" : "bg-indigo-500/60"}`}>
                      {workspaceInitial(ws.name)}
                    </div>
                    <span className="flex-1 truncate">{ws.name}</span>
                    {ws.id === active?.id && (
                      <CheckIcon className="size-3.5 text-indigo-400 shrink-0" />
                    )}
                  </a>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.07] px-2 py-1.5">
              <button
                onClick={() => { setOpen(false); setShowCreate(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
              >
                <PlusIcon className="size-4" />
                Create workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <a
          href={active ? `/dashboard?ws=${active.id}` : "/dashboard"}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            currentPath === "/dashboard"
              ? "bg-white/10 text-white"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Squares2X2Icon className="size-4 shrink-0" />
          My Apps
        </a>

        {hasAsoIntelligence && (
        <div className="pt-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
            ASO Intelligence
          </p>
          <div className="space-y-1">
            {/* Report — top-level link */}
            <a
              href={reportHref()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isOnReport
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <DocumentChartBarIcon className="size-4 shrink-0" />
              Reports
            </a>

            {/* Metadata — collapsible */}
            <div className={`w-full flex items-center justify-between rounded-lg text-sm font-medium transition-colors ${
              isOnMetadata ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}>
              <a
                href={metaHref(metadataLinks[0])}
                className="flex flex-1 items-center gap-3 px-3 py-2"
              >
                <RectangleStackIcon className="size-4 shrink-0" />
                Metadata
              </a>
              <button
                type="button"
                onClick={() => setMetaOpen((v) => !v)}
                className="pr-3 py-2"
              >
                <ChevronDownIcon
                  className={`size-3.5 text-gray-500 transition-transform duration-150 ${metaOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {metaOpen && (
              <div className="ml-4 pl-3 border-l border-white/[0.07] space-y-0.5">
                {metadataLinks.map((link) => {
                  const href = metaHref(link);
                  const isActive =
                    currentPath === href ||
                    currentPath.startsWith(link.fallback) ||
                    (isOnPreviewRoute && activePreviewPage === link.previewPage);
                  return (
                    <a
                      key={link.fallback}
                      href={href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-white bg-white/10"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <link.icon className="size-4 shrink-0" />
                      {link.label}
                    </a>
                  );
                })}
              </div>
            )}

            {/* Keywords — collapsible */}
            <div className={`w-full flex items-center justify-between rounded-lg text-sm font-medium transition-colors ${
              currentPath.startsWith("/dashboard/keywords")
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}>
              <a
                href="/dashboard/keywords/research"
                className="flex flex-1 items-center gap-3 px-3 py-2"
              >
                <MagnifyingGlassIcon className="size-4 shrink-0" />
                Keywords
              </a>
              <button
                type="button"
                onClick={() => setKeywordsOpen((v) => !v)}
                className="pr-3 py-2"
              >
                <ChevronDownIcon
                  className={`size-3.5 text-gray-500 transition-transform duration-150 ${keywordsOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {keywordsOpen && (
              <div className="ml-4 pl-3 border-l border-white/[0.07] space-y-0.5">
                {keywordLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      currentPath.startsWith(link.href)
                        ? "text-white bg-white/10"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <link.icon className="size-4 shrink-0" />
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {/* Reviews & Ratings — collapsible */}
            <div className={`w-full flex items-center justify-between rounded-lg text-sm font-medium transition-colors ${
              currentPath.startsWith("/dashboard/reviews")
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}>
              <a
                href="/dashboard/reviews/ratings"
                className="flex flex-1 items-center gap-3 px-3 py-2"
              >
                <StarIcon className="size-4 shrink-0" />
                Reviews &amp; Ratings
              </a>
              <button
                type="button"
                onClick={() => setReviewsOpen((v) => !v)}
                className="pr-3 py-2"
              >
                <ChevronDownIcon
                  className={`size-3.5 text-gray-500 transition-transform duration-150 ${reviewsOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {reviewsOpen && (
              <div className="ml-4 pl-3 border-l border-white/[0.07] space-y-0.5">
                {[
                  { label: "Ratings", href: "/dashboard/reviews/ratings",  icon: StarIcon },
                  { label: "Reviews", href: "/dashboard/reviews/reviews", icon: ChatBubbleLeftEllipsisIcon },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      currentPath.startsWith(link.href)
                        ? "text-white bg-white/10"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <link.icon className="size-4 shrink-0" />
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {hasMarketIntelligence && (
        <div className="pt-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
            Market Intelligence
          </p>
          <div className="space-y-1">
            {marketLinks.map((link) => {
              const isActive = currentPath.startsWith(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <link.icon className="size-4 shrink-0" />
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
        )}

      </nav>

      {/* Account footer */}
      <div className="border-t border-white/[0.07] p-3 space-y-0.5">
        <a
          href="/dashboard/subscription"
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
        >
          <CreditCardIcon className="size-4 shrink-0" />
          <span className="flex-1">Manage Plan</span>
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
            Free
          </span>
        </a>
        <a
          href="/dashboard/settings/account"
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
        >
          <UserCircleIcon className="size-4 shrink-0" />
          Account settings
        </a>
      </div>
    </aside>
    </>
  );
}
