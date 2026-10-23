"use server";

import { createRealUserClient, isImpersonating } from "@/libs/supabase/server";
import { recordUserEvent } from "@/libs/analytics/events";

// Called by ActivityHeartbeat. Skipped while a super admin is viewing as
// someone: the admin's browsing would otherwise count as the target user's
// usage (and the real session here is the admin's own).
export async function recordActivityAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  await supabase.rpc("record_user_activity");
}

// Called by SubscriptionPageViewTracker; same impersonation skip as above.
export async function recordSubscriptionPageViewAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  await supabase.rpc("record_subscription_page_view");
}

// Called when the product tour's last step is dismissed (DashboardSidebar).
// The tour's own state only lives in localStorage, so this is the record the
// admin Engagement page's milestones read.
export async function recordTourCompletedAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await recordUserEvent(user.id, "tour_completed");
}
