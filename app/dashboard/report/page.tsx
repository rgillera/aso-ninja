import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import DashboardSidebar from "@/features/dashboard/DashboardSidebar";
import AppPicker from "@/features/aso/AppPicker";
import type { App, Workspace } from "@/libs/contracts";
import { DocumentChartBarIcon } from "@heroicons/react/24/outline";

export default async function Page() {
  const supabase = await createClient();

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  const allWorkspaces = (workspaces ?? []) as Workspace[];
  const firstWorkspace = allWorkspaces[0];

  const { data: apps } = firstWorkspace
    ? await supabase
        .from("apps")
        .select("*")
        .eq("workspace_id", firstWorkspace.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const allApps = (apps ?? []) as App[];

  if (allApps.length === 1) {
    redirect(`/dashboard/apps/${allApps[0].id}`);
  }

  return (
    <div className="flex h-screen bg-[#111318] overflow-hidden">
      <DashboardSidebar
        currentPath="/dashboard/report"
        workspaces={allWorkspaces}
        activeWorkspaceId={firstWorkspace?.id}
      />
      <main className="flex-1 flex items-center justify-center">
        {allApps.length === 0 ? (
          <div className="text-center">
            <DocumentChartBarIcon className="size-12 text-gray-700 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-400">No apps yet</p>
            <p className="mt-1 text-sm text-gray-600">
              Add an app from{" "}
              <a href="/dashboard" className="text-indigo-400 hover:text-indigo-300">
                My Apps
              </a>{" "}
              to see its ASO report.
            </p>
          </div>
        ) : (
          <AppPicker apps={allApps} />
        )}
      </main>
    </div>
  );
}
