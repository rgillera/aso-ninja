import { createClient } from "@/libs/supabase/server";
import DashboardPage from "@/features/dashboard/DashboardPage";
import type { App, Workspace } from "@/libs/contracts";

type PageProps = { searchParams: Promise<{ ws?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const { ws: wsParam } = await searchParams;

  const supabase = await createClient();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  const allWorkspaces = (workspaces ?? []) as Workspace[];

  // Use the ?ws= param if it matches a real workspace, otherwise fall back to first
  const activeWorkspaceId =
    allWorkspaces.find((w) => w.id === wsParam)?.id ?? allWorkspaces[0]?.id;

  const { data: apps } = activeWorkspaceId
    ? await supabase
        .from("apps")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <DashboardPage
      currentPath="/dashboard"
      workspaces={allWorkspaces}
      activeWorkspaceId={activeWorkspaceId}
      apps={(apps ?? []) as App[]}
    />
  );
}
