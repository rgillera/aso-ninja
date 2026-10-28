"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { DocumentMagnifyingGlassIcon, PuzzlePieceIcon, ChartBarIcon, ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import KeywordInspectorPage, { type InspectorDock } from "./index";
import KeywordCombinationPage, { type LongTailDock } from "@/features/aso/keywords/combination";
import { KeywordPerformancePane } from "@/features/aso/keywords/performance/KeywordPerformancePane";
import type { ActiveApp } from "@/features/dashboard/ActiveAppContext";
import type { Keyword, DownloadsConnection } from "@/features/aso/keywords/research/types";
import type { CompetitorApp } from "@/features/aso/keywords/research/ManageCompetitorsModal";
import { TourTooltip } from "@/features/onboarding/TourTooltip";
import { TOUR_STEPS, type TourStep } from "@/features/onboarding/tour";

// Split view for Keyword Research: its table on the left, and a pane on the
// right about one keyword, picked by clicking its row (or Details). Its tabs
// (Inspector, Long Tail, Performance) each show that keyword,
// one at a time, so it can be checked, expanded and tracked without leaving
// the table, and anything tracked from the pane lands straight back in it.
// Only the pane's width is remembered (a per-viewer convenience, so
// localStorage is enough); each visit starts with the pane closed, and
// clicking Keyword Research in the sidebar (a full reload) closes it too.

const PREFS_KEY = "keyword-research-inspector";
const DEFAULT_WIDTH = 600;
const MIN_WIDTH = 380;
const MAX_WIDTH = 900;
// The table keeps at least 640px, so a wide saved pane can't squash it on a
// smaller screen. Enforced in the aside's CSS width (below) rather than here,
// so it also holds when the window shrinks.

const clampWidth = (w: number) => Math.round(Math.min(Math.max(w, MIN_WIDTH), MAX_WIDTH));

export type PaneTab = "inspector" | "longTail" | "performance";

type Prefs = { width: number };

function readPrefs(): Partial<Prefs> | null {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writePrefs(next: Partial<Prefs>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...next }));
  } catch {}
}

type DockApp = { store: "ios" | "android"; country?: string | null } | null | undefined;

export function useDockedInspector(activeApp: DockApp) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PaneTab>("inspector");
  // The keyword every tab is about.
  const [keyword, setKeyword] = useState<string | null>(null);
  // What the Inspector and Long Tail last ran for. Each only gets a new
  // request (a new nonce) when its tab is shown for a different keyword, so
  // switching tabs back and forth doesn't re-run them, and Long Tail
  // doesn't add a group for every keyword that's merely inspected.
  const [request, setRequest] = useState<InspectorDock["request"]>(null);
  const [seedRequest, setSeedRequest] = useState<LongTailDock["seedRequest"]>(null);

  function show(next: PaneTab, term: string | null) {
    setOpen(true);
    setTab(next);
    if (!term) return;
    // The table's own storefront, which is what its metrics (and Track)
    // are for.
    if (next === "inspector") {
      setRequest((prev) => prev?.term === term ? prev : {
        term,
        store: activeApp?.store ?? "ios",
        country: (activeApp?.country ?? "us").toLowerCase(),
        nonce: (prev?.nonce ?? 0) + 1,
      });
    } else if (next === "longTail") {
      setSeedRequest((prev) => prev?.seed === term ? prev : { seed: term, nonce: (prev?.nonce ?? 0) + 1 });
    }
  }

  // A row click: the open pane stays on its tab, now for this keyword, so
  // rows can be stepped through on Performance or Long Tail; a closed one
  // opens on the Inspector. A row's Details button always opens the
  // Inspector (`toInspector`).
  function selectKeyword(term: string, toInspector = false) {
    setKeyword(term);
    show(open && !toInspector ? tab : "inspector", term);
  }

  // From inside the pane (the Inspector's "See long tail"): straight to the
  // Long Tail tab for that term.
  function openLongTail(term: string) {
    setKeyword(term);
    show("longTail", term);
  }

  function closeInspector() {
    setOpen(false);
  }

  return {
    open,
    tab,
    keyword,
    request,
    seedRequest,
    // For the table to highlight the keyword's row.
    inspectedKeyword: open ? keyword : null,
    selectKeyword,
    openLongTail,
    showTab: (next: PaneTab) => show(next, keyword),
    closeInspector,
  };
}

export type DockedInspector = ReturnType<typeof useDockedInspector>;

const TABS: { key: PaneTab; label: string; icon: typeof PuzzlePieceIcon; href: string }[] = [
  { key: "inspector", label: "Inspector", icon: DocumentMagnifyingGlassIcon, href: "/dashboard/keywords/inspector" },
  { key: "longTail", label: "Long Tail", icon: PuzzlePieceIcon, href: "/dashboard/keywords/combination" },
  { key: "performance", label: "Performance", icon: ChartBarIcon, href: "/dashboard/keywords/performance" },
];

// The table (children) on the left, the pane on the right. Below xl there
// isn't room for both, so the pane slides over the table instead.
export function InspectorSplit({
  inspector, trackedTerms, onTrack, app, keywords, downloadsConnection, competitors, onCompetitorAdded, tourStep, onAdvanceTour, children,
}: {
  inspector: DockedInspector;
  // For the Performance tab, which reads the keyword's row from the table.
  app: ActiveApp;
  keywords: Keyword[];
  downloadsConnection?: DownloadsConnection;
  // For the Inspector's "Add as competitor" on its results, and the
  // Performance tab's visibility chart.
  competitors: CompetitorApp[];
  onCompetitorAdded: (competitor: CompetitorApp) => void;
  // The onboarding tour (owned by Keywords Research): the docked Inspector
  // shows two of its steps, and the Long Tail tab is the one after.
  tourStep: TourStep | null;
  onAdvanceTour: () => void;
  // Lowercased terms already in the table, so Track can show "Tracking".
  trackedTerms: Set<string>;
  // Resolves once the keywords are saved.
  onTrack: (terms: string[]) => Promise<void>;
  children: ReactNode;
}) {
  // A tab mounts the first time it's shown and then stays mounted (just
  // hidden), so switching back keeps its results instead of reloading.
  const [mounted, setMounted] = useState<Set<PaneTab>>(new Set());
  const longTailTabRef = useRef<HTMLButtonElement>(null);
  const tourLongTail = tourStep === "longTail";
  if (inspector.open && !mounted.has(inspector.tab)) setMounted(new Set(mounted).add(inspector.tab));

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const saved = readPrefs()?.width;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof saved === "number") setWidth(clampWidth(saved));
  }, []);

  // Drag the pane's left edge to resize. Pointer capture keeps the drag
  // going when the cursor runs over the table or off the window. Starts
  // from the rendered width, which the table's minimum may have capped.
  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = handle.parentElement?.getBoundingClientRect().width ?? width;
    let next = startWidth;
    function onMove(ev: PointerEvent) {
      next = clampWidth(startWidth + (startX - ev.clientX));
      setWidth(next);
    }
    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      writePrefs({ width: next });
    }
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="relative flex-1 flex min-h-0">
      {children}

      {inspector.open && (
        <aside
          style={{ "--inspector-w": `${width}px` } as React.CSSProperties}
          // Literal numbers (Tailwind can't see interpolated classes):
          // MIN_WIDTH, and the table's 640px minimum.
          className="absolute inset-y-0 right-0 z-30 w-full sm:w-[440px] shadow-2xl shadow-black/40 border-l border-white/[0.07] light:border-black/[0.08] xl:relative xl:z-auto xl:shrink-0 xl:shadow-none xl:w-[max(380px,min(var(--inspector-w),calc(100%-640px)))]"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Inspector"
            onPointerDown={startResize}
            className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize xl:block hover:bg-indigo-500/30 active:bg-indigo-500/40 transition-colors"
          />
          <div className="@container flex h-full flex-col">
            <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-white/[0.07] light:border-black/[0.08]">
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Side pane">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    ref={key === "longTail" ? longTailTabRef : undefined}
                    type="button"
                    role="tab"
                    aria-selected={inspector.tab === key}
                    onClick={() => {
                      // Opening Long Tail is that tour step's instruction;
                      // advancing also shows the tab (see advanceTour).
                      if (key === "longTail" && tourLongTail) onAdvanceTour();
                      else inspector.showTab(key);
                    }}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      inspector.tab === key
                        ? "bg-white/[0.08] light:bg-black/[0.06] text-white light:text-gray-900"
                        : "text-gray-500 hover:text-gray-300 light:hover:text-gray-700"
                    }`}
                  >
                    {/* Icons only once the pane has room, so all three labels fit. */}
                    <Icon className="hidden size-3.5 @md:block" />
                    {label}
                  </button>
                ))}
              </div>
              <Link
                href={TABS.find((t) => t.key === inspector.tab)!.href}
                title="Open the full page"
                aria-label="Open the full page"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] light:hover:bg-black/[0.05] hover:text-gray-300 light:hover:text-gray-700 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="size-4" />
              </Link>
              <button
                type="button"
                onClick={inspector.closeInspector}
                title="Close"
                aria-label="Close side pane"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] light:hover:bg-black/[0.05] hover:text-gray-300 light:hover:text-gray-700 transition-colors"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>

            {/* Tour: after "can I win it?", what to do when the answer is no. */}
            <TourTooltip
              targetRef={longTailTabRef}
              active={tourLongTail}
              step={TOUR_STEPS.indexOf("longTail") + 1}
              total={TOUR_STEPS.length}
              icon={<PuzzlePieceIcon className="size-4 text-indigo-400 light:text-indigo-600 shrink-0 mt-0.5" />}
              message={
                <>
                  Hard to rank for? Open <span className="font-semibold text-white light:text-gray-900">Long Tail</span> to see easier, more specific versions of this keyword, with the easiest first. Add the good ones to your table in one click.
                </>
              }
              buttonLabel="Next"
              onAdvance={onAdvanceTour}
            />

            {mounted.has("inspector") && (
              <div className={`min-h-0 flex-1 ${inspector.tab === "inspector" ? "" : "hidden"}`}>
                <KeywordInspectorPage
                  dock={{
                    request: inspector.request,
                    trackedTerms,
                    onTrack: (term) => onTrack([term]),
                    onLongTail: inspector.openLongTail,
                    competitorIds: new Set(competitors.map((c) => c.storeId)),
                    onCompetitorAdded,
                    tourStep,
                    onAdvanceTour,
                    chanceFor: (term) => {
                      const row = keywords.find((k) => k.keyword.toLowerCase() === term.toLowerCase());
                      return row && !row.loading ? row.chance : undefined;
                    },
                  }}
                />
              </div>
            )}
            {mounted.has("longTail") && (
              <div className={`min-h-0 flex-1 ${inspector.tab === "longTail" ? "" : "hidden"}`}>
                <KeywordCombinationPage
                  dock={{
                    seedRequest: inspector.seedRequest,
                    trackedTerms,
                    onTrack,
                  }}
                />
              </div>
            )}
            {/* Not kept mounted like the others: it holds no work of its own,
                and remounting picks up the row's latest numbers. */}
            {inspector.tab === "performance" && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <KeywordPerformancePane
                  row={inspector.keyword
                    ? keywords.find((k) => k.keyword.toLowerCase() === inspector.keyword!.toLowerCase())
                    : undefined}
                  app={app}
                  downloadsConnection={downloadsConnection}
                  competitors={competitors}
                />
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
