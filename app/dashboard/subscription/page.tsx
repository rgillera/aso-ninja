import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { getWorkspacePlanState } from "@/features/subscription/actions";
import SubscriptionPage from "@/features/subscription/SubscriptionPage";
import { SubscriptionPageViewTracker } from "@/features/activity/SubscriptionPageViewTracker";
import type { Workspace } from "@/libs/contracts";

type PageProps = { searchParams: Promise<{ ws?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { ws: wsParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });
  const allWorkspaces = (workspaces ?? []) as Workspace[];
  const activeWorkspaceId = allWorkspaces.find((w) => w.id === wsParam)?.id ?? allWorkspaces[0]?.id;

  if (!activeWorkspaceId) {
    return (
      <>
        <SubscriptionPageViewTracker />
        <SubscriptionPage currentPlanId="free" workspaceId="" />
      </>
    );
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", activeWorkspaceId)
    .eq("user_id", user?.id ?? "")
    .single();

  if (membership?.role !== "owner") redirect("/dashboard");

  const state = await getWorkspacePlanState(activeWorkspaceId);
  const trialEndsAt = "error" in state ? null : state.trialEndsAt;

  return (
    <>
      <SubscriptionPageViewTracker />
      <SubscriptionPage
        // The trial reads as Pro everywhere else, but billing-wise they're
        // still on Free, so Pro's card has to offer the upgrade.
        currentPlanId={"error" in state || trialEndsAt ? "free" : state.plan.slug}
        trialEndsAt={trialEndsAt}
        workspaceId={activeWorkspaceId}
        usage={"error" in state ? undefined : state.usage}
        pendingCancellation={"error" in state ? null : state.pendingCancellation}
      />
    </>
  );
}
