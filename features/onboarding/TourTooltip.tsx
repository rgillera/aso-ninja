"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** The element this step points at — also positions the bubble and is excluded from the outside-click dismiss below. */
  targetRef: RefObject<HTMLElement | null>;
  active: boolean;
  step: number;
  total: number;
  icon: ReactNode;
  message: ReactNode;
  /** Omit for a step with no skip button — e.g. one meant to require the
   * instruction actually be completed (clicking through to another page)
   * rather than offering a free pass past it. Outside-click dismiss still
   * applies either way; this only removes the explicit button. */
  buttonLabel?: string;
  onAdvance: () => void;
  /** Other elements a click inside shouldn't count as "outside" — e.g. a step whose own instruction is clicking something other than `targetRef`. */
  ignoreRefs?: RefObject<HTMLElement | null>[];
  /**
   * Where to anchor relative to `targetRef`. "bottom" (default) sits just
   * under it — right for a compact target like a column header or input
   * box. "top" sits just inside its top edge instead — for a step whose
   * target is a whole section (the Suggestions panel, the Table container)
   * that can run taller than the viewport, where anchoring off the bottom
   * edge would push the bubble below the fold. "right" sits just outside
   * its right edge — for the sidebar, a full-height strip down the left
   * side of the screen where "above"/"below" don't make sense at all.
   */
  anchor?: "top" | "bottom" | "right";
};

// A small pulsing ring laid over a step's actual click target — the static
// ring/background highlight each call site already draws says "look here";
// this adds motion on top of it that specifically reads as "click this",
// for steps whose own instruction is completing an action (typing a
// keyword, sorting a column, following a link) rather than just reading a
// section. Skipped on steps that highlight a whole passive section instead
// of one clickable element. Needs `position: relative` on whatever wraps
// it — every call site already has (or needs) that for its own highlight
// styling — and rounds to match via `rounded-[inherit]` instead of a fixed
// radius, since call sites range from a button to a table header cell to a
// full-width input box.
export function TourPulse() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-indigo-400 animate-tour-pulse"
    />
  );
}

// The floating bubble shared by every step of the onboarding coach mark that
// runs across Keywords Research and the sidebar right after the onboarding
// wizard hands off (see TOUR_STEPS in ./tour) — each step's owning component
// mounts one of these so the position-tracking, outside-click-to-advance,
// and bubble chrome only has to be written once.
export function TourTooltip({ targetRef, active, step, total, icon, message, buttonLabel, onAdvance, ignoreRefs = [], anchor = "bottom" }: Props) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    function position() {
      const el = targetRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (anchor === "right") {
        // Clamp so the bubble still lands on-screen even if the sidebar
        // somehow spans nearly the full viewport width.
        const left = Math.max(8, Math.min(r.right + 12, window.innerWidth - 272));
        setPos({ top: Math.max(8, r.top + 8), left });
        return;
      }
      // Clamp so the 256px-wide bubble can't run off a narrow viewport even
      // though the element it's pointing at sits further right.
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 272));
      setPos({ top: (anchor === "top" ? r.top : r.bottom) + 8, left });
    }
    position();
    window.addEventListener("resize", position);
    // Also re-measure on a short poll, not just resize: a step whose target
    // sits below content that's still loading (e.g. the Export button, below
    // the Performance page's summary stats card which only mounts once
    // keyword data arrives) can shift position after this effect's first
    // measurement, with nothing that fires a "resize" for it. Cheap and
    // self-correcting regardless of what caused the shift; stops as soon as
    // the step ends (this effect's cleanup on `active` flipping false).
    const poll = setInterval(position, 200);
    return () => {
      window.removeEventListener("resize", position);
      clearInterval(poll);
    };
  }, [active, targetRef, anchor]);

  // Second pass, once the bubble itself is in the DOM: pull it back up if
  // its computed position would run past the bottom of the viewport. Needed
  // because the first pass above doesn't know the bubble's own height yet —
  // matters most for `anchor="bottom"` on a target near the bottom of the
  // screen, and as a safety net for the other anchors too.
  useEffect(() => {
    if (!active || !pos || !tipRef.current) return;
    const h = tipRef.current.getBoundingClientRect().height;
    const clampedTop = Math.max(8, Math.min(pos.top, window.innerHeight - h - 8));
    if (clampedTop !== pos.top) setPos({ top: clampedTop, left: pos.left });
  }, [active, pos]);

  useEffect(() => {
    if (!active) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      // Clicking the bubble itself, the thing it's pointing at, or one of
      // this step's other "that counts as done" elements isn't an outside
      // dismiss — those are handled by their own onClick/onChange instead.
      if (tipRef.current?.contains(target)) return;
      if (targetRef.current?.contains(target)) return;
      if (ignoreRefs.some((r) => r.current?.contains(target))) return;
      onAdvance();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active || !pos) return null;

  return createPortal(
    <div
      ref={tipRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-64 rounded-xl bg-[#1a1d24] light:bg-white ring-1 ring-indigo-400/40 shadow-2xl light:shadow-black/10 p-3.5"
    >
      <div className="flex items-start gap-2.5">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-200 light:text-gray-800 leading-relaxed">{message}</p>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-600 light:text-gray-400 tabular-nums">{step} of {total}</span>
            {buttonLabel && (
              <button
                onClick={onAdvance}
                className="rounded-md bg-indigo-500 hover:bg-indigo-400 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
              >
                {buttonLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
