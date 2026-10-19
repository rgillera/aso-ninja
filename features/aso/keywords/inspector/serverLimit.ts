import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { inspectorDailyLimit } from "./limits";

// The daily limit for this user, from the plan of the workspace the page
// sent. That id comes from the browser, and get_workspace_plan answers for
// any workspace, so it only counts when the user is actually a member;
// otherwise they get Free's limit. Without this, passing some Pro
// workspace's id would unlock unlimited lookups.
export async function inspectorLimitFor(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<number | null> {
  if (!workspaceId) return inspectorDailyLimit("free");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return inspectorDailyLimit("free");

  const planState = await getWorkspacePlanState(workspaceId);
  return inspectorDailyLimit(planState && !("error" in planState) ? planState.plan.slug : "free");
}
