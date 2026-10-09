"use client";

import { useEffect, useRef } from "react";
import { recordSubscriptionPageViewAction } from "@/features/activity/actions";

// Counts one open of /dashboard/subscription for the admin Users table.
// Mounted from the page itself rather than counted on the server render, so
// Link prefetches and RSC refreshes don't inflate it. The ref keeps dev
// StrictMode's double effect run from counting twice.
export function SubscriptionPageViewTracker() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    recordSubscriptionPageViewAction().catch(() => {});
  }, []);
  return null;
}
