import { createClient } from "@/libs/supabase/server";
import DashboardPage from "@/features/dashboard/DashboardPage";
import type { App, Workspace } from "@/libs/contracts";

type PageProps = { searchParams: Promise<{ ws?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { ws: wsParam } = await searchParams;
  const supabase = await createClient();

  const { data: workspaces } = await supabase.from("workspaces").select("*").order("created_at", { ascending: true });
  const allWorkspaces = (workspaces ?? []) as Workspace[];
  const activeWorkspaceId = allWorkspaces.find((w) => w.id === wsParam)?.id ?? allWorkspaces[0]?.id;

  const { data: apps } = activeWorkspaceId
    ? await supabase.from("apps").select("*").eq("workspace_id", activeWorkspaceId).order("created_at", { ascending: false })
    : { data: [] };

  // One batched query for every followed app's connection status, rather
  // than a per-row fetch — this list is typically small, so a single
  // `in (...)` lookup is cheap regardless of how many apps are shown.
  const appIds = (apps ?? []).map((a) => a.id);
  const { data: connections } = appIds.length
    ? await supabase.from("app_store_connections").select("app_id").eq("status", "connected").in("app_id", appIds)
    : { data: [] };
  const connectedAppIds = (connections ?? []).map((c) => c.app_id);

  return (
    <DashboardPage
      activeWorkspaceId={activeWorkspaceId}
      apps={(apps ?? []) as App[]}
      connectedAppIds={connectedAppIds}
    />
  );
}
