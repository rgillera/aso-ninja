import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import type { PlanSlug } from "@/libs/contracts";
import { canUseInspector } from "./limits";

// The plan of the workspace the page sent, or null when the user isn't a
// member. That id comes from the browser, and get_workspace_plan answers
// for any workspace, so it only counts when the user is actually a member.
// Without this, passing some Pro workspace's id would unlock it.
export async function inspectorPlanFor(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<PlanSlug | null> {
  if (!workspaceId) return null;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const planState = await getWorkspacePlanState(workspaceId);
  return planState && !("error" in planState) ? planState.plan.slug : "free";
}

// Whether this user gets the Inspector (see inspectorPlanFor).
export async function inspectorAllowedFor(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const plan = await inspectorPlanFor(supabase, userId, workspaceId);
  return !!plan && canUseInspector(plan);
}
