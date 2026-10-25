"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import {
  ChevronDownIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  EyeIcon,
  PuzzlePieceIcon,
  ArrowTrendingUpIcon,
  ListBulletIcon,
  TagIcon,
  UserCircleIcon,
  CreditCardIcon,
  LockClosedIcon,
  BeakerIcon,
  TrophyIcon,
  MapIcon,
  ChartBarIcon,
  LightBulbIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassCircleIcon,
  ScaleIcon,
  BanknotesIcon,
  DocumentMagnifyingGlassIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { FreeAuditSidebarLink } from "./FreeAuditSidebarLink";
import CreateWorkspace from "@/features/workspace/CreateWorkspace";
import { isPlanAtLeast, PLAN_BADGE } from "@/features/subscription/planTiers";
import { useSidebarTour } from "@/features/dashboard/SidebarTourContext";
import { useTrialEndsAt, trialDaysLeft } from "@/features/dashboard/PlanContext";
import { TourTooltip, TourPulse } from "@/features/onboarding/TourTooltip";
import { TOUR_STEPS } from "@/features/onboarding/tour";
import { recordTourCompletedAction } from "@/features/activity/actions";
import type { PlanSlug, Workspace, WorkspaceAccess, WorkspaceRole } from "@/libs/contracts";

const LOCK_BADGE: Partial<Record<PlanSlug, { label: string; className: string }>> = {
  basic: { label: "Basic", className: "bg-emerald-500/10 text-emerald-500 light:text-emerald-700" },
  pro: { label: "Pro", className: "bg-violet-500/10 text-violet-400 light:text-violet-700" },
  pro_plus: { label: "Pro+", className: "bg-amber-500/10 text-amber-500 light:text-amber-700" },
  enterprise: { label: "Enterprise", className: "bg-indigo-500/10 text-indigo-400 light:text-indigo-700" },
};

function PlanLockBadge({ minPlan }: { minPlan: PlanSlug }) {
  const badge = LOCK_BADGE[minPlan] ?? LOCK_BADGE.enterprise!;
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold ${badge.className}`}
      title={`Requires the ${PLAN_BADGE[minPlan].label} plan or above`}
    >
      {badge.label}
    </span>
  );
}

// "NEW" on a nav link, for users who were already here before it launched
// (anyone with a workspace created before launchedOn). Signups after that
// meet it as part of the product, not as news. Hidden once they've opened
// the page, and for everyone after showUntil.
type NewBadge = { launchedOn: string; showUntil: string };

const SEEN_KEY_PREFIX = "nav-new-seen:";

function readSeen(href: string): boolean {
  try { return localStorage.getItem(SEEN_KEY_PREFIX + href) === "1"; } catch { return false; }
}

function markSeen(href: string) {
  try { localStorage.setItem(SEEN_KEY_PREFIX + href, "1"); } catch {}
}

const noopSubscribe = () => () => {};

function NewLinkBadge({ href, badge, workspaces, currentPath }: { href: string; badge: NewBadge; workspaces: Workspace[]; currentPath: string }) {
  // Client-only read (localStorage): the server snapshot says "seen", so the
  // badge never renders on the server and can't cause a hydration mismatch.
  const seen = useSyncExternalStore(noopSubscribe, () => readSeen(href), () => true);
  const onPage = currentPath.startsWith(href);
  useEffect(() => { if (onPage) markSeen(href); }, [onPage, href]);

  const today = new Date().toISOString().slice(0, 10);
  const isPastUser = workspaces.some((w) => w.created_at.slice(0, 10) < badge.launchedOn);
  if (seen || onPage || today > badge.showUntil || !isPastUser) return null;
  return (
    <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold leading-none bg-red-500 text-white">NEW</span>
  );
}

// Desktop-only icon rail. Kept in a cookie, not localStorage, so the server
// renders the right width: nav links are full page loads, and a client-only
// read would flash the full sidebar on every one.
const COLLAPSED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeCollapsedCookie(value: boolean) {
  document.cookie = `sidebarCollapsed=${value ? "1" : "0"}; path=/; max-age=${COLLAPSED_COOKIE_MAX_AGE}; SameSite=Lax`;
}

// Section label in the full sidebar; a hairline in the icon rail.
function SectionHeading({ label, rail }: { label: string; rail: boolean }) {
  return (
    <>
      <p className={`px-3 pb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-600 light:text-gray-400 ${rail ? "lg:hidden" : ""}`}>
        {label}
      </p>
      {rail && <div className="hidden lg:block mx-3 mb-2 border-t border-white/[0.07] light:border-black/[0.08]" />}
    </>
  );
}

const LONG_TAIL_HREF = "/dashboard/keywords/combination";

const keywordLinks: { label: string; href: string; icon: typeof MagnifyingGlassIcon; minPlan?: PlanSlug; newBadge?: NewBadge }[] = [
  { label: "Keyword Research", href: "/dashboard/keywords/research", icon: MagnifyingGlassIcon },
  { label: "Keyword Inspector", href: "/dashboard/keywords/inspector", icon: DocumentMagnifyingGlassIcon, minPlan: "pro", newBadge: { launchedOn: "2026-10-19", showUntil: "2026-11-18" } },
  { label: "Long Tail Keywords", href: LONG_TAIL_HREF, icon: PuzzlePieceIcon, minPlan: "pro" },
  { label: "Keyword Performance", href: "/dashboard/keywords/performance", icon: ArrowTrendingUpIcon },
  { label: "Group by Intent", href: "/dashboard/keywords/intent", icon: TagIcon, minPlan: "pro" },
  { label: "Ranked Keywords", href: "/dashboard/keywords/ranked", icon: ListBulletIcon, minPlan: "pro_plus" },
  { label: "Keyword Simulator", href: "/dashboard/keywords/simulator", icon: BeakerIcon, minPlan: "pro_plus" },
];

const marketLinks: { label: string; href: string; icon: typeof MagnifyingGlassIcon; minPlan?: PlanSlug }[] = [
  { label: "App Explorer", href: "/dashboard/market/explorer", icon: MagnifyingGlassCircleIcon, minPlan: "pro" },
  { label: "Compare Apps", href: "/dashboard/market/compare", icon: ScaleIcon, minPlan: "pro" },
];

// Bid Suggestions works with zero setup (just tracked keywords), so it stays
// a standalone top-level link. The other three all read from a connected
// Apple Search Ads account, so they're grouped under a collapsible "Campaign
// Data" parent — same convention as Keywords/Metadata below (a category
// collapses once it holds 3+ related items).
const asaAccountLinks: { label: string; href: string; icon: typeof MagnifyingGlassIcon; minPlan?: PlanSlug }[] = [
  { label: "Active Bids", href: "/dashboard/asa/active-bids", icon: ChartBarIcon, minPlan: "pro" },
  { label: "Spend Insights", href: "/dashboard/asa/spend-insights", icon: LightBulbIcon, minPlan: "pro" },
  { label: "Efficiency", href: "/dashboard/asa/efficiency", icon: AdjustmentsHorizontalIcon, minPlan: "pro" },
];

type Props = {
  currentPath?: string;
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  activeAppId?: string;
  /** When set, the Reports and Metadata links use this href instead of building /apps/[id]/... */
  metaOverrideHref?: string;
  /** Which preview sub-page is currently active ("" = report, "timeline", etc.) */
  activePreviewPage?: string;
  /** Which product areas the current member has access to in the active workspace */
  access: WorkspaceAccess[];
  /** The current member's role in the active workspace — only owners can manage billing */
  role?: WorkspaceRole;
  planSlug?: PlanSlug;
  /** Max workspaces the current user may own under their plan; null = unlimited */
  workspaceLimit?: number | null;
  /** Collapsed to the icon rail on first render, from the sidebarCollapsed cookie */
  initialCollapsed?: boolean;
  /** Below the lg breakpoint the sidebar renders as an off-canvas drawer, shown when true */
  isMobileOpen?: boolean;
  /** Closes the drawer — backdrop click, a nav link click, or Escape */
  onMobileClose?: () => void;
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
  role,
  planSlug = "free",
  workspaceLimit,
  initialCollapsed = false,
  isMobileOpen = false,
  onMobileClose,
}: Props) {
  // During the signup Pro trial the footer pill reads "Pro trial" instead of
  // just "Pro", kept short so it fits beside "Manage Plan".
  const trialEndsAt = useTrialEndsAt();
  const trialDays = trialEndsAt ? trialDaysLeft(trialEndsAt) : null;
  const planBadge = trialDays === null
    ? PLAN_BADGE[planSlug]
    : { label: "Pro trial", className: PLAN_BADGE.pro.className };
  const canManagePlan = role === "owner";
  const canCreateWorkspace = workspaceLimit == null || workspaces.length < workspaceLimit;
  const hasAsoIntelligence = access.includes("aso_intelligence");
  const hasMarketIntelligence = access.includes("market_intelligence");
  const hasAsaIntelligence = access.includes("asa_intelligence");
  const isOnPreviewRoute = currentPath === "/dashboard/preview";
  const isOnReport =
    currentPath.startsWith("/dashboard/report") ||
    currentPath.endsWith("/report") ||
    (isOnPreviewRoute && (activePreviewPage === "report" || activePreviewPage === ""));
  const isOnMetadataPreview =
    !isOnReport && (
      (isOnPreviewRoute && activePreviewPage === "preview") ||
      currentPath.startsWith("/dashboard/metadata/preview") ||
      (!isOnPreviewRoute && currentPath.endsWith("/preview"))
    );
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [asaAccountOpen, setAsaAccountOpen] = useState(
    asaAccountLinks.some((l) => currentPath.startsWith(l.href))
  );

  function reportHref() {
    if (metaOverrideHref) return `${metaOverrideHref}&page=report`;
    if (activeAppId) return `/dashboard/apps/${activeAppId}/report`;
    return activeWorkspaceId ? `/dashboard/report?ws=${activeWorkspaceId}` : "/dashboard/report";
  }

  function metadataPreviewHref() {
    if (metaOverrideHref) return `${metaOverrideHref}&page=preview`;
    if (activeAppId) return `/dashboard/apps/${activeAppId}/preview`;
    return activeWorkspaceId ? `/dashboard/metadata/preview?ws=${activeWorkspaceId}` : "/dashboard/metadata/preview";
  }

  const ref = useRef<HTMLDivElement>(null);
  const { active: tourActive, onAdvance: onAdvanceTour } = useSidebarTour();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // The tour's last step points at a nav label, so it always gets the full sidebar.
  // All rail styling is lg:-prefixed: the mobile drawer is always full width.
  const rail = collapsed && !tourActive;
  const railHide = rail ? "lg:hidden" : "";
  const railLink = rail ? "lg:justify-center lg:px-0" : "";
  const navRef = useRef<HTMLElement>(null);
  // The tour ends on Long Tail Keywords: it answers "what if I can't rank
  // for this?", the question the Inspector step just raised, and it works on
  // day one. Pro, so anyone without it (e.g. an invitee to a Free workspace)
  // ends on Keyword Performance instead.
  const tourLink = isPlanAtLeast(planSlug, "pro") ? LONG_TAIL_HREF : "/dashboard/keywords/performance";

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

  // Escape closes the mobile drawer — has no effect once lg: forces it open/static
  useEffect(() => {
    if (!isMobileOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose?.();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isMobileOpen, onMobileClose]);

  return (
    <>
    {showCreate && <CreateWorkspace onClose={() => setShowCreate(false)} />}
    {isMobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        onClick={onMobileClose}
        aria-hidden="true"
      />
    )}
    <aside
      onClick={(e) => {
        // Nav links do a full page navigation (plain <a>, no client routing) so this
        // is mostly cosmetic — avoids the drawer visibly staying open mid-navigation.
        if ((e.target as HTMLElement).closest("a")) onMobileClose?.();
      }}
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] shrink-0 flex-col bg-[#0a0a0c] light:bg-white border-r border-white/[0.07] light:border-black/[0.08] transition-all duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${rail ? "lg:w-16" : ""}`}
    >
      {/* Workspace switcher */}
      <div className={`relative p-3 border-b border-white/[0.07] light:border-black/[0.08] ${rail ? "lg:px-2" : ""}`} ref={ref}>
        <div className="group flex items-center rounded-lg hover:bg-white/5 light:hover:bg-black/[0.04] transition-colors">
          <button
            onClick={() => setOpen(!open)}
            title={rail ? active?.name ?? "My Workspace" : undefined}
            className={`flex flex-1 min-w-0 items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-white light:text-gray-900 ${railLink}`}
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-indigo-500 text-xs font-bold text-white">
              {active ? workspaceInitial(active.name) : "W"}
            </div>
            <span className={`truncate ${railHide}`}>{active?.name ?? "My Workspace"}</span>
          </button>
          <a
            href={active ? `/dashboard/settings/workspace/${active.id}` : "#"}
            title="Workspace settings"
            className={`shrink-0 rounded p-1.5 mr-1 transition-all ${railHide} ${
              currentPath.startsWith("/dashboard/settings/workspace")
                ? "text-indigo-400 light:text-indigo-600"
                : "opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white light:hover:text-gray-900 hover:bg-white/10 light:hover:bg-black/[0.06]"
            }`}
          >
            <Cog6ToothIcon className="size-4" />
          </a>
          <ChevronDownIcon
            onClick={() => setOpen(!open)}
            className={`size-4 shrink-0 text-gray-500 mr-3 cursor-pointer transition-transform duration-150 ${open ? "rotate-180" : ""} ${railHide}`}
          />
        </div>

        {/* Collapse toggle, sitting on the sidebar's right edge at the header
            divider. Desktop only: below lg the sidebar is a drawer with its own close. */}
        {!tourActive && (
          <button
            type="button"
            onClick={() => {
              setCollapsed(!collapsed);
              writeCollapsedCookie(!collapsed);
            }}
            title={rail ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 bottom-0 z-30 hidden size-6 translate-y-1/2 items-center justify-center rounded-full bg-[#141417] light:bg-white text-gray-500 ring-1 ring-white/[0.1] light:ring-black/[0.1] shadow-md shadow-black/20 light:shadow-black/5 hover:text-white light:hover:text-gray-900 transition-colors lg:flex"
          >
            {rail ? <ChevronDoubleRightIcon className="size-3" /> : <ChevronDoubleLeftIcon className="size-3" />}
          </button>
        )}

        {open && (
          <div className={`absolute left-4 right-4 top-full z-50 mt-1 rounded-xl ${rail ? "lg:left-2 lg:right-auto lg:w-64" : ""} bg-[#141417] light:bg-white shadow-xl shadow-black/30 overflow-hidden`}>
            <div className="px-2 py-1.5">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-widest text-gray-600 light:text-gray-400">
                Workspaces
              </p>
              <div className="mt-1 space-y-0.5">
                {workspaces.map((ws) => (
                  <a
                    key={ws.id}
                    href={`/dashboard?ws=${ws.id}`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-300 light:text-gray-700 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors"
                  >
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white ${ws.id === active?.id ? "bg-indigo-500" : "bg-indigo-500/60"}`}>
                      {workspaceInitial(ws.name)}
                    </div>
                    <span className="flex-1 truncate">{ws.name}</span>
                    {ws.status === "frozen" && (
                      <span
                        className="inline-flex items-center gap-1 shrink-0 rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-500 light:text-amber-700"
                        title="This workspace is over your plan's workspace limit and is paused."
                      >
                        <LockClosedIcon className="size-2.5" />
                        Paused
                      </span>
                    )}
                    {ws.id === active?.id && (
                      <CheckIcon className="size-3.5 text-indigo-400 light:text-indigo-600 shrink-0" />
                    )}
                  </a>
                ))}
              </div>
            </div>

            {canCreateWorkspace ? (
              <div className="border-t border-white/[0.07] light:border-black/[0.08] px-2 py-1.5">
                <button
                  onClick={() => { setOpen(false); setShowCreate(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors"
                >
                  <PlusIcon className="size-4" />
                  Create workspace
                </button>
              </div>
            ) : (
              <div className="border-t border-white/[0.07] light:border-black/[0.08] px-4 py-2.5">
                <p className="text-xs text-gray-600 light:text-gray-400">
                  Your plan allows {workspaceLimit} workspace{workspaceLimit === 1 ? "" : "s"}.{" "}
                  <a
                    href="/dashboard/subscription"
                    onClick={() => setOpen(false)}
                    className="text-indigo-400 light:text-indigo-600 hover:text-indigo-300 light:hover:text-indigo-700 transition-colors"
                  >
                    Upgrade
                  </a>{" "}
                  to add more.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-0.5 transition-all ${rail ? "lg:px-2" : ""} ${
          tourActive ? "ring-2 ring-inset ring-indigo-400/70 rounded-lg" : ""
        }`}
      >
        <TourTooltip
          targetRef={navRef}
          active={tourActive}
          step={TOUR_STEPS.indexOf("sidebar") + 1}
          total={TOUR_STEPS.length}
          icon={<MapIcon className="size-4 text-indigo-400 light:text-indigo-600 shrink-0 mt-0.5" />}
          message={
            tourLink === LONG_TAIL_HREF ? (
              <>
                That&apos;s the tour. If a keyword is hard to rank for, open <span className="font-semibold text-white light:text-gray-900">Long Tail Keywords</span> to find easier variants of it. Then track and export their rankings in <span className="font-semibold text-white light:text-gray-900">Keyword Performance</span>.
              </>
            ) : (
              <>
                That&apos;s the tour. Check <span className="font-semibold text-white light:text-gray-900">Keyword Performance</span> anytime to see how your keywords rank day by day, and export a full report.
              </>
            )
          }
          buttonLabel="Done"
          onAdvance={() => {
            // Last step, so closing it any way (Done, X, outside click)
            // means they reached the end of the tour.
            recordTourCompletedAction().catch(() => {});
            onAdvanceTour();
          }}
          anchor="right"
        />
        <a
          href={active ? `/dashboard?ws=${active.id}` : "/dashboard"}
          title={rail ? "My Apps" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
            currentPath === "/dashboard"
              ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
              : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
          }`}
        >
          <Squares2X2Icon className="size-5 shrink-0" />
          <span className={railHide}>My Apps</span>
        </a>

        {hasAsoIntelligence && (
        <>
        <a
          href={reportHref()}
          title={rail ? "Reports" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
            isOnReport
              ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
              : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
          }`}
        >
          <DocumentChartBarIcon className="size-5 shrink-0" />
          <span className={railHide}>Reports</span>
        </a>

        <a
          href={metadataPreviewHref()}
          title={rail ? "Metadata" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
            isOnMetadataPreview
              ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
              : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
          }`}
        >
          <EyeIcon className="size-5 shrink-0" />
          <span className={railHide}>Metadata</span>
        </a>

        <div className="pt-3">
          <SectionHeading label="Keyword Intelligence" rail={rail} />
          <div className="space-y-0.5">
            {keywordLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                title={rail ? link.label : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
                  currentPath.startsWith(link.href)
                    ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                    : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
                } ${tourActive && link.href === tourLink ? "ring-1 ring-indigo-400/70" : ""}`}
              >
                {tourActive && link.href === tourLink && <TourPulse />}
                <link.icon className="size-5 shrink-0" />
                <span className={`flex-1 whitespace-nowrap ${railHide}`}>{link.label}</span>
                {link.newBadge && !rail && (
                  <NewLinkBadge href={link.href} badge={link.newBadge} workspaces={workspaces} currentPath={currentPath} />
                )}
                {link.minPlan && !rail && !isPlanAtLeast(planSlug, link.minPlan) && (
                  <PlanLockBadge minPlan={link.minPlan} />
                )}
              </a>
            ))}
          </div>
        </div>
        </>
        )}

        {hasAsaIntelligence && (
        <div className="pt-3">
          <SectionHeading label="ASA Intelligence" rail={rail} />
          <div className="space-y-0.5">
            <a
              href="/dashboard/asa/bids"
              title={rail ? "Bid Suggestions" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
                currentPath.startsWith("/dashboard/asa/bids")
                  ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                  : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
              }`}
            >
              <BanknotesIcon className="size-5 shrink-0" />
              <span className={`flex-1 ${railHide}`}>Bid Suggestions</span>
              {!rail && !isPlanAtLeast(planSlug, "pro") && <PlanLockBadge minPlan="pro" />}
            </a>

            {/* Campaign Data — collapsible: Active Bids, Spend Insights, Efficiency all read from a connected Apple Search Ads account */}
            <div className={`w-full flex items-center justify-between rounded-lg text-sm font-medium transition-colors ${railHide} ${
              asaAccountLinks.some((l) => currentPath.startsWith(l.href))
                ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
            }`}>
              <a
                href="/dashboard/asa/active-bids"
                className="flex flex-1 items-center gap-3 px-3 py-2"
              >
                <ChartBarIcon className="size-5 shrink-0" />
                Campaign Data
              </a>
              <button
                type="button"
                onClick={() => setAsaAccountOpen((v) => !v)}
                className="pr-3 py-2"
              >
                <ChevronDownIcon
                  className={`size-3.5 text-gray-500 transition-transform duration-150 ${asaAccountOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* The rail has no room for a nested group, so it shows the three flat */}
            {(asaAccountOpen || rail) && (
              <div className={`ml-4 pl-3 border-l border-white/[0.07] light:border-black/[0.08] space-y-0.5 ${
                rail ? `lg:ml-0 lg:pl-0 lg:border-l-0 ${asaAccountOpen ? "" : "hidden lg:block"}` : ""
              }`}>
                {asaAccountLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    title={rail ? link.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
                      currentPath.startsWith(link.href)
                        ? "text-white light:text-indigo-700 bg-white/10 light:bg-indigo-50"
                        : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
                    }`}
                  >
                    <link.icon className="size-5 shrink-0" />
                    <span className={`flex-1 whitespace-nowrap ${railHide}`}>{link.label}</span>
                    {link.minPlan && !rail && !isPlanAtLeast(planSlug, link.minPlan) && (
                      <PlanLockBadge minPlan={link.minPlan} />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {hasMarketIntelligence && (
        <div className="pt-3">
          <SectionHeading label="Market Intelligence" rail={rail} />
          <div className="space-y-0.5">
            {marketLinks.map((link) => {
              const isActive = currentPath.startsWith(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  title={rail ? link.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${railLink} ${
                    isActive
                      ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
                      : "text-gray-400 light:text-gray-600 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
                  }`}
                >
                  <link.icon className="size-5 shrink-0" />
                  <span className={`flex-1 ${railHide}`}>{link.label}</span>
                  {link.minPlan && !rail && !isPlanAtLeast(planSlug, link.minPlan) && (
                    <PlanLockBadge minPlan={link.minPlan} />
                  )}
                </a>
              );
            })}
          </div>
        </div>
        )}
      </nav>

      {/* Account footer */}
      <div className={`border-t border-white/[0.07] light:border-black/[0.08] p-2.5 space-y-0.5 ${rail ? "lg:px-2" : ""}`}>
        <a
          href="/dashboard/certification"
          title={rail ? "Learn & Get Certified" : undefined}
          className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${railLink} ${
            currentPath.startsWith("/dashboard/certification")
              ? "bg-white/10 light:bg-indigo-50 text-white light:text-indigo-700"
              : "text-gray-500 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900"
          }`}
        >
          <TrophyIcon className="size-5 shrink-0" />
          <span className={railHide}>Learn &amp; Get Certified</span>
        </a>
        <FreeAuditSidebarLink rail={rail} railHide={railHide} railLink={railLink} />
        {canManagePlan ? (
          <a
            href="/dashboard/subscription"
            title={rail ? `Manage Plan (${planBadge.label})` : undefined}
            className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${railLink} text-gray-500 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors`}
          >
            <CreditCardIcon className="size-5 shrink-0" />
            <span className={`flex-1 ${railHide}`}>Manage Plan</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${railHide} ${planBadge.className}`}>
              {planBadge.label}
            </span>
          </a>
        ) : (
          <div
            title="Only the workspace owner can manage the plan"
            className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${railLink} text-gray-600 cursor-not-allowed`}
          >
            <CreditCardIcon className="size-5 shrink-0" />
            <span className={`flex-1 ${railHide}`}>Manage Plan</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium opacity-60 ${railHide} ${planBadge.className}`}>
              {planBadge.label}
            </span>
          </div>
        )}
        <a
          href="/dashboard/settings/account"
          title={rail ? "Account settings" : undefined}
          className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${railLink} text-gray-500 hover:bg-white/5 light:hover:bg-black/[0.04] hover:text-white light:hover:text-gray-900 transition-colors`}
        >
          <UserCircleIcon className="size-5 shrink-0" />
          <span className={railHide}>Account settings</span>
        </a>

      </div>
    </aside>
    </>
  );
}
