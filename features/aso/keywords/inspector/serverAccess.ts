import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import { canUseInspector } from "./limits";

// Whether this user gets the Inspector, from the plan of the workspace the
// page sent. That id comes from the browser, and get_workspace_plan answers
// for any workspace, so it only counts when the user is actually a member.
// Without this, passing some Pro workspace's id would unlock it.
export async function inspectorAllowedFor(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  if (!workspaceId) return false;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return false;

  const planState = await getWorkspacePlanState(workspaceId);
  return canUseInspector(planState && !("error" in planState) ? planState.plan.slug : "free");
}
