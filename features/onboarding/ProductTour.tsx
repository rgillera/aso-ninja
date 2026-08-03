"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { loadOnboarding, saveOnboarding } from "./onboarding-checklist";
import { TOUR_STEPS } from "./tourSteps";

type Props = {
  hasApp: boolean;
  workspaceId: string;
};

const MOBILE_QUERY = "(max-width: 1023px)";
const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 320;
const VIEWPORT_MARGIN = 16;

function dataAttr(target: string) {
  return `[data-tour="${target}"]`;
}

export function ProductTour({ hasApp, workspaceId }: Props) {
  const [show, setShow] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const openedSidebarRef = useRef(false);

  // Shown once, the first time a brand-new (app-less) workspace loads the
  // dashboard. If the workspace already has an app on that first check,
  // it's an existing user who onboarded organically before this shipped —
  // mark it seen without ever showing anything.
  useEffect(() => {
    if (!workspaceId) return;
    const stored = loadOnboarding(workspaceId);
    if (stored) return;
    if (hasApp) {
      saveOnboarding(workspaceId, { seen: true });
      return;
    }
    // Deferred to an effect (rather than a lazy useState initializer) on
    // purpose: localStorage isn't available during SSR, so reading it during
    // render would produce a hydration mismatch between server and client.
    /* eslint-disable react-hooks/set-state-in-effect */
    setStepIndex(0);
    setShow(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Manual reopen from the sidebar's "Take the tour" link — independent of
  // the once-per-workspace auto-show above.
  useEffect(() => {
    function onOpen() {
      setStepIndex(0);
      setShow(true);
    }
    window.addEventListener("aso:open-onboarding", onOpen);
    return () => window.removeEventListener("aso:open-onboarding", onOpen);
  }, []);

  const closeMobileSidebarIfNeeded = useCallback(() => {
    if (openedSidebarRef.current) {
      window.dispatchEvent(new CustomEvent("aso:tour-sidebar", { detail: { open: false } }));
      openedSidebarRef.current = false;
    }
  }, []);

  const finish = useCallback(() => {
    saveOnboarding(workspaceId, { seen: true });
    setShow(false);
    closeMobileSidebarIfNeeded();
  }, [workspaceId, closeMobileSidebarIfNeeded]);

  // Locates the current step's target, skipping steps whose element isn't
  // in the DOM (e.g. a nav section hidden by plan access), and opening the
  // off-canvas sidebar on mobile when the target lives inside it.
  useLayoutEffect(() => {
    if (!show) return;

    let index = stepIndex;
    let el: Element | null = null;
    while (index < TOUR_STEPS.length) {
      el = document.querySelector(dataAttr(TOUR_STEPS[index].target));
      if (el) break;
      index += 1;
    }

    // Synchronizing with the live DOM (an external system) rather than
    // React state — the target element may not exist yet, or may sit at a
    // later step, only knowable by querying document.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!el) {
      finish();
      return;
    }
    if (index !== stepIndex) {
      setStepIndex(index);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const step = TOUR_STEPS[index];
    const isMobile = window.matchMedia(MOBILE_QUERY).matches;
    if (isMobile && step.inSidebar) {
      window.dispatchEvent(new CustomEvent("aso:tour-sidebar", { detail: { open: true } }));
      openedSidebarRef.current = true;
    } else if (openedSidebarRef.current && !step.inSidebar) {
      closeMobileSidebarIfNeeded();
    }

    let frame = 0;
    function measure() {
      const current = document.querySelector(dataAttr(step.target));
      if (current) {
        const next = current.getBoundingClientRect();
        // Bail out (via Object.is on the returned reference) when nothing
        // moved, so this rAF poll doesn't force a re-render every frame.
        setRect((prev) =>
          prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.height === next.height
            ? prev
            : next
        );
      }
      frame = requestAnimationFrame(measure);
    }
    // Give layout (e.g. the mobile drawer opening) a moment to settle, and
    // scroll the target into view, before locking onto its position.
    const target = el as HTMLElement;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(measure);
    }, 60);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [show, stepIndex, finish, closeMobileSidebarIfNeeded]);

  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, finish]);

  if (!show || !rect) return null;

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const spotlightStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    borderRadius: 12,
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px rgba(129,140,248,0.9)",
    transition: "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease",
    pointerEvents: "none",
  };

  const spaceBelow = window.innerHeight - rect.bottom;
  const placeAbove = spaceBelow < 220 && rect.top > 220;
  const tooltipTop = placeAbove
    ? Math.max(VIEWPORT_MARGIN, rect.top - SPOTLIGHT_PADDING - 12)
    : rect.bottom + SPOTLIGHT_PADDING + 12;
  const idealLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  const tooltipLeft = Math.min(
    Math.max(idealLeft, VIEWPORT_MARGIN),
    window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN
  );

  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    left: tooltipLeft,
    width: TOOLTIP_WIDTH,
    ...(placeAbove ? { bottom: window.innerHeight - tooltipTop } : { top: tooltipTop }),
    transition: "top 200ms ease, bottom 200ms ease, left 200ms ease",
  };

  return createPortal(
    <div className="fixed inset-0 z-[80]" onClick={finish}>
      <div style={spotlightStyle} />
      <div
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl bg-[#141417] p-5 ring-1 ring-white/[0.1] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{step.title}</h3>
          <button
            onClick={finish}
            aria-label="Close tour"
            className="shrink-0 text-gray-600 hover:text-white transition-colors"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-400">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition-colors ${i === stepIndex ? "bg-indigo-400" : "bg-white/15"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex((s) => s - 1)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIndex((s) => s + 1))}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
