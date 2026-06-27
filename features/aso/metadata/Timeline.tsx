import type { App, Workspace } from "@/libs/contracts";
import DashboardSidebar from "@/features/dashboard/DashboardSidebar";

type Props = {
  app: App;
  allApps: App[];
  workspaces: Workspace[];
};

export default function Timeline({ app, workspaces }: Props) {
  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <DashboardSidebar
        currentPath="/dashboard/metadata/timeline"
        workspaces={workspaces}
        activeWorkspaceId={app.workspace_id}
        activeAppId={app.id}
      />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-600">Timeline — coming soon</p>
      </main>
    </div>
  );
}
