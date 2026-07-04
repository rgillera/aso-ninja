import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/libs/supabase/server";
import { DashboardShell } from "@/features/dashboard/DashboardShell";
import type { App, Workspace, WorkspaceAccess } from "@/libs/contracts";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const lastAppId       = cookieStore.get("lastAppId")?.value;
  const lastPreview     = cookieStore.get("lastPreview")?.value; // encoded search string
  const lastWorkspaceId = cookieStore.get("lastWorkspaceId")?.value;

  const [{ data: workspaces }, { data: apps }, { data: memberships }] = await Promise.all([
    supabase.from("workspaces").select("*").order("created_at", { ascending: true }),
    supabase.from("apps").select("*").order("created_at", { ascending: false }),
    supabase.from("workspace_members").select("workspace_id, access").eq("user_id", user.id),
  ]);

  const accessByWorkspace = Object.fromEntries(
    (memberships ?? []).map((m) => [m.workspace_id, m.access as WorkspaceAccess[]])
  );

  return (
    <Suspense>
      <DashboardShell
        workspaces={(workspaces ?? []) as Workspace[]}
        allApps={(apps ?? []) as App[]}
        lastAppId={lastAppId}
        lastPreview={lastPreview}
        lastWorkspaceId={lastWorkspaceId}
        accessByWorkspace={accessByWorkspace}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
