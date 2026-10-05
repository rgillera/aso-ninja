"use client";

import { useEffect } from "react";
import { identifyUser } from "@/libs/mixpanel";

// Rendered by the signed-in layouts (dashboard, mobile) to tie this browser's
// anonymous Mixpanel activity to the Supabase user. Skipped while an admin is
// impersonating, which would otherwise merge the admin's device into the
// target user's profile.
export function MixpanelIdentify({ userId, email }: { userId: string; email?: string }) {
  useEffect(() => {
    identifyUser(userId, email);
  }, [userId, email]);
  return null;
}
