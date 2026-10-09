"use client";

import { useEffect } from "react";
import { recordActivityAction } from "@/features/activity/actions";

const PING_INTERVAL_MS = 60 * 1000;
// A visible tab nobody has touched in this long counts as idle, not usage.
const IDLE_AFTER_MS = 5 * 60 * 1000;

// Rendered by the signed-in layouts (dashboard, mobile) to feed the admin
// Users table's "Time used" / "Last active" (see record_user_activity in
// supabase/migrations/20261009000001_user_activity.sql). Each ping = one
// minute of use. Skipped while impersonating, like MixpanelIdentify.
export function ActivityHeartbeat() {
  useEffect(() => {
    let lastInteraction = Date.now();
    const markActive = () => {
      lastInteraction = Date.now();
    };

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastInteraction > IDLE_AFTER_MS) return;
      recordActivityAction().catch(() => {});
    };

    const events = ["pointerdown", "keydown", "scroll", "mousemove", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, markActive, { passive: true });

    ping();
    const timer = window.setInterval(ping, PING_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, markActive);
    };
  }, []);

  return null;
}
