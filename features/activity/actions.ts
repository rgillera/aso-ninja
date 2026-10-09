"use server";

import { createRealUserClient, isImpersonating } from "@/libs/supabase/server";

// Called by ActivityHeartbeat. Skipped while a super admin is viewing as
// someone: the admin's browsing would otherwise count as the target user's
// usage (and the real session here is the admin's own).
export async function recordActivityAction(): Promise<void> {
  if (await isImpersonating()) return;
  const supabase = await createRealUserClient();
  await supabase.rpc("record_user_activity");
}
