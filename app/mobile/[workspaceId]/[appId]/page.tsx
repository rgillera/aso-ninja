import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { MobileMonitor } from "@/features/mobile/MobileMonitor";

// The keyword-rankings view itself — workspace/app already chosen by the
// time we get here (either picked in app/mobile/[workspaceId]/page.tsx, or
// skipped straight to via a remembered lastAppId/lastWorkspaceId cookie).
export default async function MobileAppPage({
  params,
}: {
  params: Promise<{ workspaceId: string; appId: string }>;
}) {
  const { workspaceId, appId } = await params;

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("apps")
    .select("id, name, store, icon_url, store_id, country, workspace_id")
    .eq("id", appId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // RLS already scopes this to the user's own memberships — a missing row
  // means either a stale link or a workspace/app they don't belong to.
  if (!app) redirect("/mobile");

  // Mobile has no PlanProvider, so the plan is read here. A failed lookup
  // leaves the column unlocked rather than hiding it from a paying user.
  const { data: plan } = await supabase
    .rpc("get_workspace_plan", { p_workspace_id: workspaceId })
    .single();
  const changeLocked = (plan as { slug?: string } | null)?.slug === "free";

  return (
    <MobileMonitor
      workspaceId={workspaceId}
      appId={app.id}
      appName={app.name}
      appIconUrl={app.icon_url}
      store={app.store}
      storeId={app.store_id}
      country={app.country}
      changeLocked={changeLocked}
    />
  );
}
