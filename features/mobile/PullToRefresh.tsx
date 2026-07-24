"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const PULL_THRESHOLD = 64;
const MAX_PULL = 90;

// Standalone/home-screen PWAs lose the browser's native pull-to-refresh
// (it's a browser-chrome gesture, and there's no browser chrome in standalone
// display mode) — this reimplements it for whichever scrollable region it
// wraps. Listens on the wrapper itself (not document) so it can't fire from
// gestures on unrelated overlays like NavigationDrawer's backdrop, and only
// engages when the page is already scrolled to the very top, so it never
// competes with an ordinary scroll.
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let startY: number | null = null;
    let dragging = false;
    let busy = false;

    function onTouchStart(e: TouchEvent) {
      if (busy || window.scrollY > 0) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      dragging = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging || startY === null) return;
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0 || window.scrollY > 0) {
        setPull(0);
        return;
      }
      e.preventDefault();
      setPull(Math.min(delta * 0.45, MAX_PULL));
    }

    function onTouchEnd() {
      if (!dragging) return;
      dragging = false;
      startY = null;
      setPull((current) => {
        if (current >= PULL_THRESHOLD && !busy) {
          busy = true;
          setRefreshing(true);
          onRefreshRef.current().finally(() => {
            busy = false;
            setRefreshing(false);
            setPull(0);
          });
          return PULL_THRESHOLD;
        }
        return 0;
      });
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const indicatorHeight = refreshing ? PULL_THRESHOLD : pull;

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center overflow-hidden"
        style={{
          height: indicatorHeight,
          transition: refreshing || pull === 0 ? "height 200ms ease" : "none",
        }}
      >
        {indicatorHeight > 0 && (
          <ArrowPathIcon
            className={`size-5 text-gray-500 ${refreshing ? "animate-spin" : ""}`}
            style={refreshing ? undefined : { transform: `rotate(${(pull / PULL_THRESHOLD) * 180}deg)` }}
          />
        )}
      </div>
      <div
        style={{
          transform: `translateY(${indicatorHeight}px)`,
          transition: refreshing || pull === 0 ? "transform 200ms ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
